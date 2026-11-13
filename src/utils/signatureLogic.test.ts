import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_SIGNATURE_DATA_URL_LENGTH,
  SIGNATURE_INK_COLORS,
  SIGNATURE_PEN_WIDTHS,
  buildDemoSignatureSvgDataUrl,
  computeStrokeBounds,
  formatSignatureTimestamp,
  hasSignatureContent,
  isValidSignatureDataUrl,
  popLastStroke,
  SignatureStroke,
} from './signatureLogic';

test('popLastStroke removes only the most recent stroke cleanly', () => {
  const s1: SignatureStroke = {
    points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
    color: '#0F172A',
    width: 3,
  };
  const s2: SignatureStroke = {
    points: [{ x: 30, y: 15 }, { x: 45, y: 35 }],
    color: '#1D4ED8',
    width: 2,
  };

  assert.deepEqual(popLastStroke([]), []);
  assert.deepEqual(popLastStroke([s1, s2]), [s1]);
  assert.deepEqual(popLastStroke([s1]), []);
});

test('hasSignatureContent and computeStrokeBounds evaluate strokes and existing data URLs', () => {
  assert.equal(hasSignatureContent([], ''), false);
  assert.equal(
    hasSignatureContent([], buildDemoSignatureSvgDataUrl('exec1')),
    true
  );

  const strokes: SignatureStroke[] = [
    {
      points: [
        { x: 20, y: 30 },
        { x: 120, y: 80 },
      ],
      color: SIGNATURE_INK_COLORS[0].hex,
      width: SIGNATURE_PEN_WIDTHS[1].width,
    },
  ];
  assert.equal(hasSignatureContent(strokes, ''), true);
  const bounds = computeStrokeBounds(strokes);
  assert.ok(bounds);
  assert.equal(bounds.minX, 17);
  assert.equal(bounds.minY, 27);
  assert.equal(bounds.maxX, 123);
  assert.equal(bounds.maxY, 83);
  assert.equal(computeStrokeBounds([]), null);
});

test('isValidSignatureDataUrl validates PNG/SVG data URLs and enforces Google Sheets length cap', () => {
  assert.equal(isValidSignatureDataUrl(''), false);
  assert.equal(isValidSignatureDataUrl('https://example.com/sig.png'), false);
  assert.equal(
    isValidSignatureDataUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'),
    true
  );
  assert.equal(
    isValidSignatureDataUrl(buildDemoSignatureSvgDataUrl('exec2', '#0F172A')),
    true
  );

  const oversized = `data:image/png;base64,${'A'.repeat(MAX_SIGNATURE_DATA_URL_LENGTH)}`;
  assert.equal(isValidSignatureDataUrl(oversized), false);
});

test('formatSignatureTimestamp renders readable Lao/tabular date-time', () => {
  assert.equal(formatSignatureTimestamp(''), '');
  const formatted = formatSignatureTimestamp('2026-11-12T09:15:00.000Z');
  assert.match(formatted, /^\d{2}\/\d{2}\/2026 · \d{2}:\d{2}$/);
});
