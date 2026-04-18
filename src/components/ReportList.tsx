import { useState, useEffect } from 'react';
import { Edit, Trash2, Clock, AlertTriangle } from 'lucide-react';
import type { Report } from '../types';
import { getDaysUntilDeadline, getDeadlineStatus } from '../reportMetrics';

const PAGE_SIZE = 20;

interface Props {
  reports: Report[];
  onEdit?: (report: Report) => void;
  onDelete?: (id: string) => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  return `${parseInt(day, 10)}/${month}/${year}`;
}

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '—';
  const day = d.getDate();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function doiBadgeClass(doi: string) {
  if (doi === 'Đội 2') return 'badge badge-doi-2';
  if (doi === 'Đội 3') return 'badge badge-doi-3';
  if (doi === 'Đội 4') return 'badge badge-doi-4';
  return 'badge badge-doi-2';
}

function toBanDiaBadgeClass(tob: string) {
  return tob === 'Lạc Thuỷ' ? 'badge badge-lt' : 'badge badge-hb';
}

export default function ReportList({ reports, onEdit, onDelete }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [reports]);

  if (reports.length === 0) {
    return <div className="empty-state">Chưa có hồ sơ nào.</div>;
  }

  const visible = reports.slice(0, visibleCount);
  const hasMore = visibleCount < reports.length;

  return (
    <>
      <div className="point-list">
        {visible.map((report, index) => {
          const showDeadline = !report.daThucHien;
          const deadlineStatus = showDeadline ? getDeadlineStatus(report.ngayHetThoiHieuTruyCuuTNHS) : 'none';
          const isUpcoming = deadlineStatus === 'upcoming';
          const isOverdue = deadlineStatus === 'overdue';
          const daysUntilDeadline = showDeadline ? getDaysUntilDeadline(report.ngayHetThoiHieuTruyCuuTNHS) : null;
          const createdAt = formatDateTime(report.createdAt);

          return (
            <div key={report.id} className={`point-item ${report.loaiHoSo === 'AK' ? 'ak' : 'ad'}`}>
              <div className="point-item-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>#{index + 1}</strong>
                  <div className="point-item-badges">
                    <span className={`badge badge-${report.loaiHoSo.toLowerCase()}`}>{report.loaiHoSo}</span>
                    <span className={doiBadgeClass(report.doi)}>{report.doi}</span>
                    <span className={toBanDiaBadgeClass(report.toBanDia ?? 'Hoà Bình')}>
                      {report.toBanDia ?? 'Hoà Bình'}
                    </span>
                    {report.hoSoHienHanh && <span className="badge badge-current">Hiện hành</span>}
                    {isUpcoming && (
                      <span className="badge badge-upcoming" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} />
                        Sắp hết thời hiệu
                      </span>
                    )}
                    {isOverdue && (
                      <span className="badge badge-overdue" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <AlertTriangle size={11} />
                        Quá thời hiệu
                      </span>
                    )}
                  </div>
                </div>
                <span className="point-time">{createdAt}</span>
              </div>

              <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>
                ĐTV: {report.dtvName}
              </p>

              {report.nguoiCamHoSo !== report.dtvName && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  <strong>Người cầm:</strong> {report.nguoiCamHoSo}
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
                    <strong>Hồ sơ:</strong> <b style={{ color: 'var(--text-primary)' }}>{report.soHoSo}</b>
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
                  <strong>Tính chất, mức độ nghiêm trọng:</strong> {report.tinhChatMucDoNghiemTrong}
                </p>
              )}

              {report.tinhTrang && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Tình trạng: {report.tinhTrang}
                </p>
              )}

              {report.ketQuaGiaiQuyet && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Kết quả giải quyết: {report.ketQuaGiaiQuyet}
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
                  {report.daThucHien && (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}> — đã thực hiện</span>
                  )}
                </p>
              )}

              {report.khoKhan && (
                <p
                  style={{
                    fontSize: '0.82rem',
                    whiteSpace: 'pre-wrap',
                    marginTop: 4,
                  }}
                >
                  <strong>Khó khăn/vướng mắc:</strong>{' '}
                  <em style={{ color: '#ff4757' }}>{report.khoKhan}</em>
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

      {hasMore && (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <button
            type="button"
            className="btn-small"
            style={{ padding: '8px 24px', fontSize: '0.85rem' }}
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            Xem thêm ({reports.length - visibleCount} hồ sơ còn lại)
          </button>
        </div>
      )}
    </>
  );
}
