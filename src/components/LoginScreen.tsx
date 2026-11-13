import React from 'react';
import { FileSpreadsheet, FolderLock, SearchCheck, ShieldCheck } from 'lucide-react';
import { ThemeMode } from '../utils/themeLogic';
import { AppLogo } from './AppLogo';
import { GoogleSignInButton } from './GoogleSignInButton';
import { ThemeToggleButton } from './ThemeToggleButton';

interface LoginScreenProps {
  onGoogleLogin: () => void;
  onEnterDemo: () => void;
  isLoggingIn: boolean;
  errorMessage: string | null;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onGoogleLogin,
  onEnterDemo,
  isLoggingIn,
  errorMessage,
  theme,
  onToggleTheme,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between px-4 py-8 sm:px-6 lg:px-8 transition-colors">
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-3 min-w-0">
          <AppLogo size="md" />
          <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
            ລະບົບຈັດການເອກະສານ
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggleButton theme={theme} onToggle={onToggleTheme} showLabel />
          <button
            type="button"
            onClick={onEnterDemo}
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline-offset-4 hover:underline whitespace-nowrap py-2 px-3 min-h-[40px]"
          >
            ທົດລອງໃຊ້ງານ (Demo)
          </button>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto my-auto py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="text-sm font-medium text-blue-700 dark:text-blue-400">
            ຄຸ້ມຄອງເອກະສານຂາເຂົ້າ - ຂາອອກ ແລະ ຟາຍສະແກນ
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 leading-snug text-balance">
            ຈັດລະບຽບເອກະສານຂາເຂົ້າ-ຂາອອກ ແລະ ຕິດຕາມຄຳເຫັນຂອງການນຳໃນບ່ອນດຽວ
          </h1>

          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
            ບັນທຶກເລກທີ, ວັນທີ, ພາກສ່ວນສົ່ງມາ, ຈຸດປະສົງ ແລະ ສະຖານະການຕິດຕາມຢ່າງເປັນລະບົບ.
            ຂໍ້ມູນທັງໝົດຖືກຈັດເກັບໄວ້ໃນ Google Sheets ແລະ ຟາຍສະແກນຖືກເກັບຮັກສາຢ່າງປອດໄພໃນ Google Drive ຂອງບັນຊີທ່ານເອງ.
          </p>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 border-t border-slate-200 dark:border-slate-800">
            <div className="pt-4 flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">ບັນທຶກໃນ Google Sheets</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  ຊິ້ງຂໍ້ມູນແບບທັນທີ, ຄົ້ນຫາລະອຽດ ແລະ ສົ່ງອອກເປັນໄຟລ໌ CSV ໄດ້ທຸກເວລາ.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-start gap-3">
              <FolderLock className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">ເກັບຟາຍສະແກນໃນ Google Drive</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  ອັບໂຫຼດ PDF ຫຼື ຮູບພາບສະແກນແລ້ວເຊື່ອມລິ້ງກັບທະບຽນເອກະສານໂດຍອັດຕະໂນມັດ.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-start gap-3">
              <SearchCheck className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">ຕິດຕາມສະຖານະ &amp; ຄຳເຫັນ</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  ແຍກຕາມຈຸດປະສົງ ຂໍຄຳເຫັນ, ຂໍລາຍເຊັນ, ຂໍທິດຊີ້ນຳ ແລະ ເພື່ອຊາບ.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">ປອດໄພດ້ວຍ Google Account</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  ໃຊ້ສິດເຂົ້າເຖິງສະເພາະໄຟລ໌ຂອງແອັບເທົ່ານັ້ນ ບໍ່ເກັບລະຫັດຜ່ານໄວ້ໃນເຄື່ອງ.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">ເຂົ້າສູ່ລະບົບເພື່ອເລີ່ມຕົ້ນ</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                ກະລຸນາເຂົ້າສູ່ລະບົບດ້ວຍບັນຊີ Google ເພື່ອເຊື່ອມຕໍ່ Google Sheets ແລະ Google Drive ຂອງທ່ານ.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-lg p-3.5 text-sm text-red-700 dark:text-red-300"
              >
                {errorMessage}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-center sm:justify-start">
                <GoogleSignInButton
                  onClick={onGoogleLogin}
                  loading={isLoggingIn}
                  label="ເຂົ້າສູ່ລະບົບດ້ວຍ Google"
                />
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                <span className="shrink mx-3 text-xs text-slate-400 dark:text-slate-500">ຫຼື</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              </div>

              <button
                type="button"
                onClick={onEnterDemo}
                className="w-full min-h-[44px] px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                ເຂົ້າເບິ່ງຕົວຢ່າງການໃຊ້ງານ (Demo Mode)
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              ໝາຍເຫດ: ໃນໂໝດ Demo ຂໍ້ມູນຈະຖືກຈຳລອງໄວ້ໃນເຄື່ອງຊົ່ວຄາວ. ເພື່ອບັນທຶກຂໍ້ມູນຈິງໃສ່ Google Sheets ແລະ Drive ກະລຸນາເຂົ້າສູ່ລະບົບດ້ວຍ Google.
            </p>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl w-full mx-auto pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span>ລະບົບຄຸ້ມຄອງເອກະສານຂາເຂົ້າ-ຂາອອກ</span>
        <span>ຮອງຮັບຄອມພິວເຕີ, ແທັບເລັດ ແລະ ມືຖື</span>
      </footer>
    </div>
  );
};
