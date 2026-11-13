import React from 'react';
import { BadgeCheck, ExternalLink, Eye, FilePlus2, FileText, Pencil, Trash2 } from 'lucide-react';
import { DIRECTION_LABELS, DocumentDirection, DocumentRecord } from '../types/document';
import {
  formatLaoDisplayDate,
  getEffectiveIncomingDate,
  getEffectiveOutgoingDate,
} from '../utils/documentLogic';
import { isValidSignatureDataUrl } from '../utils/signatureLogic';
import { CHANNEL_VISUALS, ChannelEmblem } from './AppLogo';
import { PurposeText, StatusText } from './StatusAndPurposeText';

interface DocumentListProps {
  documents: DocumentRecord[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  onView: (doc: DocumentRecord) => void;
  onEdit: (doc: DocumentRecord) => void;
  onDelete: (doc: DocumentRecord) => void;
  onCreateNew: () => void;
  onResetFilters: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  isLoading,
  hasActiveFilters,
  onView,
  onEdit,
  onDelete,
  onCreateNew,
  onResetFilters,
}) => {
  if (isLoading) {
    return (
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800"
        aria-busy="true"
        aria-label="ກຳລັງໂຫຼດລາຍການເອກະສານ"
      >
        {[0, 1, 2, 3, 4].map((idx) => (
          <div key={idx} className="p-4 flex items-center justify-between gap-4 animate-pulse">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800/70 rounded w-3/4" />
            </div>
            <div className="h-4 bg-slate-100 dark:bg-slate-800/70 rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" aria-hidden="true" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {hasActiveFilters ? 'ບໍ່ພົບເອກະສານທີ່ກົງກັບເງື່ອນໄຂ' : 'ຍັງບໍ່ມີເອກະສານໃນລະບົບ'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {hasActiveFilters
              ? 'ລອງປ່ຽນຄຳຄົ້ນຫາ ຫຼື ລ້າງຕົວກອງເພື່ອເບິ່ງລາຍການເອກະສານທັງໝົດ.'
              : 'ເລີ່ມຕົ້ນບັນທຶກເອກະສານ (ຂາເຂົ້າ, ຂາອອກ, ນິຕິກຳ ຫຼື ບົດໂອ້ລົມ) ສະບັບທຳອິດ ພ້ອມແນບຟາຍສະແກນໄດ້ເລີຍ.'}
          </p>
        </div>
        <div className="pt-1">
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-4 py-2.5 min-h-[42px] text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              ລ້າງຕົວກອງທັງໝົດ
            </button>
          ) : (
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors"
            >
              <FilePlus2 className="w-4 h-4" aria-hidden="true" />
              <span>ບັນທຶກເອກະສານໃໝ່</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop & Tablet Table */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <th scope="col" className="py-2.5 pl-3.5 pr-2 whitespace-nowrap">
                  ເລກທີເອກະສານ
                </th>
                <th scope="col" className="py-2.5 px-2 leading-snug min-w-[104px]">
                  <span>ວັນທີ, ເດືອນ, ປີ</span>{' '}
                  <span className="block text-blue-700 dark:text-blue-400">ເອກະສານຂາເຂົ້າ</span>
                </th>
                <th scope="col" className="py-2.5 px-2 leading-snug min-w-[104px]">
                  <span>ວັນທີ, ເດືອນ, ປີ</span>{' '}
                  <span className="block text-teal-700 dark:text-teal-400">ເອກະສານຂາອອກ</span>
                </th>
                <th scope="col" className="py-2.5 px-2 min-w-[155px]">
                  ຫົວຂໍ້ເອກະສານ &amp; ພາກສ່ວນ
                </th>
                <th scope="col" className="py-2.5 px-2 whitespace-nowrap">
                  ຈຸດປະສົງ
                </th>
                <th scope="col" className="py-2.5 px-2 min-w-[125px]">
                  ຄຳເຫັນຂອງການນຳ
                </th>
                <th scope="col" className="py-2.5 px-2 whitespace-nowrap">
                  ສະຖານະ
                </th>
                <th scope="col" className="py-2.5 px-2 whitespace-nowrap">
                  ຟາຍສະແກນ
                </th>
                <th scope="col" className="py-2.5 pl-2 pr-3.5 text-right whitespace-nowrap">
                  ຈັດການ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {documents.map((doc) => {
                const incomingDate = getEffectiveIncomingDate(doc);
                const outgoingDate = getEffectiveOutgoingDate(doc);
                const isOtherType =
                  doc.direction === DocumentDirection.LEGAL ||
                  doc.direction === DocumentDirection.SPEECH;

                const isSigned = isValidSignatureDataUrl(doc.signatureDataUrl);

                return (
                <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors align-top">
                  <td className="py-3 pl-3.5 pr-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <ChannelEmblem direction={doc.direction} size="xs" />
                      <span className="font-mono-tabular font-semibold text-slate-900 dark:text-slate-100">
                        {doc.docNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className={`font-semibold ${CHANNEL_VISUALS[doc.direction].accentTextClass}`}>
                        {DIRECTION_LABELS[doc.direction]}
                      </span>
                      {isOtherType && doc.docDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular">{formatLaoDisplayDate(doc.docDate)}</span>
                        </>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-2 whitespace-nowrap font-mono-tabular text-xs text-slate-700 dark:text-slate-300">
                    {incomingDate ? (
                      <span className="text-blue-700 dark:text-blue-400 font-medium">
                        {formatLaoDisplayDate(incomingDate)}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600">-</span>
                    )}
                  </td>

                  <td className="py-3 px-2 whitespace-nowrap font-mono-tabular text-xs text-slate-700 dark:text-slate-300">
                    {outgoingDate ? (
                      <span className="text-teal-700 dark:text-teal-400 font-medium">
                        {formatLaoDisplayDate(outgoingDate)}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600">-</span>
                    )}
                  </td>

                  <td className="py-3 px-2">
                    <button
                      type="button"
                      onClick={() => onView(doc)}
                      className="text-left font-medium text-slate-900 dark:text-slate-100 hover:text-blue-700 dark:hover:text-blue-400 leading-snug line-clamp-2"
                    >
                      {doc.title}
                    </button>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-2">
                      <span>{doc.department}</span>
                      {doc.dueDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular text-amber-700 dark:text-amber-400">
                            ກຳນົດ: {formatLaoDisplayDate(doc.dueDate)}
                          </span>
                        </>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-2 whitespace-nowrap">
                    <PurposeText purpose={doc.purpose} />
                  </td>

                  <td className="py-3 px-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 max-w-[200px]">
                      {doc.leadershipComment || (
                        <span className="text-slate-400 dark:text-slate-500">ຍັງບໍ່ມີຄຳເຫັນ</span>
                      )}
                    </p>
                  </td>

                  <td className="py-3 px-2 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <StatusText status={doc.status} />
                      {isSigned && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
                          title={doc.approverName || 'ມີລາຍເຊັນດິຈິຕອນ'}
                        >
                          <BadgeCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>ລົງນາມແລ້ວ</span>
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-2 whitespace-nowrap">
                    {doc.scanLink ? (
                      <a
                        href={doc.scanLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline py-1"
                        aria-label={`ເປີດຟາຍສະແກນ ${doc.docNumber}`}
                      >
                        <span>ເປີດຟາຍ</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">ບໍ່ມີຟາຍ</span>
                    )}
                  </td>

                  <td className="py-3 pl-2 pr-3.5 whitespace-nowrap text-right">
                    <div className="inline-flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        onClick={() => onView(doc)}
                        aria-label={`ເບິ່ງລາຍລະອຽດ ${doc.docNumber}`}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors min-w-[32px] min-h-[32px] inline-flex items-center justify-center"
                      >
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(doc)}
                        aria-label={`ແກ້ໄຂ ${doc.docNumber}`}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors min-w-[32px] min-h-[32px] inline-flex items-center justify-center"
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(doc)}
                        aria-label={`ລຶບ ${doc.docNumber}`}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition-colors min-w-[32px] min-h-[32px] inline-flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
        {documents.map((doc) => {
          const incomingDate = getEffectiveIncomingDate(doc);
          const outgoingDate = getEffectiveOutgoingDate(doc);
          const isSigned = isValidSignatureDataUrl(doc.signatureDataUrl);
          return (
          <article key={doc.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2 min-w-0">
                <ChannelEmblem direction={doc.direction} size="xs" />
                <span className={`text-xs font-semibold whitespace-nowrap ${CHANNEL_VISUALS[doc.direction].accentTextClass}`}>
                  {DIRECTION_LABELS[doc.direction]}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {doc.docNumber}
                </span>
                {doc.direction !== DocumentDirection.INCOMING &&
                  doc.direction !== DocumentDirection.OUTGOING && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">{formatLaoDisplayDate(doc.docDate)}</span>
                    </>
                  )}
              </div>
              {isSigned && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 shrink-0">
                  <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>ລົງນາມແລ້ວ</span>
                </span>
              )}
            </div>

            {(incomingDate || outgoingDate) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                {incomingDate && (
                  <span>
                    ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາເຂົ້າ:{' '}
                    <strong className="font-mono-tabular text-blue-700 dark:text-blue-400">
                      {formatLaoDisplayDate(incomingDate)}
                    </strong>
                  </span>
                )}
                {outgoingDate && (
                  <span>
                    ວັນທີ, ເດືອນ, ປີ ເອກະສານຂາອອກ:{' '}
                    <strong className="font-mono-tabular text-teal-700 dark:text-teal-400">
                      {formatLaoDisplayDate(outgoingDate)}
                    </strong>
                  </span>
                )}
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={() => onView(doc)}
                className="text-left text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-700 dark:hover:text-blue-400 leading-snug"
              >
                {doc.title}
              </button>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-2">
                <span>{doc.department}</span>
                {doc.dueDate && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-tabular text-amber-700 dark:text-amber-400">
                      ກຳນົດ: {formatLaoDisplayDate(doc.dueDate)}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
              <PurposeText purpose={doc.purpose} />
              <StatusText status={doc.status} />
            </div>

            {doc.leadershipComment && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-2">
                <span className="font-medium text-slate-700 dark:text-slate-200">ຄຳເຫັນການນຳ:</span>{' '}
                {doc.leadershipComment}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              {doc.scanLink ? (
                <a
                  href={doc.scanLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline min-h-[40px] px-1"
                >
                  <span>ເປີດຟາຍສະແກນ</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500">ບໍ່ມີຟາຍສະແກນ</span>
              )}

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onView(doc)}
                  aria-label={`ເບິ່ງລາຍລະອຽດ ${doc.docNumber}`}
                  className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Eye className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(doc)}
                  aria-label={`ແກ້ໄຂ ${doc.docNumber}`}
                  className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Pencil className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(doc)}
                  aria-label={`ລຶບ ${doc.docNumber}`}
                  className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
          );
        })}
      </div>
    </>
  );
};
