import { Edit, Trash2 } from 'lucide-react';
import type { Report } from '../types';
import { getDaysUntilDeadline, getDeadlineStatus } from '../reportMetrics';

interface Props {
  reports: Report[];
  onEdit?: (report: Report) => void;
  onDelete?: (id: string) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export default function ReportList({ reports, onEdit, onDelete }: Props) {
  if (reports.length === 0) {
    return <div className="empty-state">Chưa có hồ sơ nào.</div>;
  }

  return (
    <div className="point-list">
      {reports.map((report, index) => {
        const deadlineStatus = getDeadlineStatus(report.ngayHetThoiHieuTruyCuuTNHS);
        const isUpcoming = deadlineStatus === 'upcoming';
        const isOverdue = deadlineStatus === 'overdue';
        const daysUntilDeadline = getDaysUntilDeadline(report.ngayHetThoiHieuTruyCuuTNHS);
        const createdAt = new Date(report.createdAt).toLocaleDateString('vi-VN');

        return (
          <div key={report.id} className={`point-item ${report.loaiHoSo === 'AK' ? 'ak' : 'ad'}`}>
            <div className="point-item-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>#{index + 1}</strong>
                <div className="point-item-badges">
                  <span className={`badge badge-${report.loaiHoSo.toLowerCase()}`}>{report.loaiHoSo}</span>
                  <span className="badge badge-doi">{report.doi}</span>
                  {report.hoSoHienHanh && <span className="badge badge-current">Hiện hành</span>}
                  {isUpcoming && <span className="badge badge-upcoming">Sắp hết thời hiệu</span>}
                  {isOverdue && <span className="badge badge-overdue">Quá thời hiệu</span>}
                </div>
              </div>
              <span className="point-time">{createdAt}</span>
            </div>

            <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>
              ĐTV: {report.dtvName}
            </p>

            {report.nguoiCamHoSo !== report.dtvName && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                Người cầm: {report.nguoiCamHoSo}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              {report.soHoSo && (
                <span>
                  Hồ sơ: <b style={{ color: 'var(--text-primary)' }}>{report.soHoSo}</b>
                </span>
              )}
              {report.soTap && (
                <span>
                  Tập: <b style={{ color: 'var(--text-primary)' }}>{report.soTap}</b>
                </span>
              )}
              {report.soLuu && (
                <span>
                  Lưu: <b style={{ color: 'var(--text-primary)' }}>{report.soLuu}</b>
                </span>
              )}
            </div>

            {report.trichYeu && (
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                  fontStyle: 'italic',
                }}
              >
                {report.trichYeu}
              </p>
            )}

            {report.tinhChatMucDoNghiemTrong && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                Tính chất, mức độ nghiêm trọng: {report.tinhChatMucDoNghiemTrong}
              </p>
            )}

            {report.tinhTrang && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                Tình trạng: {report.tinhTrang}
              </p>
            )}

            {report.ngayHetThoiHieuTruyCuuTNHS && (
              <p
                style={{ fontSize: '0.82rem', marginBottom: 4 }}
                className={isOverdue ? 'text-overdue' : isUpcoming ? 'text-upcoming' : ''}
              >
                Ngày hết thời hiệu truy cứu TNHS: {formatDate(report.ngayHetThoiHieuTruyCuuTNHS)}
                {isUpcoming && daysUntilDeadline !== null && (
                  daysUntilDeadline === 0
                    ? ' (đến hạn hôm nay)'
                    : ` (còn ${daysUntilDeadline} ngày)`
                )}
                {isOverdue && daysUntilDeadline !== null && ` (quá ${Math.abs(daysUntilDeadline)} ngày)`}
              </p>
            )}

            {report.khoKhan && (
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                  marginTop: 4,
                }}
              >
                {report.khoKhan}
              </p>
            )}

            {(onEdit || onDelete) && (
              <div className="point-actions">
                {onEdit && (
                  <button className="btn-small" onClick={() => onEdit(report)}>
                    <Edit size={12} /> Sửa
                  </button>
                )}
                {onDelete && (
                  <button
                    className="btn-small btn-delete"
                    onClick={() => {
                      if (window.confirm('Xóa hồ sơ này?')) onDelete(report.id);
                    }}
                  >
                    <Trash2 size={12} /> Xóa
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
