import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Plus, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { WorkPosition, WorkProgressFormData, WorkProgressItem, WorkProgressReport } from '../types';

const OPERATION_SECTIONS = [
  {
    title: '1. CÔNG TÁC NGHIỆP VỤ CƠ BẢN',
    items: ['ĐTCB', 'SN', 'HN', 'VA', 'CTVBM', 'Vai ảo'],
  },
  {
    title: '2. CÔNG TÁC ĐIỀU TRA, THỤ LÝ ÁN',
    items: ['Đang hiện hành', 'Đơn đang phân loại, xác minh'],
  },
  {
    title: '3. NHIỆM VỤ CHUNG CỦA ĐƠN VỊ',
    items: ['Vụ án tạm đình chỉ', 'Vụ việc tạm đình chỉ', 'Chuyên án tạm đình chỉ'],
  },
  {
    title: '4. CÁC CÔNG VIỆC KHÁC',
    items: ['Đi học', 'Tập huấn', 'Nghỉ phép'],
  },
];

const newItem = (category: string, workContent = ''): WorkProgressItem => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  category,
  workContent,
  quantity: '',
  summary: '',
  caseNumber: '',
  progress: '',
  deadline: '',
  difficulties: '',
  proposal: '',
});

const isDone = (value: string) => {
  const text = value.toLowerCase();
  return text.includes('hoàn thành') || text.includes('hoan thanh') || text.includes('xong') || text.includes('100');
};

