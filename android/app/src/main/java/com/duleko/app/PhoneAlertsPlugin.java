package com.duleko.app;

import android.Manifest;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.service.notification.StatusBarNotification;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/**
 * Phone alerts without a push service - the app's bridge to
 * PhoneAlertsWorker. Used from src/lib/phone-alerts.ts:
 *
 *   start(...)        after sign-in: remember the device key, create the
 *                     notification categories, schedule the checks
 *   stop()            on sign-out: stop checking, clear the bar
 *   clear(...)        something was read in the app: drop its notification
 *   "alertTap" event  a notification was tapped: open what it's about
 */
@CapacitorPlugin(
    name = "PhoneAlerts",
    permissions = @Permission(alias = PhoneAlertsPlugin.NOTIFICATIONS, strings = { Manifest.permission.POST_NOTIFICATIONS })
)
public class PhoneAlertsPlugin extends Plugin {

    static final String NOTIFICATIONS = "notifications";

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PhoneAlertsWorker.PREFS, Context.MODE_PRIVATE);
    }

    @Override
    public void load() {
        handleTap(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        handleTap(intent);
    }

    /** Held until the app listens, so a tap that launched the app still opens the right screen. */
    private void handleTap(Intent intent) {
        if (intent == null || !intent.hasExtra(PhoneAlertsWorker.EXTRA_KIND)) return;
        JSObject tap = new JSObject();
        tap.put("notificationId", intent.getStringExtra(PhoneAlertsWorker.EXTRA_ID));
        tap.put("kind", intent.getStringExtra(PhoneAlertsWorker.EXTRA_KIND));
        // Not again after a rotation or when coming back to the app.
        intent.removeExtra(PhoneAlertsWorker.EXTRA_ID);
        intent.removeExtra(PhoneAlertsWorker.EXTRA_KIND);
        notifyListeners("alertTap", tap, true);
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        if (prefs().getString("deviceKey", null) != null) PhoneAlertsWorker.checkSoon(getContext());
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState(NOTIFICATIONS) == PermissionState.GRANTED) {
            resolvePermission(call);
            return;
        }
        requestPermissionForAlias(NOTIFICATIONS, call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        resolvePermission(call);
    }

    private void resolvePermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", PhoneAlertsWorker.canPostNotifications(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void start(PluginCall call) {
        String url = call.getString("url");
        String anonKey = call.getString("anonKey");
        String deviceKey = call.getString("deviceKey");
        if (url == null || anonKey == null || deviceKey == null) {
            call.reject("url, anonKey and deviceKey are required");
            return;
        }

        SharedPreferences prefs = prefs();
        SharedPreferences.Editor editor = prefs.edit().putString("url", url).putString("anonKey", anonKey).putString("deviceKey", deviceKey);
        // A different phone owner starts with a clean slate.
        if (!deviceKey.equals(prefs.getString("deviceKey", null))) editor.remove("shownIds");
        editor.apply();

        Map<String, String> names = new HashMap<>();
        JSObject channels = call.getObject("channels", new JSObject());
        for (Iterator<String> keys = channels.keys(); keys.hasNext();) {
            String key = keys.next();
            names.put(key, channels.getString(key));
        }
        PhoneAlertsWorker.createChannels(getContext(), names);
        PhoneAlertsWorker.schedule(getContext());
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        PhoneAlertsWorker.cancel(getContext());
        prefs().edit().clear().apply();
        NotificationManagerCompat.from(getContext()).cancelAll();
        call.resolve();
    }

    /** { all: true }, { tag: "chat-<id>" } or { prefix: "alert-" }. */
    @PluginMethod
    public void clear(PluginCall call) {
        NotificationManagerCompat manager = NotificationManagerCompat.from(getContext());
        if (Boolean.TRUE.equals(call.getBoolean("all", false))) {
            manager.cancelAll();
        } else if (call.getString("tag") != null) {
            manager.cancel(call.getString("tag"), PhoneAlertsWorker.NOTIFICATION_ID);
        } else if (call.getString("prefix") != null) {
            String prefix = call.getString("prefix");
            NotificationManager system = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            for (StatusBarNotification shown : system.getActiveNotifications()) {
                if (shown.getTag() != null && shown.getTag().startsWith(prefix)) manager.cancel(shown.getTag(), shown.getId());
            }
        }
        call.resolve();
    }

    /** Ask Supabase right away - for testing; it stays quiet while the app is on screen. */
    @PluginMethod
    public void checkNow(PluginCall call) {
        PhoneAlertsWorker.checkNow(getContext());
        call.resolve();
    }
}
