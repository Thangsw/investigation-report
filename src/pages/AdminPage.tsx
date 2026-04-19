import { useState, useEffect } from 'react';
import { api } from '../api';
import type { AppConfig, RequiredFields } from '../types';

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
  const [totalInput, setTotalInput] = useState('');
  const [akInput, setAkInput] = useState('');
  const [adInput, setAdInput] = useState('');
  const [statsToBanDia, setStatsToBanDia] = useState<'' | 'Hoà Bình' | 'Lạc Thuỷ'>('');
  const [sheetsViewUrl, setSheetsViewUrl] = useState('');
  const [reqFields, setReqFields] = useState<RequiredFields>(DEFAULT_REQUIRED);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.getConfig().then((cfg) => {
      setConfig(cfg);
      setTotalInput(String(cfg.totalCaseTarget));
      setAkInput(String(cfg.akTarget));
      setAdInput(String(cfg.adTarget));
      setStatsToBanDia(cfg.statsToBanDia ?? '');
      setSheetsViewUrl(cfg.sheetsViewUrl ?? '');
      setReqFields({ ...DEFAULT_REQUIRED, ...cfg.requiredFields });
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseInt(totalInput, 10);
    const ak = parseInt(akInput, 10);
    const ad = parseInt(adInput, 10);
    if (!total || total <= 0) { setMessage('Tổng số phải là số nguyên dương'); return; }
    if (isNaN(ak) || ak < 0) { setMessage('Số AK phải >= 0'); return; }
    if (isNaN(ad) || ad < 0) { setMessage('Số AD phải >= 0'); return; }
    setSaving(true);
    setMessage('');
    try {
      const res = await api.updateConfig({
        totalCaseTarget: total,
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
            Hiện tại: Tổng {config?.totalCaseTarget ?? '…'} | AK {config?.akTarget ?? '…'} | AD {config?.adTarget ?? '…'}
          </p>

          <div className="form-row">
            <div className="form-group">
              <label>Tổng số vụ việc *</label>
              <input type="number" className="form-control" min={1} value={totalInput}
                onChange={(e) => setTotalInput(e.target.value)} />
            </div>
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
    </div>
  );
}
