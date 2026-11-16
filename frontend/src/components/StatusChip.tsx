import React from 'react';

interface Props {
  status: string;
}

export const StatusChip: React.FC<Props> = ({ status }) => {
  const styles: Record<string, string> = {
    PENDING_APPROVAL: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
    APPROVED: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
    REJECTED: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
    QUEUED: 'bg-blue-950/80 text-blue-300 border-blue-700/60',
    RUNNING: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60 animate-pulse',
    COMPLETED: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
    FAILED: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
  };

  const currentStyle = styles[status] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStyle}`}>
      {status.replace('_', ' ')}
    </span>
  );
};
