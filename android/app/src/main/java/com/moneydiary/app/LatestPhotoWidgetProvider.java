package com.moneydiary.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;

import java.io.File;

public class LatestPhotoWidgetProvider extends AppWidgetProvider {
    static final String PREFS = "latest_photo_widget";
    static final String IMAGE_FILE = "latest_photo_widget.jpg";

    static File imageFile(Context context) {
        return new File(context.getNoBackupFilesDir(), IMAGE_FILE);
    }

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, LatestPhotoWidgetProvider.class);
        for (int id : manager.getAppWidgetIds(provider)) update(context, manager, id);
    }

    private static void update(Context context, AppWidgetManager manager, int id) {
        SharedPreferences data = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.latest_photo_widget);
        File image = imageFile(context);
        Bitmap bitmap = image.isFile() ? BitmapFactory.decodeFile(image.getAbsolutePath()) : null;
        if (bitmap != null && !data.getString("attachmentId", "").isEmpty()) {
            views.setImageViewBitmap(R.id.widget_photo, bitmap);
            views.setViewVisibility(R.id.widget_photo, View.VISIBLE);
            views.setTextViewText(R.id.widget_amount, data.getString("amountLabel", ""));
            views.setTextViewText(R.id.widget_title, data.getString("title", ""));
            views.setTextViewText(R.id.widget_detail, data.getString("detail", ""));
            String type = data.getString("type", "");
            views.setTextColor(R.id.widget_amount, "expense".equals(type) ? Color.rgb(255, 177, 182)
                    : "income".equals(type) ? Color.rgb(182, 237, 195) : Color.WHITE);
        } else {
            views.setViewVisibility(R.id.widget_photo, View.GONE);
            views.setTextViewText(R.id.widget_amount, context.getString(R.string.widget_empty_amount));
            views.setTextViewText(R.id.widget_title, context.getString(R.string.widget_empty_title));
            views.setTextViewText(R.id.widget_detail, "");
            views.setTextColor(R.id.widget_amount, Color.WHITE);
        }

        Bundle options = manager.getAppWidgetOptions(id);
        int width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        int height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0);
        views.setTextViewTextSize(R.id.widget_amount, TypedValue.COMPLEX_UNIT_SP,
                width >= 210 ? 23f : width >= 160 ? 19f : 15f);
        views.setViewVisibility(R.id.widget_detail, width >= 170 && height >= 140 ? View.VISIBLE : View.GONE);
        Intent launch = new Intent(context, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(context, id, launch,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pending);
        manager.updateAppWidget(id, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) update(context, manager, id);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        update(context, manager, id);
    }
}
