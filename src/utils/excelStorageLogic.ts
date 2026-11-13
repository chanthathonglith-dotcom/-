import * as XLSX from 'xlsx';
import { DocumentRecord, LocalDriveConfig } from '../types/document';
import {
  SHEET_HEADERS,
  documentToSheetRow,
  sheetRowsToDocuments,
} from './documentLogic';

export const EXCEL_SHEET_NAME = 'ເອກະສານ';
export const DEFAULT_EXCEL_FILENAME = 'documents.xlsx';

export const DEFAULT_DRIVE_D_CONFIG: LocalDriveConfig = {
  mode: 'google',
  driveLetterPath: 'D:\\DocManager',
  excelFilePath: 'D:\\DocManager\\documents.xlsx',
  scansFolderPath: 'D:\\DocManager\\Scans',
  linkedFolderName: '',
  linkedExcelFileName: '',
  lastLocalSyncAt: '',
};

export function normalizeDriveDPaths(baseDirInput: string): {
  driveLetterPath: string;
  excelFilePath: string;
  scansFolderPath: string;
} {
  const cleaned = baseDirInput.trim().replace(/[\\/]+$/, '') || 'D:\\DocManager';
  return {
    driveLetterPath: cleaned,
    excelFilePath: `${cleaned}\\documents.xlsx`,
    scansFolderPath: `${cleaned}\\Scans`,
  };
}

export function buildExcelDownloadFilename(prefix = 'documents'): string {
  const today = new Date().toISOString().slice(0, 10);
  const safePrefix = prefix.trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'documents';
  return `${safePrefix}-${today}.xlsx`;
}

export function documentsToExcelBuffer(records: DocumentRecord[]): Uint8Array {
  const aoa: string[][] = [
    [...SHEET_HEADERS],
    ...records.map((doc) => documentToSheetRow(doc)),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  worksheet['!cols'] = [
    { wch: 14 }, // ID
    { wch: 12 }, // ປະເພດ
    { wch: 18 }, // ເລກທີຂາເຂົ້າ-ຂາອອກ
    { wch: 14 }, // ວັນທີຫຼັກ
    { wch: 42 }, // ຫົວຂໍ້
    { wch: 26 }, // ພາກສ່ວນ
    { wch: 14 }, // ຈຸດປະສົງ
    { wch: 34 }, // ຄຳເຫັນການນຳ
    { wch: 18 }, // ສະຖານະ
    { wch: 36 }, // ລິ້ງຟາຍສະແກນ
    { wch: 24 }, // ຊື່ຟາຍສະແກນ
    { wch: 18 }, // Drive File ID
    { wch: 22 }, // ຜູ້ບັນທຶກ
    { wch: 24 }, // ອັບເດດລ່າສຸດ
    { wch: 14 }, // ວັນທີກຳນົດ
    { wch: 16 }, // ວັນທີຂາເຂົ້າ
    { wch: 16 }, // ວັນທີຂາອອກ
    { wch: 28 }, // ຜູ້ອະນຸມັດ
    { wch: 24 }, // ລາຍເຊັນ
    { wch: 22 }, // ວັນທີລົງນາມ
    { wch: 20 }, // ເລກທີຂາອອກ
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, EXCEL_SHEET_NAME);

  const output = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  }) as ArrayBuffer | Uint8Array;

  return output instanceof Uint8Array ? output : new Uint8Array(output);
}

export function excelBufferToDocuments(buffer: ArrayBuffer | Uint8Array): DocumentRecord[] {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.byteLength === 0) return [];

  const workbook = XLSX.read(bytes, { type: 'array' });
  const preferredSheetName = workbook.SheetNames.includes(EXCEL_SHEET_NAME)
    ? EXCEL_SHEET_NAME
    : workbook.SheetNames[0];

  if (!preferredSheetName) return [];

  const worksheet = workbook.Sheets[preferredSheetName];
  if (!worksheet) return [];

  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
  });

  const normalizedRows: string[][] = rawRows.map((row) =>
    Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : []
  );

  return sheetRowsToDocuments(normalizedRows);
}
