import {
  DocumentDirection,
  DocumentPurpose,
  DocumentRecord,
  DocumentStatus,
  PURPOSE_LABELS,
  STATUS_LABELS,
} from '../types/document';

export const LAO_MONTH_SHORT = [
  'ມ.ກ.',
  'ກ.ພ.',
  'ມີ.ນ.',
  'ມ.ສ.',
  'ພ.ພ.',
  'ມິ.ຖ.',
  'ກ.ລ.',
  'ສ.ຫ.',
  'ກ.ຍ.',
  'ຕ.ລ.',
  'ພ.ຈ.',
  'ທ.ວ.',
] as const;

export const LAO_MONTH_FULL = [
  'ມັງກອນ',
  'ກຸມພາ',
  'ມີນາ',
  'ເມສາ',
  'ພຶດສະພາ',
  'ມິຖຸນາ',
  'ກໍລະກົດ',
  'ສິງຫາ',
  'ກັນຍາ',
  'ຕຸລາ',
  'ພະຈິກ',
  'ທັນວາ',
] as const;

export interface MonthlyDocumentPoint {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g., ພ.ຈ. or ພ.ຈ. 2026
  monthFullLabel: string; // e.g., ພະຈິກ 2026
  incoming: number;
  outgoing: number;
  legal: number;
  speech: number;
  total: number;
}

export interface CategoryCountPoint {
  key: string;
  label: string;
  count: number;
}

export interface AnalyticsSummary {
  totalDocuments: number;
  totalIncoming: number;
  totalOutgoing: number;
  totalLegal: number;
  totalSpeech: number;
  peakMonthLabel: string;
  peakMonthCount: number;
  averagePerActiveMonth: number;
}

export function extractAvailableYears(records: DocumentRecord[]): string[] {
  const years = new Set<string>();
  for (const doc of records) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(doc.docDate)) {
      years.add(doc.docDate.slice(0, 4));
    }
  }
  return Array.from(years).sort((a, b) => b.localeCompare(a));
}

export function aggregateMonthlyDocuments(
  records: DocumentRecord[],
  selectedYear: string // 'all' or 'YYYY'
): MonthlyDocumentPoint[] {
  const buckets = new Map<
    string,
    { incoming: number; outgoing: number; legal: number; speech: number }
  >();

  for (const doc of records) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.docDate)) continue;
    const year = doc.docDate.slice(0, 4);
    if (selectedYear !== 'all' && year !== selectedYear) continue;

    const monthKey = doc.docDate.slice(0, 7);
    const current = buckets.get(monthKey) ?? {
      incoming: 0,
      outgoing: 0,
      legal: 0,
      speech: 0,
    };
    if (doc.direction === DocumentDirection.INCOMING) {
      current.incoming += 1;
    } else if (doc.direction === DocumentDirection.OUTGOING) {
      current.outgoing += 1;
    } else if (doc.direction === DocumentDirection.LEGAL) {
      current.legal += 1;
    } else if (doc.direction === DocumentDirection.SPEECH) {
      current.speech += 1;
    }
    buckets.set(monthKey, current);
  }

  if (selectedYear !== 'all') {
    const points: MonthlyDocumentPoint[] = [];
    for (let m = 0; m < 12; m++) {
      const monthStr = String(m + 1).padStart(2, '0');
      const monthKey = `${selectedYear}-${monthStr}`;
      const counts = buckets.get(monthKey) ?? {
        incoming: 0,
        outgoing: 0,
        legal: 0,
        speech: 0,
      };
      points.push({
        monthKey,
        monthLabel: LAO_MONTH_SHORT[m],
        monthFullLabel: `${LAO_MONTH_FULL[m]} ${selectedYear}`,
        incoming: counts.incoming,
        outgoing: counts.outgoing,
        legal: counts.legal,
        speech: counts.speech,
        total: counts.incoming + counts.outgoing + counts.legal + counts.speech,
      });
    }
    return points;
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, counts]) => {
      const [year, monthStr] = monthKey.split('-');
      const monthIdx = Math.max(0, Math.min(11, Number(monthStr) - 1));
      return {
        monthKey,
        monthLabel: `${LAO_MONTH_SHORT[monthIdx]} ${year}`,
        monthFullLabel: `${LAO_MONTH_FULL[monthIdx]} ${year}`,
        incoming: counts.incoming,
        outgoing: counts.outgoing,
        legal: counts.legal,
        speech: counts.speech,
        total: counts.incoming + counts.outgoing + counts.legal + counts.speech,
      };
    });
}

export function aggregateByPurpose(
  records: DocumentRecord[],
  selectedYear: string
): CategoryCountPoint[] {
  const counts = new Map<DocumentPurpose, number>();
  for (const p of Object.values(DocumentPurpose)) {
    counts.set(p, 0);
  }

  for (const doc of records) {
    if (selectedYear !== 'all' && !doc.docDate.startsWith(`${selectedYear}-`)) continue;
    counts.set(doc.purpose, (counts.get(doc.purpose) ?? 0) + 1);
  }

  return Object.values(DocumentPurpose).map((p) => ({
    key: p,
    label: PURPOSE_LABELS[p],
    count: counts.get(p) ?? 0,
  }));
}

export function aggregateByStatus(
  records: DocumentRecord[],
  selectedYear: string
): CategoryCountPoint[] {
  const counts = new Map<DocumentStatus, number>();
  for (const st of Object.values(DocumentStatus)) {
    counts.set(st, 0);
  }

  for (const doc of records) {
    if (selectedYear !== 'all' && !doc.docDate.startsWith(`${selectedYear}-`)) continue;
    counts.set(doc.status, (counts.get(doc.status) ?? 0) + 1);
  }

  return Object.values(DocumentStatus).map((st) => ({
    key: st,
    label: STATUS_LABELS[st],
    count: counts.get(st) ?? 0,
  }));
}

export function computeAnalyticsSummary(
  monthly: MonthlyDocumentPoint[]
): AnalyticsSummary {
  let totalDocuments = 0;
  let totalIncoming = 0;
  let totalOutgoing = 0;
  let totalLegal = 0;
  let totalSpeech = 0;
  let peakMonthLabel = '-';
  let peakMonthCount = 0;
  let activeMonths = 0;

  for (const point of monthly) {
    totalDocuments += point.total;
    totalIncoming += point.incoming;
    totalOutgoing += point.outgoing;
    totalLegal += point.legal;
    totalSpeech += point.speech;
    if (point.total > 0) {
      activeMonths += 1;
    }
    if (point.total > peakMonthCount) {
      peakMonthCount = point.total;
      peakMonthLabel = point.monthFullLabel;
    }
  }

  return {
    totalDocuments,
    totalIncoming,
    totalOutgoing,
    totalLegal,
    totalSpeech,
    peakMonthLabel,
    peakMonthCount,
    averagePerActiveMonth:
      activeMonths > 0 ? Number((totalDocuments / activeMonths).toFixed(1)) : 0,
  };
}
