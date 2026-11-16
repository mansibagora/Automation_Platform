import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Layers, CheckSquare, History, Shield } from 'lucide-react';

interface Props {
  currentUser: string;
  onUserChange: (user: string) => void;
}

export const Sidebar: React.FC<Props> = ({ currentUser, onUserChange }) => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/catalogue', label: 'Catalogue', icon: Layers },
    { to: '/approvals', label: 'Approvals', icon: CheckSquare },
    { to: '/executions', label: 'Executions', icon: History },
  ];

  return (
    <aside className="w-64 flex flex-col h-screen bg-slate-900 border-r border-slate-800">
      {/* Brand Header */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
            IA
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">Infra Portal</h1>
            <p className="text-xs text-slate-400">Lightweight Automation</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User Role Switcher */}
      <div className="px-4 py-4 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield size={13} className="text-indigo-400" /> Active Role
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            currentUser === 'approver_user'
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
              : 'bg-indigo-950 text-indigo-400 border border-indigo-700/50'
          }`}>
            {currentUser === 'approver_user' ? 'Approver' : 'Requester'}
          </span>
        </div>
        <select
          value={currentUser}
          onChange={(e) => onUserChange(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
        >
          <option value="engineer_user">Requester (engineer_user)</option>
          <option value="approver_user">Designated Approver (approver_user)</option>
          <option value="admin_user">Admin (admin_user)</option>
        </select>
        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
          {currentUser === 'approver_user'
            ? '✓ Can review & trigger GitHub Actions'
            : '✓ Can submit infrastructure requests'}
        </p>
      </div>
    </aside>
  );
};
