import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  ImageUp,
  QrCode,
  Search,
  X,
} from 'lucide-react';
import { DocumentRecord } from '../types/document';
import {
  decodeQrFromImageData,
  resolveScannedQrToDocument,
} from '../utils/qrScannerLogic';

interface QrScannerModalProps {
  open: boolean;
  documents: DocumentRecord[];
  onSelectDocument: (doc: DocumentRecord) => void;
  onClose: () => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  open,
  documents,
  onSelectDocument,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lastScannedText, setLastScannedText] = useState<string | null>(null);

  const stopScanner = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const handleDecodedPayload = useCallback(
    (rawPayload: string) => {
      const trimmed = rawPayload.trim();
      if (!trimmed) return;
      setLastScannedText(trimmed);

      const resolved = resolveScannedQrToDocument(trimmed, documents);
      if (resolved.document) {
        stopScanner();
        setLookupError(null);
        onClose();
        onSelectDocument(resolved.document);
      } else {
        setLookupError(
          `ບໍ່ພົບຂໍ້ມູນເອກະສານທີ່ກົງກັບລະຫັດ "${trimmed}" ໃນລາຍການປັດຈຸບັນ`
        );
      }
    },
    [documents, onClose, onSelectDocument, stopScanner]
  );

  const startLiveScanner = useCallback(async () => {
    stopScanner();
    setCameraError(null);
    setLookupError(null);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setCameraError(
        'Browser ຫຼື ອຸປະກອນນີ້ບໍ່ຮອງຮັບກ້ອງຖ່າຍຮູບ — ທ່ານສາມາດອັບໂຫຼດຮູບ QR ຫຼື ປ້ອນລະຫັດດ້ານລຸ່ມໄດ້'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setCameraActive(true);

      const scanFrame = () => {
        const v = videoRef.current;
        if (!v || !streamRef.current) return;

        if (v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0) {
          let canvas = scanCanvasRef.current;
          if (!canvas) {
            canvas = document.createElement('canvas');
            scanCanvasRef.current = canvas;
          }
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const decoded = decodeQrFromImageData(
              imgData.data,
              imgData.width,
              imgData.height
            );
            if (decoded) {
              handleDecodedPayload(decoded);
              return;
            }
          }
        }
        rafRef.current = requestAnimationFrame(scanFrame);
      };

      rafRef.current = requestAnimationFrame(scanFrame);
    } catch {
      setCameraError(
        'ບໍ່ສາມາດເປີດກ້ອງໄດ້ — ກະລຸນາອັບໂຫຼດຮູບ QR Code ຫຼື ປ້ອນລະຫັດເອກະສານດ້ວຍຕົນເອງ'
      );
    }
  }, [handleDecodedPayload, stopScanner]);

  useEffect(() => {
    if (!open) {
      stopScanner();
      setManualInput('');
      setLookupError(null);
      setLastScannedText(null);
      setCameraError(null);
      return;
    }

    void startLiveScanner();
    return () => stopScanner();
  }, [open, startLiveScanner, stopScanner]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleUploadQrImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLookupError(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Invalid image'));
        el.src = dataUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unsupported');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = decodeQrFromImageData(
        imageData.data,
        imageData.width,
        imageData.height
      );
      if (!decoded) {
        setLookupError('ບໍ່ພົບ QR Code ໃນຮູບພາບນີ້ ກະລຸນາລອງຮູບທີ່ຊັດເຈນຂຶ້ນ');
        return;
      }
      handleDecodedPayload(decoded);
    } catch {
      setLookupError('ບໍ່ສາມາດອ່ານຮູບພາບ QR Code ໄດ້');
    }
  };

  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) {
      setLookupError('ກະລຸນາປ້ອນລະຫັດ QR, ID ຫຼື ເລກທີເອກະສານ');
      return;
    }
    handleDecodedPayload(manualInput);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <QrCode className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <h2
              id="qr-scanner-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate"
            >
              ສະແກນ QR Code ເປີດເອກະສານ
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ປິດໜ້າຕ່າງສະແກນ QR"
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center border border-slate-800">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />
            {cameraActive && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <div className="w-48 h-48 border-2 border-blue-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.38)]" />
              </div>
            )}
            {!cameraActive && !cameraError && (
              <div className="text-sm text-slate-300">ກຳລັງເປີດກ້ອງສະແກນ QR Code...</div>
            )}
            {cameraError && (
              <div className="p-5 text-center space-y-2.5 max-w-sm">
                <Camera className="w-9 h-9 text-slate-400 mx-auto" aria-hidden="true" />
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{cameraError}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadQrImage}
              className="hidden"
              id="qr-image-upload-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg"
            >
              <ImageUp className="w-4 h-4" aria-hidden="true" />
              <span>ອັບໂຫຼດຮູບ QR Code</span>
            </button>

            <span className="text-xs text-slate-500 dark:text-slate-400">
              ນຳກ້ອງສ່ອງໃສ່ QR Code ເທິງແຟ້ມເອກະສານ
            </span>
          </div>

          <form
            onSubmit={handleManualLookup}
            className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2"
          >
            <label
              htmlFor="qr-manual-lookup-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              ຫຼື ປ້ອນ/ວາງລະຫັດ QR (ID, ເລກທີເອກະສານ ຫຼື ລິ້ງຕິດຕາມ)
            </label>
            <div className="flex gap-2">
              <input
                id="qr-manual-lookup-input"
                type="text"
                value={manualInput}
                onChange={(e) => {
                  setManualInput(e.target.value);
                  if (lookupError) setLookupError(null);
                }}
                placeholder="ຕົວຢ່າງ: DOC-202601 ຫຼື 042/ຂຂ-2026"
                className="flex-1 min-w-0 px-3 py-2 min-h-[40px] text-sm font-mono-tabular bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-700 dark:focus:border-blue-500"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg whitespace-nowrap"
              >
                <Search className="w-3.5 h-3.5" aria-hidden="true" />
                <span>ຄົ້ນຫາ &amp; ເປີດ</span>
              </button>
            </div>
          </form>

          {lastScannedText && lookupError && (
            <div
              role="alert"
              className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-lg text-xs text-red-700 dark:text-red-300"
            >
              {lookupError}
            </div>
          )}
          {!lastScannedText && lookupError && (
            <div
              role="alert"
              className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-lg text-xs text-red-700 dark:text-red-300"
            >
              {lookupError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
