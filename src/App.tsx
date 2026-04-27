import { Routes, Route, NavLink } from 'react-router-dom';
import { Shield } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import ReportPage from './pages/ReportPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import StatisticsPage from './pages/StatisticsPage';

function AppShell() {
  return (
    <div className="app-root">
      <nav className="top-nav glass-panel">
        <NavLink to="/" className="brand-title" style={{ textDecoration: 'none' }}>
          <Shield size={20} />
          Quản lý Hồ sơ TĐC
        </NavLink>
        <div className="nav-links">
          <NavLink to="/hs" end>Báo cáo tổng hợp</NavLink>
          <NavLink to="/hs/reports">Chỉnh sửa hồ sơ đã nhập</NavLink>
          <NavLink to="/hs/statistics">Thống kê ĐTV</NavLink>
        </div>
      </nav>

      <main className="page-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/reports" element={<ReportPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/hs/*" element={<AppShell />} />
    </Routes>
  );
}
