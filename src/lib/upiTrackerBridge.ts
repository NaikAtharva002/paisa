import { Capacitor } from '@capacitor/core';
import { store } from './storage';
import {
  parseUpiNotification,
  RawNotificationPayload,
  ParsedNotificationResult,
} from './upiNotificationParser';
import { Transaction } from '../types';
import { showToast } from '../components/common/Toast';
import { formatINR } from './calculations';

export interface TrackingStatus {
  isAndroidNative: boolean;
  isTrackingEnabled: boolean;
  permissionGranted: boolean;
  lastProcessedNotification?: string;
  lastProcessedTime?: number;
  detectedCount: number;
  supportedApps: string[];
}

const PREF_TRACKING_KEY = 'paisa_upi_tracking_enabled';
const PREF_LAST_NOTIF_KEY = 'paisa_upi_last_notification';
const PREF_LAST_TIME_KEY = 'paisa_upi_last_time';
const PREF_COUNT_KEY = 'paisa_upi_detected_count';

export const SUPPORTED_UPI_APPS = [
  'Google Pay',
  'PhonePe',
  'Paytm',
  'BHIM NPCI',
  'CRED',
  'Amazon Pay',
  'HDFC Bank',
  'SBI Yono',
  'ICICI iMobile',
  'Axis Mobile',
  'Kotak Bank',
  'Bank SMS Alerts',
];

