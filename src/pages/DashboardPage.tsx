import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api';
import type { Report, Investigator } from '../types';
import StatsCards from '../components/StatsCards';
import FilterBar from '../components/FilterBar';
import ReportList from '../components/ReportList';
import ExportButton from '../components/ExportButton';
import { EXTRACTED_CASE_TARGET, TOTAL_CASE_TARGET } from '../reportMetrics';

interface Filters {
  dtvName: string;
  loaiHoSo: string;
  doi: string;
}

export default function DashboardPage() {
  const [reports, setReports]           = useState<Report[]>([]);
  const [investigators, setInvestigators] = useState<Investigator[]>([]);
  const [filters, setFilters]           = useState<Filters>({ dtvName: '', loaiHoSo: '', doi: '' });

  const fetchAll = useCallback(async () => {
    const [r, d] = await Promise.all([api.getReports(), api.getInvestigators()]);
    setReports(r);
    setInvestigators(d);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const changeFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (filters.dtvName  && r.dtvName  !== filters.dtvName)  return false;
      if (filters.loaiHoSo && r.loaiHoSo !== filters.loaiHoSo) return false;
      if (filters.doi      && r.doi      !== filters.doi)      return false;
      return true;
    });
  }, [reports, filters]);

  return (
    <div>
      <div className="section-card glass-panel">
        <div className="section-title" style={{ marginBottom: 10 }}>Vai trò phần mềm</div>
        <p className="summary-text">
          Bộ phận tổng hợp phải rút {TOTAL_CASE_TARGET} hồ sơ, hiện đã rút {EXTRACTED_CASE_TARGET} hồ sơ để phân cho ĐTV thực hiện.
          ĐTV dùng nút "Thêm hồ sơ" để cập nhật tình trạng xử lý, thời hạn đình chỉ và khó khăn vướng mắc của từng hồ sơ.
          Màn hình này là báo cáo tổng hợp để lãnh đạo theo dõi tiến độ toàn đơn vị.
        </p>
        <p className="summary-note">
          Cách hiểu hiện tại: "Đã làm / đã báo cáo" là số hồ sơ ĐTV đã nhập hoặc cập nhật trên hệ thống.
        </p>
      </div>

      <div className="section-header" style={{ marginBottom: 12 }}>
        <span className="section-title">Báo cáo lãnh đạo</span>
        <ExportButton />
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
