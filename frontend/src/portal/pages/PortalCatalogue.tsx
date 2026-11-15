import React, { useState, useEffect } from 'react';
import { PlayCircle, StopCircle, CheckCircle2 } from 'lucide-react';
import type { AutomationItem } from '../types';
import portalApi from '../portalApi';
import { RequestModal } from '../components/RequestModal';

export const PortalCatalogue: React.FC = () => {
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [activeModalItem, setActiveModalItem] = useState<AutomationItem | null>(null);
  const [submittedAlert, setSubmittedAlert] = useState<string | null>(null);

  useEffect(() => {
    portalApi.get('/api/v1/automations').then((res) => setAutomations(res.data)).catch(() => {});
  }, []);

  const groups = [
    { key: 'SAP HANA - Linux', label: 'SAP HANA (Linux)', filter: (a: AutomationItem) => a.category === 'SAP HANA' && a.os === 'Linux' },
    { key: 'SAP - Linux', label: 'SAP (Linux)', filter: (a: AutomationItem) => a.category === 'SAP' && a.os === 'Linux' },
    { key: 'SAP - Windows', label: 'SAP (Windows)', filter: (a: AutomationItem) => a.category === 'SAP' && a.os === 'Windows' },
    { key: 'Oracle - Linux', label: 'Oracle (Linux)', filter: (a: AutomationItem) => a.category === 'Oracle' && a.os === 'Linux' },
    { key: 'Oracle - Windows', label: 'Oracle (Windows)', filter: (a: AutomationItem) => a.category === 'Oracle' && a.os === 'Windows' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Automation Catalogue</h1>
        <p className="text-xs text-slate-500 mt-1">
          Predefined infrastructure workflows for SAP and Oracle systems. Actions and target workflows are fixed.
        </p>
      </div>

      {submittedAlert && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>
              Request <strong>{submittedAlert}</strong> submitted successfully and is awaiting review in the Approvals queue.
            </span>
          </div>
          <button onClick={() => setSubmittedAlert(null)} className="font-semibold text-emerald-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Grouped Catalogue Cards */}
      <div className="space-y-8">
        {groups.map((grp) => {
          const items = automations.filter(grp.filter);
          if (items.length === 0) return null;

          return (
            <div key={grp.key} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{grp.label}</h2>
                <span className="text-xs text-slate-400">({items.length} workflows)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => {
                  const isStart = item.action === 'START';
                  return (
                    <div
                      key={item.id}
                      className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-md ${isStart ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                              {isStart ? <PlayCircle size={18} /> : <StopCircle size={18} />}
                            </div>
                            <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono tracking-wider ${
                              isStart ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.action}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>OS: {item.os}</span>
                          <span className="truncate max-w-[160px] text-slate-500">{item.workflow_file}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => setActiveModalItem(item)}
                          className="w-full py-2 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-sm"
                        >
                          Request Automation &rarr;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Request Modal */}
      {activeModalItem && (
        <RequestModal
          automation={activeModalItem}
          onClose={() => setActiveModalItem(null)}
          onSuccess={(reqId) => {
            setActiveModalItem(null);
            setSubmittedAlert(reqId);
          }}
        />
      )}
    </div>
  );
};
