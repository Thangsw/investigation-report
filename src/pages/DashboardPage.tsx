import { useState, useEffect, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { api } from '../api';
import type { Report, Investigator, ReportFormData } from '../types';
import StatsCards from '../components/StatsCards';
import FilterBar, { type Filters } from '../components/FilterBar';
import ReportList from '../components/ReportList';
import ExportButton from '../components/ExportButton';
import ReportForm from '../components/ReportForm';

export default function DashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [investigators, setInvestigators] = useState<Investigator[]>([]);
  const [filters, setFilters] = useState<Filters>({ dtvName: '', loaiHoSo: '', doi: '', toBanDia: '' });
  const [sheetOpen, setSheetOpen] = useState(false);

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

  const closeSheet = () => {
    setSheetOpen(false);
  };

  const handleCreateReport = async (data: ReportFormData) => {
    await api.createReport(data);
    closeSheet();
    await fetchAll();
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (filters.dtvName && report.dtvName !== filters.dtvName) return false;
      if (filters.loaiHoSo && report.loaiHoSo !== filters.loaiHoSo) return false;
      if (filters.doi && report.doi !== filters.doi) return false;
      if (filters.toBanDia && (report.toBanDia ?? 'Hoà Bình') !== filters.toBanDia) return false;
      return true;
    });
  }, [reports, filters]);

  return (
    <div>
      <div className="dashboard-toolbar glass-panel">
        <div className="dashboard-title">BÁO CÁO TỔNG HỢP</div>
        <div className="dashboard-actions">
          <button type="button" className="btn-primary-cta" onClick={() => setSheetOpen(true)}>
            Thêm hồ sơ đã làm
          </button>
          <ExportButton filters={filters} />
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

      <div className={`sheet-backdrop ${sheetOpen ? 'visible' : ''}`} onClick={closeSheet} />

      <div className={`bottom-sheet glass-panel ${sheetOpen ? 'open' : ''}`}>
        <div className="sheet-header">
          <h2>Thêm hồ sơ đã làm</h2>
          <button className="btn-close" onClick={closeSheet}>
            <X size={16} />
          </button>
        </div>
        <ReportForm
          investigators={investigators}
          editingReport={null}
          onSubmit={handleCreateReport}
          onCancel={closeSheet}
        />
      </div>
    </div>
  );
}
