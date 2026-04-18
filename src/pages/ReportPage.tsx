import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Users, X, Search } from 'lucide-react';
import { api } from '../api';
import type { Report, Investigator, ReportFormData, AppConfig } from '../types';
import FilterBar, { type Filters } from '../components/FilterBar';
import ReportForm from '../components/ReportForm';
import ReportList from '../components/ReportList';
import InvestigatorManager from '../components/InvestigatorManager';
import ExportButton from '../components/ExportButton';

type SheetType = 'form' | 'dtv' | null;

const EMPTY_FILTERS: Filters = { dtvName: '', loaiHoSo: '', doi: '', toBanDia: '' };

export default function ReportPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [investigators, setInvestigators] = useState<Investigator[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [sheetOpen, setSheetOpen] = useState<SheetType>(null);
  const [myName, setMyName] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [searchFilters, setSearchFilters] = useState<Filters>(EMPTY_FILTERS);

  const fetchAll = useCallback(async () => {
    const [reportData, investigatorData, configData] = await Promise.all([
      api.getReports(),
      api.getInvestigators(),
      api.getConfig(),
    ]);
    setReports(reportData);
    setInvestigators(investigatorData);
    setAppConfig(configData);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Normal list filtered by name
  const visibleReports = useMemo(() => {
    const name = myName.trim();
    if (!name) return reports;
    return reports.filter((report) =>
      report.dtvName.toLowerCase().includes(name.toLowerCase()) ||
      report.nguoiCamHoSo.toLowerCase().includes(name.toLowerCase()),
    );
  }, [reports, myName]);

  // Tra cứu filtered list
  const searchResults = useMemo(() => {
    return reports.filter((report) => {
      if (searchFilters.dtvName && report.dtvName !== searchFilters.dtvName) return false;
      if (searchFilters.loaiHoSo && report.loaiHoSo !== searchFilters.loaiHoSo) return false;
      if (searchFilters.doi && report.doi !== searchFilters.doi) return false;
      if (searchFilters.toBanDia && (report.toBanDia ?? 'Hoà Bình') !== searchFilters.toBanDia) return false;
      return true;
    });
  }, [reports, searchFilters]);

  const changeSearchFilter = (key: keyof Filters, value: string) => {
    setSearchFilters((prev) => ({ ...prev, [key]: value }));
  };

  const openForm = (report?: Report) => {
    setEditingReport(report ?? null);
    setSheetOpen('form');
  };

  const closeSheet = () => {
    setSheetOpen(null);
    setEditingReport(null);
  };

  const handleSubmit = async (data: ReportFormData) => {
    if (editingReport) {
      await api.updateReport(editingReport.id, data);
    } else {
      await api.createReport(data);
    }
    closeSheet();
    await fetchAll();
  };

  const handleDelete = async (id: string) => {
    await api.deleteReport(id);
    await fetchAll();
  };

  const handleAddDTV = async (name: string) => {
    await api.createInvestigator(name);
    setInvestigators(await api.getInvestigators());
  };

  const handleUpdateDTV = async (id: string, name: string) => {
    await api.updateInvestigator(id, name);
    setInvestigators(await api.getInvestigators());
  };

  const handleDeleteDTV = async (id: string) => {
    await api.deleteInvestigator(id);
    setInvestigators(await api.getInvestigators());
  };

  const myNameTrimmed = myName.trim();

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Header ── */}
      <div className="section-header" style={{ marginBottom: 12 }}>
        <span className="section-title">
          {searchMode ? 'Tra cứu & Xuất Excel' : 'Chỉnh sửa hồ sơ đã nhập'}
        </span>
        <button
          className={`btn-search-toggle ${searchMode ? 'active' : ''}`}
          onClick={() => {
            setSearchMode((prev) => !prev);
            setSearchFilters(EMPTY_FILTERS);
          }}
        >
          {searchMode ? <X size={13} /> : <Search size={13} />}
          {searchMode ? 'Đóng' : 'Tra cứu'}
        </button>
      </div>

      {/* ── Search / Tra cứu mode ── */}
      {searchMode && (
        <div className="search-panel">
          <FilterBar
            investigators={investigators}
            filters={searchFilters}
            onChange={changeSearchFilter}
          />
          <div className="search-panel-footer">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {searchResults.length} hồ sơ khớp (tổng: {reports.length})
            </span>
            <ExportButton filters={searchFilters} label="Xuất kết quả lọc" />
          </div>
        </div>
      )}

      {searchMode ? (
        <ReportList reports={searchResults} />
      ) : (
        <>
          {/* ── Normal filter by name ── */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Lọc hồ sơ theo tên ĐTV (nhập tên bạn để chỉ xem hồ sơ của mình):
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                list="myname-datalist"
                value={myName}
                onChange={(event) => setMyName(event.target.value)}
                placeholder="Nhập tên để lọc..."
                autoComplete="off"
              />
              {myNameTrimmed && (
                <button
                  onClick={() => setMyName('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <datalist id="myname-datalist">
              {investigators.map((investigator) => (
                <option key={investigator.id} value={investigator.name} />
              ))}
            </datalist>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
            {myNameTrimmed
              ? `${visibleReports.length} hồ sơ của "${myNameTrimmed}" (tổng: ${reports.length})`
              : `${reports.length} hồ sơ`}
          </div>

          <ReportList reports={visibleReports} onEdit={openForm} onDelete={handleDelete} />

          {/* ── FABs ── */}
          <div className="fab-container left">
            <button
              className="fab-extended"
              style={{
                background: '#ff4757',
                boxShadow: '0 12px 26px rgba(255,71,87,0.28)',
                height: 60,
                padding: '0 28px',
                fontSize: '1rem',
              }}
              onClick={() => openForm()}
            >
              <Plus size={20} />
              <span>Thêm hồ sơ đã làm</span>
            </button>
          </div>

          <div className="fab-container right">
            <button className="fab fab-secondary" onClick={() => setSheetOpen('dtv')} title="Quản lý ĐTV">
              <Users size={22} />
            </button>
          </div>
        </>
      )}

      {/* ── Sheets ── */}
      <div className={`sheet-backdrop ${sheetOpen ? 'visible' : ''}`} onClick={closeSheet} />

      <div className={`bottom-sheet glass-panel ${sheetOpen === 'form' ? 'open' : ''}`}>
        <div className="sheet-header">
          <h2>{editingReport ? 'Sửa hồ sơ' : 'Thêm hồ sơ đã làm'}</h2>
          <button className="btn-close" onClick={closeSheet}>
            <X size={16} />
          </button>
        </div>
        <ReportForm
          investigators={investigators}
          editingReport={editingReport}
          prefillDTV={myNameTrimmed || undefined}
          requiredFields={appConfig?.requiredFields}
          onSubmit={handleSubmit}
          onCancel={closeSheet}
        />
      </div>

      <div
        className={`bottom-sheet glass-panel ${sheetOpen === 'dtv' ? 'open' : ''}`}
        style={{ maxHeight: '70vh' }}
      >
        <InvestigatorManager
          investigators={investigators}
          onAdd={handleAddDTV}
          onUpdate={handleUpdateDTV}
          onDelete={handleDeleteDTV}
          onClose={closeSheet}
        />
      </div>
    </div>
  );
}
