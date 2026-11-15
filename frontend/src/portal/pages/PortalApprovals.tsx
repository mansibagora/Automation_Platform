import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle, RefreshCw } from 'lucide-react';
import type { AutomationRequest } from '../types';
import portalApi from '../portalApi';
import { PortalStatusChip } from '../components/PortalStatusChip';

export const PortalApprovals: React.FC = () => {
  const [requests, setRequests] = useState<AutomationRequest[]>([]);
  const [actionError, setActionError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<AutomationRequest | null>(null);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
    const timer = setInterval(fetchRequests, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await portalApi.get('/api/v1/requests');
      setRequests(res.data);
    } catch {
      // ignore
    }
  };

  const handleApprove = async (reqId: string) => {
    setActionError('');
    setActionLoading(true);
    try {
      await portalApi.post(`/api/v1/requests/${reqId}/approve`, { comment: comment.trim() || undefined });
      setSelectedRequest(null);
      setComment('');
      fetchRequests();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to approve request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reqId: string) => {
    setActionError('');
    setActionLoading(true);
    try {
      await portalApi.post(`/api/v1/requests/${reqId}/reject`, { comment: comment.trim() || undefined });
      setSelectedRequest(null);
      setComment('');
      fetchRequests();
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to reject request.');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingList = requests.filter((r) => r.status === 'PENDING_APPROVAL');
  const pastList = requests.filter((r) => r.status !== 'PENDING_APPROVAL');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Approval Workbench</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review submitted automation requests. Approvals automatically dispatch the existing GitHub Actions workflow.
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Pending Requests Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            Pending Approvals ({pendingList.length})
          </h2>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">Automation</th>
                <th className="px-4 py-3">SID</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No pending approval requests. Great job!
                  </td>
                </tr>
              ) : (
                pendingList.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">{req.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {req.automation_name}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {req.category} &bull; {req.os}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">{req.sid}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono ${
                          req.action === 'START' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {req.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{req.requested_by}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {new Date(req.requested_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-xs transition-colors"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Decision Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Review Request {selectedRequest.id}</h3>
                <p className="text-xs text-slate-500">
                  {selectedRequest.automation_name} &bull; SID: <span className="font-mono font-bold text-slate-700">{selectedRequest.sid}</span>
                </p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold block">Requested By</span>
                  <span className="font-semibold text-slate-800">{selectedRequest.requested_by}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold block">Fixed Action</span>
                  <span className="font-mono font-bold text-slate-800">{selectedRequest.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold block">Operating System</span>
                  <span className="font-semibold text-slate-800">{selectedRequest.os}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-semibold block">Timestamp</span>
                  <span className="text-slate-600 font-mono text-[11px]">{new Date(selectedRequest.requested_at).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="text-slate-500 font-semibold block mb-1">Parameters:</label>
                <div className="p-3 bg-slate-900 text-slate-200 font-mono rounded-lg overflow-x-auto text-[11px]">
                  {JSON.stringify(selectedRequest.parameters, null, 2)}
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Approver Comment (Optional):</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g. Approved during maintenance window CR-8402"
                  rows={2}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleReject(selectedRequest.id)}
                  className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  <X size={14} /> Reject
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleApprove(selectedRequest.id)}
                  className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  <Check size={14} /> Approve & Dispatch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent History Table */}
      <div className="space-y-3 pt-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
          Decision History ({pastList.length})
        </h2>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">Automation</th>
                <th className="px-4 py-3">SID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reviewed By</th>
                <th className="px-4 py-3">Review Date</th>
                <th className="px-4 py-3">Comment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pastList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    No historical reviews recorded yet.
                  </td>
                </tr>
              ) : (
                pastList.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700">{req.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{req.automation_name}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">{req.sid}</td>
                    <td className="px-4 py-3">
                      <PortalStatusChip status={req.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{req.reviewed_by || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {req.reviewed_at ? new Date(req.reviewed_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{req.review_comment || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
