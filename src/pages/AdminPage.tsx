import { useState, useEffect } from 'react';
import { api } from '../api';
import type { AppConfig, RequiredFields, PendingChange } from '../types';

const DEFAULT_REQUIRED: RequiredFields = {
  soHoSo: true,
  toBanDia: true,
  ngayHetThoiHieuTruyCuuTNHS: true,
  tinhChatMucDoNghiemTrong: true,
  trichYeu: false,
  qdPhanCongPTT: false,
  qdPhanCongLaiDTV: false,
  qdKhoiTo: false,
  tinhTrang: false,
  ketQuaGiaiQuyet: false,
  khoKhan: false,
};

const REQUIRED_FIELD_LABELS: { key: keyof RequiredFields; label: string }[] = [
  { key: 'soHoSo', label: 'Số hồ sơ' },
  { key: 'toBanDia', label: 'Tổ địa bàn' },
  { key: 'ngayHetThoiHieuTruyCuuTNHS', label: 'Ngày hết thời hiệu truy cứu TNHS' },
  { key: 'tinhChatMucDoNghiemTrong', label: 'Tính chất, mức độ nghiêm trọng' },
  { key: 'trichYeu', label: 'Trích yếu' },
  { key: 'qdPhanCongPTT', label: 'QĐ phân công PTT' },
  { key: 'qdPhanCongLaiDTV', label: 'QĐ phân công lại ĐTV' },
  { key: 'qdKhoiTo', label: 'QĐ khởi tố (chỉ áp dụng AK)' },
  { key: 'tinhTrang', label: 'Tình trạng hiện tại' },
  { key: 'ketQuaGiaiQuyet', label: 'Kết quả giải quyết' },
  { key: 'khoKhan', label: 'Khó khăn, vướng mắc, đề xuất' },
];

