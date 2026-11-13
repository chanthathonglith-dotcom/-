import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  ImagePlus,
  RefreshCw,
  RotateCw,
  Sliders,
  X,
} from 'lucide-react';

interface CameraScanModalProps {
  open: boolean;
  onCaptureFile: (file: File) => void;
  onClose: () => void;
}

export const CameraScanModal: React.FC<CameraScanModalProps> = ({
  open,
  onCaptureFile,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedSourceUrl, setCapturedSourceUrl] = useState<string | null>(null);
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState<string | null>(null);
  const [rotationDeg, setRotationDeg] = useState<0 | 90 | 180 | 270>(0);
  const [enhanceContrast, setEnhanceContrast] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setCameraError(
        'Browser ຫຼື ອຸປະກອນນີ້ບໍ່ຮອງຮັບກ້ອງສົດ — ກະລຸນາໃຊ້ປຸ່ມ "ຖ່າຍ/ເລືອກຮູບຈາກເຄື່ອງ" ດ້ານລຸ່ມ'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'ບໍ່ໄດ້ຮັບສິດເຂົ້າເຖິງກ້ອງຖ່າຍຮູບ ກະລຸນາອະນຸຍາດສິດກ້ອງໃນ Browser ຫຼື ເລືອກຮູບຈາກເຄື່ອງ'
          : 'ບໍ່ພົບກ້ອງຖ່າຍຮູບ ຫຼື ກ້ອງກຳລັງຖືກໃຊ້ງານຢູ່ — ສາມາດເລືອກຮູບເພື່ອອັບໂຫຼດແທນໄດ້';
      setCameraError(message);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setCapturedSourceUrl(null);
      setProcessedPreviewUrl(null);
      setRotationDeg(0);
      setEnhanceContrast(false);
      setCameraError(null);
      return;
    }

    if (!capturedSourceUrl) {
      void startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open, capturedSourceUrl, startCamera, stopCamera]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, isExporting, onClose]);

  const renderTransformedCanvas = useCallback(
    async (
      sourceUrl: string,
      rotation: number,
      contrastMode: boolean
    ): Promise<HTMLCanvasElement> => {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Failed to load captured photo'));
        el.src = sourceUrl;
      });

      const canvas = document.createElement('canvas');
      const swap = rotation === 90 || rotation === 270;
      canvas.width = swap ? img.naturalHeight : img.naturalWidth;
      canvas.height = swap ? img.naturalWidth : img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      if (contrastMode) {
        ctx.filter = 'grayscale(100%) contrast(155%) brightness(108%)';
      }
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();
      return canvas;
    },
    []
  );

  useEffect(() => {
    if (!capturedSourceUrl) {
      setProcessedPreviewUrl(null);
      return;
    }
    let cancelled = false;
    void renderTransformedCanvas(capturedSourceUrl, rotationDeg, enhanceContrast)
      .then((canvas) => {
        if (!cancelled) {
          setProcessedPreviewUrl(canvas.toDataURL('image/jpeg', 0.9));
        }
      })
      .catch(() => {
        if (!cancelled) setProcessedPreviewUrl(capturedSourceUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [capturedSourceUrl, rotationDeg, enhanceContrast, renderTransformedCanvas]);

  if (!open) return null;

  const handleSnapPhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopCamera();
    setRotationDeg(0);
    setCapturedSourceUrl(dataUrl);
  };

  const handleFallbackImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        stopCamera();
        setRotationDeg(0);
        setCapturedSourceUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirmUpload = async () => {
    if (!capturedSourceUrl) return;
    setIsExporting(true);
    try {
      const canvas = await renderTransformedCanvas(
        capturedSourceUrl,
        rotationDeg,
        enhanceContrast
      );
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to encode scan image'));
          },
          'image/jpeg',
          0.9
        );
      });
      const stamp = new Date()
        .toISOString()
        .replace(/[-:T]/g, '')
        .slice(0, 14);
      const file = new File([blob], `doc_scan_${stamp}.jpg`, {
        type: 'image/jpeg',
      });
      onCaptureFile(file);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-scan-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Camera className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <h2
              id="camera-scan-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate"
            >
              ຖ່າຍຮູບສະແກນເອກະສານດ້ວຍກ້ອງ
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            aria-label="ປິດໜ້າຕ່າງກ້ອງ"
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <input
            ref={fallbackInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFallbackImageSelect}
            className="hidden"
            id="camera-fallback-file-input"
          />

          {!capturedSourceUrl ? (
            <div className="space-y-3">
              <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center border border-slate-800">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-contain ${cameraReady ? 'block' : 'hidden'}`}
                />
                {!cameraReady && !cameraError && (
                  <div className="text-sm text-slate-300">ກຳລັງເປີດກ້ອງຖ່າຍຮູບ...</div>
                )}
                {cameraError && (
                  <div className="p-6 text-center space-y-3 max-w-md">
                    <Camera className="w-10 h-10 text-slate-400 mx-auto" aria-hidden="true" />
                    <p className="text-sm text-slate-200 leading-relaxed">{cameraError}</p>
                    <div className="flex flex-wrap justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void startCamera()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-lg"
                      >
                        <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>ລອງເປີດກ້ອງໃໝ່</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fallbackInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
                      >
                        <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>ຖ່າຍ/ເລືອກຮູບຈາກເຄື່ອງ</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => fallbackInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                >
                  <ImagePlus className="w-4 h-4" aria-hidden="true" />
                  <span>ເລືອກຮູບ / ກ້ອງມືຖື</span>
                </button>

                <button
                  type="button"
                  onClick={handleSnapPhoto}
                  disabled={!cameraReady}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-40 rounded-lg"
                >
                  <Camera className="w-4 h-4" aria-hidden="true" />
                  <span>ຖ່າຍຮູບເອກະສານ</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 flex items-center justify-center max-h-[55vh] overflow-hidden">
                <img
                  src={processedPreviewUrl || capturedSourceUrl}
                  alt="ຕົວຢ່າງພາບສະແກນເອກະສານ"
                  className="max-h-[50vh] w-auto object-contain rounded-lg"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setRotationDeg((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>ໝຸນ 90°</span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={enhanceContrast}
                    onClick={() => setEnhanceContrast((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-medium rounded-lg border transition-colors ${
                      enhanceContrast
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>ໂໝດສະແກນຊັດເຈນ (ຂາວ-ດຳ)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCapturedSourceUrl(null)}
                    disabled={isExporting}
                    className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                  >
                    ຖ່າຍໃໝ່
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmUpload}
                    disabled={isExporting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-50 rounded-lg"
                  >
                    <Check className="w-4 h-4" aria-hidden="true" />
                    <span>{isExporting ? 'ກຳລັງສ້າງຟາຍ...' : 'ໃຊ້ຮູບນີ້ ແລະ ອັບໂຫຼດ'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
