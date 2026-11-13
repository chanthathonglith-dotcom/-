import React from 'react';
import {
  LogOut,
  QrCode,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import { DocumentDirection, DocumentStats } from '../types/document';
import { AppLogo, ChannelEmblem } from './AppLogo';

export type NavSection =
  | 'all'
  | 'incoming'
  | 'outgoing'
  | 'legal'
  | 'speech'
  | 'pending'
  | 'analytics';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  stats: DocumentStats;
  isDemoMode: boolean;
  isSoleAdmin?: boolean;
  pendingApprovalsCount?: number;
  userEmail: string | null;
  userDisplayName: string | null;
  userPhotoUrl: string | null;
  onOpenSettings: () => void;
  onOpenQrScanner?: () => void;
  onOpenAdminApprovals?: () => void;
  onLogout: () => void;
  onRequestGoogleLogin: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  stats,
  isDemoMode,
  isSoleAdmin = false,
  pendingApprovalsCount = 0,
  userEmail,
  userDisplayName,
  userPhotoUrl,
  onOpenSettings,
  onOpenQrScanner,
  onOpenAdminApprovals,
  onLogout,
  onRequestGoogleLogin,
  mobileOpen,
  onCloseMobile,
}) => {
  const navItems: {
    id: NavSection;
    label: string;
    count: number;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'all',
      label: 'ເອກະສານທັງໝົດ',
      count: stats.total,
      icon: <ChannelEmblem direction="all" size="xs" />,
    },
    {
      id: 'incoming',
      label: 'ເອກະສານຂາເຂົ້າ',
      count: stats.incoming,
      icon: <ChannelEmblem direction={DocumentDirection.INCOMING} size="xs" />,
    },
    {
      id: 'outgoing',
      label: 'ເອກະສານຂາອອກ',
      count: stats.outgoing,
      icon: <ChannelEmblem direction={DocumentDirection.OUTGOING} size="xs" />,
    },
    {
      id: 'legal',
      label: 'ນິຕິກຳ',
      count: stats.legal,
      icon: <ChannelEmblem direction={DocumentDirection.LEGAL} size="xs" />,
    },
    {
      id: 'speech',
      label: 'ບົດໂອ້ລົມ',
      count: stats.speech,
      icon: <ChannelEmblem direction={DocumentDirection.SPEECH} size="xs" />,
    },
    {
      id: 'pending',
      label: 'ລໍຖ້າ / ກຳລັງດຳເນີນການ',
      count: stats.pendingAction,
      icon: <ChannelEmblem direction="pending" size="xs" />,
    },
    {
      id: 'analytics',
      label: 'ສະຖິຕິ & ກຣາຟລາຍເດືອນ',
      count: stats.total,
      icon: <ChannelEmblem direction="analytics" size="xs" />,
    },
  ];

  const handleNavClick = (section: NavSection) => {
    onSelectSection(section);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-64">
      <div className="px-5 h-16 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <AppLogo size="sm" />
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
            ຄຸ້ມຄອງເອກະສານ
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="ປິດເມນູດ້ານຂ້າງ"
          className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="ເມນູຫຼັກ">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 min-h-[42px] rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                {item.icon}
                <span className="truncate">{item.label}</span>
              </span>
              <span
                className={`text-xs font-mono-tabular pl-2 ${
                  isActive
                    ? 'text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}

        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
          {onOpenQrScanner && (
            <button
              type="button"
              onClick={() => {
                onOpenQrScanner();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[42px] rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <QrCode className="w-4 h-4 shrink-0 text-blue-700 dark:text-blue-400" aria-hidden="true" />
              <span className="truncate">ສະແກນ QR ເອກະສານ</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[42px] rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="truncate">ຕັ້ງຄ່າ Sheets, Excel &amp; Drive D:</span>
          </button>

          {isSoleAdmin && onOpenAdminApprovals && (
            <button
              type="button"
              onClick={() => {
                onOpenAdminApprovals();
                onCloseMobile();
              }}
              data-testid="sidebar-admin-approvals-btn"
              className="w-full flex items-center justify-between px-3 py-2.5 min-h-[42px] rounded-lg text-sm font-medium text-blue-800 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
            >
              <span className="flex items-center gap-2.5 truncate">
                <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">ອະນຸມັດຜູ້ໃຊ້ (Admin)</span>
              </span>
              {pendingApprovalsCount > 0 && (
                <span className="text-xs font-mono-tabular font-bold text-amber-700 dark:text-amber-300 pl-2">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
        {isDemoMode ? (
          <div className="space-y-2.5">
            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <div className="font-semibold text-slate-900 dark:text-slate-100">ໂໝດທົດລອງໃຊ້ງານ</div>
              <div>ຂໍ້ມູນຕົວຢ່າງຢູ່ໃນເຄື່ອງ</div>
            </div>
            <button
              type="button"
              onClick={onRequestGoogleLogin}
              className="w-full min-h-[40px] px-3 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
            >
              ເຊື່ອມຕໍ່ບັນຊີ Google
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              {userPhotoUrl ? (
                <img
                  src={userPhotoUrl}
                  alt={userDisplayName || 'ຮູບໂປຣໄຟລ໌'}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-semibold text-xs flex items-center justify-center shrink-0">
                  {(userDisplayName || userEmail || 'U').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {userDisplayName || 'ຜູ້ໃຊ້ງານ'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>ອອກຈາກລະບົບ</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex lg:shrink-0">{sidebarContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 dark:bg-black/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-50 flex h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
