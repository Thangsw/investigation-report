import { Routes, Route, NavLink } from 'react-router-dom';
import { Shield } from 'lucide-react';
import ReportPage from './pages/ReportPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  return (
    <div className="app-root">
      <nav className="top-nav glass-panel">
        <div className="brand-title">
          <Shield size={20} />
          Quản lý Hồ sơ TĐC
        </div>
        <div className="nav-links">
          <NavLink to="/" end>Nhập hồ sơ</NavLink>
          <NavLink to="/dashboard">Tổng hợp</NavLink>
        </div>
      </nav>

      <main className="page-content">
        <Routes>
          <Route path="/"          element={<ReportPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}
