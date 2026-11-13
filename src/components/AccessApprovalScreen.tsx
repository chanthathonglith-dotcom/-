import React, { useState } from 'react';
import {
  Clock,
  LogOut,
  Send,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { AccessRequestRecord } from '../types/document';
import { SOLE_ADMIN_EMAIL, UserAccessGateState } from '../utils/accessControlLogic';
import { ThemeMode } from '../utils/themeLogic';
import { AppLogo } from './AppLogo';
import { ThemeToggleButton } from './ThemeToggleButton';

interface AccessApprovalScreenProps {
  userEmail: string;
  userDisplayName: string;
  userPhotoUrl: string;
  gateState: Exclude<UserAccessGateState, 'admin' | 'approved'>;
  existingRequest: AccessRequestRecord | null;
  isSubmitting: boolean;
  onSubmitRequest: (reason: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onEnterDemo: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const AccessApprovalScreen: React.FC<AccessApprovalScreenProps> = ({
  userEmail,
  userDisplayName,
  userPhotoUrl,
  gateState,
  existingRequest,
  isSubmitting,
  onSubmitRequest,
  onLogout,
  onEnterDemo,
  theme,
  onToggleTheme,
}) => {
  const [reason, setReason] = useState(existingRequest?.reason || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmitRequest(reason.trim());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'ບໍ່ສາມາດສົ່ງຄຳຂໍອະນຸມັດໄດ້ ກະລຸນາລອງໃໝ່'
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between px-4 py-8 sm:px-6 lg:px-8 transition-colors">
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-3 min-w-0">
          <AppLogo size="md" />
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
            ລະບົບຈັດການເອກະສານ
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggleButton theme={theme} onToggle={onToggleTheme} showLabel />
          <button
            type="button"
            onClick={onEnterDemo}
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-2 px-3 min-h-[40px]"
          >
            ທົດລອງໃຊ້ງານ
          </button>
        </div>
      </header>

      <main className="max-w-xl w-full mx-auto my-auto py-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-200 dark:border-slate-800">
            {userPhotoUrl ? (
              <img
                src={userPhotoUrl}
                alt={userDisplayName || userEmail}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">
                {(userDisplayName || userEmail || 'U').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {userDisplayName || 'ຜູ້ໃຊ້ງານ Google'}
              </div>
              <div className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400 truncate">
                {userEmail}
              </div>
            </div>
          </div>

          {gateState === 'unverified' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold">
                <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>ອີເມວຍັງບໍ່ໄດ້ຮັບການຢືນຢັນ</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                ກະລຸນາໃຊ້ບັນຊີ Google ທີ່ຢືນຢັນອີເມວແລ້ວ ເພື່ອຂໍສິດເຂົ້າໃຊ້ງານລະບົບ.
              </p>
            </div>
          ) : gateState === 'pending' ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-sm">
                  <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>ກຳລັງລໍຖ້າການອະນຸມັດຈາກ Admin</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                  ຄຳຂໍເຂົ້າໃຊ້ງານຂອງບັນຊີ <strong className="font-mono-tabular">{userEmail}</strong> ຖືກສົ່ງໄປຍັງ Admin (<strong className="font-mono-tabular">{SOLE_ADMIN_EMAIL}</strong>) ແລ້ວ. ໜ້າຈໍນີ້ຈະເປີດເຂົ້າລະບົບອັດຕະໂນມັດທັນທີເມື່ອ Admin ອະນຸມັດ.
                </p>
              </div>
              {existingRequest?.reason && (
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  ຂໍ້ຄວາມທີ່ສົ່ງ: <span className="text-slate-900 dark:text-slate-200 font-medium">{existingRequest.reason}</span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {gateState === 'rejected' ? (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold text-sm">
                    <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>ຄຳຂໍຖືກປະຕິເສດໂດຍ Admin</span>
                  </div>
                  <p className="text-xs text-red-700/90 dark:text-red-300/90">
                    {existingRequest?.adminNote
                      ? `ໝາຍເຫດຈາກ Admin: ${existingRequest.adminNote}`
                      : `ບັນຊີຂອງທ່ານຍັງບໍ່ໄດ້ຮັບອະນຸຍາດຈາກ ${SOLE_ADMIN_EMAIL}. ທ່ານສາມາດສົ່ງຄຳຂໍໃໝ່ໄດ້.`}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-semibold text-sm">
                    <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>ຕ້ອງຜ່ານການອະນຸມັດຈາກ Admin ກ່ອນເຂົ້າໃຊ້ງານ</span>
                  </div>
                  <p className="text-xs text-blue-900/90 dark:text-blue-200/90 leading-relaxed">
                    ສິດ Admin ຖືກກຳນົດໃຫ້ <strong className="font-mono-tabular">{SOLE_ADMIN_EMAIL}</strong> ຜູ້ດຽວ. ບັນຊີອື່ນຕ້ອງກົດສົ່ງຄຳຂໍອະນຸມັດກ່ອນຈຶ່ງຈະເຂົ້າໃຊ້ລະບົບໄດ້.
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="access-reason-input"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  ພາກສ່ວນ / ຕຳແໜ່ງ ຫຼື ເຫດຜົນການຂໍໃຊ້ງານ
                </label>
                <textarea
                  id="access-reason-input"
                  rows={3}
                  maxLength={300}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="ຕົວຢ່າງ: ພະນັກງານພະແນກບໍລິຫານ — ຂໍສິດບັນທຶກເອກະສານຂາເຂົ້າ-ຂາອອກ"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>{isSubmitting ? 'ກຳລັງສົ່ງຄຳຂໍ...' : 'ສົ່ງຄຳຂໍອະນຸມັດຈາກ Admin'}</span>
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Admin: <span className="font-mono-tabular">{SOLE_ADMIN_EMAIL}</span>
            </span>
            <button
              type="button"
              onClick={() => void onLogout()}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ອອກຈາກບັນຊີນີ້</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="max-w-3xl w-full mx-auto text-xs text-center text-slate-500 dark:text-slate-400">
        ລະບົບຄຸ້ມຄອງສິດການເຂົ້າເຖິງໂດຍ Admin ຜູ້ດຽວ ({SOLE_ADMIN_EMAIL})
      </footer>
    </div>
  );
};
