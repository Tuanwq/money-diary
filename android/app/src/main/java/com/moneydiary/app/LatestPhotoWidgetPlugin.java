package com.moneydiary.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.BitmapFactory;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;

@CapacitorPlugin(name = "LatestPhotoWidget")
public class LatestPhotoWidgetPlugin extends Plugin {
    private static final int MAX_IMAGE_BYTES = 1024 * 1024;
    private static final ExecutorService IO = Executors.newSingleThreadExecutor();
    private static final AtomicLong LATEST_REQUEST = new AtomicLong();

    @PluginMethod
    public void updateLatest(PluginCall call) {
        String ownerId = call.getString("ownerId", "");
        String attachmentId = call.getString("attachmentId", "");
        String thumbnailUrl = call.getString("thumbnailUrl", "");
        if (ownerId.isEmpty() || attachmentId.isEmpty() || thumbnailUrl.isEmpty()) {
            call.reject("Thiếu dữ liệu ảnh widget.");
            return;
        }
        long request = LATEST_REQUEST.incrementAndGet();
        Context context = getContext().getApplicationContext();
        IO.execute(() -> {
            try {
                SharedPreferences prefs = context.getSharedPreferences(LatestPhotoWidgetProvider.PREFS, Context.MODE_PRIVATE);
                if (request != LATEST_REQUEST.get()) { call.resolve(); return; }
                if (!ownerId.equals(prefs.getString("ownerId", ""))) {
                    clearState(context);
                    LatestPhotoWidgetProvider.refreshAll(context);
                }
                byte[] image = downloadThumbnail(thumbnailUrl);
                if (request != LATEST_REQUEST.get()) { call.resolve(); return; }
                File target = LatestPhotoWidgetProvider.imageFile(context);
                File temp = new File(context.getNoBackupFilesDir(), "latest_photo_widget.tmp");
                try (FileOutputStream output = new FileOutputStream(temp)) { output.write(image); }
                if (target.exists() && !target.delete()) throw new IllegalStateException("Cannot replace widget image");
                if (!temp.renameTo(target)) throw new IllegalStateException("Cannot save widget image");
                prefs.edit()
                    .putString("ownerId", ownerId)
                    .putString("attachmentId", attachmentId)
                    .putString("transactionId", call.getString("transactionId", ""))
                    .putString("amountLabel", call.getString("amountLabel", ""))
                    .putString("type", call.getString("type", ""))
                    .putString("title", call.getString("title", ""))
                    .putString("detail", call.getString("detail", ""))
                    .apply();
                LatestPhotoWidgetProvider.refreshAll(context);
                call.resolve();
            } catch (Exception error) {
                call.reject("Không tải được ảnh cho widget Android.");
            }
        });
    }

    @PluginMethod
    public void clear(PluginCall call) {
        long request = LATEST_REQUEST.incrementAndGet();
        Context context = getContext().getApplicationContext();
        IO.execute(() -> {
            if (request == LATEST_REQUEST.get()) {
                clearState(context);
                LatestPhotoWidgetProvider.refreshAll(context);
            }
            call.resolve();
        });
    }

    private static void clearState(Context context) {
        context.getSharedPreferences(LatestPhotoWidgetProvider.PREFS, Context.MODE_PRIVATE).edit().clear().commit();
        File image = LatestPhotoWidgetProvider.imageFile(context);
        if (image.exists()) image.delete();
    }

    private static byte[] downloadThumbnail(String signedUrl) throws Exception {
        URL url = new URL(signedUrl);
        if (!"https".equalsIgnoreCase(url.getProtocol())) throw new IllegalArgumentException("HTTPS required");
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(10000);
        connection.setReadTimeout(10000);
        try {
            if (connection.getResponseCode() != 200 || connection.getContentLength() > MAX_IMAGE_BYTES)
                throw new IllegalStateException("Thumbnail unavailable");
            String contentType = connection.getContentType();
            if (contentType == null || !contentType.startsWith("image/"))
                throw new IllegalStateException("Invalid thumbnail type");
            try (InputStream input = connection.getInputStream();
                 ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] chunk = new byte[8192];
                int count;
                while ((count = input.read(chunk)) != -1) {
                    if (output.size() + count > MAX_IMAGE_BYTES) throw new IllegalStateException("Thumbnail too large");
                    output.write(chunk, 0, count);
                }
                byte[] bytes = output.toByteArray();
                if (BitmapFactory.decodeByteArray(bytes, 0, bytes.length) == null)
                    throw new IllegalStateException("Invalid thumbnail image");
                return bytes;
            }
        } finally {
            connection.disconnect();
        }
    }
}
