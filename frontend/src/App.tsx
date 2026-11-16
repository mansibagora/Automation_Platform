import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Catalogue } from './pages/Catalogue';
import { Approvals } from './pages/Approvals';
import { Executions } from './pages/Executions';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string>(
    localStorage.getItem('portal_user') || 'engineer_user'
  );

  const handleUserChange = (user: string) => {
    setCurrentUser(user);
    localStorage.setItem('portal_user', user);
    window.dispatchEvent(new Event('portal_user_changed'));
  };

  useEffect(() => {
    const handleStorage = () => {
      setCurrentUser(localStorage.getItem('portal_user') || 'engineer_user');
    };
    window.addEventListener('portal_user_changed', handleStorage);
    return () => window.removeEventListener('portal_user_changed', handleStorage);
  }, []);

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-900 text-slate-100 font-sans">
        <Sidebar currentUser={currentUser} onUserChange={handleUserChange} />
        <main className="flex-1 overflow-auto bg-slate-950 p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/catalogue" element={<Catalogue />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/executions" element={<Executions />} />
            {/* Backward compatibility redirects */}
            <Route path="/portal/*" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
