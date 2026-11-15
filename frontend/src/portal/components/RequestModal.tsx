import React, { useState } from 'react';
import { X, Send, AlertCircle, PlayCircle, StopCircle } from 'lucide-react';
import type { AutomationItem } from '../types';
import portalApi from '../portalApi';

interface Props {
  automation: AutomationItem;
  onClose: () => void;
  onSuccess: (reqId: string) => void;
}

export const RequestModal: React.FC<Props> = ({ automation, onClose, onSuccess }) => {
  const [sid, setSid] = useState('');
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleParamChange = (name: string, val: string) => {
    setParameters((prev) => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!sid.trim()) {
      setError('System Identifier (SID) is mandatory.');
      return;
    }

    setLoading(true);
    try {
      const res = await portalApi.post('/api/v1/requests', {
        automation_id: automation.id,
        sid: sid.trim(),
        parameters,
      });
      onSuccess(res.data.id);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const isStart = automation.action === 'START';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isStart ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {isStart ? <PlayCircle size={22} /> : <StopCircle size={22} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{automation.name}</h2>
              <p className="text-xs text-slate-500 font-mono">
                {automation.category} &bull; {automation.os} &bull; Action: <span className="font-bold">{automation.action}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Description */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 text-xs text-slate-600 leading-relaxed">
            {automation.description}
          </div>

          {/* Predefined Action (Fixed & Immutable) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Target Action</label>
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-700 flex items-center justify-between">
                <span>{automation.action}</span>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-sans font-normal">Fixed</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Workflow Dispatch</label>
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 truncate">
                {automation.workflow_file}
              </div>
            </div>
          </div>

          {/* SID Input (Universal Mandatory) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              System ID (SID) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={sid}
              onChange={(e) => setSid(e.target.value.toUpperCase())}
              placeholder="e.g. HDB, S4H, ORCL"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">Unique alphanumeric SAP / Oracle system identifier.</p>
          </div>

          {/* Additional Dynamic Required Inputs */}
          {automation.required_inputs
            .filter((field) => field.name !== 'sid')
            .map((field) => (
              <div key={field.name}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {field.label} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={parameters[field.name] || ''}
                  onChange={(e) => handleParamChange(field.name, e.target.value)}
                  placeholder={field.placeholder || ''}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {field.description && <p className="text-[11px] text-slate-500 mt-1">{field.description}</p>}
              </div>
            ))}

          {/* Optional Inputs */}
          {automation.optional_inputs.map((field) => (
            <div key={field.name}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {field.label} <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={parameters[field.name] || ''}
                onChange={(e) => handleParamChange(field.name, e.target.value)}
                placeholder={field.placeholder || ''}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {field.description && <p className="text-[11px] text-slate-500 mt-1">{field.description}</p>}
            </div>
          ))}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
            >
              <Send size={13} /> {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
