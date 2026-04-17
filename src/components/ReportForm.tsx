import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import type { Report, Investigator, ReportFormData } from '../types';

const EMPTY_FORM: ReportFormData = {
  dtvName: '',
  nguoiCamHoSo: '',
  loaiHoSo: 'AK',
  soTap: '',
  soHoSo: '',
  soLuu: '',
  trichYeu: '',
  doi: 'Đội 2',
  tinhTrang: '',
  thoiHanDinhChi: '',
  khoKhan: '',
};

interface Props {
  investigators: Investigator[];
  editingReport: Report | null;
  prefillDTV?: string;
  onSubmit: (data: ReportFormData) => Promise<void>;
  onCancel: () => void;
}

export default function ReportForm({ investigators, editingReport, prefillDTV, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<ReportFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingReport) {
      setForm({
        dtvName:        editingReport.dtvName,
        nguoiCamHoSo:   editingReport.nguoiCamHoSo,
        loaiHoSo:       editingReport.loaiHoSo,
        soTap:          editingReport.soTap,
        soHoSo:         editingReport.soHoSo,
        soLuu:          editingReport.soLuu,
        trichYeu:       editingReport.trichYeu || '',
        doi:            editingReport.doi,
        tinhTrang:      editingReport.tinhTrang,
        thoiHanDinhChi: editingReport.thoiHanDinhChi,
        khoKhan:        editingReport.khoKhan,
      });
    } else {
      setForm({ ...EMPTY_FORM, dtvName: prefillDTV || '' });
    }
  }, [editingReport, prefillDTV]);

  const set = (key: keyof ReportFormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dtvName.trim()) {
      alert('Vui lòng nhập họ tên ĐTV');
      return;
    }
    const data: ReportFormData = {
      ...form,
      dtvName: form.dtvName.trim(),
      nguoiCamHoSo: form.nguoiCamHoSo.trim() || form.dtvName.trim(),
    };
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>

      {/* 1. Họ tên ĐTV — free text + datalist gợi ý */}
      <div className="form-group">
        <label>Họ tên ĐTV:</label>
        <input
          type="text"
          className="form-control"
          list="dtv-datalist"
          value={form.dtvName}
          onChange={e => set('dtvName', e.target.value)}
          placeholder="Nhập tên ĐTV..."
          autoComplete="off"
          required
        />
        <datalist id="dtv-datalist">
          {investigators.map(d => (
            <option key={d.id} value={d.name} />
          ))}
        </datalist>
      </div>

      {/* 2. Người cầm hồ sơ */}
      <div className="form-group">
        <label>Người cầm hồ sơ (bỏ trống nếu tự làm, không đổi cho ĐTV khác):</label>
        <input
          type="text"
          className="form-control"
          list="dtv-datalist"
          value={form.nguoiCamHoSo}
          onChange={e => set('nguoiCamHoSo', e.target.value)}
          placeholder={`Để trống → tự điền "${form.dtvName || 'tên ĐTV'}"`}
          autoComplete="off"
        />
      </div>

      {/* 3. Loại hồ sơ AK/AD */}
      <div className="form-group">
        <label>Loại hồ sơ (AK/AD)</label>
        <div className="radio-group">
          {(['AK', 'AD'] as const).map(type => (
            <label
              key={type}
              className={`radio-option ${form.loaiHoSo === type ? `selected-${type.toLowerCase()}` : ''}`}
            >
              <input
                type="radio"
                name="loaiHoSo"
                value={type}
                checked={form.loaiHoSo === type}
                onChange={() => set('loaiHoSo', type)}
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      {/* 4. Số tập / Số hồ sơ / Số lưu */}
      <div className="form-row">
        <div className="form-group">
          <label>Số tập</label>
          <input
            type="text"
            className="form-control"
            value={form.soTap}
            onChange={e => set('soTap', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Số hồ sơ</label>
          <input
            type="text"
            className="form-control"
            value={form.soHoSo}
            onChange={e => set('soHoSo', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Số lưu</label>
          <input
            type="text"
            className="form-control"
            value={form.soLuu}
            onChange={e => set('soLuu', e.target.value)}
          />
        </div>
      </div>

      {/* 5. Trích yếu */}
      <div className="form-group">
        <label>Trích yếu</label>
        <textarea
          className="form-control"
          rows={2}
          value={form.trichYeu}
          onChange={e => set('trichYeu', e.target.value)}
          placeholder="Tóm tắt nội dung vụ việc..."
        />
      </div>

      {/* 6. Hồ sơ thuộc lĩnh vực — đưa lên đây */}
      <div className="form-group">
        <label>Hồ sơ thuộc lĩnh vực của (lựa chọn)</label>
        <select
          className="form-control"
          value={form.doi}
          onChange={e => set('doi', e.target.value as ReportFormData['doi'])}
          required
        >
          <option value="Đội 2">Đội 2</option>
          <option value="Đội 3">Đội 3</option>
          <option value="Đội 4">Đội 4</option>
        </select>
      </div>

      {/* 7. Tình trạng hiện tại */}
      <div className="form-group">
        <label>Tình trạng hiện tại</label>
        <input
          type="text"
          className="form-control"
          list="tinhtrang-datalist"
          value={form.tinhTrang}
          onChange={e => set('tinhTrang', e.target.value)}
          placeholder="Đang xử lý / đã Ra quyết định không khởi tố / Đã phân công lại..."
          autoComplete="off"
        />
        <datalist id="tinhtrang-datalist">
          <option value="Đang xử lý" />
          <option value="Đã ra quyết định không khởi tố" />
          <option value="Đã phân công lại" />
          <option value="Đang điều tra bổ sung" />
          <option value="Đã kết thúc điều tra, chuyển VKS" />
          <option value="Tạm đình chỉ điều tra" />
          <option value="Chờ kết luận giám định" />
        </datalist>
      </div>

      {/* 8. Thời hạn ra quyết định đình chỉ */}
      <div className="form-group">
        <label>Thời hạn ra quyết định đình chỉ</label>
        <input
          type="date"
          className="form-control"
          value={form.thoiHanDinhChi}
          onChange={e => set('thoiHanDinhChi', e.target.value)}
        />
      </div>

      {/* 9. Khó khăn, vướng mắc, đề xuất */}
      <div className="form-group">
        <label>Khó khăn, vướng mắc, đề xuất</label>
        <textarea
          className="form-control"
          rows={3}
          value={form.khoKhan}
          onChange={e => set('khoKhan', e.target.value)}
          placeholder="Ghi tự do..."
        />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="button" className="btn-small" onClick={onCancel}
          style={{ flex: 1, justifyContent: 'center', padding: '14px' }}>
          Hủy
        </button>
        <button type="submit" className="btn-submit" disabled={isSubmitting || !form.dtvName.trim()}
          style={{ flex: 2 }}>
          <Send size={16} />
          {isSubmitting ? 'Đang lưu...' : (editingReport ? 'Lưu thay đổi' : 'Lưu hồ sơ')}
        </button>
      </div>
    </form>
  );
}
