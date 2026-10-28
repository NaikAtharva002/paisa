import React, { useState } from 'react';
import {
  getNotifications,
  saveNotifications,
  AppNotification,
  requestBrowserNotificationPermission,
  addNotification,
} from '../../lib/notifications';
import { Bell, Check, Trash2, Send, Sparkles, AlertTriangle, Calendar } from 'lucide-react';

interface NotificationCenterProps {
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(getNotifications());
  const [permGranted, setPermGranted] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const handleClearAll = () => {
    setNotifications([]);
    saveNotifications([]);
  };

  const handleEnableBrowserPush = async () => {
    const ok = await requestBrowserNotificationPermission();
    setPermGranted(ok);
    if (ok) {
      addNotification({
        title: '🔔 Browser Notifications Enabled!',
        body: 'You will now receive morning budget allowances and nightly reality checks right here.',
        type: 'system',
      });
      setNotifications(getNotifications());
    }
  };

  const handleSendTestNotification = () => {
    const newNotif = addNotification({
      title: '⚠️ Budget Warning (80% Used)',
      body: "You've used ₹2,666 of today's ₹3,333 budget. Easy on dinner orders!",
      type: 'warning',
    });
    setNotifications(getNotifications());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400">
          Stay on track with timely reminders and reality checks.
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Mark read
          </button>
          <button
            onClick={handleClearAll}
            className="text-xs text-slate-400 hover:text-red-400"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Browser Notification Banner */}
      {!permGranted && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2">
          <div className="text-xs text-emerald-300">
            Enable browser notifications for morning allowances and bill warnings?
          </div>
          <button
            onClick={handleEnableBrowserPush}
            className="px-3 py-1 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex-shrink-0"
          >
            Enable
          </button>
        </div>
      )}

      {/* Notifications list */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No notifications yet. You're all caught up!
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`p-3 rounded-2xl border text-xs space-y-1 transition-all ${
                n.read
                  ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                  : 'bg-slate-900 border-slate-700/80 text-slate-200 ring-1 ring-emerald-500/20'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-slate-100">
                <span className="flex items-center gap-1.5">{n.title}</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-slate-300">{n.body}</p>
            </div>
          ))
        )}
      </div>

      {/* Send Test Alert button */}
      <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
        <button
          onClick={handleSendTestNotification}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send test 80% budget warning</span>
        </button>
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
};
