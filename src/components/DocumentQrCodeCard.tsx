import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Printer, QrCode } from 'lucide-react';
import { DocumentRecord } from '../types/document';
import {
  QrPayloadMode,
  buildDocumentQrPayload,
  buildPrintableQrStickerHtml,
  buildQrDownloadFilename,
  generateQrCodeDataUrl,
  getAvailableQrModes,
} from '../utils/qrCodeLogic';
import { CreateToastInput } from '../utils/toastLogic';

interface DocumentQrCodeCardProps {
  record: DocumentRecord;
  onNotifyToast?: (input: CreateToastInput) => string;
}

export const DocumentQrCodeCard: React.FC<DocumentQrCodeCardProps> = ({
  record,
  onNotifyToast,
}) => {
  const modes = useMemo(() => getAvailableQrModes(record), [record]);
  const [mode, setMode] = useState<QrPayloadMode>('tracking');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset to tracking mode whenever switching to another document or when scanLink becomes unavailable
  useEffect(() => {
    setCopied(false);
    setMode((prev) => {
      if (prev === 'scanLink' && !record.scanLink?.trim()) {
        return 'tracking';
      }
      return prev;
    });
  }, [record.id, record.scanLink]);

  const payload = useMemo(
    () => buildDocumentQrPayload(record, mode),
    [record, mode]
  );

  const currentModeInfo = useMemo(
    () => modes.find((m) => m.id === mode) ?? modes[0],
    [modes, mode]
  );

  useEffect(() => {
    let cancelled = false;
    setQrError(null);

    generateQrCodeDataUrl(payload, 280)
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setQrDataUrl('');
          setQrError(
            err instanceof Error ? err.message : 'ບໍ່ສາມາດສ້າງ QR Code ໄດ້'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [payload]);

  const handleCopyPayload = async () => {
    let didCopy = false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(payload);
        didCopy = true;
      } catch {
        didCopy = false;
      }
    }

    if (!didCopy) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = payload;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, payload.length);
        didCopy = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        didCopy = false;
      }
    }

    if (didCopy) {
      setCopied(true);
      onNotifyToast?.({
        variant: 'success',
        title: 'ສຳເນົາສຳເລັດ',
        description:
          mode === 'docId'
            ? `ສຳເນົາລະຫັດ "${payload}" ແລ້ວ`
            : 'ສຳເນົາລິ້ງສຳລັບແຊຣ໌ & ຕິດຕາມແລ້ວ',
      });
      window.setTimeout(() => setCopied(false), 1800);
    } else {
      onNotifyToast?.({
        variant: 'error',
        title: 'ບໍ່ສາມາດສຳເນົາໄດ້',
        description: 'ກະລຸນາຄັດລອກຂໍ້ຄວາມດ້ວຍຕົນເອງ',
      });
    }
  };

  const handleDownloadPng = async () => {
    if (!qrDataUrl) return;
    const filename = buildQrDownloadFilename(record, mode);

    try {
      const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('load failed'));
        img.src = qrDataUrl;
      });

      const canvas = document.createElement('canvas');
      const width = 340;
      const height = 404;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      let exportUrl = qrDataUrl;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, width - 2, height - 2);

        ctx.drawImage(qrImg, 30, 24, 280, 280);

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(record.docNumber || record.id, width / 2, 336, width - 36);

        ctx.fillStyle = '#475569';
        ctx.font = '13px monospace';
        ctx.fillText(`${record.id} · ${currentModeInfo.label}`, width / 2, 364, width - 36);

        ctx.fillStyle = '#64748B';
        ctx.font = '12px sans-serif';
        ctx.fillText(record.department || '', width / 2, 386, width - 36);

        exportUrl = canvas.toDataURL('image/png');
      }

      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onNotifyToast?.({
        variant: 'success',
        title: 'ດາວໂຫຼດ QR Code ສຳເລັດ',
        description: filename,
      });
    } catch {
      onNotifyToast?.({
        variant: 'error',
        title: 'ດາວໂຫຼດບໍ່ສຳເລັດ',
        description: 'ກະລຸນາລອງໃໝ່ອີກຄັ້ງ',
      });
    }
  };

  const handlePrintSticker = () => {
    if (!qrDataUrl) return;
    const html = buildPrintableQrStickerHtml({
      record,
      qrDataUrl,
      payload,
      modeLabel: currentModeInfo.label,
    });

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');

    document.body.appendChild(iframe);
    const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!frameDoc || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      return;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    window.setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        window.setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1000);
      }
    }, 150);
  };

  return (
    <section
      data-testid="detail-qr-section"
      aria-label="QR Code ຕິດຕາມ ແລະ ແຊຣ໌ເອກະສານ"
      className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
          <QrCode className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
          <span>QR Code ສຳລັບແຊຣ໌ &amp; ຕິດຕາມແຟ້ມເອກະສານ</span>
        </div>
        <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
          {record.docNumber} · {record.id}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
        {/* Crisp white quiet-zone QR card so phone scanners always read cleanly even in Dark Mode */}
        <div className="w-[144px] h-[144px] bg-white border border-slate-200 dark:border-slate-600 rounded-xl p-2 flex items-center justify-center shrink-0 self-center sm:self-start shadow-xs">
          {qrError ? (
            <span className="text-xs text-red-600 text-center px-2">{qrError}</span>
          ) : qrDataUrl ? (
            <img
              data-testid="qr-code-image"
              src={qrDataUrl}
              alt={`QR Code ເອກະສານ ${record.docNumber} (${currentModeInfo.label})`}
              className="w-full h-full object-contain select-none"
            />
          ) : (
            <div
              aria-label="ກຳລັງສ້າງ QR Code"
              className="w-full h-full rounded-lg bg-slate-100 animate-pulse"
            />
          )}
        </div>

        <div className="flex-1 min-w-0 w-full space-y-2.5">
          {/* Payload Mode Switcher */}
          <div
            role="group"
            aria-label="ເລືອກຂໍ້ມູນໃນ QR Code"
            className="inline-flex flex-wrap p-1 bg-slate-200/70 dark:bg-slate-900 rounded-lg gap-1"
          >
            {modes.map((option) => {
              const active = mode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={!option.available}
                  aria-pressed={active}
                  onClick={() => setMode(option.id)}
                  title={!option.available ? 'ເອກະສານນີ້ຍັງບໍ່ມີລິ້ງຟາຍສະແກນ' : option.description}
                  className={`px-2.5 py-1.5 min-h-[32px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {currentModeInfo.description}
          </p>

          {/* Encoded Link / ID preview */}
          <div
            data-testid="qr-payload-preview"
            className="px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono-tabular text-slate-700 dark:text-slate-200 break-all"
          >
            {payload}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleCopyPayload}
              disabled={!payload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{copied ? 'ສຳເນົາແລ້ວ' : mode === 'docId' ? 'ສຳເນົາລະຫັດ' : 'ສຳເນົາລິ້ງ'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={!qrDataUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ດາວໂຫຼດ PNG</span>
            </button>

            <button
              type="button"
              onClick={handlePrintSticker}
              disabled={!qrDataUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              <span>ພິມປ້າຍຕິດແຟ້ມ</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
