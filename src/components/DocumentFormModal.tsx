import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, FileUp, Paperclip, Trash2, X } from 'lucide-react';
import {
  DIRECTION_LABELS,
  DocumentDirection,
  DocumentInput,
  DocumentPurpose,
  DocumentRecord,
  DocumentStatus,
  PURPOSE_LABELS,
  STATUS_LABELS,
  ValidationErrors,
} from '../types/document';
import {
  getEffectiveIncomingDate,
  getEffectiveOutgoingDate,
  hasValidationErrors,
  resolvePrimaryDocDate,
  validateDocumentInput,
} from '../utils/documentLogic';
import { CreateToastInput } from '../utils/toastLogic';
import { ChannelEmblem } from './AppLogo';
import { SignaturePad } from './SignaturePad';

interface DocumentFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialRecord: DocumentRecord | null;
  defaultDirection?: DocumentDirection;
  isDemoMode: boolean;
  isSubmitting: boolean;
  onUploadFileToDrive: (file: File) => Promise<{
    id: string;
    name: string;
    webViewLink: string;
  }>;
  onNotifyToast?: (input: CreateToastInput) => string;
  onSubmit: (input: DocumentInput) => void;
  onClose: () => void;
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DocumentFormModal: React.FC<DocumentFormModalProps> = ({
  open,
  mode,
  initialRecord,
  defaultDirection = DocumentDirection.INCOMING,
  isDemoMode,
  isSubmitting,
  onUploadFileToDrive,
  onNotifyToast,
  onSubmit,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [direction, setDirection] = useState<DocumentDirection>(defaultDirection);
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState(getTodayIso());
  const [incomingDate, setIncomingDate] = useState(getTodayIso());
  const [outgoingDate, setOutgoingDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [purpose, setPurpose] = useState<DocumentPurpose>(DocumentPurpose.OPINION);
  const [leadershipComment, setLeadershipComment] = useState('');
  const [status, setStatus] = useState<DocumentStatus>(DocumentStatus.PENDING);
  const [scanLink, setScanLink] = useState('');
  const [scanFileName, setScanFileName] = useState('');
  const [driveFileId, setDriveFileId] = useState('');
  const [approverName, setApproverName] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [signedAt, setSignedAt] = useState('');

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initialRecord) {
      setDirection(initialRecord.direction);
      setDocNumber(initialRecord.docNumber);
      setDocDate(initialRecord.docDate);
      setIncomingDate(getEffectiveIncomingDate(initialRecord));
      setOutgoingDate(getEffectiveOutgoingDate(initialRecord));
      setDueDate(initialRecord.dueDate || '');
      setTitle(initialRecord.title);
      setDepartment(initialRecord.department);
      setPurpose(initialRecord.purpose);
      setLeadershipComment(initialRecord.leadershipComment);
      setStatus(initialRecord.status);
      setScanLink(initialRecord.scanLink);
      setScanFileName(initialRecord.scanFileName);
      setDriveFileId(initialRecord.driveFileId);
      setApproverName(initialRecord.approverName || '');
      setSignatureDataUrl(initialRecord.signatureDataUrl || '');
      setSignedAt(initialRecord.signedAt || '');
    } else {
      const today = getTodayIso();
      setDirection(defaultDirection);
      setDocNumber('');
      setDocDate(today);
      setIncomingDate(today);
      setOutgoingDate('');
      setDueDate('');
      setTitle('');
      setDepartment('');
      setPurpose(DocumentPurpose.OPINION);
      setLeadershipComment('');
      setStatus(DocumentStatus.PENDING);
      setScanLink('');
      setScanFileName('');
      setDriveFileId('');
      setApproverName('');
      setSignatureDataUrl('');
      setSignedAt('');
    }
    setErrors({});
    setUploadError(null);
  }, [open, mode, initialRecord, defaultDirection]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting && !isUploading) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, isSubmitting, isUploading, onClose]);

  if (!open) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (file.size > 25 * 1024 * 1024) {
      const msg = 'ຂະໜາດຟາຍຕ້ອງບໍ່ເກີນ 25 MB';
      setUploadError(msg);
      onNotifyToast?.({
        variant: 'error',
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: msg,
      });
      return;
    }

    if (isDemoMode) {
      const localUrl = URL.createObjectURL(file);
      setScanLink(localUrl);
      setScanFileName(file.name);
      setDriveFileId('');
      setErrors((prev) => ({ ...prev, scanLink: undefined }));
      onNotifyToast?.({
        variant: 'success',
        title: 'ແນບຟາຍສະແກນສຳເລັດ',
        description: file.name,
      });
      return;
    }

    setIsUploading(true);
    const toastId = onNotifyToast?.({
      id: 'drive-upload',
      variant: 'loading',
      title: 'ກຳລັງອັບໂຫຼດ...',
      description: `ກຳລັງອັບໂຫຼດ "${file.name}" ຂຶ້ນ Google Drive`,
    });
    try {
      const uploaded = await onUploadFileToDrive(file);
      setScanLink(uploaded.webViewLink);
      setScanFileName(uploaded.name);
      setDriveFileId(uploaded.id);
      setErrors((prev) => ({ ...prev, scanLink: undefined }));
      onNotifyToast?.({
        id: toastId || 'drive-upload',
        variant: 'success',
        title: 'ອັບໂຫຼດສຳເລັດ',
        description: uploaded.name,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'ອັບໂຫຼດຟາຍສະແກນບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່';
      setUploadError(msg);
      onNotifyToast?.({
        id: toastId || 'drive-upload',
        variant: 'error',
        title: 'ເກີດຂໍ້ຜິດພາດ',
        description: msg,
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDirectionChange = (nextDir: DocumentDirection) => {
    setDirection(nextDir);
    const today = getTodayIso();
    if (
      (nextDir === DocumentDirection.INCOMING || nextDir === DocumentDirection.OUTGOING) &&
      !incomingDate
    ) {
      setIncomingDate(today);
    } else if (!docDate) {
      setDocDate(today);
    }
    setErrors((p) => ({
      ...p,
      docDate: undefined,
      incomingDate: undefined,
      outgoingDate: undefined,
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedPrimaryDate = resolvePrimaryDocDate({
      direction,
      docDate:
        direction === DocumentDirection.INCOMING || direction === DocumentDirection.OUTGOING
          ? ''
          : docDate,
      incomingDate,
      outgoingDate,
    });
    const input: DocumentInput = {
      direction,
      docNumber: docNumber.trim(),
      docDate: resolvedPrimaryDate,
      incomingDate: incomingDate.trim(),
      outgoingDate: outgoingDate.trim(),
      dueDate: dueDate.trim(),
      title: title.trim(),
      department: department.trim(),
      purpose,
      leadershipComment: leadershipComment.trim(),
      status,
      scanLink: scanLink.trim(),
      scanFileName: scanFileName.trim(),
      driveFileId: driveFileId.trim(),
      approverName: approverName.trim(),
      signatureDataUrl: signatureDataUrl.trim(),
      signedAt: signatureDataUrl.trim() ? signedAt || new Date().toISOString() : '',
    };

    const validation = validateDocumentInput(input);
    setErrors(validation);
    if (hasValidationErrors(validation)) {
      return;
    }

    onSubmit(input);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-form-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-lg">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <h2 id="document-form-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {mode === 'create' ? 'ບັນທຶກເອກະສານໃໝ່' : 'ແກ້ໄຂຂໍ້ມູນເອກະສານ'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isUploading}
            aria-label="ປິດໜ້າຕ່າງຟອມ"
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} noValidate className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Direction Segmented Control */}
          <div>
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              ປະເພດເອກະສານ
            </span>
            <div className="inline-flex flex-wrap p-1 bg-slate-100 dark:bg-slate-800 rounded-lg gap-1">
              {Object.values(DocumentDirection).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => handleDirectionChange(dir)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[38px] text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    direction === dir
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ChannelEmblem direction={dir} size="xs" />
                  <span>{DIRECTION_LABELS[dir]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Doc Number & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="doc-number-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {direction === DocumentDirection.LEGAL
                  ? 'ເລກທີນິຕິກຳ'
                  : direction === DocumentDirection.SPEECH
                  ? 'ເລກທີບົດໂອ້ລົມ'
                  : direction === DocumentDirection.OUTGOING
                  ? 'ເລກທີເອກະສານຂາອອກ'
                  : 'ເລກທີເອກະສານຂາເຂົ້າ'}{' '}
                <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                id="doc-number-input"
                type="text"
                value={docNumber}
                onChange={(e) => {
                  setDocNumber(e.target.value);
                  if (errors.docNumber) setErrors((p) => ({ ...p, docNumber: undefined }));
                }}
                placeholder={
                  direction === DocumentDirection.LEGAL
                    ? 'ຕົວຢ່າງ: 015/ນກ-2026'
                    : direction === DocumentDirection.SPEECH
                    ? 'ຕົວຢ່າງ: 009/ບອ-2026'
                    : direction === DocumentDirection.OUTGOING
                    ? 'ຕົວຢ່າງ: 119/ຂອ-2026'
                    : 'ຕົວຢ່າງ: 043/ຂຂ-2026'
                }
                className={`w-full px-3.5 py-2.5 min-h-[42px] text-sm font-mono-tabular bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 dark:focus:border-blue-500 ${
                  errors.docNumber ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.docNumber && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                  {errors.docNumber}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="doc-due-date-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                ວັນທີກຳນົດ (ແຈ້ງເຕືອນ)
              </label>
              <input
                id="doc-due-date-input"
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (errors.dueDate) setErrors((p) => ({ ...p, dueDate: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 min-h-[42px] text-sm font-mono-tabular bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 dark:focus:border-blue-500 ${
                  errors.dueDate ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.dueDate && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                  {errors.dueDate}
                </p>
              )}
            </div>
          </div>

          {/* Separated Incoming Date & Outgoing Date (or Legal/Speech date) */}
          {direction === DocumentDirection.INCOMING || direction === DocumentDirection.OUTGOING ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="doc-incoming-date-input"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາເຂົ້າ{' '}
                  <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  id="doc-incoming-date-input"
                  type="date"
                  required
                  value={incomingDate}
                  onChange={(e) => {
                    setIncomingDate(e.target.value);
                    if (errors.incomingDate) setErrors((p) => ({ ...p, incomingDate: undefined }));
                  }}
                  className={`w-full px-3.5 py-2.5 min-h-[42px] text-sm font-mono-tabular bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 dark:focus:border-blue-500 ${
                    errors.incomingDate ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
                {errors.incomingDate && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                    {errors.incomingDate}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="doc-outgoing-date-input"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາອອກ{' '}
                  <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                    (ບໍ່ບັງຄັບ)
                  </span>
                </label>
                <input
                  id="doc-outgoing-date-input"
                  type="date"
                  value={outgoingDate}
                  onChange={(e) => {
                    setOutgoingDate(e.target.value);
                    if (errors.outgoingDate) setErrors((p) => ({ ...p, outgoingDate: undefined }));
                  }}
                  className={`w-full px-3.5 py-2.5 min-h-[42px] text-sm font-mono-tabular bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 dark:focus:border-blue-500 ${
                    errors.outgoingDate ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                  }`}
                />
                {errors.outgoingDate && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                    {errors.outgoingDate}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="doc-date-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {direction === DocumentDirection.LEGAL
                  ? 'ວັນທີ, ເດືອນ, ປີ ອອກນິຕິກຳ'
                  : 'ວັນທີ, ເດືອນ, ປີ ບົດໂອ້ລົມ'}{' '}
                <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                id="doc-date-input"
                type="date"
                value={docDate}
                onChange={(e) => {
                  setDocDate(e.target.value);
                  if (errors.docDate) setErrors((p) => ({ ...p, docDate: undefined }));
                }}
                className={`w-full px-3.5 py-2.5 min-h-[42px] text-sm font-mono-tabular bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 dark:focus:border-blue-500 ${
                  errors.docDate ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.docDate && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                  {errors.docDate}
                </p>
              )}
            </div>
          )}

          {/* Document Title */}
          <div>
            <label htmlFor="doc-title-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              ຫົວຂໍ້ເອກະສານ <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="doc-title-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((p) => ({ ...p, title: undefined }));
              }}
              placeholder="ປ້ອນຫົວຂໍ້ ຫຼື ເນື້ອໃນຫຍໍ້ຂອງເອກະສານ..."
              className={`w-full px-3.5 py-2.5 min-h-[42px] text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 dark:focus:border-blue-500 ${
                errors.title ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {errors.title && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                {errors.title}
              </p>
            )}
          </div>

          {/* Department */}
          <div>
            <label htmlFor="doc-department-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {direction === DocumentDirection.INCOMING
                ? 'ພາກສ່ວນສົ່ງເອກະສານມາ'
                : direction === DocumentDirection.OUTGOING
                ? 'ພາກສ່ວນຮັບເອກະສານ'
                : direction === DocumentDirection.LEGAL
                ? 'ພາກສ່ວນອອກ / ຮັບຜິດຊອບ'
                : 'ພາກສ່ວນ / ເຈົ້າພາບຈັດງານ'}{' '}
              <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="doc-department-input"
              type="text"
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                if (errors.department) setErrors((p) => ({ ...p, department: undefined }));
              }}
              placeholder="ຕົວຢ່າງ: ພະແນກການເງິນ"
              className={`w-full px-3.5 py-2.5 min-h-[42px] text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 dark:focus:border-blue-500 ${
                errors.department ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {errors.department && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                {errors.department}
              </p>
            )}
          </div>

          {/* Purpose & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="doc-purpose-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                ຈຸດປະສົງ
              </label>
              <select
                id="doc-purpose-select"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as DocumentPurpose)}
                className="w-full px-3.5 py-2.5 min-h-[42px] text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 dark:focus:border-blue-500"
              >
                {Object.values(DocumentPurpose).map((p) => (
                  <option key={p} value={p}>
                    {PURPOSE_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="doc-status-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                ສະຖານະການຕິດຕາມເອກະສານ
              </label>
              <select
                id="doc-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as DocumentStatus)}
                className="w-full px-3.5 py-2.5 min-h-[42px] text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 dark:focus:border-blue-500"
              >
                {Object.values(DocumentStatus).map((st) => (
                  <option key={st} value={st}>
                    {STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="doc-comment-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                ຄຳເຫັນຂອງການນຳ
              </label>
              <textarea
                id="doc-comment-input"
                rows={3}
                value={leadershipComment}
                onChange={(e) => setLeadershipComment(e.target.value)}
                placeholder="ບັນທຶກຄຳເຫັນ, ທິດຊີ້ນຳ ຫຼື ໝາຍເຫດຈາກການນຳ..."
                className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 dark:focus:border-blue-500"
              />
            </div>
          </div>

          {/* Canvas-based Digital Signature */}
          <SignaturePad
            approverName={approverName}
            signatureDataUrl={signatureDataUrl}
            signedAt={signedAt}
            onApproverNameChange={setApproverName}
            onSignatureChange={(nextDataUrl, nextSignedAt) => {
              setSignatureDataUrl(nextDataUrl);
              setSignedAt(nextSignedAt);
              if (errors.signatureDataUrl) {
                setErrors((p) => ({ ...p, signatureDataUrl: undefined }));
              }
            }}
            errorMessage={errors.signatureDataUrl}
          />

          {/* Scanned File Upload & Link */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="doc-scan-link-input" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ຟາຍສະແກນເອກະສານ (Google Drive)
              </label>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="scan-file-upload"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isSubmitting}
                  className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[38px] text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors whitespace-nowrap"
                >
                  <FileUp className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>
                    {isUploading
                      ? 'ກຳລັງອັບໂຫຼດຂຶ້ນ Drive...'
                      : isDemoMode
                      ? 'ແນບຟາຍສະແກນ (ຕົວຢ່າງ)'
                      : 'ອັບໂຫຼດຟາຍສະແກນຂຶ້ນ Drive'}
                  </span>
                </button>
              </div>
            </div>

            {uploadError && (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {uploadError}
              </p>
            )}

            {scanFileName && (
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
                  <span className="truncate text-slate-800 dark:text-slate-200 font-medium">{scanFileName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {scanLink && (
                    <a
                      href={scanLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>ເປີດຟາຍ</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setScanFileName('');
                      setScanLink('');
                      setDriveFileId('');
                    }}
                    aria-label="ລ້າງຟາຍທີ່ແນບ"
                    className="p-1 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            <div>
              <input
                id="doc-scan-link-input"
                type="url"
                value={scanLink}
                onChange={(e) => {
                  setScanLink(e.target.value);
                  if (errors.scanLink) setErrors((p) => ({ ...p, scanLink: undefined }));
                }}
                placeholder="ຫຼື ວາງລິ້ງ Google Drive ຂອງຟາຍສະແກນ (https://...)"
                className={`w-full px-3.5 py-2.5 min-h-[42px] text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 dark:focus:border-blue-500 ${
                  errors.scanLink ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.scanLink && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                  {errors.scanLink}
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isUploading}
              className="px-4 py-2.5 min-h-[42px] text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              ຍົກເລີກ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-5 py-2.5 min-h-[42px] text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-blue-400 rounded-lg transition-colors whitespace-nowrap"
            >
              {isSubmitting
                ? 'ກຳລັງບັນທຶກ...'
                : mode === 'create'
                ? 'ບັນທຶກເອກະສານ'
                : 'ບັນທຶກການແກ້ໄຂ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
