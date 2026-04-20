import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { api } from '../api';
import type { Report, Investigator, ReportFormData, AppConfig } from '../types';
import StatsCards, { type SpotlightType } from '../components/StatsCards';
import FilterBar, { type Filters } from '../components/FilterBar';
import ReportList from '../components/ReportList';
import ExportButton from '../components/ExportButton';
import ReportForm from '../components/ReportForm';
import { getDeadlineStatus, hasDifficulty, DEFAULT_TOTAL_CASE_TARGET } from '../reportMetrics';
import { Download } from 'lucide-react';

export default function DashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [investigators, setInvestigators] = useState<Investigator[]>([]);
  const [filters, setFilters] = useState<Filters>({ dtvName: '', loaiHoSo: '', doi: '', toBanDia: '', trichYeu: '' });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [spotlight, setSpotlight] = useState<SpotlightType | null>(null);
  const [totalCaseTarget, setTotalCaseTarget] = useState(DEFAULT_TOTAL_CASE_TARGET);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [viewToBanDia, setViewToBanDia] = useState<'' | 'Hoà Bình' | 'Lạc Thuỷ'>();

  const fetchAll = useCallback(async () => {
    const [reportData, investigatorData, configData] = await Promise.all([
      api.getReports(),
      api.getInvestigators(),
      api.getConfig(),
    ]);
    setReports(reportData);
    setInvestigators(investigatorData);
    setTotalCaseTarget(configData.totalCaseTarget);
    setAppConfig((prev) => {
      if (prev === undefined || prev === null) setViewToBanDia(configData.statsToBanDia ?? '');
      return configData;
    });
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

  const activeView = viewToBanDia ?? '';

  const displayTotalTarget = useMemo(() => {
    if (!appConfig) return totalCaseTarget;
    const hb = appConfig.totalCaseTargetHB ?? 0;
    const lt = appConfig.totalCaseTargetLT ?? 0;
    if (activeView === 'Hoà Bình') return hb || totalCaseTarget;
    if (activeView === 'Lạc Thuỷ') return lt || totalCaseTarget;
    return (hb + lt) || totalCaseTarget;
  }, [activeView, appConfig, totalCaseTarget]);

  const statsReports = useMemo(() => {
    if (!activeView) return reports;
    return reports.filter((r) => (r.toBanDia ?? 'Hoà Bình') === activeView);
  }, [reports, activeView]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (filters.dtvName && report.dtvName !== filters.dtvName) return false;
      if (filters.loaiHoSo && report.loaiHoSo !== filters.loaiHoSo) return false;
      if (filters.doi && report.doi !== filters.doi) return false;
      if (filters.toBanDia && (report.toBanDia ?? 'Hoà Bình') !== filters.toBanDia) return false;
      if (filters.trichYeu && !report.trichYeu.toLowerCase().includes(filters.trichYeu.toLowerCase())) return false;
      return true;
    });
  }, [reports, filters]);

  const spotlightReports = useMemo(() => {
    if (!spotlight) return [];
    const base = activeView ? reports.filter((r) => (r.toBanDia ?? 'Hoà Bình') === activeView) : reports;
    if (spotlight === 'upcoming') return base.filter((r) => !r.daThucHien && getDeadlineStatus(r.ngayHetThoiHieuTruyCuuTNHS) === 'upcoming');
    if (spotlight === 'overdue')  return base.filter((r) => !r.daThucHien && getDeadlineStatus(r.ngayHetThoiHieuTruyCuuTNHS) === 'overdue');
    if (spotlight === 'difficulty') return base.filter(hasDifficulty);
    return [];
  }, [reports, spotlight, activeView]);

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
          {appConfig?.sheetsViewUrl && (
            <a
              href={appConfig.sheetsViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-export"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              <ExternalLink size={14} />
              Xem trang tính
            </a>
          )}
          <ExportButton filters={filters} />
        </div>
      </div>

      <StatsCards
        reports={statsReports}
        totalCaseTarget={displayTotalTarget}
        akTarget={appConfig?.akTarget ?? 372}
        adTarget={appConfig?.adTarget ?? 238}
        viewToBanDia={activeView}
        onChangeViewToBanDia={setViewToBanDia}
        spotlight={spotlight}
        onCardClick={handleCardClick}
        spotlightPanel={spotlight ? (
          <div className="spotlight-panel glass-panel">
            <div className="section-header" style={{ marginBottom: 10 }}>
              <span className="section-title">
                {spotlightLabel[spotlight]} ({spotlightReports.length})
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {spotlightReports.length > 0 && (
                  <button
                    className="btn-export"
                    onClick={() => api.exportByIds(spotlightReports.map(r => r.id), `${spotlightLabel[spotlight]}.xlsx`)}
                  >
                    <Download size={14} /> Xuất Excel
                  </button>
                )}
                <button className="btn-search-toggle active" onClick={() => setSpotlight(null)}>
                  <X size={13} /> Đóng
                </button>
              </div>
            </div>
            {spotlightReports.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Không có hồ sơ nào.</p>
              : <ReportList reports={spotlightReports} />}
          </div>
        ) : null}
      />

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
          requiredFields={appConfig?.requiredFields}
          onSubmit={handleCreateReport}
          onCancel={closeSheet}
        />
      </div>
    </div>
  );
}
