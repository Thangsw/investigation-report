import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, Plus, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type {
  Investigator,
  WorkPosition,
  WorkProgressFormData,
  WorkProgressItem,
  WorkProgressReport,
} from '../types';

const STAFF_CATEGORY = 'Tham mưu tổng hợp';

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
  summary: '',
  caseNumber: '',
  progress: '',
  deadline: '',
  difficulties: '',
  proposal: '',
  completed: false,
});

const textKey = (value: string) => value.trim().toLowerCase();

const itemPosition = (item: WorkProgressItem): WorkPosition =>
  item.category === STAFF_CATEGORY ? 'tham_muu_tong_hop' : 'doi_nghiep_vu';

function formatDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export default function WorkProgressPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<WorkProgressReport[]>([]);
  const [investigators, setInvestigators] = useState<Investigator[]>([]);
  const [officerName, setOfficerName] = useState('');
  const [team, setTeam] = useState('');
  const [positions, setPositions] = useState<WorkPosition[]>([]);
  const [activeItem, setActiveItem] = useState<WorkProgressItem | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'stats'>('form');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const fetchAll = useCallback(async () => {
    const [reportData, investigatorData] = await Promise.all([
      api.getWorkProgressReports(),
      api.getInvestigators(),
    ]);
    setReports(reportData);
    setInvestigators(investigatorData);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const hasStaff = positions.includes('tham_muu_tong_hop');
  const hasOperation = positions.includes('doi_nghiep_vu');

  const officerNames = useMemo(() => {
    const names = new Set<string>();
    investigators.forEach((item) => item.name && names.add(item.name));
    reports.forEach((report) => report.officerName && names.add(report.officerName));
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [investigators, reports]);

  const selectedOfficerReports = useMemo(() => {
    const name = textKey(officerName);
    if (!name) return [];
    return reports.filter((report) => textKey(report.officerName).includes(name));
  }, [officerName, reports]);

  const flatOfficerItems = useMemo(() => {
    return selectedOfficerReports.flatMap((report) =>
      report.items.map((item) => ({ report, item })),
    );
  }, [selectedOfficerReports]);

  const workTypes = useMemo(() => {
    const names = new Set<string>();
    OPERATION_SECTIONS.forEach((section) => section.items.forEach((item) => names.add(item)));
    reports.forEach((report) => report.items.forEach((item) => item.workContent && names.add(item.workContent)));
    return Array.from(names);
  }, [reports]);

  const statsRows = useMemo(() => {
    const map = new Map<string, {
      officerName: string;
      team: string;
      total: number;
      completed: number;
      counts: Record<string, number>;
    }>();

    reports.forEach((report) => {
      const key = `${report.officerName}__${report.team}`;
      const current = map.get(key) ?? {
        officerName: report.officerName,
        team: report.team,
        total: 0,
        completed: 0,
        counts: {},
      };

      report.items.forEach((item) => {
        current.total += 1;
        if (item.completed) current.completed += 1;
        current.counts[item.workContent] = (current.counts[item.workContent] ?? 0) + 1;
      });

      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total || a.officerName.localeCompare(b.officerName, 'vi'));
  }, [reports]);

  const togglePosition = (position: WorkPosition) => {
    setPositions((prev) =>
      prev.includes(position) ? prev.filter((item) => item !== position) : [...prev, position],
    );
    setActiveItem(null);
  };

  const selectItem = (item: WorkProgressItem) => {
    setActiveItem(item);
  };

  const updateActiveItem = (key: keyof WorkProgressItem, value: string | boolean) => {
    setActiveItem((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const submit = async () => {
    if (!activeItem) return;
    const savedPosition = itemPosition(activeItem);
    const payload: WorkProgressFormData = {
      officerName: officerName.trim(),
      team: team.trim(),
      positions: [savedPosition],
      items: [activeItem],
    };

    setSaving(true);
    try {
      await api.createWorkProgressReport(payload);
      setToast('Đã lưu đầu việc');
      setActiveItem(null);
      await fetchAll();
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const canSubmit = Boolean(
    officerName.trim() &&
    team.trim() &&
    activeItem?.workContent.trim() &&
    positions.includes(activeItem ? itemPosition(activeItem) : 'doi_nghiep_vu'),
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

      <div className="filter-bar" style={{ marginBottom: 14 }}>
        <button
          className={`btn-search-toggle ${activeTab === 'form' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('form')}
        >
          Nhập báo cáo
        </button>
        <button
          className={`btn-search-toggle ${activeTab === 'stats' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('stats')}
        >
          Thống kê
        </button>
      </div>

      {activeTab === 'form' ? (
        <>
          <div className="section-card glass-panel">
            <div className="form-row">
              <div className="form-group">
                <label>Họ tên</label>
                <input
                  className="form-control"
                  list="work-progress-officers"
                  value={officerName}
                  onChange={(event) => setOfficerName(event.target.value)}
                  placeholder="Chọn hoặc nhập tên cán bộ..."
                />
                <datalist id="work-progress-officers">
                  {officerNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
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
                <button className="btn-add" type="button" onClick={() => selectItem(newItem(STAFF_CATEGORY))}>
                  <Plus size={14} /> Thêm đầu việc
                </button>
              </div>
            </div>
          )}

          {hasOperation && (
            <div className="section-card glass-panel">
              <div className="section-header">
                <span className="section-title">Đội nghiệp vụ</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Chọn một đầu việc, nhập xong rồi lưu
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
                        onClick={() => selectItem(newItem(section.title, label))}
                      >
                        <Plus size={13} /> {label}
                      </button>
                    ))}
                    <button
                      className="btn-add"
                      type="button"
                      onClick={() => selectItem(newItem(section.title))}
                    >
                      <Plus size={13} /> Nội dung khác
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeItem && (
            <div className="section-card glass-panel">
              <div className="section-header">
                <span className="section-title">Đang nhập đầu việc</span>
                <span className="badge badge-current">{activeItem.category}</span>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nội dung công tác</label>
                  <input
                    className="form-control"
                    value={activeItem.workContent}
                    onChange={(e) => updateActiveItem('workContent', e.target.value)}
                    placeholder="Nhập nội dung công tác..."
                  />
                </div>
                <div className="form-group">
                  <label>Số hồ sơ</label>
                  <input className="form-control" value={activeItem.caseNumber} onChange={(e) => updateActiveItem('caseNumber', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Thời hạn</label>
                  <input className="form-control" type="date" value={activeItem.deadline} onChange={(e) => updateActiveItem('deadline', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Trích yếu cụ thể</label>
                  <input className="form-control" value={activeItem.summary} onChange={(e) => updateActiveItem('summary', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Tiến độ thực hiện</label>
                  <input className="form-control" value={activeItem.progress} onChange={(e) => updateActiveItem('progress', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Trạng thái</label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={activeItem.completed}
                      onChange={(e) => updateActiveItem('completed', e.target.checked)}
                    />
                    Đã hoàn thành
                  </label>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Khó khăn vướng mắc</label>
                  <input className="form-control" value={activeItem.difficulties} onChange={(e) => updateActiveItem('difficulties', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Đề xuất</label>
                  <input className="form-control" value={activeItem.proposal} onChange={(e) => updateActiveItem('proposal', e.target.value)} />
                </div>
              </div>
              <button className="btn-submit" type="button" disabled={!canSubmit || saving} onClick={submit}>
                <Save size={17} /> {saving ? 'Đang lưu...' : 'Lưu đầu việc'}
              </button>
            </div>
          )}

          {officerName.trim() && (
            <OfficerItemsPanel items={flatOfficerItems} officerName={officerName} />
          )}
        </>
      ) : (
        <StatisticsPanel rows={statsRows} workTypes={workTypes} reportCount={reports.length} />
      )}
    </div>
  );
}

function OfficerItemsPanel({
  items,
  officerName,
}: {
  items: Array<{ report: WorkProgressReport; item: WorkProgressItem }>;
  officerName: string;
}) {
  return (
    <div className="section-card glass-panel" style={{ marginTop: 18 }}>
      <div className="section-header">
        <span className="section-title">Đầu việc đã nhập của {officerName}</span>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{items.length} đầu việc</span>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">Chưa có đầu việc nào khớp tên đang nhập.</div>
      ) : (
        <div className="point-list">
          {items.map(({ report, item }) => (
            <div className="point-item" key={`${report.id}-${item.id}`}>
              <div className="point-item-header">
                <strong>{item.workContent}</strong>
                <div className="point-item-badges">
                  <span className="badge badge-current">{item.category}</span>
                  {item.completed && <span className="badge badge-ak">Đã hoàn thành</span>}
                </div>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.5 }}>
                {item.summary && <div>Trích yếu: {item.summary}</div>}
                {item.caseNumber && <div>Số hồ sơ: {item.caseNumber}</div>}
                {item.progress && <div>Tiến độ: {item.progress}</div>}
                {item.deadline && <div>Thời hạn: {formatDate(item.deadline)}</div>}
                {item.difficulties && <div>Khó khăn: {item.difficulties}</div>}
                {item.proposal && <div>Đề xuất: {item.proposal}</div>}
                <div className="point-time">Ngày nhập: {new Date(report.createdAt).toLocaleDateString('vi-VN')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatisticsPanel({
  rows,
  workTypes,
  reportCount,
}: {
  rows: Array<{
    officerName: string;
    team: string;
    total: number;
    completed: number;
    counts: Record<string, number>;
  }>;
  workTypes: string[];
  reportCount: number;
}) {
  return (
    <div className="section-card glass-panel">
      <div className="section-header">
        <span className="section-title">Thống kê đầu việc theo cán bộ</span>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{reportCount} báo cáo</span>
      </div>
      {rows.length === 0 ? (
        <div className="empty-state">Chưa có dữ liệu thống kê.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr>
                <th style={thStyle}>Cán bộ</th>
                <th style={thStyle}>Đội</th>
                <th style={thStyle}>Tổng đầu việc</th>
                <th style={thStyle}>Hoàn thành</th>
                {workTypes.map((type) => (
                  <th style={thStyle} key={type}>{type}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.officerName}-${row.team}`}>
                  <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 700 }}>{row.officerName}</td>
                  <td style={tdStyle}>{row.team}</td>
                  <td style={tdStyle}>{row.total}</td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#1c9b56', fontWeight: 700 }}>
                      <CheckCircle2 size={14} /> {row.completed}
                    </span>
                  </td>
                  {workTypes.map((type) => (
                    <td style={tdStyle} key={type}>{row.counts[type] || ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 8px',
  borderBottom: '1px solid var(--panel-border)',
  color: 'var(--text-secondary)',
  fontSize: '0.78rem',
  textAlign: 'center',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '9px 8px',
  borderBottom: '1px solid var(--panel-border)',
  color: 'var(--text-primary)',
  fontSize: '0.86rem',
  textAlign: 'center',
  whiteSpace: 'nowrap',
};
