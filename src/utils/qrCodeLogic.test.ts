import test from 'node:test';
import assert from 'node:assert/strict';
import { DocumentDirection } from '../types/document';
import {
  buildDocumentQrPayload,
  buildPrintableQrStickerHtml,
  buildQrDownloadFilename,
  generateQrCodeDataUrl,
  generateQrCodeSvg,
  getAvailableQrModes,
} from './qrCodeLogic';

test('buildDocumentQrPayload builds tracking URL, scanLink, and docId cleanly', () => {
  const doc = {
    id: 'DOC-202601',
    docNumber: '042/ຂຂ-2026',
    scanLink: 'https://drive.google.com/file/d/abc123/view',
  };

  assert.equal(
    buildDocumentQrPayload(doc, 'tracking', 'https://docs.example.la/'),
    'https://docs.example.la/?docId=DOC-202601'
  );
  assert.equal(
    buildDocumentQrPayload(doc, 'scanLink', 'https://docs.example.la'),
    'https://drive.google.com/file/d/abc123/view'
  );
  assert.equal(
    buildDocumentQrPayload(doc, 'docId', 'https://docs.example.la'),
    'DOC-202601'
  );

  // Falls back to tracking deep link if scanLink is missing
  assert.equal(
    buildDocumentQrPayload({ id: 'DOC-99', docNumber: '099/ຂຂ', scanLink: '' }, 'scanLink', 'https://app.test'),
    'https://app.test/?docId=DOC-99'
  );
});

test('getAvailableQrModes reflects scanLink availability', () => {
  const withoutScan = getAvailableQrModes({ id: 'DOC-1', scanLink: '' });
  assert.equal(withoutScan.find((m) => m.id === 'tracking')?.available, true);
  assert.equal(withoutScan.find((m) => m.id === 'scanLink')?.available, false);
  assert.equal(withoutScan.find((m) => m.id === 'docId')?.available, true);

  const withScan = getAvailableQrModes({
    id: 'DOC-2',
    scanLink: 'https://drive.google.com/file/d/xyz/view',
  });
  assert.equal(withScan.find((m) => m.id === 'scanLink')?.available, true);
});

test('buildQrDownloadFilename sanitizes slashes and spaces safely', () => {
  assert.equal(
    buildQrDownloadFilename({ id: 'DOC-202601', docNumber: '042/ຂຂ-2026' }, 'tracking'),
    'QR-042-ຂຂ-2026-link.png'
  );
  assert.equal(
    buildQrDownloadFilename({ id: 'DOC-202601', docNumber: '042/ຂຂ-2026' }, 'docId'),
    'QR-042-ຂຂ-2026-id.png'
  );
});

test('generateQrCodeDataUrl and generateQrCodeSvg produce valid scannable outputs', async () => {
  const payload = 'https://docs.example.la/?docId=DOC-202601';
  const dataUrl = await generateQrCodeDataUrl(payload, 240);
  assert.ok(dataUrl.startsWith('data:image/png;base64,'));
  assert.ok(dataUrl.length > 200);

  const svg = await generateQrCodeSvg('DOC-202601');
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('</svg>'));
});

test('buildPrintableQrStickerHtml escapes HTML entities safely', () => {
  const html = buildPrintableQrStickerHtml({
    record: {
      id: 'DOC-1',
      docNumber: '01/ຂຂ',
      title: 'ທົດສອບ <script>alert(1)</script>',
      direction: DocumentDirection.INCOMING,
      department: 'ພະແນກໄອທີ',
    },
    qrDataUrl: 'data:image/png;base64,AAAA',
    payload: 'https://app.test/?docId=DOC-1',
    modeLabel: 'ລິ້ງຕິດຕາມ',
  });

  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
});
