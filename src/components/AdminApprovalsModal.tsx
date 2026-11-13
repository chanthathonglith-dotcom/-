import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Share2,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { AccessRequestRecord, WorkspaceSharedConfig } from '../types/document';
import { SOLE_ADMIN_EMAIL } from '../utils/accessControlLogic';

interface AdminApprovalsModalProps {
  open: boolean;
  adminEmail: string;
  requests: AccessRequestRecord[];
  sharedConfig: WorkspaceSharedConfig | null;
  currentSpreadsheetId?: string;
  currentSpreadsheetTitle?: string;
  onApprove: (uid: string, note?: string) => Promise<void>;
  onReject: (uid: string, note?: string) => Promise<void>;
  onDeleteRequest: (uid: string) => Promise<void>;
  onPublishSharedSheet: () => Promise<void>;
  onClose: () => void;
}

export const AdminApprovalsModal: React.FC<AdminApprovalsModalProps> = ({
  open,
  adminEmail,
  requests,
  sharedConfig,
  currentSpreadsheetId,
  currentSpreadsheetTitle,
  onApprove,
  onReject,
  onDeleteRequest,
  onPublishSharedSheet,
  onClose,
}) => {
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [noteByUid, setNoteByUid] = useState<Record<string, string>>({});
  const [publishingSheet, setPublishingSheet] = useState(false);

  if (!open) return null;

  const pendingList = requests.filter((r) => r.status === 'pending');
  const approvedList = requests.filter((r) => r.status === 'approved');
  const rejectedList = requests.filter((r) => r.status === 'rejected');

  const handleAction = async (
    uid: string,
    action: 'approve' | 'reject' | 'delete'
  ) => {
    setBusyUid(uid);
    try {
      const note = noteByUid[uid] ?? '';
      if (action === 'approve') {
        await onApprove(uid, note);
      } else if (action === 'reject') {
        await onReject(uid, note);
      } else {
        await onDeleteRequest(uid);
      }
    } finally {
      setBusyUid(null);
    }
  };

  const renderRequestRow = (req: AccessRequestRecord) => {
    const busy = busyUid === req.uid;
    return (
      <div
        key={req.uid}
        className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2.5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {req.photoURL ? (
              <img
                src={req.photoURL}
                alt={req.displayName || req.email}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                {(req.displayName || req.email || 'U').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {req.displayName || 'ຜູ້ໃຊ້ງານ'}
              </div>
              <div className="text-xs font-mono-tabular text-slate-600 dark:text-slate-300 truncate">
                {req.email}
              </div>
            </div>
          </div>

          <span
            className={`text-xs font-semibold inline-flex items-center gap-1 ${
              req.status === 'approved'
                ? 'text-emerald-700 dark:text-emerald-400'
                : req.status === 'rejected'
                ? 'text-red-700 dark:text-red-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {req.status === 'approved' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ອະນຸມັດແລ້ວ</span>
              </>
            ) : req.status === 'rejected' ? (
              <>
                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ປະຕິເສດແລ້ວ</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ລໍຖ້າອະນຸມັດ</span>
              </>
            )}
          </span>
        </div>

        {req.reason && (
          <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
            ເຫດຜົນ: {req.reason}
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            type="text"
            value={noteByUid[req.uid] ?? req.adminNote ?? ''}
            onChange={(e) =>
              setNoteByUid((prev) => ({ ...prev, [req.uid]: e.target.value }))
            }
            placeholder="ໝາຍເຫດຈາກ Admin (ທາງເລືອກ)..."
            className="flex-1 min-w-0 px-3 py-1.5 min-h-[36px] text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            {req.status !== 'approved' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleAction(req.uid, 'approve')}
                className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-50 rounded-lg whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ອະນຸມັດ</span>
              </button>
            )}
            {req.status !== 'rejected' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleAction(req.uid, 'reject')}
                className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 disabled:opacity-50 rounded-lg whitespace-nowrap"
              >
                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ປະຕິເສດ</span>
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleAction(req.uid, 'delete')}
              aria-label={`ລຶບຄຳຂໍຂອງ ${req.email}`}
              className="p-2 min-h-[36px] text-slate-500 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-approvals-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2
                id="admin-approvals-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate"
              >
                ຈັດການສິດຜູ້ໃຊ້ (Admin ຜູ້ດຽວ)
              </h2>
              <p className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400 truncate">
                Admin: {adminEmail || SOLE_ADMIN_EMAIL}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ປິດໜ້າຕ່າງຈັດການສິດ"
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Share current Google Sheet ID with approved members */}
          <section className="p-4 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                Google Sheet ຮ່ວມສຳລັບບັນຊີທີ່ອະນຸມັດແລ້ວ
              </div>
              {currentSpreadsheetId && (
                <button
                  type="button"
                  disabled={publishingSheet}
                  onClick={async () => {
                    setPublishingSheet(true);
                    try {
                      await onPublishSharedSheet();
                    } finally {
                      setPublishingSheet(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 rounded-lg"
                >
                  <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    {publishingSheet
                      ? 'ກຳລັງບັນທຶກ...'
                      : 'ແຊຣ໌ Sheet ປັດຈຸບັນໃຫ້ທີມ'}
                  </span>
                </button>
              )}
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300">
              {sharedConfig?.spreadsheetId ? (
                <span>
                  Sheet ຮ່ວມຂອງທີມ: <strong>{sharedConfig.spreadsheetTitle || 'ເອກະສານ'}</strong>{' '}
                  (<span className="font-mono-tabular">{sharedConfig.spreadsheetId}</span>)
                </span>
              ) : currentSpreadsheetId ? (
                <span>
                  ຍັງບໍ່ໄດ້ຕັ້ງ Sheet ຮ່ວມ · Sheet ປັດຈຸບັນຂອງທ່ານ: <strong>{currentSpreadsheetTitle}</strong>
                </span>
              ) : (
                <span>ເຊື່ອມຕໍ່ Google Sheet ກ່ອນແລ້ວກົດ &quot;ແຊຣ໌ Sheet ປັດຈຸບັນໃຫ້ທີມ&quot;</span>
              )}
            </div>
          </section>

          {/* Pending Requests */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              ລໍຖ້າການອະນຸມັດ ({pendingList.length})
            </h3>
            {pendingList.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ຍັງບໍ່ມີຄຳຂໍທີ່ລໍຖ້າອະນຸມັດໃນຂະນະນີ້
              </p>
            ) : (
              <div className="space-y-2.5">{pendingList.map(renderRequestRow)}</div>
            )}
          </section>

          {/* Approved Accounts */}
          <section className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              ບັນຊີທີ່ອະນຸມັດແລ້ວ ({approvedList.length})
            </h3>
            {approvedList.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ຍັງບໍ່ມີບັນຊີອື່ນທີ່ໄດ້ຮັບອະນຸມັດ
              </p>
            ) : (
              <div className="space-y-2.5">{approvedList.map(renderRequestRow)}</div>
            )}
          </section>

          {rejectedList.length > 0 && (
            <section className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                ບັນຊີທີ່ຖືກປະຕິເສດ ({rejectedList.length})
              </h3>
              <div className="space-y-2.5">{rejectedList.map(renderRequestRow)}</div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
