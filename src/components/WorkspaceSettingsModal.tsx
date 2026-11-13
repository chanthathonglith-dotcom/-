import React, { useEffect, useState } from 'react';
import { ExternalLink, FileSpreadsheet, FolderOpen, Plus, RefreshCw, X } from 'lucide-react';
import { WorkspaceConnection } from '../types/document';

interface WorkspaceSettingsModalProps {
  open: boolean;
  isDemoMode: boolean;
  connection: WorkspaceConnection | null;
  isBusy: boolean;
  onLinkSpreadsheetId: (spreadsheetId: string) => Promise<void>;
  onCreateNewSpreadsheet: () => Promise<void>;
  onRefreshSync: () => Promise<void>;
  onClose: () => void;
}

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
  open,
  isDemoMode,
  connection,
  isBusy,
  onLinkSpreadsheetId,
  onCreateNewSpreadsheet,
  onRefreshSync,
  onClose,
}) => {
  const [customSheetId, setCustomSheetId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCustomSheetId(connection?.spreadsheetId || '');
    setError(null);
  }, [open, connection]);

  if (!open) return null;

  const extractSheetId = (raw: string): string => {
    const trimmed = raw.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : trimmed;
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractSheetId(customSheetId);
    if (!id) {
      setError('ກະລຸນາປ້ອນ Spreadsheet ID ຫຼື URL ຂອງ Google Sheets');
      return;
    }
    setError(null);
    try {
      await onLinkSpreadsheetId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ບໍ່ສາມາດເຊື່ອມຕໍ່ Google Sheets ນີ້ໄດ້');
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-settings-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 id="workspace-settings-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
            ການເຊື່ອມຕໍ່ Google Sheets &amp; Drive
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ປິດໜ້າຕ່າງຕັ້ງຄ່າ"
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-sm">
          {isDemoMode ? (
            <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-slate-700 dark:text-slate-300 leading-relaxed">
              ທ່ານກຳລັງໃຊ້ງານໃນ <strong className="text-slate-900 dark:text-slate-100">ໂໝດທົດລອງ (Demo Mode)</strong>. ເພື່ອເຊື່ອມຕໍ່ Google Sheets ແລະ Google Drive ຈິງ, ກະລຸນາກົດປຸ່ມ &quot;ເຊື່ອມຕໍ່ບັນຊີ Google&quot; ຢູ່ແຖບດ້ານຊ້າຍ.
            </div>
          ) : connection ? (
            <>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {connection.spreadsheetTitle}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        ແຜ່ນວຽກ: {connection.sheetTitle} · ID:{' '}
                        <span className="font-mono-tabular">{connection.spreadsheetId}</span>
                      </div>
                    </div>
                  </div>
                  <a
                    href={connection.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                  >
                    <span>ເປີດ Sheet</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                </div>

                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FolderOpen className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {connection.driveFolderName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        ໂຟນເດີເກັບຟາຍສະແກນໃນ Google Drive
                      </div>
                    </div>
                  </div>
                  <a
                    href={connection.driveFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                  >
                    <span>ເປີດ Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>

              <form onSubmit={handleLinkSubmit} className="space-y-2.5">
                <label htmlFor="custom-sheet-id" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  ປ່ຽນ Google Spreadsheet (ວາງ URL ຫຼື Spreadsheet ID)
                </label>
                <div className="flex gap-2">
                  <input
                    id="custom-sheet-id"
                    type="text"
                    value={customSheetId}
                    onChange={(e) => setCustomSheetId(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="flex-1 min-w-0 px-3 py-2 min-h-[40px] text-xs font-mono-tabular bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="px-3.5 py-2 min-h-[40px] text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap"
                  >
                    ເຊື່ອມຕໍ່
                  </button>
                </div>
                {error && (
                  <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                    {error}
                  </p>
                )}
              </form>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onCreateNewSpreadsheet}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>ສ້າງ Google Sheet ໃໝ່</span>
                </button>

                <button
                  type="button"
                  onClick={onRefreshSync}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} aria-hidden="true" />
                  <span>ຊິ້ງຂໍ້ມູນດຽວນີ້</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-slate-600 dark:text-slate-400">ກຳລັງກຽມການເຊື່ອມຕໍ່ Google Workspace...</div>
          )}
        </div>
      </div>
    </div>
  );
};
