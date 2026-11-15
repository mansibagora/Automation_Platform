import React from 'react';

interface Props {
  status: string;
}

const statusConfig: Record<string, { bg: string; text: string; label: string; pulse?: boolean }> = {
  PENDING_APPROVAL: { bg: 'bg-amber-100 dark:bg-amber-950/60 border-amber-300', text: 'text-amber-800 dark:text-amber-300', label: 'Pending Approval' },
  APPROVED: { bg: 'bg-blue-100 dark:bg-blue-950/60 border-blue-300', text: 'text-blue-800 dark:text-blue-300', label: 'Approved' },
  QUEUED: { bg: 'bg-purple-100 dark:bg-purple-950/60 border-purple-300', text: 'text-purple-800 dark:text-purple-300', label: 'Queued', pulse: true },
  RUNNING: { bg: 'bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300', text: 'text-indigo-800 dark:text-indigo-300', label: 'Running', pulse: true },
  COMPLETED: { bg: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300', text: 'text-emerald-800 dark:text-emerald-300', label: 'Completed' },
  REJECTED: { bg: 'bg-rose-100 dark:bg-rose-950/60 border-rose-300', text: 'text-rose-800 dark:text-rose-300', label: 'Rejected' },
  FAILED: { bg: 'bg-red-100 dark:bg-red-950/60 border-red-300', text: 'text-red-800 dark:text-red-300', label: 'Failed' },
};

export const PortalStatusChip: React.FC<Props> = ({ status }) => {
  const conf = statusConfig[status] || {
    bg: 'bg-slate-100 dark:bg-slate-800 border-slate-300',
    text: 'text-slate-700 dark:text-slate-300',
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${conf.bg} ${conf.text} ${
        conf.pulse ? 'animate-pulse' : ''
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {conf.label}
    </span>
  );
};
