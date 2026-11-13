import React, { useEffect } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  CalendarClock,
  CheckCheck,
  FileSpreadsheet,
  Lock,
  MonitorSmartphone,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { BrowserPermissionState } from '../services/browserNotifications';
import {
  AppNotificationItem,
  DesktopPushState,
  NotificationSettings,
  NotificationTriggerType,
} from '../types/document';
import { PWAInstallButton } from './PWAInstallButton';

interface NotificationModalProps {
  open: boolean;
  permissionState: BrowserPermissionState;
  desktopPushState: DesktopPushState;
  isSubscribingPush: boolean;
  settings: NotificationSettings;
  notifications: AppNotificationItem[];
  onRequestPermission: () => Promise<void>;
  onEnableDesktopPush: () => Promise<void>;
  onDisableDesktopPush: () => Promise<void>;
  onUpdateSettings: (next: NotificationSettings) => void;
  onSendTestNotification: () => Promise<void>;
  onCheckDueNow: () => Promise<void>;
  onSelectDocument: (docId: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onClose: () => void;
}

function formatNotificationTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  open,
  permissionState,
  desktopPushState,
  isSubscribingPush,
  settings,
  notifications,
  onRequestPermission,
  onEnableDesktopPush,
  onDisableDesktopPush,
  onUpdateSettings,
  onSendTestNotification,
  onCheckDueNow,
  onSelectDocument,
  onMarkAllRead,
  onClearAll,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const permissionSummary: Record<
    BrowserPermissionState,
    { label: string; toneClass: string }
  > = {
    granted: {
      label: 'ອະນຸຍາດການແຈ້ງເຕືອນ Browser ແລ້ວ',
      toneClass: 'text-emerald-700 dark:text-emerald-400',
    },
    default: {
      label: 'ຍັງບໍ່ທັນໄດ້ເປີດສິດການແຈ້ງເຕືອນ Browser',
      toneClass: 'text-amber-700 dark:text-amber-400',
    },
    denied: {
      label: 'Browser ຖືກບລັອກການແຈ້ງເຕືອນ (ກະລຸນາເປີດໃນຕັ້ງຄ່າ Browser)',
      toneClass: 'text-red-700 dark:text-red-400',
    },
    unsupported: {
      label: 'Browser ນີ້ບໍ່ຮອງຮັບ Web Notifications (ຈະແຈ້ງເຕືອນພາຍໃນແອັບແທນ)',
      toneClass: 'text-slate-600 dark:text-slate-400',
    },
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-lg">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <h2 id="notification-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              ສູນການແຈ້ງເຕືອນ Desktop &amp; Lock Screen
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ປິດໜ້າຕ່າງການແຈ້ງເຕືອນ"
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm">
          {/* Permission Status & Background Desktop Push Card */}
          <div className="space-y-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs text-slate-500 dark:text-slate-400">ສະຖານະສິດທິ Browser Notification</div>
                <div className={`text-sm font-semibold ${permissionSummary[permissionState].toneClass}`}>
                  {permissionSummary[permissionState].label}
                </div>
              </div>

              {permissionState === 'default' && (
                <button
                  type="button"
                  onClick={onRequestPermission}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Bell className="w-4 h-4" aria-hidden="true" />
                  <span>ອະນຸຍາດການແຈ້ງເຕືອນ</span>
                </button>
              )}
            </div>

            {/* Desktop Push & Lock Screen Subscription Box */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <MonitorSmartphone
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      desktopPushState.subscribed
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-blue-700 dark:text-blue-400'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="space-y-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Desktop Push ພື້ນຫຼັງ (ແຈ້ງເຕືອນແມ້ປິດ Browser)
                    </div>
                    <div
                      data-testid="desktop-push-status"
                      className={`text-xs font-medium ${
                        desktopPushState.subscribed
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {desktopPushState.subscribed
                        ? 'ເຊື່ອມຕໍ່ Web Push ພື້ນຫຼັງແລ້ວ — ຮອງຮັບ Desktop & ໜ້າຈໍລັອກ'
                        : desktopPushState.support === 'insecure_context'
                        ? 'ຕ້ອງໃຊ້ຜ່ານ HTTPS ຫຼື localhost ເພື່ອສະໝັກ Web Push'
                        : desktopPushState.support === 'unsupported'
                        ? 'Browser ນີ້ບໍ່ຮອງຮັບ PushManager ພື້ນຫຼັງ'
                        : 'ຍັງບໍ່ໄດ້ສະໝັກຮັບການແຈ້ງເຕືອນພື້ນຫຼັງເທິງອຸປະກອນນີ້'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {desktopPushState.subscribed ? (
                    <button
                      type="button"
                      disabled={isSubscribingPush}
                      onClick={onDisableDesktopPush}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      <span>ປິດຮັບ Desktop Push</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        isSubscribingPush ||
                        desktopPushState.support !== 'supported' ||
                        permissionState === 'denied'
                      }
                      onClick={onEnableDesktopPush}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      <BellRing className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{isSubscribingPush ? 'ກຳລັງເປີດ...' : 'ເປີດຮັບ Desktop Push'}</span>
                    </button>
                  )}
                </div>
              </div>

              {desktopPushState.lastError && (
                <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 rounded-lg px-3 py-2">
                  {desktopPushState.lastError}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2 flex-1 min-w-[200px]">
                  <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="leading-relaxed">
                    ແນະນຳໃຫ້ຕິດຕັ້ງເປັນແອັບ Desktop ແລະ ເປີດການສະແດງຜົນເທິງໜ້າຈໍລັອກໃນຕັ້ງຄ່າ OS (Windows / macOS) ເພື່ອຮັບແຈ້ງເຕືອນແມ້ປິດ Browser ແລ້ວ.
                  </span>
                </div>
                <PWAInstallButton variant="inline" />
              </div>
            </div>
          </div>

          {/* Lock Screen & Delivery Preferences */}
          <div className="space-y-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              ການສະແດງຜົນເທິງ Desktop &amp; ໜ້າຈໍລັອກ (Lock Screen)
            </div>

            <label className="flex items-start justify-between gap-4 cursor-pointer py-1">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  ຮອງຮັບການສະແດງຜົນເທິງໜ້າຈໍລັອກ (Lock Screen)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ໃຊ້ Service Worker ຄວາມສຳຄັນສູງ ແລະ ຊິ້ງລາຍການຕິດຕາມໄປຍັງ Server Push
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.lockScreenDisplay}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    lockScreenDisplay: e.target.checked,
                    backgroundPushEnabled: e.target.checked,
                  })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-700 focus:ring-blue-700"
              />
            </label>

            <label className="flex items-start justify-between gap-4 cursor-pointer py-1">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  ຄ້າງການແຈ້ງເຕືອນຈົນກວ່າຈະກົດເປີດ ຫຼື ປິດ (Require Interaction)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ປ້ອງກັນການພາດເອກະສານສຳຄັນໂດຍບໍ່ໃຫ້ແຈ້ງເຕືອນຫາຍໄປເອງອັດຕະໂນມັດ
                </div>
              </div>
              <input
                type="checkbox"
                disabled={!settings.lockScreenDisplay}
                checked={settings.requireInteraction}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    requireInteraction: e.target.checked,
                  })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-700 focus:ring-blue-700 disabled:opacity-50"
              />
            </label>

            <label className="flex items-start justify-between gap-4 cursor-pointer py-1">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  ເປີດສຽງ ແລະ ການສັ່ນແຈ້ງເຕືອນ
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ແຈ້ງເຕືອນດ້ວຍສຽງ ແລະ ການສັ່ນເມື່ອມີເອກະສານສຳຄັນເຂົ້າໃໝ່ ຫຼື ຮອດກຳນົດ
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.soundAndVibration}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    soundAndVibration: e.target.checked,
                  })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-700 focus:ring-blue-700"
              />
            </label>
          </div>

          {/* Notification Triggers Configuration */}
          <div className="space-y-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">ການຕັ້ງຄ່າເງື່ອນໄຂແຈ້ງເຕືອນ</div>

            <label className="flex items-start justify-between gap-4 cursor-pointer py-1">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">ເປີດໃຊ້ງານລະບົບແຈ້ງເຕືອນອັດຕະໂນມັດ</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ກວດສອບຂໍ້ມູນໃໝ່ ແລະ ວັນທີກຳນົດຕາມຮອບເວລາ
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, enabled: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-700 focus:ring-blue-700"
              />
            </label>

            <label className="flex items-start justify-between gap-4 cursor-pointer py-1">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  ແຈ້ງເຕືອນເມື່ອມີເອກະສານໃໝ່ໃນ Google Sheets
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ສົ່ງການແຈ້ງເຕືອນທັນທີເມື່ອພົບແຖວເອກະສານໃໝ່ຖືກເພີ່ມເຂົ້າມາ
                </div>
              </div>
              <input
                type="checkbox"
                disabled={!settings.enabled}
                checked={settings.notifyOnNewSheetRows}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    notifyOnNewSheetRows: e.target.checked,
                  })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-700 focus:ring-blue-700 disabled:opacity-50"
              />
            </label>

            <label className="flex items-start justify-between gap-4 cursor-pointer py-1">
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  ແຈ້ງເຕືອນເມື່ອເຖິງວັນທີກຳນົດຂອງເອກະສານ
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ແຈ້ງເຕືອນເອກະສານທີ່ຍັງບໍ່ສຳເລັດ ເມື່ອຮອດ ຫຼື ເກີນວັນທີກຳນົດ
                </div>
              </div>
              <input
                type="checkbox"
                disabled={!settings.enabled}
                checked={settings.notifyOnDueDate}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, notifyOnDueDate: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-700 focus:ring-blue-700 disabled:opacity-50"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label htmlFor="poll-interval-select" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                ຄວາມຖີ່ໃນການກວດສອບ Google Sheets:
              </label>
              <select
                id="poll-interval-select"
                disabled={!settings.enabled || !settings.notifyOnNewSheetRows}
                value={settings.pollIntervalSeconds}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    pollIntervalSeconds: Number(e.target.value),
                  })
                }
                className="px-3 py-1.5 min-h-[36px] text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500 disabled:opacity-50"
              >
                <option value={30}>ທຸກໆ 30 ວິນາທີ</option>
                <option value={60}>ທຸກໆ 1 ນາທີ</option>
                <option value={300}>ທຸກໆ 5 ນາທີ</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onSendTestNotification}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ທົດສອບສົ່ງແຈ້ງເຕືອນ</span>
              </button>

              <button
                type="button"
                onClick={onCheckDueNow}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
              >
                <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ກວດສອບເອກະສານຮອດກຳນົດ</span>
              </button>
            </div>
          </div>

          {/* Notification History Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                ປະຫວັດການແຈ້ງເຕືອນ ({notifications.length})
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>ອ່ານແລ້ວທັງໝົດ</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>ລ້າງປະຫວັດ</span>
                  </button>
                )}
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="py-8 text-center space-y-2 text-slate-500 dark:text-slate-400">
                <BellOff className="w-6 h-6 mx-auto text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <div className="text-sm">ຍັງບໍ່ມີການແຈ້ງເຕືອນໃນເວລານີ້</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {notifications.map((item) => {
                  const icon =
                    item.type === NotificationTriggerType.NEW_SHEET_DOCUMENT ? (
                      <FileSpreadsheet className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                    ) : item.type === NotificationTriggerType.DUE_DATE_REACHED ? (
                      <CalendarClock className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <Bell className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                    );

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 flex items-start gap-3 ${
                        item.read ? 'bg-white dark:bg-slate-900' : 'bg-blue-50/50 dark:bg-blue-950/30'
                      }`}
                    >
                      {icon}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {item.title}
                          </span>
                          <span className="text-xs font-mono-tabular text-slate-400 dark:text-slate-500 shrink-0">
                            {formatNotificationTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {item.body}
                        </p>
                        {item.docId && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectDocument(item.docId!);
                              onClose();
                            }}
                            className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline mt-1.5"
                          >
                            ເປີດເບິ່ງເອກະສານ
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
