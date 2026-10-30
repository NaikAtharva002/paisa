import React, { useState, useEffect } from 'react';
import {
  getNotifications,
  saveNotifications,
  AppNotification,
  requestBrowserNotificationPermission,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  evaluateFinancialTriggers,
} from '../../lib/notifications';
import { store } from '../../lib/storage';
import { Bell, Check, Trash2, Send, Sparkles, AlertTriangle, Calendar, CheckCircle2, ShieldCheck, X } from 'lucide-react';

interface NotificationCenterProps {
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [permGranted, setPermGranted] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  useEffect(() => {
    // Run real-time financial triggers evaluation upon opening notification center
    const txs = store.getTransactions();
    const profile = store.getProfile();
    const recurring = store.getRecurringPayments();
    const prefs = store.getNotificationPreferences();

    evaluateFinancialTriggers({
      transactions: txs,
      profile,
      recurringPayments: recurring,
      preferences: prefs,
    });

    setNotifications(getNotifications());
  }, []);

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
    setNotifications(getNotifications());
  };

  const handleClearAll = () => {
    clearAllNotifications();
    setNotifications([]);
  };

  const handleMarkItemRead = (id: string) => {
    markNotificationAsRead(id);
    setNotifications(getNotifications());
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(id);
    setNotifications(getNotifications());
  };

  const handleEnableBrowserPush = async () => {
    const ok = await requestBrowserNotificationPermission();
    setPermGranted(ok);
    if (ok) {
      addNotification({
        title: '🔔 Browser Notifications Enabled',
        body: 'You will receive timely budget allowances and bill reminders right on your device.',
        type: 'system',
      });
      setNotifications(getNotifications());
    }
  };

  const handleSendTestNotification = () => {
    addNotification({
      title: '⚡ Budget Warning (80% Used)',
      body: "You've used 80% of today's spending allowance. Easy on quick-commerce orders tonight!",
      type: 'warning',
    });
    setNotifications(getNotifications());
  };

  const getTypeIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'overspent':
        return <AlertTriangle className="w-3.5 h-3.5 text-[#E06D53]" />;
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-[#D4952B]" />;
      case 'bill':
        return <Calendar className="w-3.5 h-3.5 text-[#8B5CF6]" />;
      case 'morning':
      case 'evening':
        return <Sparkles className="w-3.5 h-3.5 text-[#2E8B57]" />;
      case 'system':
      default:
        return <ShieldCheck className="w-3.5 h-3.5 text-[#3B82F6]" />;
    }
  };

  return (
    <div className="space-y-4 text-[#181D26]">
      <div className="flex items-center justify-between">
        <div className="text-xs text-[#7F899F]">
          Timely reminders and automated financial reality checks.
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-[#2E8B57] hover:underline font-bold"
          >
            Mark all read
          </button>
          <button
            onClick={handleClearAll}
            className="text-xs text-[#E06D53] hover:underline font-medium"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Browser Notification Permission Banner */}
      {!permGranted && (
        <div className="p-3.5 rounded-2xl bg-[#F0F7F3] border border-[#CDE5D7] flex items-center justify-between gap-2">
          <div className="text-xs text-[#1E5C39]">
            Enable browser push for morning allowance and bill payment reminders?
          </div>
          <button
            onClick={handleEnableBrowserPush}
            className="px-3 py-1.5 rounded-xl bg-[#2E8B57] text-white font-bold text-xs shrink-0 shadow-xs"
          >
            Enable
          </button>
        </div>
      )}

      {/* Notifications list */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#7F899F] space-y-1">
            <CheckCircle2 className="w-8 h-8 mx-auto text-[#2E8B57] mb-2" />
            <div className="font-bold text-[#181D26]">All Caught Up!</div>
            <p className="text-slate-500">No active alerts or reminders right now.</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => handleMarkItemRead(n.id)}
              className={`p-3.5 rounded-2xl border text-xs space-y-1 transition-all cursor-pointer ${
                n.read
                  ? 'bg-[#FAF8F5] border-[#EDE8E0] text-[#7F899F]'
                  : 'bg-white border-[#D4952B]/40 text-[#181D26] shadow-xs ring-1 ring-[#D4952B]/20'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-[#181D26]">
                <span className="flex items-center gap-1.5">
                  {getTypeIcon(n.type)}
                  <span>{n.title}</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#7F899F] font-normal">
                    {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={e => handleDeleteItem(n.id, e)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    title="Dismiss alert"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
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
          <span>Send test 80% warning</span>
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
