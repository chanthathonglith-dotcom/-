import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  PushStore,
  evaluateDueWatches,
  isValidPushSubscription,
} from './pushStore';

test('evaluateDueWatches detects pending/in-progress due items and skips completed or already notified', () => {
  const watches = [
    {
      id: 'D1',
      docNumber: '001/ຂຂ',
      title: 'ເອກະສານຄ້າງ',
      direction: 'incoming',
      dueDate: '2026-11-12',
      department: 'ພະແນກຈັດຕັ້ງ',
      status: 'pending',
    },
    {
      id: 'D2',
      docNumber: '002/ຂຂ',
      title: 'ເອກະສານສຳເລັດແລ້ວ',
      direction: 'outgoing',
      dueDate: '2026-11-12',
      department: 'ພະແນກການເງິນ',
      status: 'completed',
    },
    {
      id: 'D3',
      docNumber: '003/ນກ',
      title: 'ແຈ້ງເຕືອນແລ້ວ',
      direction: 'legal',
      dueDate: '2026-11-10',
      department: 'ກົດໝາຍ',
      status: 'in_progress',
    },
  ];

  const notified = new Set<string>(['D3:2026-11-12']);
  const due = evaluateDueWatches(watches, '2026-11-12', notified);

  assert.equal(due.length, 1);
  assert.equal(due[0].watch.id, 'D1');
  assert.equal(due[0].payload.requireInteraction, true);
  assert.equal(due[0].payload.lockScreenDisplay, true);
  assert.equal(due[0].payload.url, '/?docId=D1');
});

test('isValidPushSubscription validates required https endpoint and encryption keys', () => {
  assert.equal(
    isValidPushSubscription({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      keys: { p256dh: 'key1', auth: 'auth1' },
    }),
    true
  );
  assert.equal(
    isValidPushSubscription({
      endpoint: 'http://insecure.local/push',
      keys: { p256dh: 'key1', auth: 'auth1' },
    }),
    false
  );
  assert.equal(isValidPushSubscription({ endpoint: 'https://a.com' }), false);
});

test('PushStore persists VAPID keys, subscriptions, and watches on disk', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'push-store-test-'));
  try {
    const store1 = new PushStore(tmpDir);
    const key1 = store1.getPublicKey().publicKey;
    assert.ok(key1.length > 20);

    store1.upsertSubscription({
      endpoint: 'https://push.example.com/sub-1',
      keys: { p256dh: 'p256dh-val', auth: 'auth-val' },
    });
    store1.updateWatches([
      {
        id: 'DOC-9',
        docNumber: '009/2026',
        title: 'ທົດສອບ',
        direction: 'incoming',
        dueDate: '2026-11-12',
        department: 'ບໍລິຫານ',
        status: 'pending',
      },
    ]);

    const store2 = new PushStore(tmpDir);
    assert.equal(store2.getPublicKey().publicKey, key1);
    assert.equal(store2.getStatus().subscriptionCount, 1);
    assert.equal(store2.getStatus().watchCount, 1);

    const removed = store2.removeSubscription('https://push.example.com/sub-1');
    assert.equal(removed, true);
    assert.equal(store2.getStatus().subscriptionCount, 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
