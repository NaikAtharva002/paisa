import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'N', desc: 'Add new expense or income' },
  { key: 'B', desc: 'Go to Budgets screen' },
  { key: 'G', desc: 'Go to Savings Goals screen' },
  { key: 'T', desc: 'Go to Transactions screen' },
  { key: 'R', desc: 'Go to Bills & Subscriptions screen' },
  { key: 'A', desc: 'Go to Accounts screen' },
  { key: 'S', desc: 'Go to Settings screen' },
  { key: 'Ctrl + K or /', desc: 'Open Unified Command Palette search' },
  { key: '?', desc: 'Show this keyboard shortcuts guide' },
  { key: 'Esc', desc: 'Close open modal or command palette' },
];

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#181D26]/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl border border-[#EDE8E0] shadow-2xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#EDE8E0] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#EDE8E0] flex items-center justify-center text-[#D4952B]">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#181D26]">Keyboard Shortcuts</h3>
              <p className="text-[11px] text-[#7F899F]">Speed up your daily financial workflow</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close shortcuts guide"
            className="p-1.5 rounded-lg text-[#7F899F] hover:text-[#181D26] hover:bg-[#FAF8F5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 py-1">
          {SHORTCUTS.map(sc => (
            <div key={sc.key} className="flex items-center justify-between text-xs py-1.5 border-b border-[#FAF8F5]">
              <span className="text-[#3D4658] font-medium">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded-lg bg-[#FAF8F5] border border-[#EDE8E0] font-mono text-[11px] font-bold text-[#181D26]">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center text-[11px] text-[#7F899F]">
          Press any shortcut key anywhere outside of text inputs.
        </div>
      </div>
    </div>
  );
};
