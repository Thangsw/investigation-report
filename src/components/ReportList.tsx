import { Edit, Trash2 } from 'lucide-react';
import type { Report } from '../types';

interface Props {
  reports: Report[];
  onEdit?: (report: Report) => void;
  onDelete?: (id: string) => void;
}

function isOverdue(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + 'T00:00:00') < today;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export default function ReportList({ reports, onEdit, onDelete }: Props) {
  if (reports.length === 0) {
    return <div className="empty-state">Chưa có hồ sơ nào.</div>;
  }

  return (
    <div className="point-list">
      {reports.map((r, idx) => {
        const overdue = isOverdue(r.thoiHanDinhChi);
        const createdAt = new Date(r.createdAt).toLocaleDateString('vi-VN');

        return (
          <div key={r.id} className={`point-item ${r.loaiHoSo === 'AK' ? 'ak' : 'ad'}`}>
            <div className="point-item-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ color: '#aaa', fontSize: '0.8rem' }}>#{idx + 1}</strong>
                <div className="point-item-badges">
                  <span className={`badge badge-${r.loaiHoSo.toLowerCase()}`}>{r.loaiHoSo}</span>
                  <span className="badge badge-doi">{r.doi}</span>
                  {overdue && <span className="badge badge-overdue">Quá hạn</span>}
                </div>
              </div>
              <span className="point-time">{createdAt}</span>
            </div>

            <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>
              ĐTV: {r.dtvName}
            </p>

            {r.nguoiCamHoSo !== r.dtvName && (
              <p style={{ fontSize: '0.85rem', color: '#bbb', marginBottom: 4 }}>
                Người cầm: {r.nguoiCamHoSo}
              </p>
            )}

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.82rem', color: '#999', marginBottom: 6 }}>
              {r.soHoSo && <span>Hồ sơ: <b style={{ color: '#ddd' }}>{r.soHoSo}</b></span>}
              {r.soTap  && <span>Tập: <b style={{ color: '#ddd' }}>{r.soTap}</b></span>}
              {r.soLuu  && <span>Lưu: <b style={{ color: '#ddd' }}>{r.soLuu}</b></span>}
            </div>

            {r.trichYeu && (
              <p style={{ fontSize: '0.85rem', color: '#ddd', marginBottom: 4, fontStyle: 'italic' }}>
                {r.trichYeu}
              </p>
            )}

            {r.tinhTrang && (
              <p style={{ fontSize: '0.85rem', color: '#ccc', marginBottom: 4 }}>
                Tình trạng: {r.tinhTrang}
              </p>
            )}

            {r.thoiHanDinhChi && (
              <p style={{ fontSize: '0.82rem', marginBottom: 4 }}
                 className={overdue ? 'text-overdue' : ''}>
                Hạn đình chỉ: {formatDate(r.thoiHanDinhChi)}
                {overdue && ' ⚠️'}
              </p>
            )}

            {r.khoKhan && (
              <p style={{ fontSize: '0.82rem', color: '#aaa', whiteSpace: 'pre-wrap', marginTop: 4 }}>
                {r.khoKhan}
              </p>
            )}

            {(onEdit || onDelete) && (
              <div className="point-actions">
                {onEdit && (
                  <button className="btn-small" onClick={() => onEdit(r)}>
                    <Edit size={12} /> Sửa
                  </button>
                )}
                {onDelete && (
                  <button className="btn-small btn-delete"
                    onClick={() => {
                      if (window.confirm('Xóa hồ sơ này?')) onDelete(r.id);
                    }}>
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
