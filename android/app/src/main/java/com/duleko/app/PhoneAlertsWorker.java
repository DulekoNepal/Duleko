package com.duleko.app;

import android.Manifest;
import android.app.ActivityManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import me.leolin.shortcutbadger.ShortcutBadger;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The background half of phone alerts (see PhoneAlertsPlugin): asks
 * Supabase's device_alerts() for unread alerts this phone hasn't shown yet
 * (migration 5300), posts them to the notification bar, and puts the
 * unread total on the launcher icon.
 *
 * There's no push service, so this runs on Android's schedule rather than
 * the moment something happens: every 15 minutes (the shortest Android
 * allows, and later still when the phone is idle), plus 2 and 6 minutes
 * after the app is left.
 */
public class PhoneAlertsWorker extends Worker {

    static final String PREFS = "duleko.phoneAlerts";
    static final String EXTRA_ID = "duleko.alertId";
    static final String EXTRA_KIND = "duleko.alertKind";

    private static final String PERIODIC = "duleko-alerts";
    private static final String NOW = "duleko-alerts-now";
    private static final String[] SOON = { "duleko-alerts-soon-1", "duleko-alerts-soon-2" };
    private static final long[] SOON_MINUTES = { 2, 6 };
    /** Ids already shown - device_alerts() looks back a little, so repeats come in. */
    private static final int REMEMBERED_IDS = 200;
    /** Every notification uses this id; the tag tells them apart. */
    static final int NOTIFICATION_ID = 1;

    public PhoneAlertsWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    private static Constraints online() {
        return new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
    }

