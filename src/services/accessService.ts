import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  AccessApprovalStatus,
  AccessRequestRecord,
  WorkspaceSharedConfig,
} from '../types/document';
import { buildNewAccessRequestPayload } from '../utils/accessControlLogic';
import {
  OperationType,
  firestoreDb,
  handleFirestoreError,
} from './firebaseClient';

const ACCESS_REQUESTS_COLLECTION = 'accessRequests';
const WORKSPACE_CONFIG_COLLECTION = 'workspaceConfig';
const SHARED_CONFIG_DOC_ID = 'shared';

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

function mapDocToAccessRequest(
  docId: string,
  data: Record<string, unknown>
): AccessRequestRecord {
  const statusRaw = String(data.status ?? 'pending');
  const status: AccessApprovalStatus =
    statusRaw === 'approved' || statusRaw === 'rejected' ? statusRaw : 'pending';

  return {
    uid: String(data.uid ?? docId),
    email: String(data.email ?? ''),
    displayName: String(data.displayName ?? ''),
    photoURL: String(data.photoURL ?? ''),
    reason: String(data.reason ?? ''),
    status,
    reviewedByEmail: String(data.reviewedByEmail ?? ''),
    adminNote: String(data.adminNote ?? ''),
    requestedAt: timestampToIso(data.requestedAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export function subscribeOwnAccessRequest(
  uid: string,
  onData: (record: AccessRequestRecord | null) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `${ACCESS_REQUESTS_COLLECTION}/${uid}`;
  const docRef = doc(firestoreDb, ACCESS_REQUESTS_COLLECTION, uid);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData(
        mapDocToAccessRequest(snapshot.id, snapshot.data() as Record<string, unknown>)
      );
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeAllAccessRequests(
  onData: (records: AccessRequestRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = ACCESS_REQUESTS_COLLECTION;
  const q = query(
    collection(firestoreDb, ACCESS_REQUESTS_COLLECTION),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        mapDocToAccessRequest(d.id, d.data() as Record<string, unknown>)
      );
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function submitOrUpdateAccessRequest(input: {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  reason?: string | null;
}): Promise<void> {
  const path = `${ACCESS_REQUESTS_COLLECTION}/${input.uid}`;
  const docRef = doc(firestoreDb, ACCESS_REQUESTS_COLLECTION, input.uid);
  const payload = buildNewAccessRequestPayload(input);

  try {
    const existingSnap = await getDoc(docRef);
    if (!existingSnap.exists()) {
      await setDoc(docRef, {
        ...payload,
        requestedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const existingStatus = String(existingSnap.data()?.status ?? '');
    if (existingStatus === 'approved') {
      return;
    }

    await updateDoc(docRef, {
      displayName: payload.displayName,
      photoURL: payload.photoURL,
      reason: payload.reason,
      status: 'pending',
      reviewedByEmail: '',
      adminNote: '',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function reviewAccessRequest(params: {
  uid: string;
  status: 'approved' | 'rejected';
  adminEmail: string;
  adminNote?: string;
}): Promise<void> {
  const path = `${ACCESS_REQUESTS_COLLECTION}/${params.uid}`;
  const docRef = doc(firestoreDb, ACCESS_REQUESTS_COLLECTION, params.uid);

  try {
    await updateDoc(docRef, {
      status: params.status,
      reviewedByEmail: params.adminEmail.trim().slice(0, 254),
      adminNote: (params.adminNote ?? '').trim().slice(0, 300),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeAccessRequest(uid: string): Promise<void> {
  const path = `${ACCESS_REQUESTS_COLLECTION}/${uid}`;
  const docRef = doc(firestoreDb, ACCESS_REQUESTS_COLLECTION, uid);

  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchSharedWorkspaceConfig(): Promise<WorkspaceSharedConfig | null> {
  const path = `${WORKSPACE_CONFIG_COLLECTION}/${SHARED_CONFIG_DOC_ID}`;
  const docRef = doc(firestoreDb, WORKSPACE_CONFIG_COLLECTION, SHARED_CONFIG_DOC_ID);

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    return {
      spreadsheetId: String(data.spreadsheetId ?? ''),
      spreadsheetTitle: String(data.spreadsheetTitle ?? ''),
      updatedByEmail: String(data.updatedByEmail ?? ''),
      updatedAt: timestampToIso(data.updatedAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveSharedWorkspaceConfig(input: {
  spreadsheetId: string;
  spreadsheetTitle: string;
  adminEmail: string;
}): Promise<void> {
  const path = `${WORKSPACE_CONFIG_COLLECTION}/${SHARED_CONFIG_DOC_ID}`;
  const docRef = doc(firestoreDb, WORKSPACE_CONFIG_COLLECTION, SHARED_CONFIG_DOC_ID);

  try {
    await setDoc(docRef, {
      spreadsheetId: input.spreadsheetId.trim().slice(0, 200),
      spreadsheetTitle: input.spreadsheetTitle.trim().slice(0, 200),
      updatedByEmail: input.adminEmail.trim().slice(0, 254),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
