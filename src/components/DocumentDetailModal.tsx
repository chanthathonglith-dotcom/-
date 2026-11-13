import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BadgeCheck, Check, Copy, ExternalLink, FileText, Pencil, PenTool, Printer, Trash2, X } from 'lucide-react';
import { DIRECTION_LABELS, DocumentDirection, DocumentRecord } from '../types/document';
import {
  formatLaoDisplayDate,
  getEffectiveIncomingDate,
  getEffectiveOutgoingDate,
} from '../utils/documentLogic';
import {
  copyTextToClipboard,
  formatDocumentDetailsForClipboard,
} from '../utils/documentCopyLogic';
import { buildPrintableDocumentSummary } from '../utils/documentPrintLogic';
import { buildDocumentQrPayload, generateQrCodeDataUrl } from '../utils/qrCodeLogic';
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
  const [printQrDataUrl, setPrintQrDataUrl] = useState<string>('');
  const [copiedDetails, setCopiedDetails] = useState(false);

  useEffect(() => {
    setCopiedDetails(false);
  }, [record?.id]);

  useEffect(() => {
    if (!record) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [record, onClose]);

  const trackingQrPayload = useMemo(
    () => (record ? buildDocumentQrPayload(record, 'tracking') : ''),
    [record]
  );

  useEffect(() => {
    let cancelled = false;
    if (!trackingQrPayload) {
      setPrintQrDataUrl('');
      return;
    }

    generateQrCodeDataUrl(trackingQrPayload, 180)
      .then((url) => {
        if (!cancelled) {
          setPrintQrDataUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPrintQrDataUrl('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trackingQrPayload]);

  const printSummary = useMemo(
    () => (record ? buildPrintableDocumentSummary(record) : null),
    [record]
  );

  if (!record || !printSummary) return null;

  const incomingDate = getEffectiveIncomingDate(record);
  const outgoingDate = getEffectiveOutgoingDate(record);

  const handlePrintDetails = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  const handleCopyAllDetails = async () => {
    const formatted = formatDocumentDetailsForClipboard(record, trackingQrPayload);
    const didCopy = await copyTextToClipboard(formatted);

    if (didCopy) {
      setCopiedDetails(true);
      onNotifyToast?.({
        variant: 'success',
        title: 'ສຳເນົາຂໍ້ມູນສຳເລັດ',
        description: `ສຳເນົາຂໍ້ມູນເອກະສານ "${record.docNumber}" ລົງ Clipboard ແລ້ວ`,
      });
      window.setTimeout(() => setCopiedDetails(false), 1800);
    } else {
      onNotifyToast?.({
        variant: 'error',
        title: 'ບໍ່ສາມາດສຳເນົາຂໍ້ມູນໄດ້',
        description: 'ກະລຸນາລອງໃໝ່ອີກຄັ້ງ ຫຼື ຄັດລອກຂໍ້ຄວາມດ້ວຍຕົນເອງ',
      });
    }
  };

  const printSheet = (
    <article
      data-testid="document-print-view"
      aria-label="ສະບັບພິມລາຍລະອຽດເອກະສານ"
      className="hidden print:block bg-white text-slate-900 w-full p-0"
    >
      <header className="flex items-start justify-between gap-4 pb-4 border-b-2 border-slate-900">
        <div className="flex items-center gap-3">
          <ChannelEmblem direction={record.direction} size="sm" />
          <div>
            <div className="text-xs font-medium text-slate-600">
              ລະບົບຄຸ້ມຄອງເອກະສານ · {printSummary.directionLabel}
            </div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight mt-0.5">
              ໃບບັນທຶກລາຍລະອຽດເອກະສານ
            </h1>
          </div>
        </div>
        <div className="text-right text-xs text-slate-600 font-mono-tabular">
          <div>ລະຫັດ: {printSummary.referenceId}</div>
          <div>ພິມເມື່ອ: {printSummary.printedAtText}</div>
        </div>
      </header>

      <section className="mt-5">
        <div className="text-xs font-medium text-slate-500">ຫົວຂໍ້ / ເນື້ອໃນຫຍໍ້ເອກະສານ</div>
        <h2 className="text-xl font-bold text-slate-900 leading-snug mt-1">
          {printSummary.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-700 font-mono-tabular">
          <span>ເລກທີ: {printSummary.docNumber}</span>
          {record.outgoingDocNumber && (
            <>
              <span aria-hidden="true">·</span>
              <span>ເລກທີຂາອອກ: {printSummary.outgoingDocNumber}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>ສະຖານະ: {printSummary.statusLabel}</span>
        </div>
      </section>

      <section className="mt-5 border border-slate-300 rounded-lg overflow-hidden">
        <dl className="grid grid-cols-2 divide-y divide-slate-200 text-xs">
          {printSummary.metadataRows.map((item, idx) => (
            <div
              key={item.label}
              className={`px-3.5 py-2.5 ${idx % 2 === 1 ? 'border-l border-slate-200' : ''}`}
            >
              <dt className="text-slate-500 mb-0.5">{item.label}</dt>
              <dd
                className={`text-sm font-semibold text-slate-900 ${
                  item.mono ? 'font-mono-tabular' : ''
                }`}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-5 break-inside-avoid">
        <div className="text-xs font-semibold text-slate-700 mb-1.5">ຄຳເຫັນຂອງການນຳ</div>
        <div className="p-3.5 border border-slate-300 rounded-lg text-sm text-slate-900 leading-relaxed whitespace-pre-wrap min-h-[68px]">
          {printSummary.leadershipComment}
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-4 break-inside-avoid">
        <div className="border border-slate-300 rounded-lg p-3.5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
            <span>ລາຍເຊັນດິຈິຕອນຜູ້ອະນຸມັດ</span>
            {printSummary.hasSignature && (
              <span className="text-emerald-700 font-medium">ລົງນາມແລ້ວ</span>
            )}
          </div>

          {printSummary.hasSignature ? (
            <div className="my-2 flex items-center justify-center">
              <img
                src={printSummary.signatureDataUrl}
                alt={`ລາຍເຊັນຜູ້ອະນຸມັດ ${printSummary.approverName || printSummary.docNumber}`}
                className="max-h-20 w-auto object-contain"
              />
            </div>
          ) : (
            <div className="my-4 text-xs text-slate-400 text-center">
              (ຍັງບໍ່ທັນມີລາຍເຊັນດິຈິຕອນ)
            </div>
          )}

          <div className="pt-2 border-t border-dashed border-slate-300 flex items-center justify-between gap-2 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">
              {printSummary.approverName || 'ຜູ້ອະນຸມັດ: -'}
            </span>
            {printSummary.signedAtText && (
              <span className="font-mono-tabular text-slate-500">
                {printSummary.signedAtText}
              </span>
            )}
          </div>
        </div>

        <div className="border border-slate-300 rounded-lg p-3.5 flex items-center gap-3 min-h-[140px]">
          {printQrDataUrl ? (
            <img
              src={printQrDataUrl}
              alt={`QR Code ຕິດຕາມເອກະສານ ${printSummary.docNumber}`}
              className="w-24 h-24 border border-slate-200 rounded p-1 shrink-0 object-contain"
            />
          ) : (
            <div className="w-24 h-24 border border-slate-200 rounded shrink-0 flex items-center justify-center text-[11px] text-slate-400">
              QR
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-1 text-xs">
            <div className="font-semibold text-slate-800">QR Code ຕິດຕາມເອກະສານ</div>
            <div className="font-mono-tabular text-slate-700 break-all">
              {trackingQrPayload}
            </div>
            {printSummary.scanLink && (
              <div className="pt-1 border-t border-slate-200 text-slate-600 break-all">
                ຟາຍສະແກນ: {printSummary.scanFileName || printSummary.scanLink}
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="mt-6 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <span>ເອກະສານສະບັບນີ້ພິມຈາກລະບົບຄຸ້ມຄອງເອກະສານຂາເຂົ້າ-ຂາອອກ</span>
        <span className="font-mono-tabular">{printSummary.referenceId}</span>
      </footer>
    </article>
  );

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-[1px] print:hidden"
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
                {record.outgoingDocNumber && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular font-semibold text-teal-700 dark:text-teal-400">
                      ຂາອອກ: {record.outgoingDocNumber}
                    </span>
                  </>
                )}
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
                  ເລກທີເອກະສານຂາອອກ
                </dt>
                <dd className="font-mono-tabular font-medium text-teal-700 dark:text-teal-400">
                  {record.outgoingDocNumber || '-'}
                </dd>
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

          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(record);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span>ລຶບເອກະສານ</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="detail-copy-all-btn"
                aria-label="ສຳເນົາຂໍ້ມູນເອກະສານທັງໝົດ"
                onClick={handleCopyAllDetails}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {copiedDetails ? (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{copiedDetails ? 'ສຳເນົາແລ້ວ' : 'ສຳເນົາຂໍ້ມູນ'}</span>
              </button>
              <button
                type="button"
                data-testid="detail-print-btn"
                aria-label="ພິມລາຍລະອຽດເອກະສານ"
                onClick={handlePrintDetails}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Printer className="w-4 h-4" aria-hidden="true" />
                <span>ພິມເອກະສານ</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 min-h-[40px] text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                ປິດ
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(record);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Pencil className="w-4 h-4" aria-hidden="true" />
                <span>ແກ້ໄຂ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {typeof document !== 'undefined' ? createPortal(printSheet, document.body) : null}
    </>
  );
};

