import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DocumentDirection,
  DocumentPurpose,
  DocumentRecord,
  DocumentStatus,
} from '../types/document';
import {
  aggregateByPurpose,
  aggregateByStatus,
  aggregateDirectionDistribution,
  aggregateMonthlyDocuments,
  computeAnalyticsSummary,
  extractAvailableYears,
} from './analyticsLogic';

const makeDoc = (overrides: Partial<DocumentRecord> = {}): DocumentRecord => ({
  id: 'DOC-1',
  direction: DocumentDirection.INCOMING,
  docNumber: '001/ຂຂ-2026',
  docDate: '2026-11-10',
  dueDate: '',
  title: 'ເອກະສານທົດສອບ',
  department: 'ພະແນກບໍລິຫານ',
  purpose: DocumentPurpose.OPINION,
  leadershipComment: '',
  status: DocumentStatus.PENDING,
  scanLink: '',
  scanFileName: '',
  driveFileId: '',
  createdBy: 'user@example.com',
  updatedAt: '2026-11-10T09:00:00.000Z',
  ...overrides,
});

const records: DocumentRecord[] = [
  makeDoc({ id: '1', docDate: '2026-09-05', direction: DocumentDirection.INCOMING, purpose: DocumentPurpose.OPINION, status: DocumentStatus.COMPLETED }),
  makeDoc({ id: '2', docDate: '2026-10-12', direction: DocumentDirection.OUTGOING, purpose: DocumentPurpose.INFO, status: DocumentStatus.COMPLETED }),
  makeDoc({ id: '3', docDate: '2026-11-01', direction: DocumentDirection.INCOMING, purpose: DocumentPurpose.SIGNATURE, status: DocumentStatus.PENDING }),
  makeDoc({ id: '4', docDate: '2026-11-12', direction: DocumentDirection.OUTGOING, purpose: DocumentPurpose.GUIDANCE, status: DocumentStatus.IN_PROGRESS }),
  makeDoc({ id: '5', docDate: '2025-12-20', direction: DocumentDirection.INCOMING, purpose: DocumentPurpose.SIGNATURE, status: DocumentStatus.COMPLETED }),
  makeDoc({ id: '6', docDate: '2026-11-15', direction: DocumentDirection.LEGAL, purpose: DocumentPurpose.SIGNATURE, status: DocumentStatus.COMPLETED }),
  makeDoc({ id: '7', docDate: '2026-11-18', direction: DocumentDirection.SPEECH, purpose: DocumentPurpose.INFO, status: DocumentStatus.PENDING }),
];

test('extractAvailableYears returns unique sorted years descending', () => {
  assert.deepEqual(extractAvailableYears(records), ['2026', '2025']);
});

test('aggregateMonthlyDocuments builds 12-month series for selected year', () => {
  const monthly2026 = aggregateMonthlyDocuments(records, '2026');
  assert.equal(monthly2026.length, 12);

  const sep = monthly2026[8];
  assert.equal(sep.monthKey, '2026-09');
  assert.equal(sep.incoming, 1);
  assert.equal(sep.outgoing, 0);

  const nov = monthly2026[10];
  assert.equal(nov.monthKey, '2026-11');
  assert.equal(nov.incoming, 1);
  assert.equal(nov.outgoing, 1);
  assert.equal(nov.legal, 1);
  assert.equal(nov.speech, 1);
  assert.equal(nov.total, 4);

  const summary = computeAnalyticsSummary(monthly2026);
  assert.equal(summary.totalDocuments, 6);
  assert.equal(summary.totalIncoming, 2);
  assert.equal(summary.totalOutgoing, 2);
  assert.equal(summary.totalLegal, 1);
  assert.equal(summary.totalSpeech, 1);
  assert.equal(summary.peakMonthCount, 4);
  assert.equal(summary.peakMonthLabel, 'ພະຈິກ 2026');
});

test('aggregateMonthlyDocuments chronological mode covers all years', () => {
  const allYears = aggregateMonthlyDocuments(records, 'all');
  assert.deepEqual(
    allYears.map((m) => m.monthKey),
    ['2025-12', '2026-09', '2026-10', '2026-11']
  );
});

test('aggregateByPurpose and aggregateByStatus count categories for selected year', () => {
  const purposes = aggregateByPurpose(records, '2026');
  assert.equal(purposes.find((p) => p.key === DocumentPurpose.SIGNATURE)?.count, 2);
  assert.equal(purposes.find((p) => p.key === DocumentPurpose.OPINION)?.count, 1);

  const statuses = aggregateByStatus(records, '2026');
  assert.equal(statuses.find((s) => s.key === DocumentStatus.COMPLETED)?.count, 3);
});

test('aggregateDirectionDistribution calculates counts and percentages for selected year and all years', () => {
  const dist2026 = aggregateDirectionDistribution(records, '2026');
  assert.equal(dist2026.total, 6);
  assert.equal(dist2026.items.length, 4);
  assert.equal(dist2026.items[0].direction, DocumentDirection.INCOMING);
  assert.equal(dist2026.items[0].count, 2);
  assert.equal(dist2026.items[0].percentage, 33.3);
  assert.equal(dist2026.items[2].direction, DocumentDirection.LEGAL);
  assert.equal(dist2026.items[2].count, 1);
  assert.equal(dist2026.items[2].percentage, 16.7);

  const distAll = aggregateDirectionDistribution(records, 'all');
  assert.equal(distAll.total, 7);
  assert.equal(distAll.items[0].count, 3);
  assert.equal(distAll.items[0].percentage, 42.9);

  const distEmpty = aggregateDirectionDistribution([], 'all');
  assert.equal(distEmpty.total, 0);
  assert.ok(distEmpty.items.every((item) => item.count === 0 && item.percentage === 0));
});
