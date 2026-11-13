export enum DocumentDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
  LEGAL = 'legal',
  SPEECH = 'speech',
}

export enum DocumentPurpose {
  OPINION = 'opinion', // ຂໍຄຳເຫັນ
  SIGNATURE = 'signature', // ຂໍລາຍເຊັນ
  GUIDANCE = 'guidance', // ຂໍທິດຊີ້ນຳ
  INFO = 'info', // ເພື່ອຊາບ
}

export enum DocumentStatus {
  PENDING = 'pending', // ລໍຖ້າດຳເນີນການ
  IN_PROGRESS = 'in_progress', // ກຳລັງດຳເນີນການ
  COMPLETED = 'completed', // ສຳເລັດແລ້ວ
  RETURNED = 'returned', // ສົ່ງຄືນ / ແກ້ໄຂ
}

export enum SortOrder {
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
  DOC_NO_ASC = 'doc_no_asc',
  UPDATED_DESC = 'updated_desc',
}

export interface DocumentRecord {
  id: string;
  direction: DocumentDirection;
  docNumber: string; // ເລກທີເອກະສານ (ຫຼື ເລກທີເອກະສານຂາເຂົ້າ)
  outgoingDocNumber?: string; // ເລກທີເອກະສານຂາອອກ
  docDate: string; // YYYY-MM-DD ວັນທີເອກະສານຫຼັກ
  incomingDate?: string; // YYYY-MM-DD ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາເຂົ້າ
  outgoingDate?: string; // YYYY-MM-DD ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາອອກ
  dueDate: string; // YYYY-MM-DD ວັນທີກຳນົດ (ທາງເລືອກ)
  title: string; // ຫົວຂໍ້ເອກະສານ
  department: string; // ພາກສ່ວນສົ່ງ/ຮັບ ຫຼື ພາກສ່ວນຮັບຜິດຊອບ
  purpose: DocumentPurpose; // ຈຸດປະສົງ
  leadershipComment: string; // ຄຳເຫັນຂອງການນຳ
  status: DocumentStatus; // ສະຖານະການຕິດຕາມເອກະສານ
  scanLink: string; // ລິ້ງເຊື່ອມຕໍ່ກັບເອກະສານທີ່ສະແກ້ນ
  scanFileName: string; // ຊື່ຟາຍສະແກນ
  driveFileId: string; // Google Drive File ID (ຖ້າມີ)
  approverName?: string; // ຊື່ ແລະ ຕຳແໜ່ງຜູ້ອະນຸມັດ
  signatureDataUrl?: string; // ລາຍເຊັນດິຈິຕອນ (Canvas Data URL)
  signedAt?: string; // ISO timestamp ວັນທີ-ເວລາລົງນາມ
  createdBy: string;
  updatedAt: string; // ISO string
  sheetRowNumber?: number; // 1-based row index inside Google Sheets
}

export type DocumentInput = Omit<DocumentRecord, 'id' | 'updatedAt' | 'createdBy' | 'sheetRowNumber'>;

export interface DocumentFilters {
  query: string;
  direction: 'all' | DocumentDirection;
  purpose: 'all' | DocumentPurpose;
  status: 'all' | DocumentStatus;
  department: string;
  dateFrom: string;
  dateTo: string;
  sortOrder: SortOrder;
}

export interface DocumentStats {
  total: number;
  incoming: number;
  outgoing: number;
  legal: number;
  speech: number;
  pendingAction: number;
  completed: number;
}

export interface ValidationErrors {
  docNumber?: string;
  outgoingDocNumber?: string;
  docDate?: string;
  incomingDate?: string;
  outgoingDate?: string;
  dueDate?: string;
  title?: string;
  department?: string;
  scanLink?: string;
  signatureDataUrl?: string;
}

export type StorageProviderMode = 'google' | 'local_drive' | 'both';

export interface LocalDriveConfig {
  mode: StorageProviderMode;
  driveLetterPath: string; // e.g. D:\DocManager
  excelFilePath: string; // e.g. D:\DocManager\documents.xlsx
  scansFolderPath: string; // e.g. D:\DocManager\Scans
  linkedFolderName: string;
  linkedExcelFileName: string;
  lastLocalSyncAt: string;
}

export type AccessApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface AccessRequestRecord {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  reason: string;
  status: AccessApprovalStatus;
  reviewedByEmail: string;
  adminNote: string;
  requestedAt: string;
  updatedAt: string;
}

export interface WorkspaceSharedConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  updatedByEmail: string;
  updatedAt: string;
}

export enum NotificationTriggerType {
  NEW_SHEET_DOCUMENT = 'new_sheet_document',
  DUE_DATE_REACHED = 'due_date_reached',
  TEST = 'test',
}

export interface NotificationSettings {
  enabled: boolean;
  notifyOnNewSheetRows: boolean;
  notifyOnDueDate: boolean;
  pollIntervalSeconds: number;
  lockScreenDisplay: boolean;
  requireInteraction: boolean;
  soundAndVibration: boolean;
  backgroundPushEnabled: boolean;
}

export interface DocumentWatchItem {
  id: string;
  docNumber: string;
  title: string;
  direction: DocumentDirection;
  dueDate: string;
  department: string;
  status: DocumentStatus;
}

export type PushSubscriptionSupport = 'supported' | 'unsupported' | 'insecure_context';

export interface DesktopPushState {
  support: PushSubscriptionSupport;
  subscribed: boolean;
  subscriptionEndpoint: string | null;
  serverReady: boolean;
  activeServerSubscribers: number;
  lastError: string | null;
}

export interface AppNotificationItem {
  id: string;
  type: NotificationTriggerType;
  title: string;
  body: string;
  docId?: string;
  createdAt: string;
  read: boolean;
}

export interface WorkspaceConnection {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  sheetTitle: string;
  sheetId: number;
  driveFolderId: string;
  driveFolderName: string;
  driveFolderUrl: string;
}

export const DIRECTION_LABELS: Record<DocumentDirection, string> = {
  [DocumentDirection.INCOMING]: 'ຂາເຂົ້າ',
  [DocumentDirection.OUTGOING]: 'ຂາອອກ',
  [DocumentDirection.LEGAL]: 'ນິຕິກຳ',
  [DocumentDirection.SPEECH]: 'ບົດໂອ້ລົມ',
};

export const PURPOSE_LABELS: Record<DocumentPurpose, string> = {
  [DocumentPurpose.OPINION]: 'ຂໍຄຳເຫັນ',
  [DocumentPurpose.SIGNATURE]: 'ຂໍລາຍເຊັນ',
  [DocumentPurpose.GUIDANCE]: 'ຂໍທິດຊີ້ນຳ',
  [DocumentPurpose.INFO]: 'ເພື່ອຊາບ',
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  [DocumentStatus.PENDING]: 'ລໍຖ້າດຳເນີນການ',
  [DocumentStatus.IN_PROGRESS]: 'ກຳລັງດຳເນີນການ',
  [DocumentStatus.COMPLETED]: 'ສຳເລັດແລ້ວ',
  [DocumentStatus.RETURNED]: 'ສົ່ງຄືນ / ແກ້ໄຂ',
};

export const DEFAULT_FILTERS: DocumentFilters = {
  query: '',
  direction: 'all',
  purpose: 'all',
  status: 'all',
  department: '',
  dateFrom: '',
  dateTo: '',
  sortOrder: SortOrder.DATE_DESC,
};
