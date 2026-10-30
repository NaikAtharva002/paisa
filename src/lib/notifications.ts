import { NotificationPreference, Transaction, FinancialProfile, RecurringPayment } from '../types';
import {
  calculateDailyReport,
  getEffectiveDailyBudget,
  formatINR,
} from './calculations';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'morning' | 'warning' | 'overspent' | 'evening' | 'bill' | 'system';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  dedupKey?: string; // Unique key to prevent spamming duplicate alerts on the same day
}

const NOTIFICATIONS_KEY = 'paisa_in_app_notifications';

export function getNotifications(): AppNotification[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveNotifications(notifs: AppNotification[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));
  } catch (e) {
    console.error('Failed to save notifications', e);
  }
}

export function addNotification(
  notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>
): AppNotification | null {
  const current = getNotifications();

  // Deduplication check: Do not re-add if a notification with identical dedupKey exists
  if (notif.dedupKey && current.some(n => n.dedupKey === notif.dedupKey)) {
    return null;
  }

  const newNotif: AppNotification = {
    ...notif,
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    read: false,
  };

  saveNotifications([newNotif, ...current].slice(0, 100)); // Cap at 100 entries

  // If browser push is supported and permission granted, dispatch browser notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(notif.title, {
        body: notif.body,
        icon: '/favicon.ico',
      });
    } catch (e) {
      // Silent error fallback
    }
  }

  return newNotif;
}

export function markNotificationAsRead(id: string): void {
  const current = getNotifications();
  const updated = current.map(n => (n.id === id ? { ...n, read: true } : n));
  saveNotifications(updated);
}

export function markAllNotificationsAsRead(): void {
  const current = getNotifications();
  const updated = current.map(n => ({ ...n, read: true }));
  saveNotifications(updated);
}

export function deleteNotification(id: string): void {
  const current = getNotifications();
  saveNotifications(current.filter(n => n.id !== id));
}

export function clearAllNotifications(): void {
  saveNotifications([]);
}

/**
 * Checks whether the current time falls within user-configured quiet hours.
 */
export function isWithinQuietHours(
  preferences: NotificationPreference,
  currentTime = new Date()
): boolean {
  if (!preferences.quiet_hours_enabled) return false;

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  const [startH, startM] = (preferences.quiet_hours_start || '22:00').split(':').map(Number);
  const [endH, endM] = (preferences.quiet_hours_end || '07:00').split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Overnight span (e.g. 22:00 to 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  // Same day span (e.g. 13:00 to 15:00)
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

export interface FinancialTriggerParams {
  transactions: Transaction[];
  profile: FinancialProfile;
  recurringPayments: RecurringPayment[];
  preferences: NotificationPreference;
  currentDate?: Date;
}

/**
 * Evaluates real-time financial triggers and automatically generates actionable in-app notifications.
 */
export function evaluateFinancialTriggers(params: FinancialTriggerParams): AppNotification[] {
  const now = params.currentDate || new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayStr = now.toISOString().slice(0, 10);
  const generated: AppNotification[] = [];

  // If within quiet hours, defer non-critical alerts
  if (isWithinQuietHours(params.preferences, now)) {
    return generated;
  }

  // 1. Daily Budget Pacing & Overrun Trigger
  const todayTransactions = params.transactions.filter(
    t => t.transaction_date.slice(0, 10) === todayStr
  );
  const dailyBudget = getEffectiveDailyBudget(params.profile, year, month);
  const report = calculateDailyReport(
    dailyBudget,
    todayTransactions,
    todayStr,
    dailyBudget,
    params.preferences.preferred_tone
  );

  const warningPct = params.preferences.warning_threshold || 70;

  if (report.percentUsed > 100) {
    const notif = addNotification({
      title: '🚨 Daily Budget Exceeded',
      body: `You've spent ${formatINR(report.actualSpending)} today (${report.percentUsed}%), exceeding your daily limit by ${formatINR(report.overspending)}.`,
      type: 'overspent',
      dedupKey: `overspent_${todayStr}`,
    });
    if (notif) generated.push(notif);
  } else if (report.percentUsed >= warningPct) {
    const notif = addNotification({
      title: '⚡ Daily Budget Pacing Alert',
      body: `You have consumed ${report.percentUsed}% (${formatINR(report.actualSpending)}) of your ${formatINR(report.dailyBudget)} daily allowance.`,
      type: 'warning',
      dedupKey: `warning_${todayStr}`,
    });
    if (notif) generated.push(notif);
  }

  // 2. Upcoming Recurring Bills Trigger (Due in <= 3 calendar days)
  for (const bill of params.recurringPayments) {
    if (!bill.is_active) continue;

    const dueDate = new Date(bill.next_due_date);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 3) {
      const dayLabel = diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`;
      const notif = addNotification({
        title: `📅 Upcoming Bill: ${bill.name}`,
        body: `${bill.name} (${formatINR(bill.amount)}) is scheduled for payment ${dayLabel} (${bill.next_due_date}).`,
        type: 'bill',
        dedupKey: `bill_${bill.id}_${bill.next_due_date}`,
      });
      if (notif) generated.push(notif);
    }
  }

  return generated;
}

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }

  return false;
}
