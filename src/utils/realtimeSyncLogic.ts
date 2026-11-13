import type {
  DocumentDirection,
  DocumentPurpose,
  DocumentRecord,
  DocumentStatus,
} from '../types/document.ts';

export type RealtimeDocumentEvent =
  | {
      type: 'documents:snapshot';
      roomId: string;
      documents: DocumentRecord[];
      senderId?: string;
      timestamp: number;
    }
  | {
      type: 'document:created';
      roomId: string;
      document: DocumentRecord;
      senderId?: string;
      timestamp: number;
    }
  | {
      type: 'document:updated';
      roomId: string;
      document: DocumentRecord;
      senderId?: string;
      timestamp: number;
    }
  | {
      type: 'document:deleted';
      roomId: string;
      docId: string;
      senderId?: string;
      timestamp: number;
    }
  | {
      type: 'sheets:delta';
      roomId: string;
      added: DocumentRecord[];
      updated: DocumentRecord[];
      deletedIds: string[];
      senderId?: string;
      timestamp: number;
    };

export type ClientToServerMessage =
  | {
      type: 'join';
      roomId: string;
      clientId: string;
      initialDocuments?: DocumentRecord[];
    }
  | {
      type: 'leave';
      roomId: string;
    }
  | {
      type: 'watch:sheets';
      roomId: string;
      spreadsheetId: string;
      sheetTitle: string;
      accessToken: string;
    }
  | {
      type: 'unwatch:sheets';
      roomId: string;
    }
  | {
      type: 'document:created';
      roomId: string;
      document: DocumentRecord;
      senderId: string;
    }
  | {
      type: 'document:updated';
      roomId: string;
      document: DocumentRecord;
      senderId: string;
    }
  | {
      type: 'document:deleted';
      roomId: string;
      docId: string;
      senderId: string;
    }
  | {
      type: 'ping';
    };

export type ServerToClientMessage =
  | RealtimeDocumentEvent
  | {
      type: 'joined';
      roomId: string;
      peerCount: number;
    }
  | {
      type: 'sheets:auth_expired';
      roomId: string;
    }
  | {
      type: 'pong';
    };

export interface DocumentDiffResult {
  added: DocumentRecord[];
  updated: DocumentRecord[];
  deletedIds: string[];
  hasChanges: boolean;
}

export function areDocumentRecordsEqual(a: DocumentRecord, b: DocumentRecord): boolean {
  return (
    a.id === b.id &&
    a.direction === b.direction &&
    a.docNumber === b.docNumber &&
    a.docDate === b.docDate &&
    (a.incomingDate ?? '') === (b.incomingDate ?? '') &&
    (a.outgoingDate ?? '') === (b.outgoingDate ?? '') &&
    (a.dueDate ?? '') === (b.dueDate ?? '') &&
    a.title === b.title &&
    a.department === b.department &&
    a.purpose === b.purpose &&
    a.leadershipComment === b.leadershipComment &&
    a.status === b.status &&
    a.scanLink === b.scanLink &&
    a.scanFileName === b.scanFileName &&
    a.driveFileId === b.driveFileId &&
    (a.approverName ?? '') === (b.approverName ?? '') &&
    (a.signatureDataUrl ?? '') === (b.signatureDataUrl ?? '') &&
    (a.signedAt ?? '') === (b.signedAt ?? '') &&
    a.createdBy === b.createdBy &&
    a.updatedAt === b.updatedAt
  );
}

export function computeDocumentDiff(
  prevDocs: DocumentRecord[],
  nextDocs: DocumentRecord[]
): DocumentDiffResult {
  const prevById = new Map<string, DocumentRecord>();
  for (const doc of prevDocs) {
    prevById.set(doc.id, doc);
  }

  const nextById = new Map<string, DocumentRecord>();
  const added: DocumentRecord[] = [];
  const updated: DocumentRecord[] = [];

  for (const nextDoc of nextDocs) {
    nextById.set(nextDoc.id, nextDoc);
    const prevDoc = prevById.get(nextDoc.id);
    if (!prevDoc) {
      added.push(nextDoc);
    } else if (!areDocumentRecordsEqual(prevDoc, nextDoc)) {
      updated.push(nextDoc);
    }
  }

  const deletedIds: string[] = [];
  for (const prevDoc of prevDocs) {
    if (!nextById.has(prevDoc.id)) {
      deletedIds.push(prevDoc.id);
    }
  }

  return {
    added,
    updated,
    deletedIds,
    hasChanges: added.length > 0 || updated.length > 0 || deletedIds.length > 0,
  };
}

