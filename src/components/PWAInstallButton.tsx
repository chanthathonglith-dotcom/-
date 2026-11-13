import React, { useState } from 'react';
import { Download, MonitorDown, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'inline';
  onInstalled?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  onInstalled,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted && onInstalled) {
      onInstalled();
    }
  };

  if (isInstallable) {
    if (variant === 'inline') {
      return (
        <button
          type="button"
          onClick={handleInstall}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/70 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors whitespace-nowrap"
        >
          <MonitorDown className="w-3.5 h-3.5" aria-hidden="true" />
          <span>ຕິດຕັ້ງແອັບ Desktop</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleInstall}
        aria-label="ຕິດຕັ້ງແອັບລົງເຄື່ອງ"
        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors whitespace-nowrap"
      >
        <Download className="w-3.5 h-3.5" aria-hidden="true" />
        <span>ຕິດຕັ້ງແອັບ</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
        >
          <Share className="w-3.5 h-3.5" aria-hidden="true" />
          <span>ຕິດຕັ້ງເທິງ iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 id="ios-install-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                  ຕິດຕັ້ງເທິງ iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="ປິດຄຳແນະນຳການຕິດຕັ້ງ"
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <ol className="text-sm text-slate-600 dark:text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>
                  ກົດປຸ່ມ <strong className="text-slate-900 dark:text-slate-100">Share (ແບ່ງປັນ)</strong> ຢູ່ແຖບດ້ານລຸ່ມຂອງ Safari
                </li>
                <li>
                  ເລື່ອນລົງແລ້ວເລືອກ{' '}
                  <strong className="text-slate-900 dark:text-slate-100">Add to Home Screen (ເພີ່ມໃສ່ໜ້າຈໍຫຼັກ)</strong>
                </li>
                <li>ເປີດແອັບຈາກໜ້າຈໍຫຼັກເພື່ອຮັບການແຈ້ງເຕືອນເທິງໜ້າຈໍລັອກ</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 py-2.5 text-xs font-semibold text-white transition-colors"
              >
                ເຂົ້າໃຈແລ້ວ
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
