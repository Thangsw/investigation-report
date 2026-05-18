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
const STAFF_STAT_TYPE = 'Tham mưu tổng hợp';
const STAFF_SECTION = {
  title: '1. CÔNG TÁC THAM MƯU',
  items: [
    'Quản lý, khai thác, sử dụng hệ thống Văn bản điều hành',
    'Tổng hợp, theo dõi, đánh giá tiến độ công tác thực hiện khắc phục hồ sơ tạm đình chỉ của đơn vị',
    'Rà soát, kiểm tra, phê duyệt văn bản tố tụng trên phần mềm ĐTHS',
    'Quản lý kho vũ khí, công cụ hỗ trợ, phương tiện của đơn vị',
    'Quản lý hồ sơ, con dấu, công tác văn thư',
    'Theo dõi tiến độ thực hiện báo cáo định kỳ, đột xuất công tác ĐTCB, NVCB trên phần mềm ĐTHS',
  ],
};
const PRIMARY_CASE_CATEGORIES = new Set([
  '2. CÔNG TÁC ĐIỀU TRA, THỤ LÝ ÁN',
  '3. NHIỆM VỤ CHUNG CỦA ĐƠN VỊ',
]);

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

type SavedWorkItem = { report: WorkProgressReport; item: WorkProgressItem };
type ActivePlacement = { sectionTitle: string; label: string; isCustom?: boolean };

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
  primaryCase: false,
  completed: false,
});

const textKey = (value: string) => value.trim().toLowerCase();

const itemPosition = (item: WorkProgressItem): WorkPosition =>
  item.category === STAFF_CATEGORY || item.category === STAFF_SECTION.title ? 'tham_muu_tong_hop' : 'doi_nghiep_vu';

const getDisplayText = (item: WorkProgressItem) =>
  item.summary || item.caseNumber || item.progress || '(chưa có trích yếu)';

