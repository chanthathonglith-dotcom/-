import { DocumentRecord, LocalDriveConfig } from '../types/document';
import {
  DEFAULT_DRIVE_D_CONFIG,
  DEFAULT_EXCEL_FILENAME,
  buildExcelDownloadFilename,
  documentsToExcelBuffer,
  excelBufferToDocuments,
} from '../utils/excelStorageLogic';

const CONFIG_STORAGE_KEY = 'doc_archive_local_drive_config_v1';
const IDB_NAME = 'doc_archive_fs_handles_v1';
const IDB_STORE = 'handles';
const FOLDER_HANDLE_KEY = 'drive_d_folder';
const EXCEL_HANDLE_KEY = 'drive_d_excel';

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
  }) => Promise<FileSystemDirectoryHandle>;
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<FileSystemFileHandle[]>;
}

export function loadLocalDriveConfig(): LocalDriveConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_DRIVE_D_CONFIG };
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DRIVE_D_CONFIG };
    const parsed = JSON.parse(raw) as Partial<LocalDriveConfig>;
    return {
      ...DEFAULT_DRIVE_D_CONFIG,
      ...parsed,
      mode:
        parsed.mode === 'local_drive' || parsed.mode === 'both'
          ? parsed.mode
          : 'google',
    };
  } catch {
    return { ...DEFAULT_DRIVE_D_CONFIG };
  }
}

export function saveLocalDriveConfig(config: LocalDriveConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage quota failures
  }
}

export function isFileSystemAccessSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function';
}

export function isRunningInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

async function saveHandle(key: string, handle: unknown): Promise<void> {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to store handle'));
  });
}

