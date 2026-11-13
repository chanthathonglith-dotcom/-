export type ThemeMode = 'light' | 'dark';

export function resolveInitialTheme(
  storedValue: string | null | undefined,
  prefersDark: boolean
): ThemeMode {
  if (storedValue === 'light' || storedValue === 'dark') {
    return storedValue;
  }
  return prefersDark ? 'dark' : 'light';
}

export function toggleThemeMode(current: ThemeMode): ThemeMode {
  return current === 'dark' ? 'light' : 'dark';
}

export function getThemeToggleLabel(current: ThemeMode): string {
  return current === 'dark' ? 'ສະຫຼັບເປັນໂໝດສະຫວ່າງ' : 'ສະຫຼັບເປັນໂໝດມືດ';
}

export function getThemeModeDisplayName(mode: ThemeMode): string {
  return mode === 'dark' ? 'ໂໝດມືດ' : 'ໂໝດສະຫວ່າງ';
}