export function applyRealtimeDelta(
  currentDocs: DocumentRecord[],
  event: RealtimeDocumentEvent
): DocumentRecord[] {
  switch (event.type) {
    case 'documents:snapshot': {
      const seen = new Set<string>();
      const deduped: DocumentRecord[] = [];
      for (const doc of event.documents) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          deduped.push(doc);
        }
      }
      return deduped;
    }

    case 'document:created': {
      const exists = currentDocs.some((d) => d.id === event.document.id);
      if (exists) {
        return currentDocs.map((d) => (d.id === event.document.id ? event.document : d));
      }
      return [event.document, ...currentDocs];
    }

    case 'document:updated': {
      const exists = currentDocs.some((d) => d.id === event.document.id);
      if (!exists) {
        return [event.document, ...currentDocs];
      }
      return currentDocs.map((d) => (d.id === event.document.id ? event.document : d));
    }

    case 'document:deleted': {
      if (!currentDocs.some((d) => d.id === event.docId)) {
        return currentDocs;
      }
      return currentDocs.filter((d) => d.id !== event.docId);
    }

    case 'sheets:delta': {
      const deletedSet = new Set(event.deletedIds);
      const updatedMap = new Map(event.updated.map((d) => [d.id, d]));
      const next = currentDocs
        .filter((d) => !deletedSet.has(d.id))
        .map((d) => updatedMap.get(d.id) ?? d);

      const existingIds = new Set(next.map((d) => d.id));
      const newItems: DocumentRecord[] = [];
      for (const addedDoc of event.added) {
        if (!existingIds.has(addedDoc.id)) {
          existingIds.add(addedDoc.id);
          newItems.push(addedDoc);
        } else {
          // Idempotently update if already present
          const idx = next.findIndex((d) => d.id === addedDoc.id);
          if (idx >= 0) next[idx] = addedDoc;
        }
      }

      return [...newItems, ...next];
    }
  }
}

function parseDirectionServer(raw: string | undefined): DocumentDirection {
  const val = (raw ?? '').trim().toLowerCase();
  if (val === 'outgoing' || val === 'ຂາອອກ') return 'outgoing' as DocumentDirection;
  if (val === 'legal' || val === 'ນິຕິກຳ') return 'legal' as DocumentDirection;
  if (val === 'speech' || val === 'ບົດໂອ້ລົມ') return 'speech' as DocumentDirection;
  return 'incoming' as DocumentDirection;
}

function parsePurposeServer(raw: string | undefined): DocumentPurpose {
  const val = (raw ?? '').trim().toLowerCase();
  if (val === 'signature' || val === 'ຂໍລາຍເຊັນ') return 'signature' as DocumentPurpose;
  if (val === 'guidance' || val === 'ຂໍທິດຊີ້ນຳ') return 'guidance' as DocumentPurpose;
  if (val === 'info' || val === 'ເພື່ອຊາບ') return 'info' as DocumentPurpose;
  return 'opinion' as DocumentPurpose;
}

function parseStatusServer(raw: string | undefined): DocumentStatus {
  const val = (raw ?? '').trim().toLowerCase();
  if (val === 'in_progress' || val === 'ກຳລັງດຳເນີນການ') {
    return 'in_progress' as DocumentStatus;
  }
  if (val === 'completed' || val === 'ສຳເລັດແລ້ວ') {
    return 'completed' as DocumentStatus;
  }
  if (val === 'returned' || val.includes('ສົ່ງຄືນ')) {
    return 'returned' as DocumentStatus;
  }
  return 'pending' as DocumentStatus;
}

export function parseSheetRowsServerSafe(rows: string[][]): DocumentRecord[] {
  if (!rows || rows.length <= 1) return [];

  const documents: DocumentRecord[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((cell) => !cell || !cell.trim())) {
      continue;
    }

    const id = (row[0] ?? '').trim() || `row-${i + 1}`;
    const direction = parseDirectionServer(row[1]);
    const docDate = (row[3] ?? '').trim();
    const rawIncoming = (row[15] ?? '').trim();
    const rawOutgoing = (row[16] ?? '').trim();
    const hasSeparatedColumns = Boolean(rawIncoming || rawOutgoing);

    const incomingDate =
      rawIncoming ||
      (!hasSeparatedColumns && direction === ('incoming' as DocumentDirection) ? docDate : '');
    const outgoingDate =
      rawOutgoing ||
      (!hasSeparatedColumns && direction === ('outgoing' as DocumentDirection) ? docDate : '');

    documents.push({
      id,
      direction,
      docNumber: (row[2] ?? '').trim(),
      docDate: docDate || incomingDate || outgoingDate,
      incomingDate,
      outgoingDate,
      dueDate: (row[14] ?? '').trim(),
      title: (row[4] ?? '').trim(),
      department: (row[5] ?? '').trim(),
      purpose: parsePurposeServer(row[6]),
      leadershipComment: (row[7] ?? '').trim(),
      status: parseStatusServer(row[8]),
      scanLink: (row[9] ?? '').trim(),
      scanFileName: (row[10] ?? '').trim(),
      driveFileId: (row[11] ?? '').trim(),
      approverName: (row[17] ?? '').trim(),
      signatureDataUrl: (row[18] ?? '').trim(),
      signedAt: (row[19] ?? '').trim(),
      createdBy: (row[12] ?? '').trim(),
      updatedAt: (row[13] ?? '').trim() || new Date().toISOString(),
      sheetRowNumber: i + 1,
    });
  }

  return documents;
}
