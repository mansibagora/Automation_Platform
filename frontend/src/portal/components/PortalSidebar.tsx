import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Layers, CheckSquare, History, Shield, ArrowLeft } from 'lucide-react';

interface Props {
  currentUser: string;
  onUserChange: (user: string) => void;
}

export const PortalSidebar: React.FC<Props> = ({ currentUser, onUserChange }) => {
  const navItems = [
    { to: '/portal/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/portal/catalogue', label: 'Catalogue', icon: Layers },
    { to: '/portal/approvals', label: 'Approvals', icon: CheckSquare },
    { to: '/portal/executions', label: 'Executions', icon: History },
  ];

  return (
    <aside className="w-64 flex flex-col h-screen" style={{ backgroundColor: '#0f172a' }}>
      {/* Brand Header */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20">
            IA
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">Infra Portal</h1>
            <p className="text-xs text-slate-400">Automation Dispatcher</p>
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
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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

      {/* User Role Switcher for Local MVP Testing */}
      <div className="px-4 py-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Shield size={12} /> Active Role
          </span>
        </div>
        <select
          value={currentUser}
          onChange={(e) => onUserChange(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
        >
          <option value="engineer_user">Requester (DevOps)</option>
          <option value="approver_user">Approver (Lead)</option>
          <option value="admin_user">Admin</option>
        </select>
        <p className="text-[10px] text-slate-500 mt-1.5">
          {currentUser === 'approver_user' ? 'Can review and trigger automations' : 'Can submit infrastructure requests'}
        </p>
      </div>

      {/* Link back to ITSM */}
      <div className="p-3 border-t border-slate-800">
        <NavLink
          to="/inbox"
          className="flex items-center gap-2 px-3 py-2 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
        >
          <ArrowLeft size={14} /> Back to ITSM Platform
        </NavLink>
      </div>
    </aside>
  );
};
