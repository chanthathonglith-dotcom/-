import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, BarChart3, TrendingUp } from 'lucide-react';
import { DocumentDirection, DocumentRecord } from '../types/document';
import {
  aggregateByPurpose,
  aggregateByStatus,
  aggregateMonthlyDocuments,
  computeAnalyticsSummary,
  extractAvailableYears,
} from '../utils/analyticsLogic';
import { ThemeMode } from '../utils/themeLogic';
import { ChannelEmblem } from './AppLogo';

interface DocumentAnalyticsViewProps {
  documents: DocumentRecord[];
  onFilterByMonth: (monthKey: string) => void;
  theme?: ThemeMode;
}

type ChartMode = 'bar' | 'area';

interface CustomTooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  payload?: {
    monthFullLabel?: string;
    label?: string;
    total?: number;
  };
}

const MonthlyTooltip: React.FC<{
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 shadow-md text-xs space-y-1.5">
      <div className="font-bold text-slate-900 dark:text-slate-100">{point?.monthFullLabel}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span>{entry.name}</span>
          </span>
          <span className="font-mono-tabular font-semibold text-slate-900 dark:text-slate-100">
            {entry.value ?? 0} ສະບັບ
          </span>
        </div>
      ))}
      {typeof point?.total === 'number' && (
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 font-semibold text-slate-900 dark:text-slate-100">
          <span>ລວມທັງໝົດ</span>
          <span className="font-mono-tabular">{point.total} ສະບັບ</span>
        </div>
      )}
    </div>
  );
};

const PurposeTooltip: React.FC<{
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
}> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-md text-xs">
      <div className="font-semibold text-slate-900 dark:text-slate-100">{item.payload?.label}</div>
      <div className="font-mono-tabular text-blue-700 dark:text-blue-400 font-bold mt-0.5">
        {item.value ?? 0} ສະບັບ
      </div>
    </div>
  );
};

