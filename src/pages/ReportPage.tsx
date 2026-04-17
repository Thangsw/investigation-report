import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Users, X } from 'lucide-react';
import { api } from '../api';
import type { Report, Investigator, ReportFormData } from '../types';
import ReportForm from '../components/ReportForm';
import ReportList from '../components/ReportList';
import InvestigatorManager from '../components/InvestigatorManager';

type SheetType = 'form' | 'dtv' | null;

export default function ReportPage() {
  const [reports, setReports]             = useState<Report[]>([]);
  const [investigators, setInvestigators] = useState<Investigator[]>([]);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [sheetOpen, setSheetOpen]         = useState<SheetType>(null);

  // ĐTV lọc: ĐTV tự nhập tên mình để chỉ thấy hồ sơ của mình
  const [myName, setMyName] = useState('');

  const fetchAll = useCallback(async () => {
    const [r, d] = await Promise.all([api.getReports(), api.getInvestigators()]);
    setReports(r);
    setInvestigators(d);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Lọc hồ sơ theo tên ĐTV đang xem
  const visibleReports = useMemo(() => {
    const name = myName.trim();
    if (!name) return reports;
    return reports.filter(r =>
      r.dtvName.toLowerCase().includes(name.toLowerCase()) ||
      r.nguoiCamHoSo.toLowerCase().includes(name.toLowerCase())
    );
  }, [reports, myName]);

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

  // ── Investigator CRUD ─────────────────────────────────────────────────────
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

      {/* ── Bộ lọc theo tên ĐTV ─────────────────────────────────────── */}
      <div className="form-group" style={{ marginBottom: 14 }}>
        <label style={{ fontSize: '0.8rem', color: '#888' }}>
          Lọc hồ sơ theo tên ĐTV (nhập tên bạn để chỉ xem hồ sơ của mình):
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            list="myname-datalist"
            value={myName}
            onChange={e => setMyName(e.target.value)}
            placeholder="Nhập tên để lọc..."
            autoComplete="off"
          />
          {myNameTrimmed && (
            <button
              onClick={() => setMyName('')}
              style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', color: '#888', cursor: 'pointer', padding: 4,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <datalist id="myname-datalist">
          {investigators.map(d => (
            <option key={d.id} value={d.name} />
          ))}
        </datalist>
      </div>

      {/* Đếm */}
      <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: 12 }}>
        {myNameTrimmed
          ? `${visibleReports.length} hồ sơ của "${myNameTrimmed}" (tổng: ${reports.length})`
          : `${reports.length} hồ sơ`
        }
      </div>

      <ReportList
        reports={visibleReports}
        onEdit={openForm}
        onDelete={handleDelete}
      />

      {/* FAB: Thêm hồ sơ */}
      <div className="fab-container left">
        <button
          className="fab-extended"
          style={{ background: '#ff4757', boxShadow: '0 4px 16px rgba(255,71,87,0.4)' }}
          onClick={() => openForm()}
        >
          <Plus size={20} />
          <span>Thêm hồ sơ</span>
        </button>
      </div>

      {/* FAB: Quản lý ĐTV */}
      <div className="fab-container right">
        <button className="fab fab-secondary" onClick={() => setSheetOpen('dtv')} title="Quản lý ĐTV">
          <Users size={22} />
        </button>
      </div>

      {/* Backdrop */}
      <div className={`sheet-backdrop ${sheetOpen ? 'visible' : ''}`} onClick={closeSheet} />

      {/* Bottom sheet: Form */}
      <div className={`bottom-sheet glass-panel ${sheetOpen === 'form' ? 'open' : ''}`}>
        <div className="sheet-header">
          <h2>{editingReport ? 'Sửa hồ sơ' : 'Thêm hồ sơ mới'}</h2>
          <button className="btn-close" onClick={closeSheet}><X size={16} /></button>
        </div>
        <ReportForm
          investigators={investigators}
          editingReport={editingReport}
          prefillDTV={myNameTrimmed || undefined}
          onSubmit={handleSubmit}
          onCancel={closeSheet}
        />
      </div>

      {/* Bottom sheet: Investigator Manager */}
      <div className={`bottom-sheet glass-panel ${sheetOpen === 'dtv' ? 'open' : ''}`}
           style={{ maxHeight: '70vh' }}>
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
