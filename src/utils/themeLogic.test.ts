import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getThemeModeDisplayName,
  getThemeToggleLabel,
  resolveInitialTheme,
  toggleThemeMode,
} from './themeLogic';

test('resolveInitialTheme honors explicit stored preference first', () => {
  assert.equal(resolveInitialTheme('dark', false), 'dark');
  assert.equal(resolveInitialTheme('light', true), 'light');
});

test('resolveInitialTheme falls back to system preference when stored value is missing or invalid', () => {
  assert.equal(resolveInitialTheme(null, true), 'dark');
  assert.equal(resolveInitialTheme(undefined, false), 'light');
  assert.equal(resolveInitialTheme('invalid', true), 'dark');
});

test('toggleThemeMode switches cleanly between light and dark', () => {
  assert.equal(toggleThemeMode('light'), 'dark');
  assert.equal(toggleThemeMode('dark'), 'light');
});

test('Lao theme labels match current mode accurately', () => {
  assert.equal(getThemeModeDisplayName('light'), 'ໂໝດສະຫວ່າງ');
  assert.equal(getThemeModeDisplayName('dark'), 'ໂໝດມືດ');
  assert.equal(getThemeToggleLabel('light'), 'ສະຫຼັບເປັນໂໝດມືດ');
  assert.equal(getThemeToggleLabel('dark'), 'ສະຫຼັບເປັນໂໝດສະຫວ່າງ');
});
