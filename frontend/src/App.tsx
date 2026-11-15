import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Inbox from './pages/Inbox';
import Analytics from './pages/Analytics';
import MockITSM from './pages/MockITSM';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/mock" element={<MockITSM />} />
            <Route path="*" element={<Navigate to="/inbox" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
