import React, { useState } from 'react';
import { Download, FileSpreadsheet, QrCode, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import {
  DIRECTION_LABELS,
  DocumentDirection,
  DocumentFilters,
  DocumentPurpose,
  DocumentStatus,
  PURPOSE_LABELS,
  SortOrder,
  STATUS_LABELS,
} from '../types/document';
import { ChannelEmblem } from './AppLogo';

interface SearchFilterBarProps {
  filters: DocumentFilters;
  totalResults: number;
  onChange: (next: DocumentFilters) => void;
  onReset: () => void;
  onExportCsv: () => void;
  onExportExcel?: () => void;
  onOpenQrScanner?: () => void;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  filters,
  totalResults,
  onChange,
  onReset,
  onExportCsv,
  onExportExcel,
  onOpenQrScanner,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeAdvancedCount =
    (filters.purpose !== 'all' ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0) +
    (filters.department.trim() ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0);

  const hasAnyFilter =
    Boolean(filters.query.trim()) ||
    filters.direction !== 'all' ||
    activeAdvancedCount > 0;

  return (
    <section
      aria-label="ຄົ້ນຫາ ແລະ ກັ່ນຕອງເອກະສານ"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3"
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search
            className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="doc-search-input" className="sr-only">
            ຄົ້ນຫາເອກະສານ
          </label>
          <input
            id="doc-search-input"
            type="search"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="ຄົ້ນຫາເລກທີຂາເຂົ້າ-ຂາອອກ, ຫົວຂໍ້, ພາກສ່ວນ ຫຼື ຄຳເຫັນ..."
            className="w-full pl-10 pr-4 py-2 min-h-[42px] text-sm bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 dark:focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Direction segmented filter */}
          <div
            className="inline-flex flex-wrap p-1 bg-slate-100 dark:bg-slate-800 rounded-lg gap-0.5 max-w-full"
            role="group"
            aria-label="ປະເພດເອກະສານ"
          >
            <button
              type="button"
              onClick={() => onChange({ ...filters, direction: 'all' })}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filters.direction === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ChannelEmblem direction="all" size="xs" />
              <span>ທັງໝົດ</span>
            </button>
            {Object.values(DocumentDirection).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => onChange({ ...filters, direction: dir })}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filters.direction === dir
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ChannelEmblem direction={dir} size="xs" />
                <span>{DIRECTION_LABELS[dir]}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium border rounded-lg transition-colors whitespace-nowrap ${
              showAdvanced || activeAdvancedCount > 0
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              ຄົ້ນຫາລະອຽດ{activeAdvancedCount > 0 ? ` (${activeAdvancedCount})` : ''}
            </span>
          </button>

          {onOpenQrScanner && (
            <button
              type="button"
              onClick={onOpenQrScanner}
              data-testid="searchbar-qr-scanner-btn"
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors whitespace-nowrap"
            >
              <QrCode className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>ສະແກນ QR</span>
            </button>
          )}

          {onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              disabled={totalResults === 0}
              data-testid="export-excel-btn"
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>ສົ່ງອອກ Excel</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportCsv}
            disabled={totalResults === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {showAdvanced && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label htmlFor="filter-purpose" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              ຈຸດປະສົງ
            </label>
            <select
              id="filter-purpose"
              value={filters.purpose}
              onChange={(e) =>
                onChange({
                  ...filters,
                  purpose: e.target.value as DocumentFilters['purpose'],
                })
              }
              className="w-full px-3 py-2 min-h-[40px] text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
            >
              <option value="all">ທຸກຈຸດປະສົງ</option>
              {Object.values(DocumentPurpose).map((p) => (
                <option key={p} value={p}>
                  {PURPOSE_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-status" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              ສະຖານະຕິດຕາມ
            </label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(e) =>
                onChange({
                  ...filters,
                  status: e.target.value as DocumentFilters['status'],
                })
              }
              className="w-full px-3 py-2 min-h-[40px] text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
            >
              <option value="all">ທຸກສະຖານະ</option>
              {Object.values(DocumentStatus).map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABELS[st]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-department" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              ພາກສ່ວນສົ່ງ/ຮັບ
            </label>
            <input
              id="filter-department"
              type="text"
              value={filters.department}
              onChange={(e) => onChange({ ...filters, department: e.target.value })}
              placeholder="ກັ່ນຕອງຊື່ພາກສ່ວນ..."
              className="w-full px-3 py-2 min-h-[40px] text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="filter-date-from" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              ຕັ້ງແຕ່ວັນທີ
            </label>
            <input
              id="filter-date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 min-h-[40px] text-xs font-mono-tabular bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="filter-date-to" className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              ເຖິງວັນທີ
            </label>
            <input
              id="filter-date-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 min-h-[40px] text-xs font-mono-tabular bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span>
            ສະແດງ{' '}
            <strong className="font-mono-tabular text-slate-800 dark:text-slate-200">{totalResults}</strong> ລາຍການ
          </span>
          {hasAnyFilter && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 hover:underline font-medium py-1"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>ລ້າງຕົວກອງ</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort-order-select" className="text-slate-500 dark:text-slate-400">
            ລຽງລຳດັບ:
          </label>
          <select
            id="sort-order-select"
            value={filters.sortOrder}
            onChange={(e) =>
              onChange({ ...filters, sortOrder: e.target.value as SortOrder })
            }
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
          >
            <option value={SortOrder.DATE_DESC}>ວັນທີໃໝ່ສຸດກ່ອນ</option>
            <option value={SortOrder.DATE_ASC}>ວັນທີເກົ່າສຸດກ່ອນ</option>
            <option value={SortOrder.DOC_NO_ASC}>ເລກທີເອກະສານ</option>
            <option value={SortOrder.UPDATED_DESC}>ອັບເດດລ່າສຸດ</option>
          </select>
        </div>
      </div>
    </section>
  );
};