async function loadHandle<T>(key: string): Promise<T | null> {
  try {
    const db = await openHandleDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function clearStoredHandles(): Promise<void> {
  try {
    const db = await openHandleDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

async function ensureWritePermission(
  handle: FileSystemDirectoryHandle | FileSystemFileHandle
): Promise<boolean> {
  const permHandle = handle as unknown as {
    queryPermission?: (desc: { mode: 'readwrite' }) => Promise<string>;
    requestPermission?: (desc: { mode: 'readwrite' }) => Promise<string>;
  };
  if (typeof permHandle.queryPermission === 'function') {
    const status = await permHandle.queryPermission({ mode: 'readwrite' });
    if (status === 'granted') return true;
  }
  if (typeof permHandle.requestPermission === 'function') {
    const next = await permHandle.requestPermission({ mode: 'readwrite' });
    return next === 'granted';
  }
  return true;
}

export async function pickDriveDFolder(): Promise<{
  folderName: string;
  excelFileName: string;
}> {
  const pickerWin = window as DirectoryPickerWindow;
  if (typeof pickerWin.showDirectoryPicker !== 'function') {
    throw new Error(
      'Browser ນີ້ບໍ່ຮອງຮັບການເລືອກໂຟນເດີ Hard Disk ໂດຍກົງ (ກະລຸນາໃຊ້ Chrome/Edge ຫຼື ໃຊ້ປຸ່ມບັນທຶກຜ່ານ Server / Export Excel)'
    );
  }

  try {
    const dirHandle = await pickerWin.showDirectoryPicker({
      id: 'drive_d_doc_manager',
      mode: 'readwrite',
    });
    await saveHandle(FOLDER_HANDLE_KEY, dirHandle);
    await dirHandle.getDirectoryHandle('Scans', { create: true });
    return {
      folderName: dirHandle.name,
      excelFileName: DEFAULT_EXCEL_FILENAME,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'SecurityError') {
      throw new Error(
        'ໜ້າຕ່າງ Preview (iframe) ຈຳກັດສິດເຂົ້າເຖິງ Drive D: ໂດຍກົງ — ກະລຸນາເປີດໃນ Tab ໃໝ່ ຫຼື ໃຊ້ລະບົບຊິ້ງ Excel ຜ່ານ Server ແລະ Export .xlsx'
      );
    }
    throw err;
  }
}

export async function pickDriveDExcelFile(): Promise<{
  fileName: string;
  documents: DocumentRecord[];
}> {
  const pickerWin = window as DirectoryPickerWindow;
  if (typeof pickerWin.showOpenFilePicker !== 'function') {
    throw new Error('Browser ນີ້ບໍ່ຮອງຮັບ File Picker ໂດຍກົງ');
  }

  const [fileHandle] = await pickerWin.showOpenFilePicker({
    multiple: false,
    types: [
      {
        description: 'Excel Workbook (.xlsx)',
        accept: {
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        },
      },
    ],
  });

  await saveHandle(EXCEL_HANDLE_KEY, fileHandle);
  const file = await fileHandle.getFile();
  const buf = await file.arrayBuffer();
  const documents = excelBufferToDocuments(buf);
  return {
    fileName: file.name,
    documents,
  };
}

export async function disconnectDriveDHandles(): Promise<void> {
  await clearStoredHandles();
}

export async function syncDocumentsToLocalDriveAndServer(
  documents: DocumentRecord[],
  config: LocalDriveConfig
): Promise<{
  wroteDirectoryHandle: boolean;
  serverFilePath: string;
  syncedAt: string;
}> {
  const bytes = documentsToExcelBuffer(documents);
  let wroteDirectoryHandle = false;

  const dirHandle = await loadHandle<FileSystemDirectoryHandle>(FOLDER_HANDLE_KEY);
  if (dirHandle) {
    try {
      const granted = await ensureWritePermission(dirHandle);
      if (granted) {
        const fileHandle = await dirHandle.getFileHandle(
          config.linkedExcelFileName || DEFAULT_EXCEL_FILENAME,
          { create: true }
        );
        const writable = await fileHandle.createWritable();
        await writable.write(bytes as unknown as BufferSource);
        await writable.close();
        wroteDirectoryHandle = true;
      }
    } catch {
      wroteDirectoryHandle = false;
    }
  }

  let serverFilePath = '';
  const syncedAt = new Date().toISOString();
  try {
    const res = await fetch('/api/local-storage/sync-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documents,
        driveLetterPath: config.driveLetterPath,
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as { filePath?: string };
      serverFilePath = json.filePath || '';
    }
  } catch {
    // Allow browser-only operation when offline
  }

  return {
    wroteDirectoryHandle,
    serverFilePath,
    syncedAt,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read scan file'));
    reader.readAsDataURL(file);
  });
}

export async function saveScanFileToLocalDriveAndServer(file: File): Promise<{
  id: string;
  name: string;
  webViewLink: string;
  savedToHandle: boolean;
}> {
  let savedToHandle = false;
  const dirHandle = await loadHandle<FileSystemDirectoryHandle>(FOLDER_HANDLE_KEY);
  if (dirHandle) {
    try {
      const granted = await ensureWritePermission(dirHandle);
      if (granted) {
        const scansDir = await dirHandle.getDirectoryHandle('Scans', { create: true });
        const stampedName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const scanHandle = await scansDir.getFileHandle(stampedName, { create: true });
        const writable = await scanHandle.createWritable();
        await writable.write(file);
        await writable.close();
        savedToHandle = true;
      }
    } catch {
      savedToHandle = false;
    }
  }

  try {
    const dataBase64 = await fileToBase64(file);
    const res = await fetch('/api/local-storage/upload-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        dataBase64,
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        id: string;
        name: string;
        webViewLink: string;
      };
      return {
        ...json,
        savedToHandle,
      };
    }
  } catch {
    // Fall back to local object URL if backend is unreachable
  }

  return {
    id: `local-${Date.now()}`,
    name: file.name,
    webViewLink: URL.createObjectURL(file),
    savedToHandle,
  };
}

export async function fetchLocalServerStatus(): Promise<{
  serverStorageDir: string;
  scansDir: string;
  excelFilePath: string;
  excelExists: boolean;
  scanCount: number;
  lastUpdatedAt: string | null;
} | null> {
  try {
    const res = await fetch('/api/local-storage/status');
    if (!res.ok) return null;
    return (await res.json()) as {
      serverStorageDir: string;
      scansDir: string;
      excelFilePath: string;
      excelExists: boolean;
      scanCount: number;
      lastUpdatedAt: string | null;
    };
  } catch {
    return null;
  }
}

export async function fetchDocumentsFromLocalServer(): Promise<DocumentRecord[]> {
  const res = await fetch('/api/local-storage/documents');
  if (!res.ok) {
    throw new Error('ບໍ່ສາມາດອ່ານຂໍ້ມູນ Excel ຈາກລະບົບຈັດເກັບໃນເຄື່ອງໄດ້');
  }
  const data = (await res.json()) as { documents?: DocumentRecord[] };
  return Array.isArray(data.documents) ? data.documents : [];
}

export function triggerExcelDownload(
  documents: DocumentRecord[],
  prefix = 'documents'
): string {
  const bytes = documentsToExcelBuffer(documents);
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const filename = buildExcelDownloadFilename(prefix);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return filename;
}
