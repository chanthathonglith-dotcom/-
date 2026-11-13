import { AccessRequestRecord } from '../types/document';

export const SOLE_ADMIN_EMAIL = 'chanthathonglith@gmail.com';

export type UserAccessGateState =
  | 'admin'
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'needs_request'
  | 'unverified';

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

export function isSoleAdminEmail(
  email: string | null | undefined,
  emailVerified = true
): boolean {
  if (!emailVerified) return false;
  return normalizeEmail(email) === SOLE_ADMIN_EMAIL;
}

export function resolveUserAccessGate(params: {
  email: string | null | undefined;
  emailVerified: boolean;
  request: AccessRequestRecord | null;
}): UserAccessGateState {
  if (!params.emailVerified || !normalizeEmail(params.email)) {
    return 'unverified';
  }
  if (isSoleAdminEmail(params.email, params.emailVerified)) {
    return 'admin';
  }
  if (!params.request) {
    return 'needs_request';
  }
  if (params.request.status === 'approved') {
    return 'approved';
  }
  if (params.request.status === 'rejected') {
    return 'rejected';
  }
  return 'pending';
}

export function buildNewAccessRequestPayload(input: {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  reason?: string | null;
}): Omit<AccessRequestRecord, 'requestedAt' | 'updatedAt'> {
  return {
    uid: input.uid.trim().slice(0, 128),
    email: input.email.trim().slice(0, 254),
    displayName: (input.displayName ?? '').trim().slice(0, 120),
    photoURL: (input.photoURL ?? '').trim().slice(0, 500),
    reason: (input.reason ?? '').trim().slice(0, 300),
    status: 'pending',
    reviewedByEmail: '',
    adminNote: '',
  };
}

export function countPendingRequests(requests: AccessRequestRecord[]): number {
  return requests.filter((r) => r.status === 'pending').length;
}
