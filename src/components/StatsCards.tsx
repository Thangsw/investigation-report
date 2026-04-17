import type { Report } from '../types';
import { EXTRACTED_CASE_TARGET, TOTAL_CASE_TARGET, getDashboardMetrics } from '../reportMetrics';

interface Props {
  reports: Report[];
}

export default function StatsCards({ reports }: Props) {
  const metrics = getDashboardMetrics(reports);
  const dtvEntries = Object.entries(metrics.byDTV).sort((a, b) => b[1] - a[1]);
  const maxDTV = dtvEntries[0]?.[1] || 1;
  const completionRateLabel = `${metrics.completionRate.toFixed(1)}%`;
  const extractionRateLabel = `${metrics.extractionRate.toFixed(1)}%`;

  return (
    <>
      <div className="section-card glass-panel">
        <div className="section-title" style={{ marginBottom: 12 }}>Khối lượng bộ phận tổng hợp</div>
        <div className="stats-grid stats-grid-3" style={{ marginBottom: 0 }}>
          <div className="stat-card">
            <div className="stat-value">{TOTAL_CASE_TARGET}</div>
            <div className="stat-label">Cần rút</div>
          </div>
          <div className="stat-card">
            <div className="stat-value blue">{EXTRACTED_CASE_TARGET}</div>
            <div className="stat-label">Đã rút</div>
          </div>
          <div className="stat-card">
            <div className="stat-value amber">{metrics.remainingToExtract}</div>
            <div className="stat-label">Còn lại</div>
          </div>
        </div>
      </div>

      <div className="section-card glass-panel">
        <div className="section-title" style={{ marginBottom: 12 }}>Tiến độ thực hiện của đơn vị</div>
        <div className="stats-grid stats-grid-3" style={{ marginBottom: 0 }}>
          <div className="stat-card">
            <div className="stat-value">{metrics.completedCount}</div>
            <div className="stat-label">Đã làm / đã báo cáo</div>
          </div>
          <div className="stat-card">
            <div className="stat-value green">{completionRateLabel}</div>
            <div className="stat-label">Tỷ lệ thực hiện</div>
          </div>
          <div className="stat-card">
            <div className="stat-value blue">{metrics.remainingToReport}</div>
            <div className="stat-label">Chưa báo cáo</div>
          </div>
          <div className="stat-card">
            <div className="stat-value amber">{metrics.reassignedCount}</div>
            <div className="stat-label">Đã phân công lại</div>
          </div>
          <div className="stat-card">
            <div className="stat-value amber">{metrics.upcomingDeadlineCount}</div>
            <div className="stat-label">Sắp đến hạn đình chỉ</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: metrics.overdueDeadlineCount > 0 ? '#ff4757' : '#2ed573' }}>
              {metrics.overdueDeadlineCount}
            </div>
            <div className="stat-label">Quá hạn đình chỉ</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: metrics.difficultyCount > 0 ? '#ff9f43' : '#2ed573' }}>
              {metrics.difficultyCount}
            </div>
            <div className="stat-label">Khó khăn / vướng mắc</div>
          </div>
          <div className="stat-card">
            <div className="stat-value blue">{extractionRateLabel}</div>
            <div className="stat-label">Tỷ lệ đã rút</div>
          </div>
          <div className="stat-card">
            <div className="stat-value amber">{metrics.adCount}</div>
            <div className="stat-label">Hồ sơ AD</div>
          </div>
        </div>
      </div>

      <div className="section-card glass-panel">
        <div className="section-title" style={{ marginBottom: 12 }}>Phân bố hồ sơ đã cập nhật</div>
        <div className="stats-grid stats-grid-5" style={{ marginBottom: 0 }}>
          <div className="stat-card">
            <div className="stat-value blue">{metrics.akCount}</div>
            <div className="stat-label">AK</div>
          </div>
          <div className="stat-card">
            <div className="stat-value amber">{metrics.adCount}</div>
            <div className="stat-label">AD</div>
          </div>
          <div className="stat-card">
            <div className="stat-value green">{metrics.byDoi['Đội 2']}</div>
            <div className="stat-label">Đội 2</div>
          </div>
          <div className="stat-card">
            <div className="stat-value green">{metrics.byDoi['Đội 3']}</div>
            <div className="stat-label">Đội 3</div>
          </div>
          <div className="stat-card">
            <div className="stat-value green">{metrics.byDoi['Đội 4']}</div>
            <div className="stat-label">Đội 4</div>
          </div>
        </div>
      </div>

      <div className="section-card glass-panel">
        <div className="section-title" style={{ marginBottom: 12 }}>Phân bổ theo ĐTV</div>
        {dtvEntries.length === 0 ? (
          <div className="empty-state" style={{ padding: '8px 0 0' }}>
            Chưa có hồ sơ nào được ĐTV cập nhật.
          </div>
        ) : (
          dtvEntries.map(([name, count]) => (
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
          ))
        )}
      </div>
    </>
  );
}
