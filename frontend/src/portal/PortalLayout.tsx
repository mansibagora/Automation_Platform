import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PortalSidebar } from './components/PortalSidebar';
import { PortalDashboard } from './pages/PortalDashboard';
import { PortalCatalogue } from './pages/PortalCatalogue';
import { PortalApprovals } from './pages/PortalApprovals';
import { PortalExecutions } from './pages/PortalExecutions';

export const PortalLayout: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string>(
    localStorage.getItem('portal_user') || 'engineer_user'
  );

  const handleUserChange = (user: string) => {
    setCurrentUser(user);
    localStorage.setItem('portal_user', user);
  };

  return (
    <div className="flex h-screen bg-slate-100/90 text-slate-800 antialiased overflow-hidden font-sans">
      <PortalSidebar currentUser={currentUser} onUserChange={handleUserChange} />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="dashboard" element={<PortalDashboard />} />
          <Route path="catalogue" element={<PortalCatalogue />} />
          <Route path="approvals" element={<PortalApprovals />} />
          <Route path="executions" element={<PortalExecutions />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};
