import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmModal({
  isOpen, title, message,
  confirmLabel = '確認', cancelLabel = '取消',
  onConfirm, onCancel, danger = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
         role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      {/* Sheet */}
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-slideUp sm:animate-fadeIn"
           style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <button onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition cursor-pointer">
          <X className="h-4 w-4 text-slate-500" />
        </button>

        <div className="flex items-start gap-4 mb-5">
          <div className={`p-3 rounded-2xl shrink-0 ${danger ? 'bg-rose-100' : 'bg-amber-100'}`}>
            <AlertTriangle className={`h-5 w-5 ${danger ? 'text-rose-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button onClick={onConfirm}
            className={`w-full py-3 rounded-2xl text-sm font-extrabold transition active:scale-95 cursor-pointer ${
              danger
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-emerald-800 hover:bg-emerald-700 text-white'
            }`}>
            {confirmLabel}
          </button>
          <button onClick={onCancel}
            className="w-full py-3 rounded-2xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 cursor-pointer">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
