import QRCode from 'qrcode';
import { DIRECTION_LABELS, DocumentRecord } from '../types/document';
import { buildPushDeepLinkUrl } from './pushNotificationLogic';

export type QrPayloadMode = 'tracking' | 'scanLink' | 'docId';

export interface QrModeOption {
  id: QrPayloadMode;
  label: string;
  description: string;
  available: boolean;
}

export function resolveAppOrigin(explicitOrigin?: string): string {
  if (explicitOrigin && explicitOrigin.trim()) {
    return explicitOrigin.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return '';
}

export function buildDocumentQrPayload(
  record: Pick<DocumentRecord, 'id' | 'docNumber' | 'scanLink'>,
  mode: QrPayloadMode,
  origin?: string
): string {
  const cleanId = (record.id || '').trim();
  const cleanScanLink = (record.scanLink || '').trim();

  if (mode === 'scanLink' && cleanScanLink) {
    return cleanScanLink;
  }

  if (mode === 'docId') {
    return cleanId || (record.docNumber || '').trim();
  }

  const deepLinkPath = buildPushDeepLinkUrl(cleanId);
  const resolvedOrigin = resolveAppOrigin(origin);
  return resolvedOrigin ? `${resolvedOrigin}${deepLinkPath}` : deepLinkPath;
}

export function getAvailableQrModes(
  record: Pick<DocumentRecord, 'id' | 'scanLink'>
): QrModeOption[] {
  const hasScanLink = Boolean(record.scanLink && record.scanLink.trim());
  return [
    {
      id: 'tracking',
      label: 'ລິ້ງຕິດຕາມ',
      description: 'ເປີດໜ້າລາຍລະອຽດເອກະສານນີ້ໃນລະບົບໂດຍກົງ',
      available: Boolean(record.id && record.id.trim()),
    },
    {
      id: 'scanLink',
      label: 'ຟາຍສະແກນ',
      description: 'ເປີດຟາຍສະແກນເອກະສານໃນ Google Drive ໂດຍກົງ',
      available: hasScanLink,
    },
    {
      id: 'docId',
      label: 'ລະຫັດ ID',
      description: 'ລະຫັດອ້າງອີງເອກະສານສຳລັບຕິດຕາມແຟ້ມເອກະສານຕົວຈິງ',
      available: Boolean(record.id && record.id.trim()),
    },
  ];
}

export function buildQrDownloadFilename(
  record: Pick<DocumentRecord, 'id' | 'docNumber'>,
  mode: QrPayloadMode
): string {
  const rawBase = (record.docNumber || record.id || 'document').trim();
  const sanitized = rawBase
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = mode === 'scanLink' ? 'drive' : mode === 'docId' ? 'id' : 'link';
  return `QR-${sanitized || 'document'}-${suffix}.png`;
}

export async function generateQrCodeDataUrl(
  payload: string,
  sizePx = 280
): Promise<string> {
  const text = payload.trim();
  if (!text) {
    throw new Error('ບໍ່ມີຂໍ້ມູນສຳລັບສ້າງ QR Code');
  }
  return QRCode.toDataURL(text, {
    width: sizePx,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });
}

export async function generateQrCodeSvg(payload: string): Promise<string> {
  const text = payload.trim();
  if (!text) {
    throw new Error('ບໍ່ມີຂໍ້ມູນສຳລັບສ້າງ QR Code');
  }
  return QRCode.toString(text, {
    type: 'svg',
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPrintableQrStickerHtml(input: {
  record: Pick<DocumentRecord, 'id' | 'docNumber' | 'title' | 'direction' | 'department'>;
  qrDataUrl: string;
  payload: string;
  modeLabel: string;
}): string {
  const { record, qrDataUrl, payload, modeLabel } = input;
  const dirLabel = DIRECTION_LABELS[record.direction] || '';
  return `<!doctype html>
<html lang="lo">
  <head>
    <meta charset="utf-8" />
    <title>QR ${escapeHtml(record.docNumber || record.id)}</title>
    <style>
      @page { margin: 14mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Noto Sans Lao", "Phetsarath OT", system-ui, -apple-system, sans-serif;
        color: #0f172a;
        background: #ffffff;
      }
      .sticker {
        width: 360px;
        border: 1.5px solid #cbd5e1;
        border-radius: 12px;
        padding: 16px;
        display: flex;
        gap: 14px;
        align-items: center;
      }
      .qr {
        width: 120px;
        height: 120px;
        flex-shrink: 0;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 4px;
      }
      .meta {
        min-width: 0;
        flex: 1;
      }
      .kicker {
        font-size: 11px;
        color: #475569;
        margin-bottom: 4px;
      }
      .doc-number {
        font-size: 15px;
        font-weight: 700;
        margin: 0 0 4px;
      }
      .title {
        font-size: 12px;
        line-height: 1.4;
        color: #1e293b;
        margin: 0 0 6px;
      }
      .id-line {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 11px;
        color: #334155;
        word-break: break-all;
      }
    </style>
  </head>
  <body>
    <div class="sticker">
      <img class="qr" src="${escapeHtml(qrDataUrl)}" alt="QR Code" />
      <div class="meta">
        <div class="kicker">${escapeHtml(dirLabel)} · ${escapeHtml(modeLabel)}</div>
        <div class="doc-number">${escapeHtml(record.docNumber)}</div>
        <div class="title">${escapeHtml(record.title)}</div>
        <div class="id-line">${escapeHtml(record.id)} · ${escapeHtml(record.department)}</div>
        <div class="id-line" style="margin-top:4px;color:#64748b;">${escapeHtml(payload)}</div>
      </div>
    </div>
  </body>
</html>`;
}