export default function AdminPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [hbInput, setHbInput] = useState('');
  const [ltInput, setLtInput] = useState('');
  const [akInput, setAkInput] = useState('');
  const [adInput, setAdInput] = useState('');
  const [statsToBanDia, setStatsToBanDia] = useState<'' | 'Hoà Bình' | 'Lạc Thuỷ'>('');
  const [sheetsViewUrl, setSheetsViewUrl] = useState('');
  const [reqFields, setReqFields] = useState<RequiredFields>(DEFAULT_REQUIRED);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPending = () => api.getPendingChanges().then(setPendingChanges).catch(() => {});

  useEffect(() => {
    api.getConfig().then((cfg) => {
      setConfig(cfg);
      setHbInput(String(cfg.totalCaseTargetHB ?? 0));
      setLtInput(String(cfg.totalCaseTargetLT ?? 0));
      setAkInput(String(cfg.akTarget));
      setAdInput(String(cfg.adTarget));
      setStatsToBanDia(cfg.statsToBanDia ?? '');
      setSheetsViewUrl(cfg.sheetsViewUrl ?? '');
      setReqFields({ ...DEFAULT_REQUIRED, ...cfg.requiredFields });
    });
    fetchPending();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hb = parseInt(hbInput, 10) || 0;
    const lt = parseInt(ltInput, 10) || 0;
    const ak = parseInt(akInput, 10);
    const ad = parseInt(adInput, 10);
    if (isNaN(ak) || ak < 0) { setMessage('Số AK phải >= 0'); return; }
    if (isNaN(ad) || ad < 0) { setMessage('Số AD phải >= 0'); return; }
    setSaving(true);
    setMessage('');
    try {
      const res = await api.updateConfig({
        totalCaseTargetHB: hb,
        totalCaseTargetLT: lt,
        akTarget: ak,
        adTarget: ad,
        statsToBanDia,
        sheetsViewUrl,
        requiredFields: reqFields,
      });
      setConfig(res);
      setMessage('✓ Đã lưu thành công');
    } catch {
      setMessage('Lỗi khi lưu, thử lại');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await api.approvePendingChange(id);
      await fetchPending();
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await api.rejectPendingChange(id);
      await fetchPending();
    } finally {
      setProcessingId(null);
    }
  };

  const toggleField = (key: keyof RequiredFields) => {
    setReqFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 16px' }}>
      <form onSubmit={handleSubmit}>

        {/* ── Mục tiêu thực hiện ── */}
        <div className="glass-panel" style={{ padding: 24, marginBottom: 16 }}>
          <h2 style={{ marginBottom: 8, fontSize: '1.05rem' }}>Mục tiêu thực hiện</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Hiện tại: HB {config?.totalCaseTargetHB ?? 0} | LT {config?.totalCaseTargetLT ?? 0} | Tổng {config?.totalCaseTarget ?? '…'} | AK {config?.akTarget ?? '…'} | AD {config?.adTarget ?? '…'}
          </p>

          <div className="form-row">
            <div className="form-group">
              <label>Tổ Hoà Bình</label>
              <input type="number" className="form-control" min={0} value={hbInput}
                onChange={(e) => setHbInput(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Tổ Lạc Thuỷ</label>
              <input type="number" className="form-control" min={0} value={ltInput}
                onChange={(e) => setLtInput(e.target.value)} />
            </div>
            <div className="form-group">
              <label style={{ color: 'var(--text-muted)' }}>Tổng (tự tính)</label>
              <input type="number" className="form-control" value={(parseInt(hbInput) || 0) + (parseInt(ltInput) || 0)} readOnly
                style={{ opacity: 0.6 }} />
            </div>
          </div>
          <div className="form-row" style={{ marginTop: 8 }}>
            <div className="form-group">
              <label>Mục tiêu AK</label>
              <input type="number" className="form-control" min={0} value={akInput}
                onChange={(e) => setAkInput(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Mục tiêu AD</label>
              <input type="number" className="form-control" min={0} value={adInput}
                onChange={(e) => setAdInput(e.target.value)} />
            </div>
            <div className="form-group" />
          </div>
        </div>

        {/* ── Lọc thống kê theo tổ địa bàn ── */}
        <div className="glass-panel" style={{ padding: 24, marginBottom: 16 }}>
          <h2 style={{ marginBottom: 6, fontSize: '1.05rem' }}>Lọc thống kê theo tổ địa bàn</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Khi chọn một tổ, phần "Tổng số vụ án…" trên báo cáo tổng hợp chỉ tính hồ sơ của tổ đó.
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            {(['', 'Hoà Bình', 'Lạc Thuỷ'] as const).map((val) => (
              <label
                key={val}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: statsToBanDia === val ? 700 : 400,
                  color: statsToBanDia === val ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                <input
                  type="radio"
                  name="statsToBanDia"
                  value={val}
                  checked={statsToBanDia === val}
                  onChange={() => setStatsToBanDia(val)}
                  style={{ accentColor: '#ff4757', cursor: 'pointer' }}
                />
                {val === '' ? 'Tất cả' : val}
              </label>
            ))}
          </div>
        </div>

        {/* ── URL trang tính Google Sheets ── */}
        <div className="glass-panel" style={{ padding: 24, marginBottom: 16 }}>
          <h2 style={{ marginBottom: 6, fontSize: '1.05rem' }}>Liên kết trang tính Google Sheets</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            Dán URL Google Sheets vào đây để hiển thị nút "Xem trang tính" trên báo cáo tổng hợp.
          </p>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <input
              type="url"
              className="form-control"
              value={sheetsViewUrl}
              onChange={(e) => setSheetsViewUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </div>
        </div>

        {/* ── Trường bắt buộc ── */}
        <div className="glass-panel" style={{ padding: 24, marginBottom: 16 }}>
          <h2 style={{ marginBottom: 6, fontSize: '1.05rem' }}>Trường bắt buộc nhập</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Tick vào ô để đánh dấu trường đó là bắt buộc khi nhập hồ sơ.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {REQUIRED_FIELD_LABELS.map(({ key, label }) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  color: reqFields[key] ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                <input
                  type="checkbox"
                  checked={reqFields[key]}
                  onChange={() => toggleField(key)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#ff4757' }}
                />
                {label}
                {reqFields[key] && (
                  <span style={{ fontSize: '0.75rem', color: '#ff4757', fontWeight: 700 }}>*</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {message && (
          <p style={{ fontSize: '0.85rem', color: message.startsWith('✓') ? '#2ed573' : '#ff4757', marginBottom: 12 }}>
            {message}
          </p>
        )}
        <button type="submit" className="btn-submit" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </form>

      {/* ── Pending Changes ── */}
      <div className="glass-panel" style={{ padding: 24, marginTop: 24 }}>
        <h2 style={{ marginBottom: 6, fontSize: '1.05rem' }}>
          Yêu cầu chờ duyệt
          {pendingChanges.filter(c => c.status === 'pending').length > 0 && (
            <span style={{ marginLeft: 8, background: '#ff4757', color: '#fff', borderRadius: 12, padding: '1px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
              {pendingChanges.filter(c => c.status === 'pending').length}
            </span>
          )}
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          ĐTV đã gửi yêu cầu sửa/xoá hồ sơ, Admin cần phê duyệt để áp dụng chính thức.
        </p>
        {pendingChanges.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Không có yêu cầu nào.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingChanges.map((change) => {
              const r = change.reportSnapshot;
              const isPending = change.status === 'pending';
              return (
                <div key={change.id} style={{
                  border: `1px solid ${isPending ? '#ff4757' : change.status === 'approved' ? '#2ed573' : '#888'}`,
                  borderRadius: 8, padding: '12px 14px',
                  opacity: isPending ? 1 : 0.6,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                        background: change.type === 'delete' ? '#ff4757' : '#ff9f43', color: '#fff', marginRight: 8,
                      }}>
                        {change.type === 'delete' ? 'XOÁ' : 'SỬA'}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.dtvName}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginLeft: 8 }}>
                        {r.loaiHoSo} · {r.soHoSo || '—'} · {r.trichYeu ? r.trichYeu.slice(0, 40) + (r.trichYeu.length > 40 ? '…' : '') : ''}
                      </span>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {new Date(change.requestedAt).toLocaleString('vi-VN')} · {
                          change.status === 'pending' ? 'Chờ duyệt' :
                          change.status === 'approved' ? '✓ Đã duyệt' : '✗ Đã từ chối'
                        }
                      </div>
                    </div>
                    {isPending && (
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => handleApprove(change.id)}
                          disabled={processingId === change.id}
                          style={{ padding: '5px 14px', background: '#2ed573', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleReject(change.id)}
                          disabled={processingId === change.id}
                          style={{ padding: '5px 14px', background: 'transparent', color: '#ff4757', border: '1px solid #ff4757', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
