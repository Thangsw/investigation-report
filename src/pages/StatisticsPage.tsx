import { useState, useEffect, useMemo } from 'react';
import { X, Clock, AlertTriangle, BarChart2 } from 'lucide-react';
import { api } from '../api';
import type { Report, Investigator } from '../types';
import { getDeadlineStatus, getDaysUntilDeadline, hasDifficulty, isReassignedReport } from '../reportMetrics';

// ── ĐTV → Nhóm chuyên môn (từ Google Sheets) ─────────────────────────────────

export type NhomKey = 'TMTH' | 'Nhân thân' | 'Sở hữu' | 'Tệ nạn' | 'Khác';

const NHOM_COLORS: Record<NhomKey, string> = {
  'TMTH':      '#a29bfe',
  'Nhân thân': '#74b9ff',
  'Sở hữu':   '#55efc4',
  'Tệ nạn':   '#fd79a8',
  'Khác':      '#636e72',
};

const DTV_NHOM: Record<string, NhomKey> = {
  // TMTH
  'Bùi Thị Thanh Hà':  'TMTH',
  'Bùi Thế Việt':      'TMTH',
  'Bùi Thị Thu Thuỷ':  'TMTH',
  'Nguyễn Phương Thảo':'TMTH',
  'Đỗ Đức Thắng':      'TMTH',
  // Nhân thân
  'Nguyễn Hà Giang':   'Nhân thân',
  'Bùi Hữu Đức':       'Nhân thân',
  'Đặng Thị Vân Anh':  'Nhân thân',
  'Đặng Việt Hùng':    'Nhân thân',
  'Lương Tiến Hưng':   'Nhân thân',
  'Mạc Trung Kiên':    'Nhân thân',
  'Nguyễn Hiếu Thảo':  'Nhân thân',
  'Nguyễn Quang Ninh': 'Nhân thân',
  'Nguyễn Quốc Thắng': 'Nhân thân',
  'Nông Việt Hùng':    'Nhân thân',
  'Quách Văn Thành':   'Nhân thân',
  'Vũ Thanh Hải':      'Nhân thân',
  'Trần Đức Dũng':     'Nhân thân',
  'Bùi Mạnh Dũng':     'Nhân thân',
  'Bàn Văn Chiến':     'Nhân thân',
  'Nguyễn Tiến Đông':  'Nhân thân',
  'Nguyễn Trọng Hậu':  'Nhân thân',
  'Nguyễn Xuân Úy':    'Nhân thân',
  // Sở hữu
  'Lê Văn Thắng':      'Sở hữu',
  'Bùi Mạnh Linh':     'Sở hữu',
  'Bùi Mạnh Cường':    'Sở hữu',
  'Đinh Thanh Hoà':    'Sở hữu',
  'Dương Công Thành':  'Sở hữu',
  'Mai Tùng Dương':    'Sở hữu',
  'Nguyễn Đắc Duy':    'Sở hữu',
  'Nguyễn Đức Cao':    'Sở hữu',
  'Nguyễn Khắc Hoà':   'Sở hữu',
  'Nguyễn Thanh Tùng': 'Sở hữu',
  'Nguyễn Trung Hiếu': 'Sở hữu',
  'Nguyễn Văn Hùng':   'Sở hữu',
  'Trần Đình Đức':     'Sở hữu',
  'Vũ Đức Lộc':        'Sở hữu',
  'Nguyễn Mạnh Cường': 'Sở hữu',
  'Dư Công Thanh':     'Sở hữu',
  'Nguyễn Mạnh Hiển':  'Sở hữu',
  'Nguyễn Văn Phước':  'Sở hữu',
  // Tệ nạn
  'Nguyễn Trọng Đức':  'Tệ nạn',
  'Bùi Thanh Tuấn':    'Tệ nạn',
  'Bùi Thị Quế':       'Tệ nạn',
  'Bùi Văn Phong':     'Tệ nạn',
  'Chu Văn Phương':    'Tệ nạn',
  'Đặng Tiến Mạnh':    'Tệ nạn',
  'Hoàng Đức Tho':     'Tệ nạn',
  'Hoàng Hải Huy':     'Tệ nạn',
  'Nguyễn Duy Cảnh':   'Tệ nạn',
  'Nguyễn Thanh Hằng': 'Tệ nạn',
  'Nguyễn Tiến Hải':   'Tệ nạn',
  'Nguyễn Tiến Mạnh':  'Tệ nạn',
  'Phương Huy Hoàng':  'Tệ nạn',
  'Vũ Văn Tuấn':       'Tệ nạn',
};

