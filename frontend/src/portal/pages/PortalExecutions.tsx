import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw, Filter } from 'lucide-react';
import type { ExecutionRecord } from '../types';
import portalApi from '../portalApi';
import { PortalStatusChip } from '../components/PortalStatusChip';

export const PortalExecutions: React.FC = () => {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  useEffect(() => {
    fetchExecutions();
    const timer = setInterval(fetchExecutions, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchExecutions = async () => {
    try {
      const res = await portalApi.get('/api/v1/executions');
      setExecutions(res.data);
    } catch {
      // ignore
    }
  };

  const handleSync = async (execId: string) => {
    setSyncingId(execId);
    try {
      await portalApi.post(`/api/v1/executions/${execId}/sync`);
      fetchExecutions();
    } catch {
      // ignore
    } finally {
      setSyncingId(null);
    }
  };

  const filtered = executions.filter((e) => {
    if (statusFilter === 'ALL') return true;
    return e.status === statusFilter;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Execution History</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track real-time GitHub Actions workflow runs, statuses, and execution links for triggered Ansible playbooks.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-600 shadow-sm">
            <Filter size={12} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="QUEUED">Queued</option>
              <option value="RUNNING">Running</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <button
            onClick={fetchExecutions}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Executions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Exec ID</th>
              <th className="px-4 py-3">Request ID</th>
              <th className="px-4 py-3">Automation</th>
              <th className="px-4 py-3">SID</th>
              <th className="px-4 py-3">Workflow</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">GitHub Run</th>
              <th className="px-4 py-3">Dispatched At</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  No execution records found matching criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">{item.id}</td>
                  <td className="px-4 py-3 font-mono text-indigo-600 font-semibold">{item.request_id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.automation_name || item.automation_id}</td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-700">{item.sid || '—'}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{item.workflow_file}</td>
                  <td className="px-4 py-3">
                    <PortalStatusChip status={item.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px]">
                    {item.github_run_url ? (
                      <a
                        href={item.github_run_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline font-semibold"
                      >
                        #{item.github_run_id || 'View'} <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="text-slate-400">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                    {new Date(item.dispatched_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSync(item.id)}
                      disabled={syncingId === item.id}
                      className="px-2.5 py-1 text-slate-600 border border-slate-200 hover:bg-slate-100 rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
                      title="Sync latest status from GitHub API"
                    >
                      {syncingId === item.id ? 'Syncing...' : 'Sync'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
