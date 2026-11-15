import { NavLink } from 'react-router-dom';
import { Inbox, BarChart3, Beaker } from 'lucide-react';

const links = [
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/mock', label: 'Mock ITSM', icon: Beaker },
];

export default function Sidebar() {
  return (
    <aside className="w-64 flex flex-col" style={{ backgroundColor: '#1e293b' }}>
      {/* App Title */}
      <div className="px-6 py-5 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white tracking-wide">
          ITSM Automation
        </h1>
        <p className="text-xs text-slate-400 mt-1">Approval & Orchestration</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-700/80 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User Label */}
      <div className="px-4 py-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
            A
          </div>
          <div>
            <p className="text-sm text-white font-medium">User: admin_user</p>
            <p className="text-xs text-slate-400">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
