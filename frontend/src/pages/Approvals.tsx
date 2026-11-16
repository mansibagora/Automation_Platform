import React, { useEffect, useState } from 'react';
import { CheckSquare, Check, X, AlertCircle, ShieldAlert, KeyRound } from 'lucide-react';
import type { AutomationRequest } from '../types';
import api from '../api';
import { StatusChip } from '../components/StatusChip';

export const Approvals: React.FC = () => {
  const [requests, setRequests] = useState<AutomationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const [reviewModal, setReviewModal] = useState<{ id: string; action: 'APPROVE' | 'REJECT' } | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string>(
    localStorage.getItem('portal_user') || 'engineer_user'
  );

  const fetchRequests = () => {
    setLoading(true);
    setError(null);
    api
      .get('/api/v1/requests')
      .then((res) => {
        setRequests(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Failed to fetch requests');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRequests();
    const handleRole = () => {
      setCurrentUser(localStorage.getItem('portal_user') || 'engineer_user');
    };
    window.addEventListener('portal_user_changed', handleRole);
    return () => window.removeEventListener('portal_user_changed', handleRole);
  }, []);

  const handleSwitchToApprover = () => {
    localStorage.setItem('portal_user', 'approver_user');
    setCurrentUser('approver_user');
    window.dispatchEvent(new Event('portal_user_changed'));
    setError(null);
  };

  const handleApprove = async (reqId: string) => {
    try {
      await api.post(`/api/v1/requests/${reqId}/approve`, {
        comment: comment.trim() || undefined,
      });
      setReviewModal(null);
      setComment('');
      fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Approval failed');
    }
  };

  const handleReject = async (reqId: string) => {
    try {
      await api.post(`/api/v1/requests/${reqId}/reject`, {
        comment: comment.trim() || undefined,
      });
      setReviewModal(null);
      setComment('');
      fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Rejection failed');
    }
  };

  const filtered = requests.filter((r) =>
    activeTab === 'PENDING' ? r.status === 'PENDING_APPROVAL' : true
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CheckSquare className="text-indigo-400" size={22} />
            Approval Workbench
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Designated approver authorization gate. Approved requests immediately dispatch GitHub Actions.
          </p>
        </div>

        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'PENDING' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending ({requests.filter((r) => r.status === 'PENDING_APPROVAL').length})
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Requests ({requests.length})
          </button>
        </div>
      </div>

      {/* Role Notice Banner */}
      {currentUser !== 'approver_user' && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200">
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className="text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">You are currently signed in as: </span>
              <code className="bg-amber-900/50 px-1.5 py-0.5 rounded text-amber-300 font-mono">{currentUser}</code>.
              Only the designated approver (<code className="bg-amber-900/50 px-1.5 py-0.5 rounded text-amber-300 font-mono">approver_user</code>) can approve or reject requests.
            </div>
          </div>
          <button
            onClick={handleSwitchToApprover}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-700/30 whitespace-nowrap"
          >
            <KeyRound size={13} /> Switch to Approver Role
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 uppercase text-[10px] tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Automation</th>
                <th className="py-3 px-4">SID</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Requester</th>
                <th className="py-3 px-4">Submitted At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Loading requests...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No requests found in this view.
                  </td>
                </tr>
              ) : (
                filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                      #{req.id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div>{req.automation_name}</div>
                      <div className="text-[10px] text-slate-500">{req.category} • {req.os}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-slate-200 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {req.sid}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        req.action === 'START'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                      }`}>
                        {req.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusChip status={req.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {req.requested_by}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(req.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {req.status === 'PENDING_APPROVAL' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setReviewModal({ id: req.id, action: 'APPROVE' })}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                          >
                            <Check size={12} /> Approve
                          </button>
                          <button
                            onClick={() => setReviewModal({ id: req.id, action: 'REJECT' })}
                            className="bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            <X size={12} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          {req.reviewed_by ? `Reviewed by ${req.reviewed_by}` : 'Processed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Confirmation Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">
              Confirm {reviewModal.action === 'APPROVE' ? 'Approval & Dispatch' : 'Rejection'}
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              {reviewModal.action === 'APPROVE'
                ? 'Approving will immediately trigger the corresponding GitHub Actions workflow dispatch.'
                : 'Rejecting will mark the request as REJECTED without triggering any execution.'}
            </p>

            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Review Comment (Optional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Verified change window, proceeding with restart."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 mb-4"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setReviewModal(null);
                  setComment('');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  reviewModal.action === 'APPROVE'
                    ? handleApprove(reviewModal.id)
                    : handleReject(reviewModal.id)
                }
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg text-white shadow-md transition-colors ${
                  reviewModal.action === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                }`}
              >
                Confirm {reviewModal.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
