import { useState, useEffect } from 'react';
import { X, Lock, Unlock, Check, XCircle } from 'lucide-react';
import api from '../api';
import StatusChip from './StatusChip';

interface Ticket {
  id: string;
  ticket_no: string;
  status: string;
  assignment_group: string;
  created_by: string;
  created_at: string;
  correlation_id: string;
  payload?: Record<string, any>;
  locked_by_username?: string | null;
  locked_by_user_id?: string | null;
}

interface Props {
  ticket: Ticket;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ReviewModal({ ticket, onClose, onUpdate }: Props) {
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [executions, setExecutions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [currentTicket, setCurrentTicket] = useState(ticket);

  useEffect(() => {
    fetchDetails();
  }, [ticket.id]);

  async function fetchDetails() {
    try {
      const [execRes, auditRes, ticketRes] = await Promise.all([
        api.get(`/api/v1/tickets/${ticket.id}/executions`),
        api.get(`/api/v1/tickets/${ticket.id}/audit`),
        api.get(`/api/v1/tickets/${ticket.id}`),
      ]);
      setExecutions(execRes.data);
      setAuditLogs(auditRes.data);
      setCurrentTicket(ticketRes.data);
    } catch { /* ignore */ }
  }

  async function handleAction(action: string) {
    setError('');
    setLoading(true);
    try {
      if (action === 'approve') {
        await api.post(`/api/v1/tickets/${ticket.id}/approve`);
      } else if (action === 'deny') {
        const reason = comment.trim() || 'Denied by approver';
        await api.post(`/api/v1/tickets/${ticket.id}/deny`, { reason });
      } else if (action === 'lock') {
        await api.post(`/api/v1/tickets/${ticket.id}/lock`);
      } else if (action === 'unlock') {
        await api.post(`/api/v1/tickets/${ticket.id}/unlock`);
      }
      await fetchDetails();
      onUpdate();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  const p = currentTicket.payload || {};
  const jenkinsKeys = ['SOURCE', 'RITM', 'AWSAccountNumbers', 'UserName', 'Key', 'AccessType'];
  const snowKeys = ['assignment_group', 'assigned_to', 'catalog_item', 'category', 'description', 'impact', 'opened_by', 'priority', 'requested_for'];
  const isLocked = currentTicket.status === 'LOCKED';
  const canApprove = ['PENDING', 'LOCKED'].includes(currentTicket.status);
  const canDeny = ['PENDING', 'LOCKED'].includes(currentTicket.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900">Request Details</h2>
              <StatusChip status={currentTicket.status} />
            </div>
            <div className="mt-1 text-sm text-gray-500 space-x-4">
              <span>ID: {currentTicket.correlation_id}</span>
              <span>Created by: {currentTicket.created_by}</span>
              <span>Created: {new Date(currentTicket.created_at).toLocaleString()}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm">
              {currentTicket.locked_by_username && (
                <span className="text-blue-600">🔒 Locked by: {currentTicket.locked_by_username}</span>
              )}
              <button
                onClick={() => handleAction(isLocked ? 'unlock' : 'lock')}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border hover:bg-gray-50"
                disabled={loading}
              >
                {isLocked ? <><Unlock size={12}/> Unlock</> : <><Lock size={12}/> Lock</>}
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Two Column Grid */}
        <div className="grid grid-cols-2 gap-6 p-6">
          {/* Left: Jenkins Parameters */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Jenkins Parameters</h3>
            <div className="space-y-2">
              {jenkinsKeys.map(key => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 uppercase">{key}</span>
                  <span className="px-2 py-1 bg-slate-100 rounded text-xs font-mono text-slate-700">
                    {p[key] || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: ServiceNow Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">ServiceNow Details</h3>
            <div className="space-y-2">
              {snowKeys.map(key => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm text-gray-900">{p[key] || currentTicket[key as keyof Ticket] || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="px-6 text-xs text-gray-400 italic">Showing ServiceNow data from Global ServiceNow Instance</p>

        {/* Execution History */}
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Execution History</h3>
          {executions.length === 0 ? (
            <p className="text-sm text-gray-400">No executions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-3">Engine</th><th className="pb-2 pr-3">Target</th>
                  <th className="pb-2 pr-3">Status</th><th className="pb-2 pr-3">Job ID</th>
                  <th className="pb-2">Started</th>
                </tr></thead>
                <tbody>
                  {executions.map((e: any) => (
                    <tr key={e.id} className="border-b border-gray-100">
                      <td className="py-1.5 pr-3">{e.engine}</td>
                      <td className="py-1.5 pr-3 font-mono">{e.target_identifier}</td>
                      <td className="py-1.5 pr-3"><StatusChip status={e.status}/></td>
                      <td className="py-1.5 pr-3 font-mono">{e.external_job_id || '—'}</td>
                      <td className="py-1.5">{new Date(e.started_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Trail */}
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Audit Trail</h3>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-gray-400">No audit entries</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {auditLogs.map((a: any) => (
                <div key={a.id} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="text-gray-400">{new Date(a.timestamp).toLocaleString()}</span>
                  <span className="font-medium">{a.action}</span>
                  {a.previous_state && <span className="text-gray-400">{a.previous_state} →</span>}
                  {a.new_state && <StatusChip status={a.new_state}/>}
                  {a.username && <span className="text-gray-400">by {a.username}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <input
            type="text"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Add comment (optional for deny)..."
            className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-100">Close</button>
          {canDeny && (
            <button
              onClick={() => handleAction('deny')}
              disabled={loading}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <XCircle size={14}/> Deny
            </button>
          )}
          {canApprove && (
            <button
              onClick={() => handleAction('approve')}
              disabled={loading}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Check size={14}/> Approve
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
