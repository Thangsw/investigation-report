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
          <NavLink to="/" end>Báo cáo tổng hợp</NavLink>
          <NavLink to="/reports">Chỉnh sửa hồ sơ đã nhập</NavLink>
        </div>
      </nav>

      <main className="page-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reports" element={<ReportPage />} />
        </Routes>
      </main>
    </div>
  );
}
