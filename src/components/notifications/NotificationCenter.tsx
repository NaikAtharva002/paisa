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
    <div className="space-y-4 text-[#181D26]">
      <div className="flex items-center justify-between">
        <div className="text-xs text-[#7F899F]">
          Timely reminders and daily reality check alerts.
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-[#2E8B57] hover:underline font-bold"
          >
            Mark read
          </button>
          <button
            onClick={handleClearAll}
            className="text-xs text-[#E06D53] hover:underline font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Browser Notification Banner */}
      {!permGranted && (
        <div className="p-3.5 rounded-2xl bg-[#F0F7F3] border border-[#CDE5D7] flex items-center justify-between gap-2">
          <div className="text-xs text-[#1E5C39]">
            Enable push notifications for morning allowance and bill alerts?
          </div>
          <button
            onClick={handleEnableBrowserPush}
            className="px-3 py-1.5 rounded-xl bg-[#2E8B57] text-white font-bold text-xs flex-shrink-0 shadow-sm"
          >
            Enable
          </button>
        </div>
      )}

      {/* Notifications list */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#7F899F]">
            No notifications yet. You're all caught up!
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`p-3.5 rounded-2xl border text-xs space-y-1 transition-all ${
                n.read
                  ? 'bg-[#FAF8F5] border-[#EDE8E0] text-[#7F899F]'
                  : 'bg-white border-[#D4952B]/40 text-[#181D26] shadow-sm ring-1 ring-[#D4952B]/20'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[#181D26]">
                <span className="flex items-center gap-1.5">{n.title}</span>
                <span className="text-[10px] text-[#7F899F] font-normal">
                  {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-[#3D4658] leading-relaxed">{n.body}</p>
            </div>
          ))
        )}
      </div>

      {/* Send Test Alert button & Close */}
      <div className="pt-3 border-t border-[#EDE8E0] flex justify-between items-center">
        <button
          onClick={handleSendTestNotification}
          className="text-xs text-[#7F899F] hover:text-[#181D26] flex items-center gap-1.5 font-medium"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send test 80% budget warning</span>
        </button>
        <button
          onClick={onClose}
          className="btn-secondary text-xs"
        >
          Close
        </button>
      </div>
    </div>
  );
};
