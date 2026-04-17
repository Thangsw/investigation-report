import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Report, Investigator } from '../types';
import StatsCards from '../components/StatsCards';
import FilterBar from '../components/FilterBar';
import ReportList from '../components/ReportList';
import ExportButton from '../components/ExportButton';

interface Filters {
  dtvName: string;
  loaiHoSo: string;
  doi: string;
}

export default function DashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [investigators, setInvestigators] = useState<Investigator[]>([]);
  const [filters, setFilters] = useState<Filters>({ dtvName: '', loaiHoSo: '', doi: '' });

  const fetchAll = useCallback(async () => {
    const [reportData, investigatorData] = await Promise.all([
      api.getReports(),
      api.getInvestigators(),
    ]);
    setReports(reportData);
    setInvestigators(investigatorData);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const changeFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (filters.dtvName && report.dtvName !== filters.dtvName) return false;
      if (filters.loaiHoSo && report.loaiHoSo !== filters.loaiHoSo) return false;
      if (filters.doi && report.doi !== filters.doi) return false;
      return true;
    });
  }, [reports, filters]);

  return (
    <div>
      <div className="dashboard-toolbar glass-panel">
        <div className="dashboard-title">BÁO CÁO TỔNG HỢP</div>
        <div className="dashboard-actions">
          <Link to="/reports" className="btn-primary-cta">
            Thêm hồ sơ đã làm
          </Link>
          <ExportButton />
        </div>
      </div>

      <StatsCards reports={reports} />

      <div className="section-header">
        <span className="section-title">
          Danh sách hồ sơ ĐTV đã báo cáo ({filteredReports.length})
        </span>
      </div>

      <FilterBar
        investigators={investigators}
        filters={filters}
        onChange={changeFilter}
      />

      <ReportList reports={filteredReports} />
    </div>
  );
}
