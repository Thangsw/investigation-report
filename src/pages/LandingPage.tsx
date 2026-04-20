import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, FileSearch } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showComingSoon, setShowComingSoon] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      gap: 40,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
          <Shield size={36} color="#ff4757" />
        </div>
        <h1 style={{
          fontSize: 'clamp(1.3rem, 4vw, 2rem)',
          fontWeight: 800,
          color: 'var(--text-primary)',
          lineHeight: 1.3,
          margin: 0,
        }}>
          Hệ thống Quản lý hồ sơ
        </h1>
        <p style={{
          fontSize: 'clamp(1rem, 3vw, 1.3rem)',
          fontWeight: 600,
          color: '#ff4757',
          marginTop: 6,
        }}>
          Tổ Hoà Bình – Lạc Thuỷ
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: 24,
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 720,
      }}>
        {/* Điều tra hình sự */}
        <button
          onClick={() => navigate('/hs')}
          style={{
            flex: '1 1 260px',
            maxWidth: 320,
            minHeight: 200,
            background: 'linear-gradient(135deg, rgba(255,71,87,0.18) 0%, rgba(255,71,87,0.06) 100%)',
            border: '2px solid rgba(255,71,87,0.5)',
            borderRadius: 18,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 32,
            transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-4px)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#ff4757';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 32px rgba(255,71,87,0.25)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = '';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,71,87,0.5)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,71,87,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={32} color="#ff4757" />
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Điều tra hình sự
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Quản lý hồ sơ tạm đình chỉ
            </div>
          </div>
        </button>

        {/* Điều tra cơ bản */}
        <button
          onClick={() => setShowComingSoon((v) => !v)}
          style={{
            flex: '1 1 260px',
            maxWidth: 320,
            minHeight: 200,
            background: 'linear-gradient(135deg, rgba(100,100,120,0.18) 0%, rgba(100,100,120,0.06) 100%)',
            border: '2px solid rgba(150,150,170,0.3)',
            borderRadius: 18,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 32,
            transition: 'transform 0.15s, border-color 0.15s',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = '';
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(150,150,170,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileSearch size={32} color="var(--text-muted)" />
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
              Điều tra cơ bản
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Quản lý hồ sơ điều tra cơ bản
            </div>
          </div>
        </button>
      </div>

      {showComingSoon && (
        <div style={{
          fontSize: '1.05rem', fontWeight: 600,
          color: 'var(--text-secondary)',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12, padding: '12px 28px',
          animation: 'fadeIn 0.2s ease',
        }}>
          👍 Sắp triển khai
        </div>
      )}
    </div>
  );
}
