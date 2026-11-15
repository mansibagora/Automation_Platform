import { useState, useEffect, useCallback } from 'react';
import { Lock, Eye } from 'lucide-react';
import api from '../api';
import StatusChip from '../components/StatusChip';
import ReviewModal from '../components/ReviewModal';

const TABS = ['PENDING', 'RUNNING', 'COMPLETED', 'DENIED', 'FAILED'] as const;

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

export default function Inbox() {
  const [activeTab, setActiveTab] = useState<string>('PENDING');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/tickets', { params: { status: activeTab, page_size: 50 } });
      setTickets(res.data.tickets);
      setTotal(res.data.total);
    } catch { /* ignore */ }
  }, [activeTab]);

  const fetchCounts = useCallback(async () => {
    try {
      const results = await Promise.all(
        TABS.map(s => api.get('/api/v1/tickets', { params: { status: s, page_size: 1 } }))
      );
      const c: Record<string, number> = {};
      TABS.forEach((s, i) => { c[s] = results[i].data.total; });
      setCounts(c);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchCounts();
    const interval = setInterval(() => { fetchTickets(); fetchCounts(); }, 5000);
    return () => clearInterval(interval);
  }, [fetchTickets, fetchCounts]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Approval Workbench</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
              {counts[tab] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">RITM No</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assignment Group</th>
              <th className="px-4 py-3">Created By</th>
              <th className="px-4 py-3">Created Date</th>
              <th className="px-4 py-3">Lock</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tickets.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No tickets found</td></tr>
            ) : tickets.map(ticket => (
              <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-mono font-medium text-indigo-700">{ticket.ticket_no}</td>
                <td className="px-4 py-3"><StatusChip status={ticket.status}/></td>
                <td className="px-4 py-3 text-sm text-gray-600">{ticket.assignment_group}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{ticket.created_by}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{new Date(ticket.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {ticket.locked_by_username ? (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600" title={`Locked by ${ticket.locked_by_username}`}>
                      <Lock size={14}/> {ticket.locked_by_username}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedTicket(ticket)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Eye size={14}/> Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {selectedTicket && (
        <ReviewModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdate={() => { fetchTickets(); fetchCounts(); }}
        />
      )}
    </div>
  );
}