function getNhom(name: string): NhomKey {
  return DTV_NHOM[name] ?? 'Khác';
}

// ── Column definitions ────────────────────────────────────────────────────────

type ColKey =
  | 'total' | 'ak' | 'ad'
  | 'doi2' | 'doi3' | 'doi4'
  | 'hoaBinh' | 'lacThuy'
  | 'upcoming' | 'overdue'
  | 'daThucHien' | 'chuaThucHien'
  | 'khoKhan' | 'hienHanh' | 'phanCongLai';

interface ColDef {
  key: ColKey;
  label: string;
  defaultOn: boolean;
  color?: string;
}

const COL_DEFS: ColDef[] = [
  { key: 'total',        label: 'Tổng',        defaultOn: true  },
  { key: 'ak',           label: 'AK',          defaultOn: true,  color: '#ff6b81' },
  { key: 'ad',           label: 'AD',          defaultOn: true,  color: '#ff9f43' },
  { key: 'doi2',         label: 'Đội 2',       defaultOn: true,  color: '#74b9ff' },
  { key: 'doi3',         label: 'Đội 3',       defaultOn: true,  color: '#74b9ff' },
  { key: 'doi4',         label: 'Đội 4',       defaultOn: true,  color: '#74b9ff' },
  { key: 'hoaBinh',      label: 'Hoà Bình',    defaultOn: false },
  { key: 'lacThuy',      label: 'Lạc Thuỷ',    defaultOn: false },
  { key: 'upcoming',     label: 'Sắp hết TH',  defaultOn: true,  color: '#ff9f43' },
  { key: 'overdue',      label: 'Quá TH',      defaultOn: true,  color: '#ff4757' },
  { key: 'daThucHien',   label: 'Đã TH',       defaultOn: false, color: '#2ed573' },
  { key: 'chuaThucHien', label: 'Chưa TH',     defaultOn: false },
  { key: 'khoKhan',      label: 'Khó khăn',    defaultOn: true,  color: '#ff9f43' },
  { key: 'hienHanh',     label: 'Hiện hành',   defaultOn: false },
  { key: 'phanCongLai',  label: 'P/C lại',     defaultOn: false },
];

// ── Data model ────────────────────────────────────────────────────────────────

interface DTVStats {
  name: string;
  nhom: NhomKey;
  total: number;
  ak: number; ad: number;
  doi2: number; doi3: number; doi4: number;
  hoaBinh: number; lacThuy: number;
  upcoming: number; overdue: number;
  daThucHien: number; chuaThucHien: number;
  khoKhan: number; hienHanh: number; phanCongLai: number;
  reports: Report[];
}