    static void schedule(Context context) {
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(PhoneAlertsWorker.class, 15, TimeUnit.MINUTES)
            .setConstraints(online())
            .build();
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, request);
    }

    /** Leaving the app: replies tend to come soon after a message, so look again shortly. */
    static void checkSoon(Context context) {
        WorkManager work = WorkManager.getInstance(context);
        for (int i = 0; i < SOON.length; i++) {
            OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(PhoneAlertsWorker.class)
                .setInitialDelay(SOON_MINUTES[i], TimeUnit.MINUTES)
                .setConstraints(online())
                .build();
            work.enqueueUniqueWork(SOON[i], ExistingWorkPolicy.REPLACE, request);
        }
    }

    static void checkNow(Context context) {
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(PhoneAlertsWorker.class).setConstraints(online()).build();
        WorkManager.getInstance(context).enqueueUniqueWork(NOW, ExistingWorkPolicy.REPLACE, request);
    }

    static void cancel(Context context) {
        WorkManager work = WorkManager.getInstance(context);
        work.cancelUniqueWork(PERIODIC);
        work.cancelUniqueWork(NOW);
        for (String name : SOON) work.cancelUniqueWork(name);
    }

    /** Android lists these under Settings > Apps > Duleko > Notifications, so one kind can be muted. */
    static void createChannels(Context context, Map<String, String> names) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        for (String id : Arrays.asList("messages", "work", "friends", "updates")) {
            int importance = id.equals("messages") || id.equals("work")
                ? NotificationManager.IMPORTANCE_HIGH
                : NotificationManager.IMPORTANCE_DEFAULT;
            String name = names.containsKey(id) ? names.get(id) : id;
            NotificationChannel channel = new NotificationChannel(id, name, importance);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PRIVATE);
            // Re-creating an existing channel only renames it (a language switch).
            manager.createNotificationChannel(channel);
        }
    }

    /** Which of the categories above an alert kind belongs to. */
    private static String channelFor(String kind) {
        switch (kind) {
            case "message":
                return "messages";
            case "friend_request":
            case "friend_accepted":
                return "friends";
            case "request":
            case "accepted":
            case "declined":
            case "confirmed":
            case "completed":
            case "cancelled":
            case "review":
                return "work";
            default:
                return "updates";
        }
    }

    /** One notification per chat partner (a newer message replaces the older), one per alert. */
    static String tagFor(String kind, String id, String relatedProfileId) {
        return kind.equals("message") && relatedProfileId != null ? "chat-" + relatedProfileId : "alert-" + id;
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String url = prefs.getString("url", null);
        String anonKey = prefs.getString("anonKey", null);
        String deviceKey = prefs.getString("deviceKey", null);
        if (url == null || anonKey == null || deviceKey == null) return Result.success(); // signed out

        // The app is on screen: it shows everything itself. Whatever is
        // still unread when it's left comes up on the next check.
        if (appInForeground()) return Result.success();

        JSONObject response;
        try {
            response = askSupabase(url, anonKey, deviceKey);
        } catch (IOException e) {
            return Result.retry();
        } catch (JSONException e) {
            return Result.success();
        }
        // Unknown key: signed out on the server's side.
        if (response == null) return Result.success();

        List<String> shown = new ArrayList<>(Arrays.asList(prefs.getString("shownIds", "").split(",")));
        shown.remove("");
        JSONArray alerts = response.optJSONArray("alerts");
        boolean canPost = canPostNotifications(context);
        if (alerts != null) {
            for (int i = 0; i < alerts.length(); i++) {
                JSONObject alert = alerts.optJSONObject(i);
                if (alert == null) continue;
                String id = alert.optString("id");
                if (id.isEmpty() || shown.contains(id)) continue;
                if (canPost) post(context, alert);
                shown.add(id);
            }
        }
        if (shown.size() > REMEMBERED_IDS) shown = shown.subList(shown.size() - REMEMBERED_IDS, shown.size());

        int badge = Math.max(0, response.optInt("badge", 0));
        // Kept in step with @capawesome/capacitor-badge, which the app uses
        // while it's open and which restores its own stored count.
        context.getSharedPreferences("capacitor.badge", Context.MODE_PRIVATE).edit().putInt("capacitor.badge", badge).apply();
        ShortcutBadger.applyCount(context, badge);

        prefs.edit().putString("shownIds", String.join(",", shown)).apply();
        return Result.success();
    }

    private static boolean appInForeground() {
        ActivityManager.RunningAppProcessInfo info = new ActivityManager.RunningAppProcessInfo();
        ActivityManager.getMyMemoryState(info);
        return info.importance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND;
    }

    static boolean canPostNotifications(Context context) {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            return false;
        }
        return NotificationManagerCompat.from(context).areNotificationsEnabled();
    }

    private static JSONObject askSupabase(String url, String anonKey, String deviceKey) throws IOException, JSONException {
        HttpURLConnection connection = (HttpURLConnection) new URL(url + "/rest/v1/rpc/device_alerts").openConnection();
        try {
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(15_000);
            connection.setReadTimeout(15_000);
            connection.setDoOutput(true);
            connection.setRequestProperty("apikey", anonKey);
            connection.setRequestProperty("Authorization", "Bearer " + anonKey);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Accept", "application/json");
            byte[] body = new JSONObject().put("p_key", deviceKey).toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream out = connection.getOutputStream()) {
                out.write(body);
            }
            int status = connection.getResponseCode();
            if (status >= 500 || status == 429) throw new IOException("supabase " + status);
            if (status >= 400) throw new JSONException("supabase " + status); // e.g. migration not applied
            String text = read(connection.getInputStream()).trim();
            return text.equals("null") || text.isEmpty() ? null : new JSONObject(text);
        } finally {
            connection.disconnect();
        }
    }

    private static String read(InputStream in) throws IOException {
        try (InputStream stream = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int n;
            while ((n = stream.read(buffer)) != -1) out.write(buffer, 0, n);
            return out.toString("UTF-8");
        }
    }

    @SuppressWarnings("MissingPermission") // checked by canPostNotifications()
    private static void post(Context context, JSONObject alert) {
        String id = alert.optString("id");
        String kind = alert.optString("kind", "updates");
        String related = alert.isNull("related_profile_id") ? null : alert.optString("related_profile_id");
        String title = alert.optString("title", "Duleko");
        String body = alert.optString("body", "");
        String tag = tagFor(kind, id, related);

        // Tapping opens the app on what it's about (PhoneAlertsPlugin.handleTap).
        Intent open = new Intent(context, MainActivity.class)
            .putExtra(EXTRA_ID, id)
            .putExtra(EXTRA_KIND, kind)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tap = PendingIntent.getActivity(
            context,
            tag.hashCode(),
            open,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        boolean urgent = kind.equals("message") || channelFor(kind).equals("work");
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelFor(kind))
            .setSmallIcon(R.drawable.ic_stat_duleko)
            .setColor(ContextCompat.getColor(context, R.color.notification_color))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(tap)
            .setAutoCancel(true)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setCategory(kind.equals("message") ? NotificationCompat.CATEGORY_MESSAGE : NotificationCompat.CATEGORY_SOCIAL)
            .setPriority(urgent ? NotificationCompat.PRIORITY_HIGH : NotificationCompat.PRIORITY_DEFAULT);
        long at = alert.optLong("at", 0);
        if (at > 0) builder.setWhen(at).setShowWhen(true);

        NotificationManagerCompat.from(context).notify(tag, NOTIFICATION_ID, builder.build());
    }
}
