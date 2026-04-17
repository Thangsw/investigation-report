import type { Report } from '../types';

interface Props {
  reports: Report[];
}

export default function StatsCards({ reports }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const akCount = reports.filter(r => r.loaiHoSo === 'AK').length;
  const adCount = reports.filter(r => r.loaiHoSo === 'AD').length;
  const overdueCount = reports.filter(r => {
    if (!r.thoiHanDinhChi) return false;
    return new Date(r.thoiHanDinhChi + 'T00:00:00') < today;
  }).length;

  // Count by ĐTV
  const byDTV: Record<string, number> = {};
  reports.forEach(r => {
    byDTV[r.dtvName] = (byDTV[r.dtvName] || 0) + 1;
  });
  const dtvEntries = Object.entries(byDTV).sort((a, b) => b[1] - a[1]);
  const maxDTV = dtvEntries[0]?.[1] || 1;

  // Count by Đội
  const doi2 = reports.filter(r => r.doi === 'Đội 2').length;
  const doi3 = reports.filter(r => r.doi === 'Đội 3').length;
  const doi4 = reports.filter(r => r.doi === 'Đội 4').length;

  return (
    <>
      {/* Row 1: 4 stat cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card glass-panel">
          <div className="stat-value">{reports.length}</div>
          <div className="stat-label">Tổng hồ sơ</div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-value blue">{akCount}</div>
          <div className="stat-label">Hồ sơ AK</div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-value amber">{adCount}</div>
          <div className="stat-label">Hồ sơ AD</div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-value" style={{ color: overdueCount > 0 ? '#ff4757' : '#2ed573' }}>
            {overdueCount}
          </div>
          <div className="stat-label">Quá hạn đình chỉ</div>
        </div>
      </div>

      {/* Row 2: by Đội */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
        <div className="stat-card glass-panel">
          <div className="stat-value green">{doi2}</div>
          <div className="stat-label">Đội 2</div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-value green">{doi3}</div>
          <div className="stat-label">Đội 3</div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-value green">{doi4}</div>
          <div className="stat-label">Đội 4</div>
        </div>
      </div>

      {/* ĐTV breakdown */}
      {dtvEntries.length > 0 && (
        <div className="section-card glass-panel" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>Thống kê theo ĐTV</div>
          {dtvEntries.map(([name, count]) => (
            <div key={name} className="stat-bar-row">
              <span className="bar-name">{name}</span>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill"
                  style={{ width: `${(count / maxDTV) * 100}%` }}
                />
              </div>
              <span className="stat-bar-count">{count}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
