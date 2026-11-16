import React, { useEffect, useState } from 'react';
import { Layers, Play, Server, Monitor } from 'lucide-react';
import type { AutomationItem } from '../types';
import api from '../api';
import { RequestModal } from '../components/RequestModal';

export const Catalogue: React.FC = () => {
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [selectedAuto, setSelectedAuto] = useState<AutomationItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedOS, setSelectedOS] = useState<string>('ALL');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/v1/automations').then((res) => setAutomations(res.data)).catch(() => {});
  }, []);

  const categories = ['ALL', ...Array.from(new Set(automations.map((a) => a.category)))];
  const osOptions = ['ALL', 'Linux', 'Windows'];

  const filtered = automations.filter((a) => {
    if (selectedCategory !== 'ALL' && a.category !== selectedCategory) return false;
    if (selectedOS !== 'ALL' && a.os !== selectedOS) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="text-indigo-400" size={22} />
            Predefined Automation Catalogue
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose from fixed infrastructure start/stop playbooks. Actions are strictly defined.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'ALL' ? 'All Platforms' : c}</option>
            ))}
          </select>

          <select
            value={selectedOS}
            onChange={(e) => setSelectedOS(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {osOptions.map((o) => (
              <option key={o} value={o}>{o === 'ALL' ? 'All Operating Systems' : o}</option>
            ))}
          </select>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs p-3 rounded-lg flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Catalogue Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md group"
          >
            <div>
              {/* Category & OS Badges */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                  {item.category}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {item.os === 'Windows' ? <Monitor size={11} /> : <Server size={11} />}
                  {item.os}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                {item.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {item.description}
              </p>

              {/* Action & Parameters */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded tracking-wider ${
                  item.action === 'START'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                    : 'bg-rose-950 text-rose-400 border border-rose-800/80'
                }`}>
                  {item.action}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Workflow: {item.workflow_file}
                </span>
              </div>
            </div>

            {/* Launch Button */}
            <div className="mt-5">
              <button
                onClick={() => setSelectedAuto(item)}
                className="w-full bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 group-hover:shadow-md group-hover:shadow-indigo-600/20"
              >
                <Play size={13} />
                Configure & Request
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedAuto && (
        <RequestModal
          automation={selectedAuto}
          onClose={() => setSelectedAuto(null)}
          onSuccess={(reqId) => {
            setSelectedAuto(null);
            setSuccessMsg(`Automation request #${reqId.slice(0, 8)} submitted successfully. Awaiting designated approver review.`);
          }}
        />
      )}
    </div>
  );
};
