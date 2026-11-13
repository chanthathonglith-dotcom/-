import test from 'node:test';
import assert from 'node:assert/strict';
import { AccessRequestRecord } from '../types/document';
import {
  SOLE_ADMIN_EMAIL,
  buildNewAccessRequestPayload,
  countPendingRequests,
  isSoleAdminEmail,
  resolveUserAccessGate,
} from './accessControlLogic';

test('isSoleAdminEmail grants admin exclusively to verified chanthathonglith@gmail.com', () => {
  assert.equal(isSoleAdminEmail(SOLE_ADMIN_EMAIL, true), true);
  assert.equal(isSoleAdminEmail(' Chanthathonglith@GMAIL.com ', true), true);
  assert.equal(isSoleAdminEmail(SOLE_ADMIN_EMAIL, false), false);
  assert.equal(isSoleAdminEmail('other.user@gmail.com', true), false);
  assert.equal(isSoleAdminEmail('', true), false);
});

test('resolveUserAccessGate enforces sole admin and approval gate states', () => {
  assert.equal(
    resolveUserAccessGate({
      email: 'Chanthathonglith@gmail.com',
      emailVerified: true,
      request: null,
    }),
    'admin'
  );

  assert.equal(
    resolveUserAccessGate({
      email: 'staff1@gmail.com',
      emailVerified: false,
      request: null,
    }),
    'unverified'
  );

  assert.equal(
    resolveUserAccessGate({
      email: 'staff1@gmail.com',
      emailVerified: true,
      request: null,
    }),
    'needs_request'
  );

  const pendingReq: AccessRequestRecord = {
    uid: 'uid-1',
    email: 'staff1@gmail.com',
    displayName: 'Staff 1',
    photoURL: '',
    reason: 'ພະແນກບໍລິຫານ',
    status: 'pending',
    reviewedByEmail: '',
    adminNote: '',
    requestedAt: '2026-11-12T00:00:00.000Z',
    updatedAt: '2026-11-12T00:00:00.000Z',
  };

  assert.equal(
    resolveUserAccessGate({
      email: 'staff1@gmail.com',
      emailVerified: true,
      request: pendingReq,
    }),
    'pending'
  );

  assert.equal(
    resolveUserAccessGate({
      email: 'staff1@gmail.com',
      emailVerified: true,
      request: { ...pendingReq, status: 'approved' },
    }),
    'approved'
  );

  assert.equal(
    resolveUserAccessGate({
      email: 'staff1@gmail.com',
      emailVerified: true,
      request: { ...pendingReq, status: 'rejected' },
    }),
    'rejected'
  );
});

test('buildNewAccessRequestPayload enforces blueprint max lengths and pending initial status', () => {
  const payload = buildNewAccessRequestPayload({
    uid: 'user_123',
    email: 'user@example.com',
    displayName: 'A'.repeat(150),
    photoURL: 'https://example.com/a.jpg',
    reason: 'B'.repeat(350),
  });

  assert.equal(payload.status, 'pending');
  assert.equal(payload.reviewedByEmail, '');
  assert.equal(payload.adminNote, '');
  assert.equal(payload.displayName.length, 120);
  assert.equal(payload.reason.length, 300);

  assert.equal(
    countPendingRequests([
      {
        ...payload,
        requestedAt: '',
        updatedAt: '',
      },
      {
        ...payload,
        uid: 'user_456',
        status: 'approved',
        requestedAt: '',
        updatedAt: '',
      },
    ]),
    1
  );
});
