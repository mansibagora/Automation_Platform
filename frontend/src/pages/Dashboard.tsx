import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Clock,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  PlusCircle,
  Shield,
  ExternalLink,
  Activity,
} from 'lucide-react';
import type { DashboardSummary } from '../types';
import api from '../api';

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary>({
    total_requests: 0,
    pending_approvals: 0,
    running_executions: 0,
    successful_executions: 0,
    failed_executions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/v1/dashboard/summary')
      .then((res) => {
        setSummary(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Total Requests', count: summary.total_requests, icon: Layers, color: 'text-indigo-400', border: 'border-indigo-800/40', link: '/approvals' },
    { label: 'Pending Approvals', count: summary.pending_approvals, icon: Clock, color: 'text-amber-400', border: 'border-amber-800/40', link: '/approvals' },
    { label: 'Running Executions', count: summary.running_executions, icon: ArrowUpRight, color: 'text-blue-400', border: 'border-blue-800/40', link: '/executions' },
    { label: 'Successful', count: summary.successful_executions, icon: CheckCircle, color: 'text-emerald-400', border: 'border-emerald-800/40', link: '/executions' },
    { label: 'Failed', count: summary.failed_executions, icon: XCircle, color: 'text-rose-400', border: 'border-rose-800/40', link: '/executions' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="text-indigo-400" size={22} />
            Infrastructure Automation Operations
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Self-service portal for SAP & Oracle infrastructure start/stop automation dispatch.
          </p>
        </div>
        <Link
          to="/catalogue"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/20"
        >
          <PlusCircle size={16} /> New Request
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(({ label, count, icon: Icon, color, border, link }) => (
          <Link
            key={label}
            to={link}
            className={`bg-slate-900 p-5 rounded-xl border ${border} hover:border-slate-600 transition-all group`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
              <Icon size={18} className={color} />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white">
                {loading ? '-' : count}
              </span>
              <ExternalLink size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {/* Operational Lifecycle Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Shield size={18} className="text-indigo-400" />
          Deterministic Lifecycle & Role Workflow
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-950/70 border border-slate-800/80 p-4 rounded-lg">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Step 1</span>
            <h4 className="text-sm font-semibold text-white mt-1">Catalogue Selection</h4>
            <p className="text-xs text-slate-400 mt-1">
              Select predefined SAP / Oracle automation with fixed START or STOP actions and specify SID.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 p-4 rounded-lg">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Step 2</span>
            <h4 className="text-sm font-semibold text-white mt-1">Designated Approval</h4>
            <p className="text-xs text-slate-400 mt-1">
              Reviewed by designated approver (<code className="text-amber-300">approver_user</code>) to prevent accidental production outages.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 p-4 rounded-lg">
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Step 3</span>
            <h4 className="text-sm font-semibold text-white mt-1">Workflow Dispatch</h4>
            <p className="text-xs text-slate-400 mt-1">
              Upon approval, the backend triggers GitHub Actions <code className="text-blue-300">workflow_dispatch</code> API via HTTPX.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 p-4 rounded-lg">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Step 4</span>
            <h4 className="text-sm font-semibold text-white mt-1">Status Sync & Audit</h4>
            <p className="text-xs text-slate-400 mt-1">
              Execution progress syncs with GitHub workflow runs with full audit logging and direct run links.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
