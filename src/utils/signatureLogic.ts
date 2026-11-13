export interface SignaturePoint {
  x: number;
  y: number;
}

export interface SignatureStroke {
  points: SignaturePoint[];
  color: string;
  width: number;
}

export interface InkPreset {
  id: string;
  label: string;
  hex: string;
}

export interface PenWidthPreset {
  id: 'thin' | 'medium' | 'bold';
  label: string;
  width: number;
}

export const MAX_SIGNATURE_DATA_URL_LENGTH = 48_000;

export const SIGNATURE_INK_COLORS: readonly InkPreset[] = [
  { id: 'ink-navy', label: 'ນ້ຳມຶກດຳເຂັ້ມ', hex: '#0F172A' },
  { id: 'ink-blue', label: 'ປາກກາສີຟ້າ', hex: '#1D4ED8' },
  { id: 'ink-crimson', label: 'ນ້ຳມຶກສີແດງ', hex: '#B91C1C' },
];

export const SIGNATURE_PEN_WIDTHS: readonly PenWidthPreset[] = [
  { id: 'thin', label: 'ບາງ', width: 2 },
  { id: 'medium', label: 'ກາງ', width: 3 },
  { id: 'bold', label: 'ໜາ', width: 4.5 },
];

export function popLastStroke(strokes: SignatureStroke[]): SignatureStroke[] {
  if (strokes.length === 0) return strokes;
  return strokes.slice(0, -1);
}

export function hasSignatureContent(
  strokes: SignatureStroke[],
  existingDataUrl?: string
): boolean {
  const hasStrokes = strokes.some((s) => s.points.length > 0);
  if (hasStrokes) return true;
  return isValidSignatureDataUrl(existingDataUrl);
}

export function computeStrokeBounds(
  strokes: SignatureStroke[]
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let count = 0;

  for (const stroke of strokes) {
    const pad = Math.max(2, stroke.width);
    for (const pt of stroke.points) {
      count += 1;
      if (pt.x - pad < minX) minX = pt.x - pad;
      if (pt.y - pad < minY) minY = pt.y - pad;
      if (pt.x + pad > maxX) maxX = pt.x + pad;
      if (pt.y + pad > maxY) maxY = pt.y + pad;
    }
  }

  if (count === 0) return null;
  return { minX, minY, maxX, maxY };
}

export function isValidSignatureDataUrl(raw: string | undefined): boolean {
  const val = (raw ?? '').trim();
  if (!val) return false;
  if (val.length > MAX_SIGNATURE_DATA_URL_LENGTH) return false;
  return /^data:image\/(png;base64,[A-Za-z0-9+/=]+|svg\+xml(;utf8|,|;base64,))/i.test(val);
}

export function formatSignatureTimestamp(iso?: string): string {
  const trimmed = (iso ?? '').trim();
  if (!trimmed) return '';
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  const d = String(parsed.getDate()).padStart(2, '0');
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const y = parsed.getFullYear();
  const hh = String(parsed.getHours()).padStart(2, '0');
  const mm = String(parsed.getMinutes()).padStart(2, '0');
  return `${d}/${m}/${y} · ${hh}:${mm}`;
}

export function buildDemoSignatureSvgDataUrl(variant: 'exec1' | 'exec2' | 'exec3', inkHex = '#1D4ED8'): string {
  const paths: Record<'exec1' | 'exec2' | 'exec3', string> = {
    exec1:
      'M26 78 C 38 30, 56 26, 52 74 C 49 92, 68 42, 86 58 C 98 70, 108 42, 128 54 C 142 62, 152 44, 174 52 C 194 60, 212 36, 240 48 M34 90 C 96 80, 178 74, 248 80',
    exec2:
      'M30 74 C 52 24, 72 34, 62 76 C 58 88, 92 44, 110 62 C 122 72, 136 38, 158 58 C 172 72, 196 42, 224 52 M42 88 C 106 82, 166 78, 228 82',
    exec3:
      'M28 66 C 46 28, 66 42, 58 76 C 54 90, 82 48, 98 62 C 114 76, 134 34, 154 52 C 168 64, 188 46, 214 54 C 228 58, 244 42, 256 48 M38 86 C 112 78, 182 76, 252 78',
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 110" width="280" height="110"><path d="${paths[variant]}" fill="none" stroke="${inkHex}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