export const upiTrackerBridge = {
  isNativeAndroid(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  },

  async checkPermission(): Promise<boolean> {
    if (this.isNativeAndroid()) {
      try {
        const plugin = (Capacitor as any).Plugins?.UpiTrackerPlugin;
        if (plugin) {
          const res = await plugin.isPermissionGranted();
          return !!res?.granted;
        }
      } catch (err) {
        console.warn('Native permission check fallback:', err);
      }
    }
    // Web / Simulated platform: Check local preference
    return localStorage.getItem('paisa_upi_permission_simulated') === 'true';
  },

  async openPermissionSettings(): Promise<boolean> {
    if (this.isNativeAndroid()) {
      try {
        const plugin = (Capacitor as any).Plugins?.UpiTrackerPlugin;
        if (plugin) {
          await plugin.openPermissionSettings();
          return true;
        }
      } catch (err) {
        console.warn('Could not open Android settings:', err);
      }
    }
    // Simulation mode for Web
    localStorage.setItem('paisa_upi_permission_simulated', 'true');
    return true;
  },

  isTrackingEnabled(): boolean {
    return localStorage.getItem(PREF_TRACKING_KEY) === 'true';
  },

  async setTrackingEnabled(enabled: boolean): Promise<boolean> {
    localStorage.setItem(PREF_TRACKING_KEY, enabled ? 'true' : 'false');

    if (this.isNativeAndroid()) {
      try {
        const plugin = (Capacitor as any).Plugins?.UpiTrackerPlugin;
        if (plugin) {
          await plugin.setTrackingEnabled({ enabled });
        }
      } catch (err) {
        console.warn('Native setTrackingEnabled fallback:', err);
      }
    }

    return enabled;
  },

    getStatus(): TrackingStatus {
    const isNative = this.isNativeAndroid();
    const isEnabled = this.isTrackingEnabled();
    const lastNotif = typeof localStorage !== 'undefined' ? localStorage.getItem(PREF_LAST_NOTIF_KEY) || undefined : undefined;
    const lastTimeStr = typeof localStorage !== 'undefined' ? localStorage.getItem(PREF_LAST_TIME_KEY) : null;
    const lastTime = lastTimeStr ? Number(lastTimeStr) : undefined;
    const countStr = typeof localStorage !== 'undefined' ? localStorage.getItem(PREF_COUNT_KEY) : null;
    const detectedCount = countStr ? Number(countStr) : 0;

    return {
      isAndroidNative: isNative,
      isTrackingEnabled: isEnabled,
      permissionGranted: typeof localStorage !== 'undefined' && localStorage.getItem('paisa_upi_permission_simulated') === 'true',
      lastProcessedNotification: lastNotif,
      lastProcessedTime: lastTime,
      detectedCount,
      supportedApps: SUPPORTED_UPI_APPS,
    };
  },

  async getTrackingStatus(): Promise<TrackingStatus> {
    const isNative = this.isNativeAndroid();
    const isEnabled = this.isTrackingEnabled();
    const permissionGranted = await this.checkPermission();
    const lastNotif = localStorage.getItem(PREF_LAST_NOTIF_KEY) || undefined;
    const lastTimeStr = localStorage.getItem(PREF_LAST_TIME_KEY);
    const lastTime = lastTimeStr ? Number(lastTimeStr) : undefined;
    const countStr = localStorage.getItem(PREF_COUNT_KEY);
    const detectedCount = countStr ? Number(countStr) : 0;

    return {
      isAndroidNative: isNative,
      isTrackingEnabled: isEnabled,
      permissionGranted,
      lastProcessedNotification: lastNotif,
      lastProcessedTime: lastTime,
      detectedCount,
      supportedApps: SUPPORTED_UPI_APPS,
    };
  },

  // --------------------------------------------------------------------
  // Core Processing Pipeline
  // Connects extracted notifications into the transaction repository
  // --------------------------------------------------------------------
  processNotification(payload: RawNotificationPayload): {
    result: ParsedNotificationResult;
    transactionCreated?: Transaction;
  } {
    // Check consent: If tracking is disabled, drop immediately
    if (!this.isTrackingEnabled()) {
      return {
        result: {
          isSensitive: false,
          isFinancial: false,
          status: 'ignored_unrelated',
          reason: 'Automatic tracking is disabled by the user.',
          sourceApp: payload.packageName || 'Unknown',
        },
      };
    }

    const existingTxs = store.getTransactions();
    const people = store.getPeople();
    const result = parseUpiNotification(payload, existingTxs, people);

    // Update tracking stats
    const summary = `${payload.title}: ${payload.text}`;
    localStorage.setItem(PREF_LAST_NOTIF_KEY, summary);
    localStorage.setItem(PREF_LAST_TIME_KEY, String(Date.now()));

    // If duplicate detected or sensitive or unrelated: do not save transaction
    if (result.isDuplicate || result.status !== 'success' || !result.extracted) {
      return { result };
    }

    const ext = result.extracted;
    const currentCount = Number(localStorage.getItem(PREF_COUNT_KEY) || 0) + 1;
    localStorage.setItem(PREF_COUNT_KEY, String(currentCount));

    // Persist into store and IndexedDB / Outbox repository
    const newTx = store.addTransaction({
      user_id: store.getActiveUserId(),
      transaction_date: `${ext.date}T${new Date().toTimeString().slice(0, 8)}`,
      merchant: ext.merchant,
      description: ext.rawDescription,
      amount: ext.amount,
      transaction_type: ext.direction,
      category_id: ext.categoryId,
      payment_method: 'UPI',
      external_transaction_id: ext.refId,
      notes: `Captured via ${result.sourceApp} notification tracking.`,
      is_unplanned: ext.confidenceTier === 'needs_review',
    });

    showToast({
      type: 'success',
      title: 'UPI Transaction Detected',
      message: `${ext.merchant}: ${formatINR(ext.amount)} (${result.sourceApp})`,
    });

    return { result, transactionCreated: newTx };
  },

  // --------------------------------------------------------------------
  // Listener Lifecycle
  // --------------------------------------------------------------------
  init(): void {
    if (this.isNativeAndroid()) {
      try {
        const plugin = (Capacitor as any).Plugins?.UpiTrackerPlugin;
        if (plugin?.addListener) {
          plugin.addListener('notificationDetected', (data: RawNotificationPayload) => {
            this.processNotification(data);
          });
        }
      } catch (err) {
        console.warn('Could not register native notification listener:', err);
      }
    }
  },
};
