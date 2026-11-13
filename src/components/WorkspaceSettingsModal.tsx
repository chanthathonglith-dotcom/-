import React, { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  HardDrive,
  Plus,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import {
  DocumentRecord,
  LocalDriveConfig,
  StorageProviderMode,
  WorkspaceConnection,
} from '../types/document';
import {
  disconnectDriveDHandles,
  fetchLocalServerStatus,
  isFileSystemAccessSupported,
  isRunningInIframe,
  pickDriveDFolder,
} from '../services/localDriveStorage';
import {
  excelBufferToDocuments,
  normalizeDriveDPaths,
} from '../utils/excelStorageLogic';

interface WorkspaceSettingsModalProps {
  open: boolean;
  isDemoMode: boolean;
  connection: WorkspaceConnection | null;
  localConfig: LocalDriveConfig;
  documents: DocumentRecord[];
  isBusy: boolean;
  onUpdateLocalConfig: (next: LocalDriveConfig) => void;
  onSyncLocalExcel: () => Promise<void>;
  onDownloadExcel: () => void;
  onImportExcelDocuments: (docs: DocumentRecord[]) => Promise<void>;
  onLinkSpreadsheetId: (spreadsheetId: string) => Promise<void>;
  onCreateNewSpreadsheet: () => Promise<void>;
  onRefreshSync: () => Promise<void>;
  onClose: () => void;
}

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
  open,
  isDemoMode,
  connection,
  localConfig,
  documents,
  isBusy,
  onUpdateLocalConfig,
  onSyncLocalExcel,
  onDownloadExcel,
  onImportExcelDocuments,
  onLinkSpreadsheetId,
  onCreateNewSpreadsheet,
  onRefreshSync,
  onClose,
}) => {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [customSheetId, setCustomSheetId] = useState('');
  const [driveBasePath, setDriveBasePath] = useState(localConfig.driveLetterPath);
  const [error, setError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<{
    serverStorageDir: string;
    excelExists: boolean;
    scanCount: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setCustomSheetId(connection?.spreadsheetId || '');
    setDriveBasePath(localConfig.driveLetterPath);
    setError(null);
    setLocalError(null);
    setLocalMessage(null);
    void fetchLocalServerStatus().then((st) => {
      if (st) {
        setServerStatus({
          serverStorageDir: st.serverStorageDir,
          excelExists: st.excelExists,
          scanCount: st.scanCount,
        });
      }
    });
  }, [open, connection, localConfig.driveLetterPath]);

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
      setError(
        err instanceof Error ? err.message : 'ບໍ່ສາມາດເຊື່ອມຕໍ່ Google Sheets ນີ້ໄດ້'
      );
    }
  };

  const handleModeChange = (mode: StorageProviderMode) => {
    onUpdateLocalConfig({
      ...localConfig,
      mode,
    });
  };

  const handleSavePaths = () => {
    const normalized = normalizeDriveDPaths(driveBasePath);
    onUpdateLocalConfig({
      ...localConfig,
      ...normalized,
    });
    setLocalMessage(`ບັນທຶກເສັ້ນທາງ ${normalized.driveLetterPath} ແລ້ວ`);
    setLocalError(null);
  };

  const handlePickDriveFolder = async () => {
    setLocalError(null);
    setLocalMessage(null);
    try {
      const picked = await pickDriveDFolder();
      onUpdateLocalConfig({
        ...localConfig,
        linkedFolderName: picked.folderName,
        linkedExcelFileName: picked.excelFileName,
      });
      setLocalMessage(
        `ເຊື່ອມຕໍ່ໂຟນເດີ "${picked.folderName}" ສຳເລັດ — ລະບົບຈະຂຽນ ${picked.excelFileName} ແລະ ຟາຍສະແກນລົງໃນໂຟນເດີນີ້`
      );
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'ບໍ່ສາມາດເລືອກໂຟນເດີ Drive D: ໄດ້'
      );
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLocalError(null);
    setLocalMessage(null);
    try {
      const buf = await file.arrayBuffer();
      const importedDocs = excelBufferToDocuments(buf);
      if (importedDocs.length === 0) {
        setLocalError('ບໍ່ພົບແຖວຂໍ້ມູນເອກະສານໃນຟາຍ Excel ນີ້');
        return;
      }
      await onImportExcelDocuments(importedDocs);
      setLocalMessage(`ນຳເຂົ້າ ${importedDocs.length} ລາຍການຈາກ "${file.name}" ສຳເລັດ`);
    } catch {
      setLocalError('ບໍ່ສາມາດອ່ານຟາຍ Excel (.xlsx) ນີ້ໄດ້');
    }
  };

  const fsSupported = isFileSystemAccessSupported();
  const inIframe = isRunningInIframe();

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-settings-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h2
            id="workspace-settings-title"
            className="text-lg font-bold text-slate-900 dark:text-slate-100"
          >
            ຕັ້ງຄ່າແຫຼ່ງເກັບຂໍ້ມູນ (Google Sheets, Excel &amp; Drive D:)
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Storage Mode Selector */}
          <section className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              ເລືອກຮູບແບບການບັນທຶກຂໍ້ມູນ ແລະ ຟາຍສະແກນ
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  {
                    id: 'google' as const,
                    label: 'Google Sheets & Drive',
                    desc: 'ອອນລາຍ Cloud',
                    icon: <Cloud className="w-4 h-4 shrink-0" aria-hidden="true" />,
                  },
                  {
                    id: 'local_drive' as const,
                    label: 'Excel & Drive D:',
                    desc: 'ໃນເຄື່ອງຄອມພິວເຕີ',
                    icon: <HardDrive className="w-4 h-4 shrink-0" aria-hidden="true" />,
                  },
                  {
                    id: 'both' as const,
                    label: 'ທັງສອງລະບົບພ້ອມກັນ',
                    desc: 'Google + Excel/Drive D:',
                    icon: <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden="true" />,
                  },
                ] as const
              ).map((opt) => {
                const active = localConfig.mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleModeChange(opt.id)}
                    className={`p-3 rounded-xl border text-left transition-colors flex items-start gap-2.5 ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="mt-0.5 text-blue-700 dark:text-blue-400">
                      {opt.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold">{opt.label}</span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {opt.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Excel (.xlsx) & Local Hard Disk Drive D: Section */}
          <section className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  ເຊື່ອມຕໍ່ Excel (.xlsx) &amp; Hard Disk Drive D:
                </h3>
              </div>
              {localConfig.linkedFolderName && (
                <button
                  type="button"
                  onClick={() => {
                    void disconnectDriveDHandles().then(() => {
                      onUpdateLocalConfig({
                        ...localConfig,
                        linkedFolderName: '',
                        linkedExcelFileName: '',
                      });
                    });
                  }}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  ຍົກເລີກການເຊື່ອມໂຟນເດີ
                </button>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="drive-d-path-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                ເສັ້ນທາງໂຟນເດີໃນ Drive D: (ສຳລັບຟາຍ Excel &amp; ຟາຍສະແກນ)
              </label>
              <div className="flex gap-2">
                <input
                  id="drive-d-path-input"
                  type="text"
                  value={driveBasePath}
                  onChange={(e) => setDriveBasePath(e.target.value)}
                  placeholder="D:\DocManager"
                  className="flex-1 min-w-0 px-3 py-2 min-h-[38px] text-xs font-mono-tabular bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700"
                />
                <button
                  type="button"
                  onClick={handleSavePaths}
                  className="px-3 py-2 min-h-[38px] text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg whitespace-nowrap"
                >
                  ບັນທຶກ Path
                </button>
              </div>
              <div className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400 space-y-0.5">
                <div>Excel: {localConfig.excelFilePath}</div>
                <div>Scans: {localConfig.scansFolderPath}</div>
                {localConfig.linkedFolderName && (
                  <div className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    ເຊື່ອມຕໍ່ໂຟນເດີຈິງແລ້ວ: {localConfig.linkedFolderName}/
                    {localConfig.linkedExcelFileName || 'documents.xlsx'}
                  </div>
                )}
                {serverStatus && (
                  <div>
                    Server Local Backup: {serverStatus.excelExists ? 'ມີຟາຍ Excel ແລ້ວ' : 'ພ້ອມສ້າງອັດຕະໂນມັດ'} · ຟາຍສະແກນ {serverStatus.scanCount} ຟາຍ
                  </div>
                )}
              </div>
            </div>

            {inIframe && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 rounded-lg px-3 py-2">
                ໝາຍເຫດ: ການເລືອກໂຟນເດີ Drive D: ໂດຍກົງຈາກ Browser ຕ້ອງເປີດແອັບໃນ Tab ປົກກະຕິ (Chrome/Edge). ໃນໂໝດນີ້ທ່ານຍັງສາມາດຊິ້ງ Excel ຜ່ານ Server, Export .xlsx ແລະ Import .xlsx ໄດ້ທຸກເວລາ.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {fsSupported && (
                <button
                  type="button"
                  onClick={() => void handlePickDriveFolder()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg whitespace-nowrap"
                >
                  <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>ເລືອກໂຟນເດີ Drive D:</span>
                </button>
              )}

              <button
                type="button"
                disabled={isBusy}
                onClick={() => void onSyncLocalExcel()}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-50 rounded-lg whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ຊິ້ງລົງ Excel ດຽວນີ້ ({documents.length})</span>
              </button>

              <button
                type="button"
                disabled={documents.length === 0}
                onClick={onDownloadExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 rounded-lg whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ດາວໂຫຼດ .xlsx</span>
              </button>

              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFile}
                className="hidden"
                id="import-excel-file-input"
              />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ນຳເຂົ້າຈາກ .xlsx</span>
              </button>
            </div>

            {localMessage && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                {localMessage}
              </p>
            )}
            {localError && (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {localError}
              </p>
            )}
          </section>

          {/* Google Sheets & Google Drive Section */}
          <section className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              ການເຊື່ອມຕໍ່ Google Sheets &amp; Google Drive
            </h3>
            {isDemoMode ? (
              <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                ທ່ານກຳລັງໃຊ້ງານໃນ{' '}
                <strong className="text-slate-900 dark:text-slate-100">
                  ໂໝດທົດລອງ (Demo Mode)
                </strong>
                . ເພື່ອເຊື່ອມຕໍ່ Google Sheets ແລະ Google Drive ຈິງ, ກະລຸນາກົດປຸ່ມ
                &quot;ເຊື່ອມຕໍ່ບັນຊີ Google&quot; ຢູ່ແຖບດ້ານຊ້າຍ.
              </div>
            ) : connection ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <FileSpreadsheet
                        className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {connection.spreadsheetTitle}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          ແຜ່ນວຽກ: {connection.sheetTitle} · ID:{' '}
                          <span className="font-mono-tabular">
                            {connection.spreadsheetId}
                          </span>
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
                      <FolderOpen
                        className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
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
                  <label
                    htmlFor="custom-sheet-id"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
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
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    <span>ຊິ້ງຂໍ້ມູນດຽວນີ້</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-slate-600 dark:text-slate-400">
                ກຳລັງກຽມການເຊື່ອມຕໍ່ Google Workspace...
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
