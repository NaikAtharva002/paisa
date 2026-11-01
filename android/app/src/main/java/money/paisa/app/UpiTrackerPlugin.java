package money.paisa.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;
import android.text.TextUtils;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Set;

@CapacitorPlugin(name = "UpiTrackerPlugin")
public class UpiTrackerPlugin extends Plugin {

    private static final String PREFS_NAME = "PaisaUpiTrackerPrefs";
    private static final String PREF_TRACKING_ENABLED = "tracking_enabled";
    private static final String PREF_LAST_NOTIF = "last_notification_summary";
    private static final String PREF_LAST_NOTIF_TIME = "last_notification_time";
    private static final String PREF_PROCESSED_COUNT = "processed_count";

    private static UpiTrackerPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void dispatchNotification(
            String packageName,
            String title,
            String text,
            String subText,
            long postTime
    ) {
        if (instance != null) {
            Context ctx = instance.getContext();
            if (ctx != null) {
                SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                int count = prefs.getInt(PREF_PROCESSED_COUNT, 0) + 1;
                prefs.edit()
                        .putString(PREF_LAST_NOTIF, (title + " - " + text).trim())
                        .putLong(PREF_LAST_NOTIF_TIME, postTime)
                        .putInt(PREF_PROCESSED_COUNT, count)
                        .apply();
            }

            JSObject ret = new JSObject();
            ret.put("packageName", packageName);
            ret.put("title", title);
            ret.put("text", text);
            ret.put("subText", subText);
            ret.put("timestamp", postTime);

            instance.notifyListeners("notificationDetected", ret, true);
        }
    }

    @PluginMethod
    public void isPermissionGranted(PluginCall call) {
        Context context = getContext();
        boolean granted = checkNotificationListenerPermission(context);
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void openPermissionSettings(PluginCall call) {
        Context context = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not open notification listener settings", e);
        }
    }

    @PluginMethod
    public void setTrackingEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled", false);
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(PREF_TRACKING_ENABLED, enabled != null && enabled).apply();

        JSObject ret = new JSObject();
        ret.put("enabled", enabled != null && enabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void getTrackingStatus(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean(PREF_TRACKING_ENABLED, false);
        boolean granted = checkNotificationListenerPermission(context);
        String lastNotif = prefs.getString(PREF_LAST_NOTIF, "");
        long lastTime = prefs.getLong(PREF_LAST_NOTIF_TIME, 0);
        int count = prefs.getInt(PREF_PROCESSED_COUNT, 0);

        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        ret.put("permissionGranted", granted);
        ret.put("lastNotification", lastNotif);
        ret.put("lastNotificationTime", lastTime);
        ret.put("processedCount", count);
        ret.put("isAndroidNative", true);
        call.resolve(ret);
    }

    private boolean checkNotificationListenerPermission(Context context) {
        if (context == null) return false;
        try {
            Set<String> packageNames = NotificationManagerCompat.getEnabledListenerPackages(context);
            if (packageNames.contains(context.getPackageName())) {
                return true;
            }
        } catch (Exception ignored) {}

        // Fallback check on Settings.Secure
        String flat = Settings.Secure.getString(context.getContentResolver(), "enabled_notification_listeners");
        if (!TextUtils.isEmpty(flat)) {
            String myPkg = context.getPackageName();
            String[] names = flat.split(":");
            for (String name : names) {
                ComponentName cn = ComponentName.unflattenFromString(name);
                if (cn != null && TextUtils.equals(myPkg, cn.getPackageName())) {
                    return true;
                }
            }
        }
        return false;
    }
}
