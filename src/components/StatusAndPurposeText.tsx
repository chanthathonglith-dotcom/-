import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Compass,
  Eye,
  FileSignature,
  MessageSquareText,
  Mic,
  RotateCcw,
  Scale,
  Timer,
} from 'lucide-react';
import {
  DIRECTION_LABELS,
  DocumentDirection,
  DocumentPurpose,
  DocumentStatus,
  PURPOSE_LABELS,
  STATUS_LABELS,
} from '../types/document';

export const DirectionText: React.FC<{ direction: DocumentDirection }> = ({ direction }) => {
  const config: Record<
    DocumentDirection,
    { textClass: string; icon: React.ReactNode }
  > = {
    [DocumentDirection.INCOMING]: {
      textClass: 'text-blue-700 dark:text-blue-400',
      icon: <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    },
    [DocumentDirection.OUTGOING]: {
      textClass: 'text-teal-700 dark:text-teal-400',
      icon: <ArrowUpRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    },
    [DocumentDirection.LEGAL]: {
      textClass: 'text-indigo-700 dark:text-indigo-400',
      icon: <Scale className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    },
    [DocumentDirection.SPEECH]: {
      textClass: 'text-amber-700 dark:text-amber-400',
      icon: <Mic className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    },
  };

  const current = config[direction];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${current.textClass}`}>
      {current.icon}
      {DIRECTION_LABELS[direction]}
    </span>
  );
};

export const PurposeText: React.FC<{ purpose: DocumentPurpose }> = ({ purpose }) => {
  const iconMap: Record<DocumentPurpose, React.ReactNode> = {
    [DocumentPurpose.OPINION]: (
      <MessageSquareText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
    ),
    [DocumentPurpose.SIGNATURE]: (
      <FileSignature className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
    ),
    [DocumentPurpose.GUIDANCE]: (
      <Compass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
    ),
    [DocumentPurpose.INFO]: (
      <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
    ),
  };

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
      {iconMap[purpose]}
      <span>{PURPOSE_LABELS[purpose]}</span>
    </span>
  );
};

export const StatusText: React.FC<{ status: DocumentStatus }> = ({ status }) => {
  const config: Record<
    DocumentStatus,
    { textClass: string; icon: React.ReactNode }
  > = {
    [DocumentStatus.PENDING]: {
      textClass: 'text-amber-700 dark:text-amber-400',
      icon: <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    },
    [DocumentStatus.IN_PROGRESS]: {
      textClass: 'text-blue-700 dark:text-blue-400',
      icon: <Timer className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    },
    [DocumentStatus.COMPLETED]: {
      textClass: 'text-emerald-700 dark:text-emerald-400',
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    },
    [DocumentStatus.RETURNED]: {
      textClass: 'text-red-700 dark:text-red-400',
      icon: <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
    },
  };

  const current = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${current.textClass}`}>
      {current.icon}
      <span>{STATUS_LABELS[status]}</span>
    </span>
  );
};