const getPlacementForItem = (item: WorkProgressItem): ActivePlacement | null => {
  if (item.category === STAFF_CATEGORY || item.category === STAFF_SECTION.title) {
    const isKnownItem = STAFF_SECTION.items.includes(item.workContent);
    return {
      sectionTitle: STAFF_SECTION.title,
      label: isKnownItem ? item.workContent : 'Nội dung khác',
      isCustom: !isKnownItem,
    };
  }

  const section = OPERATION_SECTIONS.find((entry) => entry.title === item.category);
  if (!section) return null;
  const isKnownItem = section.items.includes(item.workContent);
  return {
    sectionTitle: section.title,
    label: isKnownItem ? item.workContent : 'Nội dung khác',
    isCustom: !isKnownItem,
  };
};

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
  const [activePlacement, setActivePlacement] = useState<ActivePlacement | null>(null);
  const [editingReport, setEditingReport] = useState<WorkProgressReport | null>(null);
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

  const previousTeamByOfficer = useMemo(() => {
    const map = new Map<string, string>();
    reports.forEach((report) => {
      const key = textKey(report.officerName);
      if (key && report.team && !map.has(key)) map.set(key, report.team);
    });
    return map;
  }, [reports]);

  useEffect(() => {
    const previousTeam = previousTeamByOfficer.get(textKey(officerName));
    if (previousTeam) {
      setTeam(previousTeam);
    }
  }, [officerName, previousTeamByOfficer]);

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
    names.add(STAFF_STAT_TYPE);
    OPERATION_SECTIONS.forEach((section) => section.items.forEach((item) => names.add(item)));
    reports.forEach((report) => report.items.forEach((item) => {
      const type = itemPosition(item) === 'tham_muu_tong_hop' ? STAFF_STAT_TYPE : item.workContent;
      if (type) names.add(type);
    }));
    return Array.from(names);
  }, [reports]);

  const statsRows = useMemo(() => {
    const map = new Map<string, {
      officerName: string;
      team: string;
      total: number;
      completed: number;
      primaryCase: number;
      counts: Record<string, number>;
    }>();

    reports.forEach((report) => {
      const key = `${report.officerName}__${report.team}`;
      const current = map.get(key) ?? {
        officerName: report.officerName,
        team: report.team,
        total: 0,
        completed: 0,
        primaryCase: 0,
        counts: {},
      };

      report.items.forEach((item) => {
        current.total += 1;
        if (item.completed) current.completed += 1;
        if (item.primaryCase) current.primaryCase += 1;
        const type = itemPosition(item) === 'tham_muu_tong_hop' ? STAFF_STAT_TYPE : item.workContent;
        current.counts[type] = (current.counts[type] ?? 0) + 1;
      });

      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total || a.officerName.localeCompare(b.officerName, 'vi'));
  }, [reports]);

  const togglePosition = (position: WorkPosition) => {
    setPositions((prev) =>
      prev.includes(position) ? prev.filter((item) => item !== position) : [...prev, position],
    );
    clearActiveItem();
  };

  const clearActiveItem = () => {
    setActiveItem(null);
    setActivePlacement(null);
    setEditingReport(null);
  };

  const startNewItem = (item: WorkProgressItem, placement?: ActivePlacement) => {
    setActiveItem(item);
    setActivePlacement(placement ?? getPlacementForItem(item));
    setEditingReport(null);
  };

  const startEditItem = (saved: SavedWorkItem) => {
    setOfficerName(saved.report.officerName);
    setTeam(saved.report.team);
    setPositions((prev) => {
      const next = new Set([...prev, ...saved.report.positions, itemPosition(saved.item)]);
      return Array.from(next);
    });
    setActiveItem({ ...saved.item });
    setActivePlacement(getPlacementForItem(saved.item));
    setEditingReport(saved.report);
    setActiveTab('form');
  };

  const updateActiveItem = (key: keyof WorkProgressItem, value: string | boolean) => {
    setActiveItem((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const submit = async () => {
    if (!activeItem) return;
    const savedPosition = itemPosition(activeItem);

    setSaving(true);
    try {
      if (editingReport) {
        const updatedItems = editingReport.items.map((item) =>
          item.id === activeItem.id ? activeItem : item,
        );
        const updatedPositions = Array.from(new Set([...editingReport.positions, savedPosition]));
        await api.updateWorkProgressReport(editingReport.id, {
          officerName: officerName.trim(),
          team: team.trim(),
          positions: updatedPositions,
          items: updatedItems,
        });
        setToast('Đã cập nhật đầu việc');
      } else {
        const payload: WorkProgressFormData = {
          officerName: officerName.trim(),
          team: team.trim(),
          positions: [savedPosition],
          items: [activeItem],
        };
        await api.createWorkProgressReport(payload);
        setToast('Đã lưu đầu việc');
      }

      clearActiveItem();
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
            {(!officerName.trim() || positions.length === 0) && (
              <div className="field-note" style={{ marginTop: 12, fontWeight: 700 }}>
                Nhập tên và chọn vị trí công tác để tiếp tục
              </div>
            )}
          </div>

          {hasStaff && (
            <div className="section-card glass-panel">
              <div className="section-header">
                <span className="section-title">Tham mưu tổng hợp</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Chọn một đầu việc, nhập xong rồi lưu
                </span>
              </div>

              <div className="work-section-list">
                <WorkSection
                  section={STAFF_SECTION}
                  savedItems={flatOfficerItems}
                  activeItem={activeItem}
                  activePlacement={activePlacement}
                  editing={Boolean(editingReport)}
                  saving={saving}
                  canSubmit={canSubmit}
                  onChange={updateActiveItem}
                  onSubmit={submit}
                  onCancel={clearActiveItem}
                  onNew={startNewItem}
                  onEdit={startEditItem}
                />
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

              <div className="work-section-list">
                {OPERATION_SECTIONS.map((section) => (
                  <WorkSection
                    key={section.title}
                    section={section}
                    savedItems={flatOfficerItems}
                    activeItem={activeItem}
                    activePlacement={activePlacement}
                    editing={Boolean(editingReport)}
                    saving={saving}
                    canSubmit={canSubmit}
                    onChange={updateActiveItem}
                    onSubmit={submit}
                    onCancel={clearActiveItem}
                    onNew={startNewItem}
                    onEdit={startEditItem}
                  />
                ))}
              </div>
            </div>
          )}

          {officerName.trim() && (
            <OfficerItemsPanel items={flatOfficerItems} officerName={officerName} onEdit={startEditItem} />
          )}
        </>
      ) : (
        <StatisticsPanel rows={statsRows} workTypes={workTypes} reportCount={reports.length} />
      )}
    </div>
  );
}

function WorkSection({
  section,
  savedItems,
  activeItem,
  activePlacement,
  editing,
  saving,
  canSubmit,
  onChange,
  onSubmit,
  onCancel,
  onNew,
  onEdit,
}: {
  section: { title: string; items: string[] };
  savedItems: SavedWorkItem[];
  activeItem: WorkProgressItem | null;
  activePlacement: ActivePlacement | null;
  editing: boolean;
  saving: boolean;
  canSubmit: boolean;
  onChange: (key: keyof WorkProgressItem, value: string | boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onNew: (item: WorkProgressItem, placement?: ActivePlacement) => void;
  onEdit: (saved: SavedWorkItem) => void;
}) {
  const isStaffSection = section.title === STAFF_SECTION.title;
  const sectionItems = savedItems.filter(({ item }) =>
    isStaffSection
      ? item.category === section.title || item.category === STAFF_CATEGORY
      : item.category === section.title,
  );
  const customItems = sectionItems.filter(({ item }) => !section.items.includes(item.workContent));

  return (
    <div className="work-section">
      <div className="work-section-title">{section.title}</div>
      <div className="work-option-list">
        {section.items.map((label) => (
          <WorkOption
            key={label}
            label={label}
            sectionTitle={section.title}
            savedItems={sectionItems.filter(({ item }) => item.workContent === label)}
            activeItem={activeItem}
            activePlacement={activePlacement}
            editing={editing}
            saving={saving}
            canSubmit={canSubmit}
            onChange={onChange}
            onSubmit={onSubmit}
            onCancel={onCancel}
            onNew={onNew}
            onEdit={onEdit}
          />
        ))}
        <WorkOption
          label="Nội dung khác"
          sectionTitle={section.title}
          savedItems={customItems}
          activeItem={activeItem}
          activePlacement={activePlacement}
          editing={editing}
          saving={saving}
          canSubmit={canSubmit}
          onChange={onChange}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onNew={onNew}
          onEdit={onEdit}
          isCustom
        />
      </div>
    </div>
  );
}

function WorkOption({
  label,
  sectionTitle,
  savedItems,
  activeItem,
  activePlacement,
  editing,
  saving,
  canSubmit,
  onChange,
  onSubmit,
  onCancel,
  onNew,
  onEdit,
  isCustom = false,
}: {
  label: string;
  sectionTitle: string;
  savedItems: SavedWorkItem[];
  activeItem: WorkProgressItem | null;
  activePlacement: ActivePlacement | null;
  editing: boolean;
  saving: boolean;
  canSubmit: boolean;
  onChange: (key: keyof WorkProgressItem, value: string | boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onNew: (item: WorkProgressItem, placement?: ActivePlacement) => void;
  onEdit: (saved: SavedWorkItem) => void;
  isCustom?: boolean;
}) {
  const placement = { sectionTitle, label, isCustom };
  const isActive =
    Boolean(activeItem) &&
    activePlacement?.sectionTitle === sectionTitle &&
    activePlacement.label === label &&
    Boolean(activePlacement.isCustom) === isCustom;

  return (
    <div className="work-option">
      <div className="work-option-head">
        <div className="work-option-label">{label}</div>
        <button
          className={isCustom ? 'btn-add' : 'btn-small'}
          type="button"
          onClick={() => onNew(newItem(sectionTitle, isCustom ? '' : label), placement)}
        >
          <Plus size={13} /> Thêm mới
        </button>
      </div>
      {isActive && activeItem && (
        <InlineWorkForm
          item={activeItem}
          editing={editing}
          saving={saving}
          canSubmit={canSubmit}
          compactWorkContent={!isCustom}
          onChange={onChange}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )}
      {savedItems.length > 0 && (
        <div className="work-summary-list">
          {savedItems.map((saved, index) => (
            <button
              key={`${saved.report.id}-${saved.item.id}`}
              type="button"
              className="work-summary-row"
              onClick={() => onEdit(saved)}
              title="Bấm để sửa đầu việc này"
            >
              <span>{index + 1}.</span>
              <span>{getDisplayText(saved.item)}</span>
              {saved.item.primaryCase && <span className="badge badge-ad">Thụ lý chính</span>}
              {saved.item.completed && <span className="badge badge-ak">Đã hoàn thành</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InlineWorkForm({
  item,
  editing,
  saving,
  canSubmit,
  compactWorkContent = false,
  onChange,
  onSubmit,
  onCancel,
}: {
  item: WorkProgressItem;
  editing: boolean;
  saving: boolean;
  canSubmit: boolean;
  compactWorkContent?: boolean;
  onChange: (key: keyof WorkProgressItem, value: string | boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="inline-work-form">
      <div className="section-header" style={{ marginBottom: 10 }}>
        <span className="section-title">{editing ? 'Sửa đầu việc' : 'Nhập đầu việc'}</span>
        <span className="badge badge-current">{item.category}</span>
      </div>
      <div className="form-row">
        {!compactWorkContent && (
          <div className="form-group">
            <label>Nội dung công tác</label>
            <input
              className="form-control"
              value={item.workContent}
              onChange={(e) => onChange('workContent', e.target.value)}
              placeholder="Nhập nội dung công tác..."
            />
          </div>
        )}
        <div className="form-group">
          <label>Trích yếu cụ thể</label>
          <input
            className="form-control"
            value={item.summary}
            onChange={(e) => onChange('summary', e.target.value)}
            placeholder="Nhập trích yếu..."
          />
        </div>
        <div className="form-group">
          <label>Số hồ sơ</label>
          <input className="form-control" value={item.caseNumber} onChange={(e) => onChange('caseNumber', e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Tiến độ thực hiện</label>
          <input className="form-control" value={item.progress} onChange={(e) => onChange('progress', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Thời hạn</label>
          <input className="form-control" type="date" value={item.deadline} onChange={(e) => onChange('deadline', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Trạng thái</label>
          {PRIMARY_CASE_CATEGORIES.has(item.category) && (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={item.primaryCase}
                onChange={(e) => onChange('primaryCase', e.target.checked)}
              />
              Thụ lý chính
            </label>
          )}
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={(e) => onChange('completed', e.target.checked)}
            />
            Đã hoàn thành
          </label>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Khó khăn vướng mắc</label>
          <input className="form-control" value={item.difficulties} onChange={(e) => onChange('difficulties', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Đề xuất</label>
          <input className="form-control" value={item.proposal} onChange={(e) => onChange('proposal', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn-submit" type="button" disabled={!canSubmit || saving} onClick={onSubmit} style={{ flex: '1 1 220px' }}>
          <Save size={17} /> {saving ? 'Đang lưu...' : editing ? 'Lưu chỉnh sửa' : 'Lưu đầu việc'}
        </button>
        <button className="btn-small" type="button" onClick={onCancel} style={{ minHeight: 46 }}>
          Huỷ
        </button>
      </div>
    </div>
  );
}

function OfficerItemsPanel({
  items,
  officerName,
  onEdit,
}: {
  items: SavedWorkItem[];
  officerName: string;
  onEdit: (saved: SavedWorkItem) => void;
}) {
  const exactReport = items.find(({ report }) => textKey(report.officerName) === textKey(officerName))?.report;
  const exportName = exactReport?.officerName || items[0]?.report.officerName || officerName;
  const exportTeam = exactReport?.team || items[0]?.report.team;

  return (
    <div className="section-card glass-panel" style={{ marginTop: 18 }}>
      <div className="section-header">
        <span className="section-title">Đầu việc đã nhập của {officerName}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{items.length} đầu việc</span>
          {items.length > 0 && (
            <button
              className="btn-small"
              type="button"
              onClick={() => api.exportWorkProgressForOfficer(exportName, exportTeam)}
            >
              <Download size={14} /> Xuất riêng
            </button>
          )}
        </div>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">Chưa có đầu việc nào khớp tên đang nhập.</div>
      ) : (
        <div className="point-list">
          {items.map(({ report, item }) => (
            <button
              type="button"
              className="point-item"
              key={`${report.id}-${item.id}`}
              onClick={() => onEdit({ report, item })}
              style={{ textAlign: 'left', cursor: 'pointer' }}
            >
              <div className="point-item-header">
                <strong>{item.workContent}</strong>
                <div className="point-item-badges">
                  <span className="badge badge-current">{item.category}</span>
                  {item.primaryCase && <span className="badge badge-ad">Thụ lý chính</span>}
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
            </button>
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
    primaryCase: number;
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
                <th style={thStyle}>Thụ lý chính</th>
                <th style={thStyle}>Hoàn thành</th>
                <th style={thStyle}>Xuất</th>
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
                  <td style={tdStyle}>{row.primaryCase || ''}</td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#1c9b56', fontWeight: 700 }}>
                      <CheckCircle2 size={14} /> {row.completed}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button
                      className="btn-small"
                      type="button"
                      onClick={() => api.exportWorkProgressForOfficer(row.officerName, row.team)}
                    >
                      <Download size={14} /> Excel
                    </button>
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
