import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface Analytics {
  total_processed: number;
  backdated: number;
  suppressed: number;
  suppression_rate: number;
  tickets_avoided: number;
  non_auto_resolving: number;
  incidents_reopened: number;
  volume_trend: { date: string; count: number }[];
  category_distribution: { category: string; count: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    api.get('/api/v1/analytics').then(r => setData(r.data)).catch(() => {});
  }, []);

  function exportCsv() {
    window.open('/api/v1/analytics/export/csv', '_blank');
  }

  if (!data) return <div className="p-6 text-gray-400">Loading analytics...</div>;

  const metrics = [
    { label: 'Total Processed', value: data.total_processed, color: 'text-indigo-600' },
    { label: 'Backdated / Suppressed', value: `${data.backdated} / ${data.suppressed}`, color: 'text-amber-600' },
    { label: 'Suppression Rate', value: `${data.suppression_rate}%`, color: 'text-blue-600' },
    { label: 'Tickets Avoided', value: data.tickets_avoided, color: 'text-green-600' },
    { label: 'Non-Auto Resolving', value: data.non_auto_resolving, color: 'text-red-600' },
    { label: 'Incidents Re-opened', value: data.incidents_reopened, color: 'text-purple-600' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          <Download size={16}/> Export CSV
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-sm text-gray-500">{m.label}</p>
            <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">30-Day Alert Volume Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.volume_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Category Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.category_distribution} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={90} innerRadius={45} label>
                {data.category_distribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
