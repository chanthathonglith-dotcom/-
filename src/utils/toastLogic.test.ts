import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TOAST_DURATIONS,
  MAX_VISIBLE_TOASTS,
  createToastItem,
  dismissToast,
  upsertToast,
} from './toastLogic';

test('createToastItem assigns variant-appropriate default durations', () => {
  const loading = createToastItem({
    id: 't-load',
    variant: 'loading',
    title: 'ກຳລັງອັບໂຫຼດ...',
  });
  assert.equal(loading.durationMs, 0);

  const success = createToastItem({
    id: 't-ok',
    variant: 'success',
    title: 'ບັນທຶກສຳເລັດ',
  });
  assert.equal(success.durationMs, DEFAULT_TOAST_DURATIONS.success);

  const err = createToastItem({
    id: 't-err',
    variant: 'error',
    title: 'ເກີດຂໍ້ຜິດພາດ',
  });
  assert.equal(err.durationMs, DEFAULT_TOAST_DURATIONS.error);
});

test('upsertToast updates an existing loading toast in-place and caps max visible count', () => {
  let toasts = [
    createToastItem({ id: 't1', variant: 'loading', title: 'ກຳລັງອັບໂຫຼດ...' }),
  ];

  toasts = upsertToast(
    toasts,
    createToastItem({
      id: 't1',
      variant: 'success',
      title: 'ບັນທຶກສຳເລັດ',
      description: 'ອັບໂຫຼດຟາຍສຳເລັດແລ້ວ',
    })
  );
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].variant, 'success');
  assert.equal(toasts[0].title, 'ບັນທຶກສຳເລັດ');
  assert.equal(toasts[0].durationMs, DEFAULT_TOAST_DURATIONS.success);

  for (let i = 2; i <= MAX_VISIBLE_TOASTS + 2; i++) {
    toasts = upsertToast(
      toasts,
      createToastItem({ id: `t${i}`, variant: 'info', title: `ແຈ້ງເຕືອນ ${i}` })
    );
  }
  assert.equal(toasts.length, MAX_VISIBLE_TOASTS);
  assert.equal(toasts[0].id, 't3');
  assert.equal(toasts[toasts.length - 1].id, `t${MAX_VISIBLE_TOASTS + 2}`);
});

test('dismissToast removes only the matching toast id', () => {
  const list = [
    createToastItem({ id: 'a', variant: 'info', title: 'A' }),
    createToastItem({ id: 'b', variant: 'error', title: 'B' }),
  ];
  const next = dismissToast(list, 'a');
  assert.equal(next.length, 1);
  assert.equal(next[0].id, 'b');
});