export default function WorkProgressPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<WorkProgressReport[]>([]);
  const [officerName, setOfficerName] = useState('');
  const [team, setTeam] = useState('');
  const [positions, setPositions] = useState<WorkPosition[]>([]);
  const [staffItems, setStaffItems] = useState<WorkProgressItem[]>([newItem('Tham mưu tổng hợp')]);
  const [operationItems, setOperationItems] = useState<WorkProgressItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const fetchReports = useCallback(async () => {
    setReports(await api.getWorkProgressReports());
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const hasStaff = positions.includes('tham_muu_tong_hop');
  const hasOperation = positions.includes('doi_nghiep_vu');

  const togglePosition = (position: WorkPosition) => {
    setPositions((prev) =>
      prev.includes(position) ? prev.filter((item) => item !== position) : [...prev, position],
    );
  };

  const updateItem = (
    source: 'staff' | 'operation',
    id: string,
    key: keyof WorkProgressItem,
    value: string,
  ) => {
    const setter = source === 'staff' ? setStaffItems : setOperationItems;
    setter((prev) => prev.map((item) => item.id === id ? { ...item, [key]: value } : item));
  };

  const removeItem = (source: 'staff' | 'operation', id: string) => {
    const setter = source === 'staff' ? setStaffItems : setOperationItems;
    setter((prev) => prev.filter((item) => item.id !== id));
  };

  const evaluation = useMemo(() => {
    const map = new Map<string, {
      officerName: string;
      team: string;
      totalQuantity: number;
      itemCount: number;
      doneCount: number;
      reportCount: number;
    }>();

    reports.forEach((report) => {
      const key = `${report.officerName}__${report.team}`;
      const current = map.get(key) ?? {
        officerName: report.officerName,
        team: report.team,
        totalQuantity: 0,
        itemCount: 0,
        doneCount: 0,
        reportCount: 0,
      };
      current.reportCount += 1;
      report.items.forEach((item) => {
        const quantity = Number(String(item.quantity).replace(',', '.')) || 1;
        current.totalQuantity += quantity;
        current.itemCount += 1;
        if (isDone(item.progress)) current.doneCount += 1;
      });
      map.set(key, current);
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        efficiency: item.itemCount ? Math.round((item.doneCount / item.itemCount) * 100) : 0,
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity || b.efficiency - a.efficiency);
  }, [reports]);

  const submit = async () => {
    const items = [
      ...(hasStaff ? staffItems.map((item) => ({ ...item, quantity: item.quantity || '1' })) : []),
      ...(hasOperation ? operationItems : []),
    ].filter((item) => item.workContent.trim());

    const payload: WorkProgressFormData = {
      officerName,
      team,
      positions,
      items,
    };

    setSaving(true);
    try {
      await api.createWorkProgressReport(payload);
      setToast('Đã lưu báo cáo tiến độ công việc');
      setOfficerName('');
      setTeam('');
      setPositions([]);
      setStaffItems([newItem('Tham mưu tổng hợp')]);
      setOperationItems([]);
      await fetchReports();
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 3500);
    }
  };

  const canSubmit = officerName.trim() && team.trim() && positions.length > 0 && (
    (hasStaff && staffItems.some((item) => item.workContent.trim())) ||
    (hasOperation && operationItems.some((item) => item.workContent.trim()))
  );

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#2ed573',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: 10,
          fontWeight: 700,
          zIndex: 3000,
        }}>
          {toast}
        </div>
      )}

      <div className="dashboard-toolbar glass-panel">
        <div>
          <button className="btn-small" type="button" onClick={() => navigate('/')}>
            <ArrowLeft size={14} /> Trang chủ
          </button>
          <div className="dashboard-title" style={{ marginTop: 12 }}>
            BÁO CÁO TIẾN ĐỘ CÔNG VIỆC
          </div>
        </div>
        <button className="btn-export" type="button" onClick={api.exportWorkProgress}>
          <Download size={15} /> Xuất Excel
        </button>
      </div>

      <div className="section-card glass-panel">
        <div className="form-row">
          <div className="form-group">
            <label>Họ tên</label>
            <input className="form-control" value={officerName} onChange={(e) => setOfficerName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Đội</label>
            <input className="form-control" value={team} onChange={(e) => setTeam(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Vị trí công tác</label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={hasStaff}
                onChange={() => togglePosition('tham_muu_tong_hop')}
              />
              Tham mưu tổng hợp
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={hasOperation}
                onChange={() => togglePosition('doi_nghiep_vu')}
              />
              Đội nghiệp vụ
            </label>
          </div>
        </div>
      </div>

      {hasStaff && (
        <div className="section-card glass-panel">
          <div className="section-header">
            <span className="section-title">Tham mưu tổng hợp</span>
            <button className="btn-add" type="button" onClick={() => setStaffItems((prev) => [...prev, newItem('Tham mưu tổng hợp')])}>
              <Plus size={14} /> Thêm dòng
            </button>
          </div>
          <div className="point-list">
            {staffItems.map((item, index) => (
              <div className="dtv-item" key={item.id}>
                <span style={{ color: 'var(--text-muted)', width: 24 }}>{index + 1}</span>
                <input
                  className="form-control"
                  value={item.workContent}
                  onChange={(e) => updateItem('staff', item.id, 'workContent', e.target.value)}
                  placeholder="Nhập nội dung công việc tham mưu..."
                />
                <button className="btn-small btn-delete" type="button" onClick={() => removeItem('staff', item.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasOperation && (
        <div className="section-card glass-panel">
          <div className="section-header">
            <span className="section-title">Đội nghiệp vụ</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Mẫu theo file Theo dõi nội dung công việc.xlsx
            </span>
          </div>

          {OPERATION_SECTIONS.map((section) => (
            <div key={section.title} style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{section.title}</div>
              <div className="filter-bar">
                {section.items.map((label) => (
                  <button
                    key={label}
                    className="btn-small"
                    type="button"
                    onClick={() => setOperationItems((prev) => [...prev, newItem(section.title, label)])}
                  >
                    <Plus size={13} /> {label}
                  </button>
                ))}
                <button
                  className="btn-add"
                  type="button"
                  onClick={() => setOperationItems((prev) => [...prev, newItem(section.title)])}
                >
                  <Plus size={13} /> Nội dung khác
                </button>
              </div>
            </div>
          ))}

          <div className="point-list">
            {operationItems.map((item) => (
              <div className="point-item" key={item.id}>
                <div className="point-item-header">
                  <strong>{item.category}</strong>
                  <button className="btn-small btn-delete" type="button" onClick={() => removeItem('operation', item.id)}>
                    <Trash2 size={14} /> Xóa
                  </button>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nội dung công tác</label>
                    <input className="form-control" value={item.workContent} onChange={(e) => updateItem('operation', item.id, 'workContent', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Số lượng</label>
                    <input className="form-control" value={item.quantity} onChange={(e) => updateItem('operation', item.id, 'quantity', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Số hồ sơ</label>
                    <input className="form-control" value={item.caseNumber} onChange={(e) => updateItem('operation', item.id, 'caseNumber', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Trích yếu cụ thể</label>
                    <input className="form-control" value={item.summary} onChange={(e) => updateItem('operation', item.id, 'summary', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Tiến độ thực hiện</label>
                    <input className="form-control" value={item.progress} onChange={(e) => updateItem('operation', item.id, 'progress', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Thời hạn</label>
                    <input className="form-control" type="date" value={item.deadline} onChange={(e) => updateItem('operation', item.id, 'deadline', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Khó khăn vướng mắc</label>
                    <input className="form-control" value={item.difficulties} onChange={(e) => updateItem('operation', item.id, 'difficulties', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Đề xuất</label>
                    <input className="form-control" value={item.proposal} onChange={(e) => updateItem('operation', item.id, 'proposal', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="btn-submit" type="button" disabled={!canSubmit || saving} onClick={submit}>
        <Save size={17} /> {saving ? 'Đang lưu...' : 'Lưu báo cáo tiến độ'}
      </button>

      <div className="section-card glass-panel" style={{ marginTop: 18 }}>
        <div className="section-header">
          <span className="section-title">Bảng đánh giá cán bộ</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{reports.length} báo cáo</span>
        </div>
        {evaluation.length === 0 ? (
          <div className="empty-state">Chưa có dữ liệu đánh giá.</div>
        ) : (
          <div className="point-list">
            {evaluation.map((row, index) => (
              <div className="point-item" key={`${row.officerName}-${row.team}`}>
                <div className="point-item-header">
                  <strong>{index + 1}. {row.officerName}</strong>
                  <span className="badge badge-current">{row.team}</span>
                </div>
                <div className="stats-grid stats-grid-4" style={{ marginBottom: 0 }}>
                  <div className="stat-card"><div className="stat-value">{row.totalQuantity}</div><div className="stat-label">Tổng số lượng</div></div>
                  <div className="stat-card"><div className="stat-value blue">{row.itemCount}</div><div className="stat-label">Đầu việc</div></div>
                  <div className="stat-card"><div className="stat-value green">{row.doneCount}</div><div className="stat-label">Hoàn thành</div></div>
                  <div className="stat-card"><div className="stat-value amber">{row.efficiency}%</div><div className="stat-label">Hiệu quả</div></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
