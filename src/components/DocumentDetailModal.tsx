import React, { useEffect } from 'react';
import { BadgeCheck, ExternalLink, FileText, Pencil, PenTool, Trash2, X } from 'lucide-react';
import { DIRECTION_LABELS, DocumentDirection, DocumentRecord } from '../types/document';
import {
  formatLaoDisplayDate,
  getEffectiveIncomingDate,
  getEffectiveOutgoingDate,
} from '../utils/documentLogic';
import { formatSignatureTimestamp, isValidSignatureDataUrl } from '../utils/signatureLogic';
import { CreateToastInput } from '../utils/toastLogic';
import { CHANNEL_VISUALS, ChannelEmblem } from './AppLogo';
import { DocumentQrCodeCard } from './DocumentQrCodeCard';
import { PurposeText, StatusText } from './StatusAndPurposeText';

interface DocumentDetailModalProps {
  record: DocumentRecord | null;
  onNotifyToast?: (input: CreateToastInput) => string;
  onClose: () => void;
  onEdit: (record: DocumentRecord) => void;
  onDelete: (record: DocumentRecord) => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  record,
  onNotifyToast,
  onClose,
  onEdit,
  onDelete,
}) => {
  useEffect(() => {
    if (!record) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [record, onClose]);

  if (!record) return null;

  const incomingDate = getEffectiveIncomingDate(record);
  const outgoingDate = getEffectiveOutgoingDate(record);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-lg">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ChannelEmblem direction={record.direction} size="xs" />
              <span className={`font-semibold ${CHANNEL_VISUALS[record.direction].accentTextClass}`}>
                {DIRECTION_LABELS[record.direction]}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular font-semibold text-slate-700 dark:text-slate-200">
                {record.docNumber}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">{formatLaoDisplayDate(record.docDate)}</span>
            </div>
            <h2
              id="detail-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 leading-snug"
            >
              {record.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ປິດໜ້າຕ່າງລາຍລະອຽດ"
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                {record.direction === DocumentDirection.INCOMING
                  ? 'ພາກສ່ວນສົ່ງເອກະສານມາ'
                  : record.direction === DocumentDirection.OUTGOING
                  ? 'ພາກສ່ວນຮັບເອກະສານ'
                  : record.direction === DocumentDirection.LEGAL
                  ? 'ພາກສ່ວນອອກ / ຮັບຜິດຊອບ'
                  : 'ພາກສ່ວນ / ເຈົ້າພາບຈັດງານ'}
              </dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{record.department}</dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400 mb-1">ຈຸດປະສົງ</dt>
              <dd>
                <PurposeText purpose={record.purpose} />
              </dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400 mb-1">ສະຖານະຕິດຕາມ</dt>
              <dd>
                <StatusText status={record.status} />
              </dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400 mb-1">ລະຫັດອ້າງອີງ</dt>
              <dd className="font-mono-tabular text-slate-700 dark:text-slate-300">{record.id}</dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາເຂົ້າ
              </dt>
              <dd className="font-mono-tabular font-medium text-blue-700 dark:text-blue-400">
                {incomingDate ? formatLaoDisplayDate(incomingDate) : '-'}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາອອກ
              </dt>
              <dd className="font-mono-tabular font-medium text-teal-700 dark:text-teal-400">
                {outgoingDate ? formatLaoDisplayDate(outgoingDate) : '-'}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400 mb-1">ວັນທີກຳນົດ</dt>
              <dd className="font-mono-tabular text-slate-700 dark:text-slate-300">
                {record.dueDate ? formatLaoDisplayDate(record.dueDate) : 'ບໍ່ໄດ້ກຳນົດ'}
              </dd>
            </div>
          </dl>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">ຄຳເຫັນຂອງການນຳ</div>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {record.leadershipComment || 'ຍັງບໍ່ມີຄຳເຫັນຂອງການນຳ'}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <PenTool className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                <span>ລາຍເຊັນດິຈິຕອນຜູ້ອະນຸມັດ</span>
              </div>
              {isValidSignatureDataUrl(record.signatureDataUrl) && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    {record.signedAt
                      ? `ລົງນາມແລ້ວ · ${formatSignatureTimestamp(record.signedAt)}`
                      : 'ລົງນາມແລ້ວ'}
                  </span>
                </span>
              )}
            </div>

            {isValidSignatureDataUrl(record.signatureDataUrl) ? (
              <div
                data-testid="detail-signature-box"
                className="bg-white border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2"
              >
                <div className="border-b border-dashed border-slate-200 pb-2">
                  <img
                    src={record.signatureDataUrl}
                    alt={`ລາຍເຊັນຜູ້ອະນຸມັດ ${record.approverName || record.docNumber}`}
                    className="max-h-28 w-auto mx-auto object-contain"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">
                    {record.approverName || 'ຜູ້ອະນຸມັດ'}
                  </span>
                  {record.signedAt && (
                    <span className="font-mono-tabular text-slate-500">
                      {formatSignatureTimestamp(record.signedAt)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {record.approverName
                  ? `ຜູ້ອະນຸມັດ: ${record.approverName} (ຍັງບໍ່ທັນໄດ້ແຕ້ມລາຍເຊັນ)`
                  : 'ຍັງບໍ່ທັນມີລາຍເຊັນຜູ້ອະນຸມັດ'}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">ຟາຍສະແກນເອກະສານ</div>
            {record.scanLink ? (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {record.scanFileName || 'ຟາຍສະແກນເອກະສານ'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{record.scanLink}</div>
                  </div>
                </div>
                <a
                  href={record.scanLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>ເປີດເບິ່ງເອກະສານ</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">ຍັງບໍ່ໄດ້ແນບຟາຍສະແກນເອກະສານ</div>
            )}
          </div>

          <DocumentQrCodeCard record={record} onNotifyToast={onNotifyToast} />
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(record);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition-colors whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            <span>ລຶບເອກະສານ</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[40px] text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              ປິດ
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(record);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
            >
              <Pencil className="w-4 h-4" aria-hidden="true" />
              <span>ແກ້ໄຂ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
