import React, { useState } from 'react';
import { X, Play, AlertCircle, Check } from 'lucide-react';
import type { AutomationItem } from '../types';
import api from '../api';

interface Props {
  automation: AutomationItem | null;
  onClose: () => void;
  onSuccess: (requestId: string) => void;
}

export const RequestModal: React.FC<Props> = ({ automation, onClose, onSuccess }) => {
  const [sid, setSid] = useState('');
  const [params, setParams] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!automation) return null;

  const handleParamChange = (name: string, val: any) => {
    setParams((prev) => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sid.trim()) {
      setError('System Identifier (SID) is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/api/v1/requests', {
        automation_id: automation.id,
        sid: sid.trim().toUpperCase(),
        parameters: params,
      });
      onSuccess(res.data.id);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Play size={16} className="text-indigo-400" />
              Request Automation: {automation.name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Target: <span className="text-slate-200">{automation.category} ({automation.os})</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Immutable Action Display */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Fixed Operation (Immutable)
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-xs font-bold tracking-wider ${
                automation.action === 'START'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}>
                {automation.action}
              </span>
              <span className="text-xs text-slate-400">
                Action is strictly predefined and cannot be modified.
              </span>
            </div>
          </div>

          {/* Mandatory SID Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              System ID (SID) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={sid}
              onChange={(e) => setSid(e.target.value)}
              placeholder="e.g. HDB, PRD, DEV, ORA1"
              maxLength={8}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Mandatory system identifier for target environment.
            </p>
          </div>

          {/* Additional Dynamic Parameters */}
          {automation.inputs.required.filter((i) => i.name !== 'sid').map((param) => (
            <div key={param.name}>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                {param.label} <span className="text-rose-400">*</span>
              </label>
              <input
                type={param.type === 'integer' ? 'number' : 'text'}
                required
                value={params[param.name] ?? param.default ?? ''}
                onChange={(e) => handleParamChange(param.name, e.target.value)}
                placeholder={param.description || `Enter ${param.label}`}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {param.description && (
                <p className="text-[11px] text-slate-500 mt-1">{param.description}</p>
              )}
            </div>
          ))}

          {automation.inputs.optional.map((param) => (
            <div key={param.name}>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                {param.label} <span className="text-slate-600">(Optional)</span>
              </label>
              {param.type === 'boolean' ? (
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params[param.name] ?? param.default ?? false}
                    onChange={(e) => handleParamChange(param.name, e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span>Enable {param.label}</span>
                </label>
              ) : (
                <input
                  type="text"
                  value={params[param.name] ?? param.default ?? ''}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                  placeholder={param.description}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              )}
            </div>
          ))}

          {/* Workflow Target Details */}
          <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3">
            Workflow Dispatch Target: <span className="font-mono text-slate-400">{automation.workflow_file}</span>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-2 shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {loading ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <Check size={14} /> Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
