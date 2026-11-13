import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Clock,
  Files,
  Mic,
  Scale,
} from 'lucide-react';
import { DocumentDirection } from '../types/document';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 'sm', className = '' }) => {
  const sizeClass =
    size === 'lg'
      ? 'w-11 h-11 rounded-2xl'
      : size === 'md'
      ? 'w-9 h-9 rounded-xl'
      : 'w-8 h-8 rounded-[10px]';

  return (
    <div
      className={`${sizeClass} bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 dark:from-sky-500 dark:via-blue-600 dark:to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-700/25 ring-1 ring-inset ring-white/25 ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 32 32"
        className="w-[68%] h-[68%]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M7 5.5C7 4.67157 7.67157 4 8.5 4H18.2L24.5 10.3V26.5C24.5 27.3284 23.8284 28 23 28H8.5C7.67157 28 7 27.3284 7 26.5V5.5Z"
          fill="white"
          fillOpacity="0.2"
          stroke="white"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M18 4V9.5C18 10.0523 18.4477 10.5 19 10.5H24.5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.5 14H18.5M10.5 18H15"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M11 23.2C13.2 21.4 15.2 21.6 16.5 23.1C17.4 24.1 19 22.8 21.5 21.8"
          stroke="#BAE6FD"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export interface ChannelVisualConfig {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  badgeClass: string;
  accentTextClass: string;
  accentDotClass: string;
  chartColorLight: string;
  chartColorDark: string;
  progressBarClass: string;
}

export const CHANNEL_VISUALS: Record<DocumentDirection, ChannelVisualConfig> = {
  [DocumentDirection.INCOMING]: {
    icon: ArrowDownLeft,
    badgeClass:
      'bg-gradient-to-br from-sky-500 via-blue-600 to-blue-700 dark:from-sky-400 dark:via-blue-500 dark:to-blue-700 text-white shadow-sm shadow-blue-600/20 ring-1 ring-inset ring-white/25',
    accentTextClass: 'text-blue-700 dark:text-blue-400',
    accentDotClass: 'bg-blue-600 dark:bg-blue-400',
    chartColorLight: '#2563EB',
    chartColorDark: '#38BDF8',
    progressBarClass: 'bg-gradient-to-r from-sky-500 to-blue-600',
  },
  [DocumentDirection.OUTGOING]: {
    icon: ArrowUpRight,
    badgeClass:
      'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 dark:from-emerald-400 dark:via-teal-500 dark:to-cyan-600 text-white shadow-sm shadow-teal-600/20 ring-1 ring-inset ring-white/25',
    accentTextClass: 'text-teal-700 dark:text-teal-400',
    accentDotClass: 'bg-teal-600 dark:bg-teal-400',
    chartColorLight: '#0D9488',
    chartColorDark: '#2DD4BF',
    progressBarClass: 'bg-gradient-to-r from-emerald-500 to-teal-500',
  },
  [DocumentDirection.LEGAL]: {
    icon: Scale,
    badgeClass:
      'bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 dark:from-indigo-400 dark:via-indigo-500 dark:to-violet-600 text-white shadow-sm shadow-indigo-600/20 ring-1 ring-inset ring-white/25',
    accentTextClass: 'text-indigo-700 dark:text-indigo-400',
    accentDotClass: 'bg-indigo-600 dark:bg-indigo-400',
    chartColorLight: '#4F46E5',
    chartColorDark: '#818CF8',
    progressBarClass: 'bg-gradient-to-r from-indigo-500 to-violet-600',
  },
  [DocumentDirection.SPEECH]: {
    icon: Mic,
    badgeClass:
      'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 dark:from-amber-400 dark:via-orange-500 dark:to-rose-500 text-white shadow-sm shadow-orange-500/20 ring-1 ring-inset ring-white/25',
    accentTextClass: 'text-orange-700 dark:text-amber-400',
    accentDotClass: 'bg-orange-500 dark:bg-amber-400',
    chartColorLight: '#EA580C',
    chartColorDark: '#FB923C',
    progressBarClass: 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500',
  },
};

const DuotoneGlyph: React.FC<{
  kind: DocumentDirection | 'all' | 'pending' | 'analytics';
  className: string;
}> = ({ kind, className }) => {
  switch (kind) {
    case 'all':
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <rect
            x="6.5"
            y="3"
            width="9.5"
            height="11.5"
            rx="2"
            fill="white"
            fillOpacity="0.28"
          />
          <rect
            x="4"
            y="5.5"
            width="9.5"
            height="11.5"
            rx="2"
            fill="white"
            fillOpacity="0.2"
            stroke="white"
            strokeWidth="1.6"
          />
          <path
            d="M6.5 9.5H11M6.5 12.5H9.5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case DocumentDirection.INCOMING:
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <path
            d="M3.5 12.5H6.8L8 14.5H12L13.2 12.5H16.5V15.5C16.5 16.3284 15.8284 17 15 17H5C4.17157 17 3.5 16.3284 3.5 15.5V12.5Z"
            fill="white"
            fillOpacity="0.32"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M10 3.5V11M10 11L7 8M10 11L13 8"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case DocumentDirection.OUTGOING:
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <path
            d="M3.5 9.5L16.5 3.5L12.8 16.5L9.5 11.2L3.5 9.5Z"
            fill="white"
            fillOpacity="0.28"
            stroke="white"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 11.2L16.2 3.8"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );

    case DocumentDirection.LEGAL:
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <path
            d="M10 3.5V16M6.5 16.5H13.5M4.5 6.5H15.5"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M5 6.5L3 11.5C3.5 12.4 4.3 12.8 5 12.8C5.7 12.8 6.5 12.4 7 11.5L5 6.5Z"
            fill="white"
            fillOpacity="0.3"
            stroke="white"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M15 6.5L13 11.5C13.5 12.4 14.3 12.8 15 12.8C15.7 12.8 16.5 12.4 17 11.5L15 6.5Z"
            fill="white"
            fillOpacity="0.3"
            stroke="white"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );

    case DocumentDirection.SPEECH:
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <rect
            x="7.5"
            y="3"
            width="5"
            height="8"
            rx="2.5"
            fill="white"
            fillOpacity="0.32"
            stroke="white"
            strokeWidth="1.6"
          />
          <path
            d="M5.2 9.5C5.2 12.1 7.35 14 10 14C12.65 14 14.8 12.1 14.8 9.5M10 14V17M7.5 17H12.5"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'pending':
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <circle
            cx="10"
            cy="10"
            r="6.5"
            fill="white"
            fillOpacity="0.24"
            stroke="white"
            strokeWidth="1.6"
          />
          <path
            d="M10 6.5V10.2L12.6 11.8"
            stroke="white"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'analytics':
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
          <path
            d="M10.5 3.5V9.5H16.5C16.5 6.18629 13.8137 3.5 10.5 3.5Z"
            fill="white"
            fillOpacity="0.36"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M9 5C5.96243 5 3.5 7.46243 3.5 10.5C3.5 13.5376 5.96243 16 9 16C12.0376 16 14.5 13.5376 14.5 10.5H9V5Z"
            fill="white"
            fillOpacity="0.18"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
};

export const ChannelEmblem: React.FC<{
  direction: DocumentDirection | 'all' | 'pending' | 'analytics';
  size?: 'xs' | 'sm' | 'md';
}> = ({ direction, size = 'sm' }) => {
  const boxSize =
    size === 'md'
      ? 'w-9 h-9 rounded-xl'
      : size === 'sm'
      ? 'w-7 h-7 rounded-[9px]'
      : 'w-5 h-5 rounded-[6px]';
  const iconSize =
    size === 'md' ? 'w-5 h-5' : size === 'sm' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  if (direction === 'all') {
    return (
      <span
        className={`${boxSize} inline-flex items-center justify-center shrink-0 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 dark:from-slate-600 dark:via-slate-700 dark:to-slate-800 text-white shadow-sm shadow-slate-900/15 ring-1 ring-inset ring-white/20`}
        aria-hidden="true"
      >
        <DuotoneGlyph kind="all" className={iconSize} />
      </span>
    );
  }

  if (direction === 'pending') {
    return (
      <span
        className={`${boxSize} inline-flex items-center justify-center shrink-0 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 dark:from-amber-400 dark:via-amber-500 dark:to-orange-600 text-white shadow-sm shadow-amber-600/20 ring-1 ring-inset ring-white/25`}
        aria-hidden="true"
      >
        <DuotoneGlyph kind="pending" className={iconSize} />
      </span>
    );
  }

  if (direction === 'analytics') {
    return (
      <span
        className={`${boxSize} inline-flex items-center justify-center shrink-0 bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 dark:from-emerald-400 dark:via-teal-500 dark:to-cyan-600 text-white shadow-sm shadow-emerald-600/20 ring-1 ring-inset ring-white/25`}
        aria-hidden="true"
      >
        <DuotoneGlyph kind="analytics" className={iconSize} />
      </span>
    );
  }

  const cfg = CHANNEL_VISUALS[direction];
  return (
    <span
      className={`${boxSize} inline-flex items-center justify-center shrink-0 ${cfg.badgeClass}`}
      aria-hidden="true"
    >
      <DuotoneGlyph kind={direction} className={iconSize} />
    </span>
  );
};

// Keep icon imports referenced so tree-shaking/lint stay clean if consumers use them via CHANNEL_VISUALS
void BarChart3;
void Clock;
void Files;
