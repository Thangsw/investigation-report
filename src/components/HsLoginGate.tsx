import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Shield } from 'lucide-react';

type GateStatus = 'checking' | 'need-login' | 'authed';

interface HsLoginGateProps {
  children: ReactNode;
}

export default function HsLoginGate({ children }: HsLoginGateProps) {
  const [status, setStatus] = useState<GateStatus>('checking');
  const [name, setName] = useState('');
  const [badge, setBadge] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/vneid/me', { credentials: 'same-origin' })
      .then((res) => {
        if (cancelled) return;
        setStatus(res.ok ? 'authed' : 'need-login');
      })
      .catch(() => {
        if (!cancelled) setStatus('need-login');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/vneid/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name: name.trim(), badge: badge.trim(), source: 'hs' }),
      });
      if (res.ok) {
        setStatus('authed');
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error || 'Đăng nhập không thành công');
    } catch {
      setError('Không kết nối được máy chủ');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'authed') {
    return <>{children}</>;
  }

  if (status === 'checking') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.95rem',
        }}
      >
        Đang kiểm tra...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '32px 28px',
          borderRadius: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Shield size={24} color="#ff4757" />
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Đăng nhập — Quản lý hồ sơ
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 0, marginBottom: 20 }}>
          Vui lòng đăng nhập để truy cập khu vực quản lý hồ sơ.
        </p>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="hs-login-name"
              style={{
                display: 'block',
                marginBottom: 6,
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              Họ tên đầy đủ
            </label>
            <input
              id="hs-login-name"
              className="form-control"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label
              htmlFor="hs-login-badge"
              style={{
                display: 'block',
                marginBottom: 6,
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              Số hiệu
            </label>
            <input
              id="hs-login-badge"
              className="form-control"
              type="text"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              autoComplete="off"
              required
            />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 6, marginBottom: 0 }}>
              Số hiệu chấp nhận 321-393 hoặc 321393
            </p>
          </div>

          {error && (
            <p style={{ color: '#ff4757', fontSize: '0.85rem', margin: '12px 0 0' }}>{error}</p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', marginTop: 20 }}
          >
            {submitting ? 'Đang xử lý...' : 'Truy cập'}
          </button>
        </form>
      </div>
    </div>
  );
}
