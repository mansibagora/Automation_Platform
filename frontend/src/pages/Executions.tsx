import React, { useEffect, useState } from 'react';
import { History, RefreshCw, ExternalLink, Terminal } from 'lucide-react';
import type { Execution } from '../types';
import api from '../api';
import { StatusChip } from '../components/StatusChip';

export const Executions: React.FC = () => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExec, setSelectedExec] = useState<Execution | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchExecutions = () => {
    setLoading(true);
    api
      .get('/api/v1/executions')
      .then((res) => {
        setExecutions(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchExecutions();
  }, []);

  const handleSync = async (execId: string) => {
    setSyncingId(execId);
    try {
      await api.post(`/api/v1/executions/${execId}/sync`);
      fetchExecutions();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingId(null);
    }
  };

  const getWorkflowName = (exec: Execution) =>
    exec.workflow_file || exec.github_workflow || 'workflow.yml';

  const getTriggeredBy = (exec: Execution) =>
    exec.reviewed_by || exec.requested_by || exec.triggered_by || 'operator';

  const getFormattedDate = (exec: Execution) => {
    const rawDate = exec.dispatched_at || exec.triggered_at;
    if (!rawDate) return '-';
    try {
      return new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return String(rawDate);
    }
  };

  const getExecutionLogs = (exec: Execution) =>
    exec.log_summary || exec.execution_logs || 'No logs generated yet.';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="text-indigo-400" size={22} />
            Execution Monitor & History
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time GitHub Actions workflow execution tracking and logs.
          </p>
        </div>

        <button
          onClick={fetchExecutions}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh Executions
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 uppercase text-[10px] tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Execution ID</th>
                <th className="py-3 px-4">Automation</th>
                <th className="py-3 px-4">SID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">GitHub Run</th>
                <th className="py-3 px-4">Triggered By</th>
                <th className="py-3 px-4">Started At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading execution history...
                  </td>
                </tr>
              ) : executions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No executions recorded yet.
                  </td>
                </tr>
              ) : (
                executions.map((exec) => (
                  <tr key={exec.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                      #{exec.id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div>{exec.automation_name || 'Automation'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{getWorkflowName(exec)}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {exec.sid || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusChip status={exec.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      {exec.github_run_url ? (
                        <a
                          href={exec.github_run_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline font-mono text-[11px]"
                        >
                          Run #{exec.github_run_id || 'View'}
                          <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">
                          {exec.github_run_id ? `#${exec.github_run_id}` : 'Dispatched'}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {getTriggeredBy(exec)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {getFormattedDate(exec)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedExec(exec)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded text-xs transition-colors flex items-center gap-1"
                          title="View Execution Logs"
                        >
                          <Terminal size={12} /> Logs
                        </button>
                        <button
                          onClick={() => handleSync(exec.id)}
                          disabled={syncingId === exec.id}
                          className="bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                          title="Sync status with GitHub API"
                        >
                          <RefreshCw size={12} className={syncingId === exec.id ? 'animate-spin' : ''} />
                          Sync
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execution Logs Modal */}
      {selectedExec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal size={16} className="text-indigo-400" />
                  Execution Logs: #{selectedExec.id.slice(0, 8)}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Workflow: {getWorkflowName(selectedExec)} • SID: {selectedExec.sid || '-'}
                </p>
              </div>
              <button
                onClick={() => setSelectedExec(null)}
                className="text-slate-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-300 my-4 border border-slate-800/80 whitespace-pre-wrap">
              {getExecutionLogs(selectedExec)}
            </div>

            <div className="flex justify-between items-center pt-2">
              <StatusChip status={selectedExec.status} />
              <button
                onClick={() => setSelectedExec(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