function buildStats(reports: Report[], name: string): DTVStats {
  const r = reports.filter(x => x.dtvName === name);
  return {
    name,
    nhom: getNhom(name),
    total: r.length,
    ak: r.filter(x => x.loaiHoSo === 'AK').length,
    ad: r.filter(x => x.loaiHoSo === 'AD').length,
    doi2: r.filter(x => x.doi === 'Đội 2').length,
    doi3: r.filter(x => x.doi === 'Đội 3').length,
    doi4: r.filter(x => x.doi === 'Đội 4').length,
    hoaBinh: r.filter(x => (x.toBanDia ?? 'Hoà Bình') === 'Hoà Bình').length,
    lacThuy: r.filter(x => x.toBanDia === 'Lạc Thuỷ').length,
    upcoming: r.filter(x => !x.daThucHien && getDeadlineStatus(x.ngayHetThoiHieuTruyCuuTNHS) === 'upcoming').length,
    overdue:  r.filter(x => !x.daThucHien && getDeadlineStatus(x.ngayHetThoiHieuTruyCuuTNHS) === 'overdue').length,
    daThucHien:   r.filter(x => x.daThucHien).length,
    chuaThucHien: r.filter(x => !x.daThucHien).length,
    khoKhan:      r.filter(hasDifficulty).length,
    hienHanh:     r.filter(x => x.hoSoHienHanh).length,
    phanCongLai:  r.filter(isReassignedReport).length,
    reports: r,
  };
}

function buildTotalRow(reports: Report[]): Omit<DTVStats, 'name' | 'nhom' | 'reports'> {
  return {
    total: reports.length,
    ak: reports.filter(r => r.loaiHoSo === 'AK').length,
    ad: reports.filter(r => r.loaiHoSo === 'AD').length,
    doi2: reports.filter(r => r.doi === 'Đội 2').length,
    doi3: reports.filter(r => r.doi === 'Đội 3').length,
    doi4: reports.filter(r => r.doi === 'Đội 4').length,
    hoaBinh: reports.filter(r => (r.toBanDia ?? 'Hoà Bình') === 'Hoà Bình').length,
    lacThuy: reports.filter(r => r.toBanDia === 'Lạc Thuỷ').length,
    upcoming: reports.filter(r => !r.daThucHien && getDeadlineStatus(r.ngayHetThoiHieuTruyCuuTNHS) === 'upcoming').length,
    overdue:  reports.filter(r => !r.daThucHien && getDeadlineStatus(r.ngayHetThoiHieuTruyCuuTNHS) === 'overdue').length,
    daThucHien:   reports.filter(r => r.daThucHien).length,
    chuaThucHien: reports.filter(r => !r.daThucHien).length,
    khoKhan:      reports.filter(hasDifficulty).length,
    hienHanh:     reports.filter(r => r.hoSoHienHanh).length,
    phanCongLai:  reports.filter(isReassignedReport).length,
  };
}

