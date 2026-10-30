import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, RotateCcw } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  undoAction?: () => void;
  duration?: number;
}

// Global lightweight event dispatcher for toasts
type ToastListener = (toasts: ToastMessage[]) => void;
const listeners = new Set<ToastListener>();
let activeToasts: ToastMessage[] = [];

export function showToast(
  titleOrToast: string | Omit<ToastMessage, 'id'>,
  type: 'success' | 'error' | 'info' = 'info'
) {
  const toastObj: Omit<ToastMessage, 'id'> =
    typeof titleOrToast === 'string'
      ? { title: titleOrToast, type }
      : titleOrToast;

  const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const newToast: ToastMessage = {
    ...toastObj,
    id,
    duration: toastObj.duration ?? (toastObj.undoAction ? 6000 : 4000),
  };

  activeToasts = [...activeToasts, newToast];
  listeners.forEach(l => l(activeToasts));

  if (newToast.duration) {
    setTimeout(() => {
      dismissToast(id);
    }, newToast.duration);
  }
}

export const dismissToast = (id: string) => {
  activeToasts = activeToasts.filter(t => t.id !== id);
  listeners.forEach(l => l(activeToasts));
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>(activeToasts);

  useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map(toast => {
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto bg-[#181D26] text-white p-4 rounded-2xl shadow-xl border border-[#2A3241] flex items-start gap-3 animate-slide-up transition-all"
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#2E8B57]" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-[#E06D53]" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-[#D4952B]" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold leading-tight">{toast.title}</div>
              {toast.message && (
                <div className="text-[11px] text-slate-300 mt-0.5 leading-snug">{toast.message}</div>
              )}
            </div>

            {toast.undoAction && (
              <button
                type="button"
                onClick={() => {
                  toast.undoAction?.();
                  dismissToast(toast.id);
                }}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-[#2A3241] hover:bg-[#3B4556] text-[#F0D49C] text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Undo</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
