import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'ຢືນຢັນ',
  cancelLabel = 'ຍົກເລີກ',
  variant = 'primary',
  isBusy = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, isBusy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-lg space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {variant === 'danger' ? (
              <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
              </div>
            )}
            <div>
              <h3 id="confirm-dialog-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                {title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">{description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            aria-label="ປິດໜ້າຕ່າງຢືນຢັນ"
            className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="px-4 py-2 min-h-[42px] text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className={`px-4 py-2 min-h-[42px] text-sm font-semibold text-white rounded-lg transition-colors whitespace-nowrap ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'
                : 'bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-blue-400'
            }`}
          >
            {isBusy ? 'ກຳລັງດຳເນີນການ...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
