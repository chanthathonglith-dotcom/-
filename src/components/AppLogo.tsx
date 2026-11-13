import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
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
    size === 'lg' ? 'w-11 h-11' : size === 'md' ? 'w-9 h-9' : 'w-8 h-8';

  return (
    <div
      className={`${sizeClass} rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 dark:from-blue-600 dark:via-blue-500 dark:to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm ring-1 ring-blue-800/15 dark:ring-white/15 ${className}`}
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
          fillOpacity="0.16"
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
          stroke="#93C5FD"
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
}

export const CHANNEL_VISUALS: Record<DocumentDirection, ChannelVisualConfig> = {
  [DocumentDirection.INCOMING]: {
    icon: ArrowDownLeft,
    badgeClass:
      'bg-blue-50 text-blue-700 ring-1 ring-blue-200/80 dark:bg-blue-950/70 dark:text-blue-300 dark:ring-blue-800/70',
    accentTextClass: 'text-blue-700 dark:text-blue-400',
    accentDotClass: 'bg-blue-600 dark:bg-blue-400',
  },
  [DocumentDirection.OUTGOING]: {
    icon: ArrowUpRight,
    badgeClass:
      'bg-teal-50 text-teal-700 ring-1 ring-teal-200/80 dark:bg-teal-950/70 dark:text-teal-300 dark:ring-teal-800/70',
    accentTextClass: 'text-teal-700 dark:text-teal-400',
    accentDotClass: 'bg-teal-600 dark:bg-teal-400',
  },
  [DocumentDirection.LEGAL]: {
    icon: Scale,
    badgeClass:
      'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/80 dark:bg-indigo-950/70 dark:text-indigo-300 dark:ring-indigo-800/70',
    accentTextClass: 'text-indigo-700 dark:text-indigo-400',
    accentDotClass: 'bg-indigo-600 dark:bg-indigo-400',
  },
  [DocumentDirection.SPEECH]: {
    icon: Mic,
    badgeClass:
      'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80 dark:bg-amber-950/70 dark:text-amber-300 dark:ring-amber-800/70',
    accentTextClass: 'text-amber-700 dark:text-amber-400',
    accentDotClass: 'bg-amber-600 dark:bg-amber-400',
  },
};

export const ChannelEmblem: React.FC<{
  direction: DocumentDirection | 'all' | 'pending';
  size?: 'xs' | 'sm' | 'md';
}> = ({ direction, size = 'sm' }) => {
  const boxSize =
    size === 'md'
      ? 'w-8 h-8 rounded-lg'
      : size === 'sm'
      ? 'w-6 h-6 rounded-md'
      : 'w-5 h-5 rounded';
  const iconSize =
    size === 'md' ? 'w-4 h-4' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  if (direction === 'all') {
    return (
      <span
        className={`${boxSize} inline-flex items-center justify-center shrink-0 bg-slate-100 text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700`}
        aria-hidden="true"
      >
        <Files className={iconSize} aria-hidden="true" />
      </span>
    );
  }

  if (direction === 'pending') {
    return (
      <span
        className={`${boxSize} inline-flex items-center justify-center shrink-0 bg-amber-50 text-amber-700 ring-1 ring-amber-200/80 dark:bg-amber-950/70 dark:text-amber-300 dark:ring-amber-800/70`}
        aria-hidden="true"
      >
        <Clock className={iconSize} aria-hidden="true" />
      </span>
    );
  }

  const cfg = CHANNEL_VISUALS[direction];
  const Icon = cfg.icon;
  return (
    <span
      className={`${boxSize} inline-flex items-center justify-center shrink-0 ${cfg.badgeClass}`}
      aria-hidden="true"
    >
      <Icon className={iconSize} aria-hidden="true" />
    </span>
  );
};