export const DocumentAnalyticsView: React.FC<DocumentAnalyticsViewProps> = ({
  documents,
  onFilterByMonth,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const availableYears = useMemo(() => extractAvailableYears(documents), [documents]);
  const [selectedYear, setSelectedYear] = useState<string>(() => availableYears[0] || 'all');
  const [chartMode, setChartMode] = useState<ChartMode>('bar');

  const effectiveYear =
    selectedYear !== 'all' && !availableYears.includes(selectedYear)
      ? availableYears[0] || 'all'
      : selectedYear;

  const monthlyData = useMemo(
    () => aggregateMonthlyDocuments(documents, effectiveYear),
    [documents, effectiveYear]
  );

  const purposeData = useMemo(
    () => aggregateByPurpose(documents, effectiveYear),
    [documents, effectiveYear]
  );

  const statusData = useMemo(
    () => aggregateByStatus(documents, effectiveYear),
    [documents, effectiveYear]
  );

  const summary = useMemo(() => computeAnalyticsSummary(monthlyData), [monthlyData]);
  const activeMonths = useMemo(
    () => monthlyData.filter((m) => m.total > 0),
    [monthlyData]
  );

  const incomingColor = isDark ? '#3B82F6' : '#1D4ED8';
  const outgoingColor = isDark ? '#14B8A6' : '#0F766E';
  const legalColor = isDark ? '#818CF8' : '#4338CA';
  const speechColor = isDark ? '#FBBF24' : '#D97706';
  const gridStroke = isDark ? '#1E293B' : '#E2E8F0';
  const axisStroke = isDark ? '#334155' : '#CBD5E1';
  const tickColor = isDark ? '#94A3B8' : '#475569';
  const cursorFill = isDark ? '#1E293B' : '#F1F5F9';

  const purposeColors = isDark
    ? ['#94A3B8', '#3B82F6', '#F59E0B', '#14B8A6']
    : ['#475569', '#1D4ED8', '#D97706', '#0F766E'];

  if (documents.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-2">
        <BarChart3 className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" aria-hidden="true" />
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">ຍັງບໍ່ມີຂໍ້ມູນສຳລັບວິເຄາະ</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          ເມື່ອມີການບັນທຶກເອກະສານຂາເຂົ້າ ຫຼື ຂາອອກແລ້ວ, ກຣາຟສະຖິຕິລາຍເດືອນຈະສະແດງຢູ່ບ່ອນນີ້.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="analytics-view">
      {/* Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="analytics-year-select" className="text-xs font-medium text-slate-600 dark:text-slate-300">
            ເລືອກປີຂໍ້ມູນ:
          </label>
          <select
            id="analytics-year-select"
            value={effectiveYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 min-h-[38px] text-xs font-mono-tabular bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
          >
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                ປີ {yr}
              </option>
            ))}
            <option value="all">ທຸກປີ</option>
          </select>
        </div>

        <div
          className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg gap-1"
          role="group"
          aria-label="ຮູບແບບກຣາຟ"
        >
          <button
            type="button"
            onClick={() => setChartMode('bar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              chartMode === 'bar'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>ກຣາຟແທ່ງ</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode('area')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              chartMode === 'area'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>ກຣາຟເສັ້ນ</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Strip */}
      <section
        aria-label="ສະຖິຕິລວມຕາມຊ່ວງເວລາ"
        className="bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden grid grid-cols-2 lg:grid-cols-4 gap-px"
      >
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">ເອກະສານທັງໝົດ</div>
          <div className="text-2xl font-bold font-mono-tabular text-slate-900 dark:text-slate-100 mt-1">
            {summary.totalDocuments}
          </div>
          <div className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
            ສະເລ່ຍ {summary.averagePerActiveMonth} ສະບັບ/ເດືອນ
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">ຂາເຂົ້າ / ຂາອອກ</div>
          <div className="text-2xl font-bold font-mono-tabular text-slate-900 dark:text-slate-100 mt-1">
            <span className="text-blue-700 dark:text-blue-400">{summary.totalIncoming}</span>
            <span className="text-slate-300 dark:text-slate-600 mx-1.5">/</span>
            <span className="text-teal-700 dark:text-teal-400">{summary.totalOutgoing}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">ນິຕິກຳ / ບົດໂອ້ລົມ</div>
          <div className="text-2xl font-bold font-mono-tabular text-slate-900 dark:text-slate-100 mt-1">
            <span className="text-indigo-700 dark:text-indigo-400">{summary.totalLegal}</span>
            <span className="text-slate-300 dark:text-slate-600 mx-1.5">/</span>
            <span className="text-amber-700 dark:text-amber-400">{summary.totalSpeech}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">ເດືອນທີ່ມີເອກະສານຫຼາຍສຸດ</div>
          <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
            {summary.peakMonthLabel}
          </div>
          <div className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
            {summary.peakMonthCount} ສະບັບ
          </div>
        </div>
      </section>

      {/* Main Monthly Chart across all 4 Document Categories */}
      <section
        aria-label="ກຣາຟເອກະສານລາຍເດືອນ"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              ຈຳນວນເອກະສານແຕ່ລະປະເພດ ຕາມແຕ່ລະເດືອນ
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ປຽບທຽບປະລິມານ ຂາເຂົ້າ, ຂາອອກ, ນິຕິກຳ ແລະ ບົດໂອ້ລົມ ({effectiveYear === 'all' ? 'ທຸກປີ' : `ປີ ${effectiveYear}`})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <ChannelEmblem direction={DocumentDirection.INCOMING} size="xs" />
              <span>ຂາເຂົ້າ</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ChannelEmblem direction={DocumentDirection.OUTGOING} size="xs" />
              <span>ຂາອອກ</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ChannelEmblem direction={DocumentDirection.LEGAL} size="xs" />
              <span>ນິຕິກຳ</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ChannelEmblem direction={DocumentDirection.SPEECH} size="xs" />
              <span>ບົດໂອ້ລົມ</span>
            </span>
          </div>
        </div>

        <div className="h-[320px] w-full" data-testid="monthly-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'bar' ? (
              <BarChart
                data={monthlyData}
                margin={{ top: 10, right: 12, left: -16, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fill: tickColor, fontSize: 12 }}
                  axisLine={{ stroke: axisStroke }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: tickColor, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<MonthlyTooltip />} cursor={{ fill: cursorFill }} />
                <Bar
                  dataKey="incoming"
                  name="ຂາເຂົ້າ"
                  fill={incomingColor}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={26}
                />
                <Bar
                  dataKey="outgoing"
                  name="ຂາອອກ"
                  fill={outgoingColor}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={26}
                />
                <Bar
                  dataKey="legal"
                  name="ນິຕິກຳ"
                  fill={legalColor}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={26}
                />
                <Bar
                  dataKey="speech"
                  name="ບົດໂອ້ລົມ"
                  fill={speechColor}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={26}
                />
              </BarChart>
            ) : (
              <AreaChart
                data={monthlyData}
                margin={{ top: 10, right: 12, left: -16, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fill: tickColor, fontSize: 12 }}
                  axisLine={{ stroke: axisStroke }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: tickColor, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<MonthlyTooltip />} />
                <Area
                  type="monotone"
                  dataKey="incoming"
                  name="ຂາເຂົ້າ"
                  stroke={incomingColor}
                  strokeWidth={2}
                  fill={incomingColor}
                  fillOpacity={0.18}
                />
                <Area
                  type="monotone"
                  dataKey="outgoing"
                  name="ຂາອອກ"
                  stroke={outgoingColor}
                  strokeWidth={2}
                  fill={outgoingColor}
                  fillOpacity={0.18}
                />
                <Area
                  type="monotone"
                  dataKey="legal"
                  name="ນິຕິກຳ"
                  stroke={legalColor}
                  strokeWidth={2}
                  fill={legalColor}
                  fillOpacity={0.18}
                />
                <Area
                  type="monotone"
                  dataKey="speech"
                  name="ບົດໂອ້ລົມ"
                  stroke={speechColor}
                  strokeWidth={2}
                  fill={speechColor}
                  fillOpacity={0.18}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </section>

      {/* Secondary Breakdown: Purpose Chart + Monthly Breakdown Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section
          aria-label="ກຣາຟສະຖິຕິຕາມຈຸດປະສົງ"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
        >
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">ຈຳນວນເອກະສານຕາມຈຸດປະສົງ</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ແຍກຕາມ ຂໍຄຳເຫັນ, ຂໍລາຍເຊັນ, ຂໍທິດຊີ້ນຳ ແລະ ເພື່ອຊາບ
            </p>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={purposeData}
                margin={{ top: 8, right: 12, left: -16, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: tickColor, fontSize: 12 }}
                  axisLine={{ stroke: axisStroke }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: tickColor, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<PurposeTooltip />} cursor={{ fill: cursorFill }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={42}>
                  {purposeData.map((entry, idx) => (
                    <Cell
                      key={entry.key}
                      fill={purposeColors[idx % purposeColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
            {statusData.map((st) => (
              <div key={st.key} className="flex items-center justify-between py-1">
                <span className="text-slate-600 dark:text-slate-400">{st.label}</span>
                <span className="font-mono-tabular font-semibold text-slate-900 dark:text-slate-100">
                  {st.count}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section
          aria-label="ຕາຕະລາງສະຫຼຸບລາຍເດືອນ"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col"
        >
          <div className="p-5 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">ສະຫຼຸບຈຳນວນລາຍເດືອນ</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ກົດທີ່ແຖວເດືອນເພື່ອເປີດເບິ່ງລາຍການເອກະສານຂອງເດືອນນັ້ນ
            </p>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-y border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <th scope="col" className="py-2.5 pl-5 pr-3">
                    ເດືອນ
                  </th>
                  <th scope="col" className="py-2.5 px-2.5 text-right whitespace-nowrap">
                    ຂາເຂົ້າ
                  </th>
                  <th scope="col" className="py-2.5 px-2.5 text-right whitespace-nowrap">
                    ຂາອອກ
                  </th>
                  <th scope="col" className="py-2.5 px-2.5 text-right whitespace-nowrap">
                    ນິຕິກຳ
                  </th>
                  <th scope="col" className="py-2.5 px-2.5 text-right whitespace-nowrap">
                    ບົດໂອ້ລົມ
                  </th>
                  <th scope="col" className="py-2.5 px-2.5 text-right whitespace-nowrap">
                    ລວມ
                  </th>
                  <th scope="col" className="py-2.5 pl-2 pr-5 text-right whitespace-nowrap">
                    ເບິ່ງຂໍ້ມູນ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {activeMonths.map((row) => (
                  <tr key={row.monthKey} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 pl-5 pr-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {row.monthFullLabel}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono-tabular text-blue-700 dark:text-blue-400 font-semibold">
                      {row.incoming}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono-tabular text-teal-700 dark:text-teal-400 font-semibold">
                      {row.outgoing}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono-tabular text-indigo-700 dark:text-indigo-400 font-semibold">
                      {row.legal}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono-tabular text-amber-700 dark:text-amber-400 font-semibold">
                      {row.speech}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono-tabular text-slate-900 dark:text-slate-100 font-bold">
                      {row.total}
                    </td>
                    <td className="py-2.5 pl-2 pr-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onFilterByMonth(row.monthKey)}
                        aria-label={`ເບິ່ງເອກະສານເດືອນ ${row.monthFullLabel}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline py-1"
                      >
                        <span>ເປີດເບິ່ງ</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
