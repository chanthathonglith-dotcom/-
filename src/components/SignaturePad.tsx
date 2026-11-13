import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Eraser, PenTool, RotateCcw, UserCheck } from 'lucide-react';
import {
  SIGNATURE_INK_COLORS,
  SIGNATURE_PEN_WIDTHS,
  SignaturePoint,
  SignatureStroke,
  formatSignatureTimestamp,
  isValidSignatureDataUrl,
  popLastStroke,
} from '../utils/signatureLogic';

interface SignaturePadProps {
  approverName: string;
  signatureDataUrl: string;
  signedAt: string;
  onApproverNameChange: (name: string) => void;
  onSignatureChange: (dataUrl: string, signedAt: string) => void;
  errorMessage?: string;
}

const LOGICAL_WIDTH = 560;
const LOGICAL_HEIGHT = 176;

function renderStrokesToContext(
  ctx: CanvasRenderingContext2D,
  strokes: SignatureStroke[]
): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;

    if (stroke.points.length === 1) {
      const pt = stroke.points[0];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, stroke.width / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
      const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
    }
    const last = stroke.points[stroke.points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  approverName,
  signatureDataUrl,
  signedAt,
  onApproverNameChange,
  onSignatureChange,
  errorMessage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<SignatureStroke[]>([]);
  const activeStrokeRef = useRef<SignatureStroke | null>(null);
  const isDrawingRef = useRef(false);
  const lastEmittedDataUrlRef = useRef<string>('');

  const [inkColor, setInkColor] = useState<string>(SIGNATURE_INK_COLORS[0].hex);
  const [penWidth, setPenWidth] = useState<number>(SIGNATURE_PEN_WIDTHS[1].width);
  const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
  const [baseImageUrl, setBaseImageUrl] = useState<string>(
    isValidSignatureDataUrl(signatureDataUrl) ? signatureDataUrl : ''
  );

  useEffect(() => {
    if (signatureDataUrl === lastEmittedDataUrlRef.current) {
      return;
    }
    lastEmittedDataUrlRef.current = signatureDataUrl;
    setStrokes([]);
    strokesRef.current = [];
    activeStrokeRef.current = null;
    isDrawingRef.current = false;
    setBaseImageUrl(isValidSignatureDataUrl(signatureDataUrl) ? signatureDataUrl : '');
  }, [signatureDataUrl]);

  const redrawCanvas = useCallback((nextStrokes: SignatureStroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const targetW = Math.round(LOGICAL_WIDTH * dpr);
    const targetH = Math.round(LOGICAL_HEIGHT * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    renderStrokesToContext(ctx, nextStrokes);
    ctx.restore();
  }, []);

  useEffect(() => {
    redrawCanvas(strokes);
  }, [strokes, redrawCanvas]);

  const exportCombinedSignature = useCallback(
    async (nextStrokes: SignatureStroke[], currentBaseUrl: string) => {
      if (nextStrokes.length === 0 && !currentBaseUrl) {
        lastEmittedDataUrlRef.current = '';
        onSignatureChange('', '');
        return;
      }

      if (nextStrokes.length === 0 && currentBaseUrl) {
        lastEmittedDataUrlRef.current = currentBaseUrl;
        onSignatureChange(currentBaseUrl, signedAt || new Date().toISOString());
        return;
      }

      const offscreen = document.createElement('canvas');
      offscreen.width = LOGICAL_WIDTH;
      offscreen.height = LOGICAL_HEIGHT;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      if (currentBaseUrl) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = currentBaseUrl;
        });
      }

      renderStrokesToContext(ctx, nextStrokes);
      const dataUrl = offscreen.toDataURL('image/png');
      lastEmittedDataUrlRef.current = dataUrl;
      onSignatureChange(dataUrl, new Date().toISOString());
    },
    [onSignatureChange, signedAt]
  );

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): SignaturePoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * LOGICAL_WIDTH;
    const y = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * LOGICAL_HEIGHT;
    return {
      x: Math.max(0, Math.min(LOGICAL_WIDTH, x)),
      y: Math.max(0, Math.min(LOGICAL_HEIGHT, y)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore environments without pointer capture support
    }

    const pt = getCanvasPoint(e);
    const stroke: SignatureStroke = {
      points: [pt],
      color: inkColor,
      width: penWidth,
    };
    isDrawingRef.current = true;
    activeStrokeRef.current = stroke;
    const previewStrokes = [...strokesRef.current, stroke];
    redrawCanvas(previewStrokes);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !activeStrokeRef.current) return;
    e.preventDefault();
    const pt = getCanvasPoint(e);
    activeStrokeRef.current.points.push(pt);
    redrawCanvas([...strokesRef.current, activeStrokeRef.current]);
  };

  const finishStroke = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !activeStrokeRef.current) return;
    if (e) {
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }
    isDrawingRef.current = false;
    const committed = [...strokesRef.current, activeStrokeRef.current];
    activeStrokeRef.current = null;
    strokesRef.current = committed;
    setStrokes(committed);
    void exportCombinedSignature(committed, baseImageUrl);
  };

  const handleUndo = () => {
    const next = popLastStroke(strokesRef.current);
    strokesRef.current = next;
    setStrokes(next);
    void exportCombinedSignature(next, baseImageUrl);
  };

  const handleClear = () => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    isDrawingRef.current = false;
    lastEmittedDataUrlRef.current = '';
    setStrokes([]);
    setBaseImageUrl('');
    redrawCanvas([]);
    onSignatureChange('', '');
  };

  const hasSignature = strokes.length > 0 || Boolean(baseImageUrl) || isValidSignatureDataUrl(signatureDataUrl);
  const formattedSignedAt = formatSignatureTimestamp(signedAt);

  return (
    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200/80 dark:ring-blue-800/70 inline-flex items-center justify-center shrink-0">
            <PenTool className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            ລາຍເຊັນດິຈິຕອນຜູ້ອະນຸມັດ
          </span>
        </div>

        <div
          data-testid="signature-status"
          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
            hasSignature
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {hasSignature ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                {formattedSignedAt ? `ລົງນາມແລ້ວ · ${formattedSignedAt}` : 'ລົງນາມແລ້ວ'}
              </span>
            </>
          ) : (
            <span>ຍັງບໍ່ທັນໄດ້ລົງນາມ</span>
          )}
        </div>
      </div>

      {/* Approver Name */}
      <div>
        <label
          htmlFor="doc-approver-name-input"
          className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5"
        >
          ຊື່ ແລະ ຕຳແໜ່ງຜູ້ອະນຸມັດ
        </label>
        <div className="relative">
          <UserCheck
            className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="doc-approver-name-input"
            type="text"
            value={approverName}
            onChange={(e) => onApproverNameChange(e.target.value)}
            placeholder="ຕົວຢ່າງ: ທ່ານ ບຸນມີ ພົມມະວົງ — ຫົວໜ້າຫ້ອງວ່າການ"
            className="w-full pl-9 pr-3.5 py-2 min-h-[40px] text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 dark:focus:border-blue-500"
          />
        </div>
      </div>

      {/* Pen Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5" role="group" aria-label="ສີປາກກາລາຍເຊັນ">
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-0.5">ສີ:</span>
            {SIGNATURE_INK_COLORS.map((preset) => {
              const selected = inkColor === preset.hex;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setInkColor(preset.hex)}
                  aria-label={preset.label}
                  aria-pressed={selected}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                    selected
                      ? 'ring-2 ring-offset-2 ring-blue-600 dark:ring-blue-400 dark:ring-offset-slate-800 scale-105'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: preset.hex }}
                />
              );
            })}
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />

          <div className="flex items-center gap-1" role="group" aria-label="ຂະໜາດເສັ້ນປາກກາ">
            {SIGNATURE_PEN_WIDTHS.map((pw) => {
              const selected = penWidth === pw.width;
              return (
                <button
                  key={pw.id}
                  type="button"
                  onClick={() => setPenWidth(pw.width)}
                  aria-pressed={selected}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    selected
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {pw.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 rounded-md transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>ຍ້ອນກັບ</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasSignature}
            className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[32px] text-xs font-medium text-red-700 dark:text-red-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/60 disabled:opacity-40 rounded-md transition-colors whitespace-nowrap"
          >
            <Eraser className="w-3.5 h-3.5" aria-hidden="true" />
            <span>ລ້າງລາຍເຊັນ</span>
          </button>
        </div>
      </div>

      {/* Crisp Paper Signature Pad (always bright white paper backing so ink is clearly visible in Light & Dark Mode) */}
      <div className="relative bg-white border border-slate-300 dark:border-slate-600 rounded-xl overflow-hidden shadow-inner">
        {baseImageUrl && (
          <img
            src={baseImageUrl}
            alt="ລາຍເຊັນທີ່ບັນທຶກໄວ້"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          />
        )}

        {!hasSignature && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-slate-400 px-4 text-center">
            <span className="text-xs font-medium">
              ແຕ້ມລາຍເຊັນຜູ້ອະນຸມັດບ່ອນນີ້ (ຮອງຮັບເມົ້າສ໌, ປາກກາ ແລະ ໜ້າຈໍສຳຜັດ)
            </span>
          </div>
        )}

        {/* Signature baseline */}
        <div
          className="absolute left-6 right-6 bottom-6 border-b border-dashed border-slate-300 pointer-events-none"
          aria-hidden="true"
        />

        <canvas
          ref={canvasRef}
          data-testid="signature-canvas"
          aria-label="ກະດານແຕ້ມລາຍເຊັນດິຈິຕອນ"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          className="relative z-10 block w-full h-[168px] sm:h-[180px] cursor-crosshair touch-none"
        />
      </div>

      {errorMessage && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
