import { useState } from 'react';
import { Send, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function MockITSM() {
  const [ticketType, setTicketType] = useState('SR');
  const [payload, setPayload] = useState('');
  const [correlationId, setCorrelationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function generate() {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/v1/mock-helix/generate', { type: ticketType });
      setPayload(JSON.stringify(res.data.payload, null, 2));
      setCorrelationId('');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to generate');
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    setError('');
    if (!payload.trim()) { setError('Generate a payload first'); return; }
    setLoading(true);
    try {
      const parsed = JSON.parse(payload);
      const res = await api.post('/api/v1/mock-helix/send', { payload: parsed });
      setCorrelationId(res.data.correlation_id);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to send — check JSON syntax');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mock ITSM Simulator</h1>

      {/* Type Selector */}
      <div className="bg-white rounded-xl border p-5 shadow-sm mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Ticket Type</label>
        <div className="flex gap-3">
          {['SR', 'CR', 'INC'].map(t => (
            <button
              key={t}
              onClick={() => setTicketType(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                ticketType === t
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <Wand2 size={16}/> Generate Scaffold
        </button>
        <button
          onClick={send}
          disabled={loading || !payload}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          <Send size={16}/> Send to Pipeline
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Success */}
      {correlationId && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✅ Sent! Correlation ID: <span className="font-mono font-bold">{correlationId}</span>
          </p>
          <button
            onClick={() => navigate('/inbox')}
            className="mt-2 text-sm text-indigo-600 hover:underline"
          >
            → Go to Inbox
          </button>
        </div>
      )}

      {/* JSON Editor */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="px-4 py-3 border-b bg-gray-50 rounded-t-xl">
          <span className="text-sm font-medium text-gray-700">Payload Editor</span>
        </div>
        <textarea
          value={payload}
          onChange={e => setPayload(e.target.value)}
          className="w-full h-80 p-4 font-mono text-sm text-gray-800 focus:outline-none resize-none"
          placeholder="Click 'Generate Scaffold' to create a realistic ticket payload..."
        />
      </div>
    </div>
  );
}
