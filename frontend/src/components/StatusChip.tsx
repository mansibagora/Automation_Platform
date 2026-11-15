interface Props {
  status: string;
}

const colors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  LOCKED: 'bg-blue-100 text-blue-800',
  RUNNING: 'bg-indigo-100 text-indigo-800 animate-pulse',
  COMPLETED: 'bg-green-100 text-green-800',
  DENIED: 'bg-red-100 text-red-800',
  FAILED: 'bg-rose-100 text-rose-700',
};

export default function StatusChip({ status }: Props) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
