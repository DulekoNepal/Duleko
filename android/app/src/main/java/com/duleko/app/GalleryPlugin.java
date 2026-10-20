package com.duleko.app;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

/**
 * Saves a picture straight into the phone's gallery, in a "Duleko" album
 * under Pictures - no share sheet in between. Used from
 * src/lib/profileCard.ts for the Professional ID card:
 *
 *   saveImage({ data, filename })   data is the raw base64 PNG
 *
 * Android 10+ writes through MediaStore, which needs no permission at all.
 * Android 7-9 has no such API, so it asks once for storage access
 * (declared with maxSdkVersion 28 in the manifest) and writes the file
 * itself, then has the media scanner pick it up.
 */
@CapacitorPlugin(
    name = "Gallery",
    permissions = @Permission(alias = GalleryPlugin.STORAGE, strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE })
)
public class GalleryPlugin extends Plugin {

    static final String STORAGE = "storage";
    private static final String ALBUM = "Duleko";

    @PluginMethod
    public void saveImage(PluginCall call) {
        if (call.getString("data") == null || call.getString("filename") == null) {
            call.reject("data and filename are required");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState(STORAGE) != PermissionState.GRANTED) {
            requestPermissionForAlias(STORAGE, call, "storagePermissionDone");
            return;
        }
        write(call);
    }

    @PermissionCallback
    private void storagePermissionDone(PluginCall call) {
        if (getPermissionState(STORAGE) == PermissionState.GRANTED) write(call);
        else call.reject("Permission to save photos was denied", "PERMISSION_DENIED");
    }

    private void write(PluginCall call) {
        byte[] bytes = Base64.decode(call.getString("data"), Base64.DEFAULT);
        String filename = call.getString("filename");
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) writeToMediaStore(bytes, filename);
            else writeToPictures(bytes, filename);
            call.resolve();
        } catch (IOException e) {
            call.reject("Could not save the picture to the gallery", e);
        }
    }

    /** Android 10+. A second save of the same name becomes "name (1).png" - MediaStore never overwrites. */
    private void writeToMediaStore(byte[] bytes, String filename) throws IOException {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
        values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/" + ALBUM);
        // Hidden from the gallery until every byte is written.
        values.put(MediaStore.Images.Media.IS_PENDING, 1);

        Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        if (uri == null) throw new IOException("Could not create the picture");
        try (OutputStream out = resolver.openOutputStream(uri)) {
            if (out == null) throw new IOException("Could not open the picture for writing");
            out.write(bytes);
        } catch (IOException e) {
            resolver.delete(uri, null, null);
            throw e;
        }

        values.clear();
        values.put(MediaStore.Images.Media.IS_PENDING, 0);
        resolver.update(uri, values, null, null);
    }

    /** Android 7-9: a plain file in Pictures/Duleko, then the media scanner adds it to the gallery. */
    @SuppressWarnings("deprecation")
    private void writeToPictures(byte[] bytes, String filename) throws IOException {
        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), ALBUM);
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("Could not create the Duleko album");
        File file = new File(dir, filename);
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(bytes);
        }
        MediaScannerConnection.scanFile(getContext(), new String[] { file.getAbsolutePath() }, new String[] { "image/png" }, null);
    }
}
