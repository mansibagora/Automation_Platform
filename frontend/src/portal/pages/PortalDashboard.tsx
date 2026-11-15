import React, { useState, useEffect } from 'react';
import { Layers, CheckCircle, Clock, XCircle, ArrowUpRight } from 'lucide-react';
import type { DashboardSummaryData } from '../types';
import portalApi from '../portalApi';
import { Link } from 'react-router-dom';

export const PortalDashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummaryData>({
    total_requests: 0,
    pending_approvals: 0,
    running_executions: 0,
    successful_executions: 0,
    failed_executions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
    const timer = setInterval(fetchSummary, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await portalApi.get('/api/v1/dashboard/summary');
      setSummary(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { label: 'Total Requests', count: summary.total_requests, icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100', link: '/portal/approvals' },
    { label: 'Pending Approvals', count: summary.pending_approvals, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', link: '/portal/approvals' },
    { label: 'Running Executions', count: summary.running_executions, icon: ArrowUpRight, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100', link: '/portal/executions' },
    { label: 'Successful Executions', count: summary.successful_executions, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', link: '/portal/executions' },
    { label: 'Failed Executions', count: summary.failed_executions, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100', link: '/portal/executions' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Infrastructure Portal Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Overview of SAP & Oracle automation dispatches and pending governance approvals.
          </p>
        </div>
        <Link
          to="/portal/catalogue"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-all"
        >
          <Layers size={14} /> Open Automation Catalogue
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              to={c.link}
              className={`p-5 rounded-xl border ${c.bg} transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{c.label}</span>
                <Icon size={18} className={c.color} />
              </div>
              <div className="mt-4">
                <span className={`text-3xl font-extrabold ${c.color}`}>
                  {loading ? '—' : c.count}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Launch & Workflows Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Operational Lifecycle
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            1. <strong>Select:</strong> Choose a predefined SAP or Oracle operation in the Automation Catalogue.<br />
            2. <strong>Submit:</strong> Specify your target SID and optional parameters.<br />
            3. <strong>Approve:</strong> The designated approver reviews and approves or rejects the request.<br />
            4. <strong>Dispatch:</strong> Upon approval, GitHub Actions triggers the existing Ansible playbook via <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded font-mono">workflow_dispatch</code>.<br />
            5. <strong>Monitor:</strong> Review live GitHub run execution statuses in real time.
          </p>
        </div>

        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Standard Operating Systems
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            All automations use strictly immutable START / STOP actions to protect production SAP systems and Oracle databases against human error during dispatch.
          </p>
          <div className="pt-2 flex gap-2">
            <Link
              to="/portal/approvals"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              &rarr; Review pending approvals
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
