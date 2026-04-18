import { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdminPage() {
  const [current, setCurrent] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.getConfig().then((cfg) => {
      setCurrent(cfg.totalCaseTarget);
      setInput(String(cfg.totalCaseTarget));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(input, 10);
    if (!val || val <= 0) { setMessage('Vui lòng nhập số nguyên dương'); return; }
    setSaving(true);
    setMessage('');
    try {
      const res = await api.updateConfig(val);
      setCurrent(res.totalCaseTarget);
      setMessage('✓ Đã lưu thành công');
    } catch {
      setMessage('Lỗi khi lưu, thử lại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 16px' }}>
      <div className="glass-panel" style={{ padding: 24 }}>
        <h2 style={{ marginBottom: 20, fontSize: '1.1rem' }}>Cấu hình hệ thống</h2>

        <div style={{ marginBottom: 20, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Tổng số vụ án, vụ việc tạm đình chỉ hiện tại: <strong style={{ color: 'var(--text-primary)' }}>{current ?? '...'}</strong>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tổng số vụ án, vụ việc tạm đình chỉ *</label>
            <input
              type="number"
              className="form-control"
              min={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              required
            />
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
    </div>
  );
}
