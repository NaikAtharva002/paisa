package money.paisa.app;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

public class PaisaNotificationListenerService extends NotificationListenerService {

    private static final String TAG = "PaisaNotifListener";
    private static final String PREFS_NAME = "PaisaUpiTrackerPrefs";
    private static final String PREF_TRACKING_ENABLED = "tracking_enabled";

    // Known UPI and Indian Banking packages
    private static final Set<String> SUPPORTED_PACKAGES = new HashSet<>(Arrays.asList(
            "com.google.android.apps.nbu.paisa.user", // Google Pay
            "com.phonepe.app",                       // PhonePe
            "net.one97.paytm",                       // Paytm
            "in.org.npci.upiapp",                    // BHIM NPCI
            "com.dreamplug.androidapp",              // CRED
            "in.amazon.mShop.android.shopping",      // Amazon Pay
            "com.snapwork.hdfc",                     // HDFC Bank MobileBanking
            "com.sbi.lotusintouch",                  // SBI YONO
            "com.csam.icici.bank.imobile",           // ICICI iMobile
            "com.axis.mobile",                       // Axis Mobile
            "com.msf.kbank.mobile",                  // Kotak Mobile Banking
            "com.google.android.apps.messaging",     // Google Messages (Bank SMS)
            "com.samsung.android.messaging"          // Samsung Messages (Bank SMS)
    ));

    // Security Filter: Strictly reject OTPs, passwords, and sensitive codes
    private static final Pattern SENSITIVE_PATTERN = Pattern.compile(
            "\\b(otp|one[ -]time[ -]password|secret code|verification code|do not share|atm pin|upi pin|cvv|password)\\b",
            Pattern.CASE_INSENSITIVE
    );

    // Financial Indicators: Must contain currency or transaction verbs
    private static final Pattern FINANCIAL_PATTERN = Pattern.compile(
            "(₹|INR|Rs\\.?|debited|credited|paid to|sent to|received from|transfer|spent|withdrawn|refund)",
            Pattern.CASE_INSENSITIVE
    );

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        Context context = getApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean isTrackingEnabled = prefs.getBoolean(PREF_TRACKING_ENABLED, false);

        // Respect explicit user consent
        if (!isTrackingEnabled) {
            return;
        }

        String packageName = sbn.getPackageName();
        if (packageName == null) return;

        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;
        if (extras == null) return;

        CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigTextCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        CharSequence subTextCs = extras.getCharSequence(Notification.EXTRA_SUB_TEXT);

        String title = titleCs != null ? titleCs.toString() : "";
        String text = bigTextCs != null ? bigTextCs.toString() : (textCs != null ? textCs.toString() : "");
        String subText = subTextCs != null ? subTextCs.toString() : "";

        String combined = (title + " " + text + " " + subText).trim();
        if (combined.isEmpty()) return;

        // 1. PRIVACY & SECURITY GUARD: Immediately drop OTPs and PINs
        if (SENSITIVE_PATTERN.matcher(combined).find()) {
            return;
        }

        // 2. Package and Financial keyword verification
        boolean isSupportedApp = SUPPORTED_PACKAGES.contains(packageName);
        boolean hasFinancialKeywords = FINANCIAL_PATTERN.matcher(combined).find();

        if (!isSupportedApp && !hasFinancialKeywords) {
            return;
        }

        long postTime = sbn.getPostTime();
        if (postTime <= 0) postTime = System.currentTimeMillis();

        // 3. Dispatch to UpiTrackerPlugin bridge
        UpiTrackerPlugin.dispatchNotification(
                packageName,
                title,
                text,
                subText,
                postTime
        );
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // No action required on removal
    }
}