function formatDate(s: string) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${parseInt(d)}/${m}/${y}`;
}

// ── Main page ─────────────────────────────────────────────────────────────────

type NhomFilter = '' | NhomKey;
type SortKey = 'name' | 'nhom' | ColKey;

const NHOM_OPTIONS: NhomKey[] = ['TMTH', 'Nhân thân', 'Sở hữu', 'Tệ nạn', 'Khác'];

export default function StatisticsPage() {
  const [reports, setReports]               = useState<Report[]>([]);
  const [investigators, setInvestigators]   = useState<Investigator[]>([]);
  const [nhomFilter, setNhomFilter]         = useState<NhomFilter>('');
  const [showZero, setShowZero]             = useState(false);
  const [visibleCols, setVisibleCols]       = useState<Set<ColKey>>(
    () => new Set(COL_DEFS.filter(c => c.defaultOn).map(c => c.key)),
  );
  const [sortKey, setSortKey]   = useState<SortKey>('nhom');
  const [sortAsc, setSortAsc]   = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getReports(), api.getInvestigators()]).then(([r, i]) => {
      setReports(r);
      setInvestigators(i);
    });
  }, []);

  // All ĐTV names
  const allNames = useMemo(() => {
    const s = new Set([
      ...investigators.map(i => i.name),
      ...reports.map(r => r.dtvName).filter(Boolean),
    ]);
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [investigators, reports]);

  // Build stats (always on ALL reports — nhom filter affects displayed rows)
  const table = useMemo(
    () => allNames.map(name => buildStats(reports, name)),
    [allNames, reports],
  );

  // Filter rows by nhom and optionally by zero total
  const visibleRows = useMemo(() => {
    let rows = table;
    if (nhomFilter) rows = rows.filter(r => r.nhom === nhomFilter);
    if (!showZero)  rows = rows.filter(r => r.total > 0);
    return rows;
  }, [table, nhomFilter, showZero]);

  // Sort
  const sortedRows = useMemo(() => {
    return [...visibleRows].sort((a, b) => {
      let c = 0;
      if (sortKey === 'name') {
        c = a.name.localeCompare(b.name, 'vi');
      } else if (sortKey === 'nhom') {
        c = NHOM_OPTIONS.indexOf(a.nhom) - NHOM_OPTIONS.indexOf(b.nhom);
        if (c === 0) c = a.name.localeCompare(b.name, 'vi');
      } else {
        const va = a[sortKey as ColKey] as number;
        const vb = b[sortKey as ColKey] as number;
        c = va - vb;
      }
      return sortAsc ? c : -c;
    });
  }, [visibleRows, sortKey, sortAsc]);

  // Totals for currently visible rows' reports
  const visibleReports = useMemo(() => {
    const names = new Set(visibleRows.map(r => r.name));
    return reports.filter(r => names.has(r.dtvName));
  }, [visibleRows, reports]);

  const totals = buildTotalRow(visibleReports);

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(key === 'name' || key === 'nhom'); }
  };

  const activeCols = COL_DEFS.filter(c => visibleCols.has(c.key));
  const selectedStats = selected ? buildStats(reports, selected) : null;

  const thS: React.CSSProperties = {
    padding: '10px 10px', textAlign: 'center', cursor: 'pointer',
    whiteSpace: 'nowrap', fontSize: '0.78rem', fontWeight: 600,
    letterSpacing: '0.02em', userSelect: 'none',
    borderBottom: '2px solid rgba(255,255,255,0.08)',
  };
  const tdS: React.CSSProperties = {
    padding: '8px 10px', textAlign: 'center', fontSize: '0.85rem',
  };
  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : <span style={{ opacity: 0.25 }}> ↕</span>;

  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
      <div className="dashboard-toolbar glass-panel" style={{ marginBottom: 14 }}>
        <div className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart2 size={18} />
          THỐNG KÊ CHI TIẾT THEO ĐTV
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {visibleRows.length} ĐTV · {visibleReports.length} hồ sơ
          {nhomFilter && ` · ${nhomFilter}`}
        </div>
      </div>

      {/* Controls */}
      <div className="glass-panel" style={{ padding: '12px 16px', marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        {/* Nhóm filter */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>NHÓM:</span>
          <button
            onClick={() => setNhomFilter('')}
            style={{
              padding: '4px 13px', borderRadius: 20,
              border: `1.5px solid ${nhomFilter === '' ? '#ff4757' : 'rgba(255,255,255,0.15)'}`,
              background: nhomFilter === '' ? 'rgba(255,71,87,0.18)' : 'transparent',
              color: nhomFilter === '' ? '#ff4757' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: nhomFilter === '' ? 700 : 400,
              transition: 'all 0.12s',
            }}
          >
            Tất cả
          </button>
          {NHOM_OPTIONS.map(n => {
            const c = NHOM_COLORS[n];
            const active = nhomFilter === n;
            return (
              <button
                key={n}
                onClick={() => setNhomFilter(n)}
                style={{
                  padding: '4px 13px', borderRadius: 20,
                  border: `1.5px solid ${active ? c : 'rgba(255,255,255,0.15)'}`,
                  background: active ? `${c}28` : 'transparent',
                  color: active ? c : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '0.82rem', fontWeight: active ? 700 : 400,
                  transition: 'all 0.12s',
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={showZero}
            onChange={e => setShowZero(e.target.checked)}
            style={{ accentColor: '#ff4757', cursor: 'pointer' }}
          />
          Hiện ĐTV chưa có hồ sơ
        </label>
      </div>

      {/* Column toggles */}
      <div className="glass-panel" style={{ padding: '10px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 7, fontWeight: 700, letterSpacing: '0.06em' }}>
          HIỂN THỊ / ẨN CỘT
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {COL_DEFS.map(col => {
            const on = visibleCols.has(col.key);
            const c  = col.color || '#54a0ff';
            return (
              <button
                key={col.key}
                onClick={() => toggleCol(col.key)}
                style={{
                  padding: '3px 11px', borderRadius: 14,
                  border: `1.5px solid ${on ? c : 'rgba(255,255,255,0.12)'}`,
                  background: on ? `${c}22` : 'transparent',
                  color: on ? c : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '0.77rem',
                  fontWeight: on ? 700 : 400, lineHeight: '1.7',
                  transition: 'all 0.12s',
                }}
              >
                {col.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                <th style={{ ...thS, textAlign: 'left', padding: '10px 14px', position: 'sticky', left: 0, background: 'rgba(20,20,32,0.98)', zIndex: 3, minWidth: 150 }}
                    onClick={() => handleSort('name')}>
                  Tên ĐTV{sortIcon('name')}
                </th>
                <th style={{ ...thS, minWidth: 90, cursor: 'pointer' }}
                    onClick={() => handleSort('nhom')}>
                  Nhóm{sortIcon('nhom')}
                </th>
                {activeCols.map(col => (
                  <th key={col.key} style={{ ...thS, color: col.color || 'var(--text-secondary)' }}
                      onClick={() => handleSort(col.key)}>
                    {col.label}{sortIcon(col.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Totals */}
              <tr style={{ background: 'rgba(255,71,87,0.05)', borderBottom: '2px solid rgba(255,71,87,0.18)' }}>
                <td style={{ ...tdS, textAlign: 'left', padding: '9px 14px', fontWeight: 800, color: '#ff4757', fontSize: '0.8rem', position: 'sticky', left: 0, background: 'rgba(20,20,32,0.98)', zIndex: 2 }}>
                  TỔNG CỘNG
                </td>
                <td style={{ ...tdS, color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</td>
                {activeCols.map(col => {
                  const val = totals[col.key] as number;
                  return (
                    <td key={col.key} style={{ ...tdS, fontWeight: 800, color: val > 0 ? (col.color || 'var(--text-primary)') : 'var(--text-muted)' }}>
                      {val > 0 ? val : '—'}
                    </td>
                  );
                })}
              </tr>

              {/* ĐTV rows */}
              {sortedRows.map((row, idx) => {
                const nhomColor = NHOM_COLORS[row.nhom];
                const isSel = selected === row.name;
                const evenBg = 'rgba(20,20,32,0.98)';
                const oddBg  = 'rgba(24,24,36,0.98)';
                const selBg  = 'rgba(255,71,87,0.1)';
                return (
                  <tr key={row.name} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: isSel ? 'rgba(255,71,87,0.06)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}>
                    <td
                      style={{ ...tdS, textAlign: 'left', padding: '8px 14px', cursor: 'pointer', color: '#54a0ff', fontWeight: 600, whiteSpace: 'nowrap', position: 'sticky', left: 0, zIndex: 1, textDecoration: 'underline', textUnderlineOffset: 3, background: isSel ? selBg : idx % 2 === 0 ? evenBg : oddBg }}
                      onClick={() => setSelected(prev => prev === row.name ? null : row.name)}
                    >
                      {row.name}
                    </td>
                    <td style={{ ...tdS }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                        background: `${nhomColor}22`, color: nhomColor, whiteSpace: 'nowrap',
                        border: `1px solid ${nhomColor}44`,
                      }}>
                        {row.nhom}
                      </span>
                    </td>
                    {activeCols.map(col => {
                      const val = row[col.key] as number;
                      return (
                        <td key={col.key} style={{
                          ...tdS,
                          color: val === 0 ? 'rgba(255,255,255,0.14)' : (col.color || 'var(--text-primary)'),
                          fontWeight: val > 0 && col.color ? 700 : val > 0 ? 500 : 400,
                        }}>
                          {val > 0 ? val : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={activeCols.length + 3} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {selectedStats && (
        <DTVDetailPanel stats={selectedStats} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// ── ĐTV Detail Side Panel ─────────────────────────────────────────────────────

function DTVDetailPanel({ stats, onClose }: { stats: DTVStats; onClose: () => void }) {
  const nhomColor = NHOM_COLORS[stats.nhom];

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999 }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(500px, 100vw)',
        background: 'rgba(16,16,26,0.97)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(255,255,255,0.1)',
        zIndex: 1000, overflowY: 'auto', padding: 22,
        boxShadow: '-12px 0 40px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 10px', borderRadius: 10, background: `${nhomColor}22`, color: nhomColor, border: `1px solid ${nhomColor}44`, marginBottom: 8, display: 'inline-block' }}>
              {stats.nhom}
            </span>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '6px 0 0', color: 'var(--text-primary)' }}>
              {stats.name}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, marginTop: -2 }}>
            <X size={20} />
          </button>
        </div>

        {/* Top summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Tổng hồ sơ', value: stats.total, color: '#54a0ff' },
            { label: 'AK', value: stats.ak, color: '#ff6b81' },
            { label: 'AD', value: stats.ad, color: '#ff9f43' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        <Section title="LĨNH VỰC ĐỘI (theo hồ sơ)">
          <div style={{ display: 'flex', gap: 8 }}>
            <MiniCard label="Đội 2" value={stats.doi2} activeColor="#74b9ff" />
            <MiniCard label="Đội 3" value={stats.doi3} activeColor="#74b9ff" />
            <MiniCard label="Đội 4" value={stats.doi4} activeColor="#74b9ff" />
          </div>
        </Section>

        <Section title="ĐỊA BÀN">
          <div style={{ display: 'flex', gap: 8 }}>
            <MiniCard label="Hoà Bình" value={stats.hoaBinh} activeColor="#54a0ff" />
            <MiniCard label="Lạc Thuỷ" value={stats.lacThuy} activeColor="#54a0ff" />
          </div>
        </Section>

        <Section title="THỜI HIỆU TNHS">
          <div style={{ display: 'flex', gap: 8 }}>
            <MiniCard label="Sắp hết TH"  value={stats.upcoming}   activeColor="#ff9f43" />
            <MiniCard label="Quá TH"       value={stats.overdue}    activeColor="#ff4757" />
            <MiniCard label="Đã thực hiện" value={stats.daThucHien} activeColor="#2ed573" />
            <MiniCard label="Chưa TH"      value={stats.chuaThucHien} activeColor="#54a0ff" />
          </div>
        </Section>

        {(stats.khoKhan > 0 || stats.phanCongLai > 0 || stats.hienHanh > 0) && (
          <Section title="KHÁC">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {stats.khoKhan    > 0 && <MiniCard label="Khó khăn"  value={stats.khoKhan}     activeColor="#ff9f43" />}
              {stats.phanCongLai > 0 && <MiniCard label="P/C lại"   value={stats.phanCongLai}  activeColor="#a29bfe" />}
              {stats.hienHanh   > 0 && <MiniCard label="Hiện hành" value={stats.hienHanh}    activeColor="#54a0ff" />}
            </div>
          </Section>
        )}

        {/* Case list */}
        {stats.reports.length > 0 ? (
          <Section title={`DANH SÁCH HỒ SƠ (${stats.reports.length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.reports
                .slice()
                .sort((a, b) => {
                  const sa = a.daThucHien ? 'none' : getDeadlineStatus(a.ngayHetThoiHieuTruyCuuTNHS);
                  const sb = b.daThucHien ? 'none' : getDeadlineStatus(b.ngayHetThoiHieuTruyCuuTNHS);
                  const rank = (s: string) => s === 'overdue' ? 0 : s === 'upcoming' ? 1 : 2;
                  return rank(sa) - rank(sb);
                })
                .map(r => {
                  const ds = r.daThucHien ? 'none' : getDeadlineStatus(r.ngayHetThoiHieuTruyCuuTNHS);
                  const days = getDaysUntilDeadline(r.ngayHetThoiHieuTruyCuuTNHS);
                  const isUp  = ds === 'upcoming';
                  const isOv  = ds === 'overdue';
                  return (
                    <div key={r.id} style={{
                      background: 'rgba(255,255,255,0.025)',
                      border: `1px solid ${isOv ? 'rgba(255,71,87,0.3)' : isUp ? 'rgba(255,159,67,0.3)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: 8, padding: '10px 12px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          <span className={`badge badge-${r.loaiHoSo.toLowerCase()}`}>{r.loaiHoSo}</span>
                          <span style={{ fontSize: '0.7rem', background: 'rgba(116,185,255,0.15)', color: '#74b9ff', borderRadius: 4, padding: '2px 6px' }}>{r.doi}</span>
                          <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.07)', color: 'var(--text-muted)', borderRadius: 4, padding: '2px 6px' }}>{r.toBanDia}</span>
                          {isOv && !r.daThucHien && <span style={{ fontSize: '0.7rem', background: 'rgba(255,71,87,0.15)', color: '#ff4757', borderRadius: 4, padding: '2px 6px', display:'inline-flex', alignItems:'center', gap:2 }}><AlertTriangle size={9}/>Quá TH</span>}
                          {isUp && !r.daThucHien && <span style={{ fontSize: '0.7rem', background: 'rgba(255,159,67,0.15)', color: '#ff9f43', borderRadius: 4, padding: '2px 6px', display:'inline-flex', alignItems:'center', gap:2 }}><Clock size={9}/>Sắp hết TH</span>}
                          {r.daThucHien && <span style={{ fontSize: '0.7rem', background: 'rgba(46,213,115,0.15)', color: '#2ed573', borderRadius: 4, padding: '2px 6px' }}>✓ Đã TH</span>}
                        </div>
                        {r.soHoSo && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>{r.soHoSo}</span>}
                      </div>
                      {r.trichYeu && (
                        <p style={{ fontSize: '0.79rem', color: 'var(--text-secondary)', margin: '0 0 3px', fontStyle: 'italic', lineHeight: 1.4 }}>
                          {r.trichYeu.length > 110 ? r.trichYeu.slice(0, 110) + '…' : r.trichYeu}
                        </p>
                      )}
                      {r.tinhChatMucDoNghiemTrong && (
                        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0 0 3px' }}>{r.tinhChatMucDoNghiemTrong}</p>
                      )}
                      {r.ngayHetThoiHieuTruyCuuTNHS && (
                        <p style={{ fontSize: '0.74rem', margin: '0 0 2px', color: isOv ? '#ff4757' : isUp ? '#ff9f43' : 'var(--text-muted)' }}>
                          Thời hiệu: {formatDate(r.ngayHetThoiHieuTruyCuuTNHS)}
                          {isUp && days !== null && ` (còn ${days} ngày)`}
                          {isOv  && days !== null && ` (quá ${Math.abs(days)} ngày)`}
                        </p>
                      )}
                      {r.khoKhan && (
                        <p style={{ fontSize: '0.74rem', color: '#ff9f43', margin: '3px 0 0', lineHeight: 1.4 }}>
                          ⚠ {r.khoKhan.length > 90 ? r.khoKhan.slice(0, 90) + '…' : r.khoKhan}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </Section>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px 0', fontSize: '0.9rem' }}>
            Chưa có hồ sơ nào
          </div>
        )}
      </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function MiniCard({ label, value, activeColor }: { label: string; value: number; activeColor: string }) {
  const active = value > 0;
  return (
    <div style={{
      flex: 1, minWidth: 55,
      background: active ? `${activeColor}18` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${active ? `${activeColor}44` : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 8, padding: '8px 4px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: active ? activeColor : 'rgba(255,255,255,0.18)' }}>{value}</div>
      <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: 1, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}
