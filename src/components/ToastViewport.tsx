import React from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import { ToastItem, ToastVariant } from '../utils/toastLogic';

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const VARIANT_STYLES: Record<
  ToastVariant,
  {
    borderClass: string;
    icon: React.ReactNode;
    accentBarClass: string;
  }
> = {
  loading: {
    borderClass: 'border-blue-200 dark:border-blue-900/70',
    icon: <Loader2 className="w-4 h-4 text-blue-700 dark:text-blue-400 animate-spin shrink-0" aria-hidden="true" />,
    accentBarClass: 'bg-blue-600 dark:bg-blue-500',
  },
  success: {
    borderClass: 'border-emerald-200 dark:border-emerald-900/70',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />,
    accentBarClass: 'bg-emerald-600 dark:bg-emerald-500',
  },
  error: {
    borderClass: 'border-red-200 dark:border-red-900/70',
    icon: <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0" aria-hidden="true" />,
    accentBarClass: 'bg-red-600 dark:bg-red-500',
  },
  info: {
    borderClass: 'border-slate-200 dark:border-slate-700',
    icon: <Info className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />,
    accentBarClass: 'bg-blue-600 dark:bg-blue-500',
  },
};

export const ToastViewport: React.FC<ToastViewportProps> = ({ toasts, onDismiss }) => {
  return (
    <MotionConfig reducedMotion="user">
      <div
        data-testid="toast-viewport"
        aria-label="ການແຈ້ງເຕືອນສະຖານະ"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:bottom-5 z-50 flex flex-col gap-2.5 sm:w-full sm:max-w-sm pointer-events-none"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {toasts.map((toast) => {
            const style = VARIANT_STYLES[toast.variant];
            return (
              <motion.div
                key={toast.id}
                layout
                data-testid={`toast-item-${toast.variant}`}
                role={toast.variant === 'error' ? 'alert' : 'status'}
                aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className={`pointer-events-auto relative overflow-hidden bg-white dark:bg-slate-900 border ${style.borderClass} rounded-xl shadow-lg px-4 py-3 flex items-start gap-3`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-0 bottom-0 w-1 ${style.accentBarClass}`}
                />
                <div className="pt-0.5 pl-1">{style.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                    {toast.title}
                  </p>
                  {toast.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed break-words">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDismiss(toast.id)}
                  aria-label="ປິດການແຈ້ງເຕືອນ"
                  className="p-1 -mr-1 -mt-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-md min-w-[28px] min-h-[28px] flex items-center justify-center shrink-0 transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
};
