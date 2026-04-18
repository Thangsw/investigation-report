import { useState, useEffect, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import { api } from '../api';
import type { Report, Investigator, ReportFormData } from '../types';
import StatsCards, { type SpotlightType } from '../components/StatsCards';
import FilterBar, { type Filters } from '../components/FilterBar';
import ReportList from '../components/ReportList';
import ExportButton from '../components/ExportButton';
import ReportForm from '../components/ReportForm';
import { getDeadlineStatus, hasDifficulty, DEFAULT_TOTAL_CASE_TARGET } from '../reportMetrics';

export default function DashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [investigators, setInvestigators] = useState<Investigator[]>([]);
  const [filters, setFilters] = useState<Filters>({ dtvName: '', loaiHoSo: '', doi: '', toBanDia: '' });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [spotlight, setSpotlight] = useState<SpotlightType | null>(null);
  const [totalCaseTarget, setTotalCaseTarget] = useState(DEFAULT_TOTAL_CASE_TARGET);

  const fetchAll = useCallback(async () => {
    const [reportData, investigatorData, configData] = await Promise.all([
      api.getReports(),
      api.getInvestigators(),
      api.getConfig(),
    ]);
    setReports(reportData);
    setInvestigators(investigatorData);
    setTotalCaseTarget(configData.totalCaseTarget);
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

  const spotlightReports = useMemo(() => {
    if (!spotlight) return [];
    if (spotlight === 'upcoming') return reports.filter((r) => getDeadlineStatus(r.ngayHetThoiHieuTruyCuuTNHS) === 'upcoming');
    if (spotlight === 'overdue')  return reports.filter((r) => getDeadlineStatus(r.ngayHetThoiHieuTruyCuuTNHS) === 'overdue');
    if (spotlight === 'difficulty') return reports.filter(hasDifficulty);
    return [];
  }, [reports, spotlight]);

  const spotlightLabel: Record<SpotlightType, string> = {
    upcoming:   'Sắp hết thời hiệu TNHS',
    overdue:    'Quá thời hiệu TNHS',
    difficulty: 'Có khó khăn / vướng mắc',
  };

  const handleCardClick = (type: SpotlightType) => {
    setSpotlight((prev) => (prev === type ? null : type));
  };

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

      <StatsCards reports={reports} totalCaseTarget={totalCaseTarget} spotlight={spotlight} onCardClick={handleCardClick} />

      {spotlight && (
        <div className="spotlight-panel glass-panel">
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="section-title">
              {spotlightLabel[spotlight]} ({spotlightReports.length})
            </span>
            <button className="btn-search-toggle active" onClick={() => setSpotlight(null)}>
              <X size={13} /> Đóng
            </button>
          </div>
          {spotlightReports.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Không có hồ sơ nào.</p>
            : <ReportList reports={spotlightReports} />}
        </div>
      )}

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
