import React from 'react';
import { Moon, Sun } from 'lucide-react';
import {
  getThemeModeDisplayName,
  getThemeToggleLabel,
  ThemeMode,
} from '../utils/themeLogic';

interface ThemeToggleButtonProps {
  theme: ThemeMode;
  onToggle: () => void;
  showLabel?: boolean;
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  theme,
  onToggle,
  showLabel = false,
}) => {
  const isDark = theme === 'dark';
  const nextDisplay = getThemeModeDisplayName(isDark ? 'light' : 'dark');

  return (
    <button
      type="button"
      onClick={onToggle}
      data-testid="theme-toggle-button"
      aria-label={getThemeToggleLabel(theme)}
      aria-pressed={isDark}
      title={getThemeToggleLabel(theme)}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
        showLabel
          ? 'px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
          : 'p-2 min-w-[40px] min-h-[40px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4 shrink-0" aria-hidden="true" />
      )}
      {showLabel && <span>{nextDisplay}</span>}
    </button>
  );
};
