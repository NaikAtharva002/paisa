import { NotificationPreference } from '../types';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'morning' | 'warning' | 'overspent' | 'evening' | 'bill' | 'system';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

const NOTIFICATIONS_KEY = 'paisa_in_app_notifications';

export function getNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) {
      return [
        {
          id: 'notif_1',
          title: '🌅 Good Morning, Atharva!',
          body: 'Your planned spending allowance today is ₹3,333.33. Make it count!',
          type: 'morning',
          timestamp: new Date().toISOString(),
          read: false,
        },
        {
          id: 'notif_2',
          title: '⚡ Internet Bill Reminder',
          body: 'ACT Fibernet broadband bill (₹1,150) is due in 3 days.',
          type: 'bill',
          timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
          read: true,
        }
      ];
    }
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveNotifications(notifs: AppNotification[]) {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));
  } catch (e) {
    console.error('Failed to save notifications', e);
  }
}

export function addNotification(notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
  const current = getNotifications();
  const newNotif: AppNotification = {
    ...notif,
    id: `notif_${Date.now()}`,
    timestamp: new Date().toISOString(),
    read: false,
  };
  saveNotifications([newNotif, ...current]);

  // If browser push is supported and permission granted, dispatch browser notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(notif.title, {
        body: notif.body,
        icon: '/favicon.ico',
      });
    } catch (e) {
      // Background notifications silent error fallback
    }
  }

  return newNotif;
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
