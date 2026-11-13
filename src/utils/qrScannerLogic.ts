import jsQR from 'jsqr';
import { DocumentRecord } from '../types/document';

export interface QrMatchResult {
  document: DocumentRecord | null;
  matchedBy: 'docId' | 'id' | 'docNumber' | 'outgoingDocNumber' | 'scanLink' | null;
  normalizedToken: string;
}

export function extractQrLookupCandidates(rawText: string): string[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  const candidates = new Set<string>();
  candidates.add(trimmed);

  // Try parsing JSON payload (if QR contains {"docId": "..."} or {"id": "..."})
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      for (const key of ['docId', 'id', 'docNumber', 'outgoingDocNumber']) {
        const val = parsed[key];
        if (typeof val === 'string' && val.trim()) {
          candidates.add(val.trim());
        }
      }
    } catch {
      // ignore invalid JSON
    }
  }

  // Try extracting ?docId=... from deep link URLs
  try {
    const parsedUrl = new URL(trimmed, 'https://placeholder.local');
    const docIdParam = parsedUrl.searchParams.get('docId');
    if (docIdParam && docIdParam.trim()) {
      candidates.add(docIdParam.trim());
    }
  } catch {
    // ignore URL parse errors
  }

  const queryMatch = trimmed.match(/[?&]docId=([^&#]+)/i);
  if (queryMatch?.[1]) {
    try {
      candidates.add(decodeURIComponent(queryMatch[1]).trim());
    } catch {
      candidates.add(queryMatch[1].trim());
    }
  }

  return Array.from(candidates);
}

export function resolveScannedQrToDocument(
  rawQrText: string,
  documents: DocumentRecord[]
): QrMatchResult {
  const candidates = extractQrLookupCandidates(rawQrText);
  if (candidates.length === 0) {
    return { document: null, matchedBy: null, normalizedToken: '' };
  }

  const normalizedCandidates = candidates.map((c) => c.toLowerCase());

  // 1. Highest priority: exact ID match (case-insensitive)
  for (const cand of normalizedCandidates) {
    const byId = documents.find((d) => d.id.trim().toLowerCase() === cand);
    if (byId) {
      const matchedBy = rawQrText.includes('docId=') ? 'docId' : 'id';
      return { document: byId, matchedBy, normalizedToken: byId.id };
    }
  }

  // 2. Exact docNumber match
  for (const cand of normalizedCandidates) {
    const byDocNo = documents.find((d) => d.docNumber.trim().toLowerCase() === cand);
    if (byDocNo) {
      return {
        document: byDocNo,
        matchedBy: 'docNumber',
        normalizedToken: byDocNo.docNumber,
      };
    }
  }

  // 3. Exact outgoingDocNumber match
  for (const cand of normalizedCandidates) {
    const byOutNo = documents.find(
      (d) => (d.outgoingDocNumber ?? '').trim().toLowerCase() === cand && cand !== ''
    );
    if (byOutNo) {
      return {
        document: byOutNo,
        matchedBy: 'outgoingDocNumber',
        normalizedToken: byOutNo.outgoingDocNumber || '',
      };
    }
  }

  // 4. Scan link match
  for (const cand of normalizedCandidates) {
    const byScanLink = documents.find(
      (d) => d.scanLink.trim() && d.scanLink.trim().toLowerCase() === cand
    );
    if (byScanLink) {
      return {
        document: byScanLink,
        matchedBy: 'scanLink',
        normalizedToken: byScanLink.scanLink,
      };
    }
  }

  return {
    document: null,
    matchedBy: null,
    normalizedToken: candidates[0],
  };
}

export function decodeQrFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number
): string | null {
  if (!data || width <= 0 || height <= 0) return null;
  const code = jsQR(data, width, height, {
    inversionAttempts: 'attemptBoth',
  });
  return code?.data?.trim() || null;
}
