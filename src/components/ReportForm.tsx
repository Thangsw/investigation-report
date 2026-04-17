import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import type { Report, Investigator, ReportFormData } from '../types';

const SEVERITY_PRESETS = [
  'Rất nghiêm trọng',
  'Ít nghiêm trọng',
  'Đặc biệt nghiêm trọng',
] as const;

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
  ngayHetThoiHieuTruyCuuTNHS: '',
  tinhChatMucDoNghiemTrong: '',
  khoKhan: '',
};

interface Props {
  investigators: Investigator[];
  editingReport: Report | null;
  prefillDTV?: string;
  onSubmit: (data: ReportFormData) => Promise<void>;
  onCancel: () => void;
}

export default function ReportForm({
  investigators,
  editingReport,
  prefillDTV,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<ReportFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAD = form.loaiHoSo === 'AD';

  useEffect(() => {
    if (editingReport) {
      setForm({
        dtvName: editingReport.dtvName,
        nguoiCamHoSo: editingReport.nguoiCamHoSo,
        loaiHoSo: editingReport.loaiHoSo,
        soTap: editingReport.soTap,
        soHoSo: editingReport.soHoSo,
        soLuu: editingReport.soLuu,
        trichYeu: editingReport.trichYeu || '',
        doi: editingReport.doi,
        tinhTrang: editingReport.tinhTrang,
        ngayHetThoiHieuTruyCuuTNHS: editingReport.ngayHetThoiHieuTruyCuuTNHS,
        tinhChatMucDoNghiemTrong: editingReport.tinhChatMucDoNghiemTrong || '',
        khoKhan: editingReport.khoKhan,
      });
    } else {
      setForm({ ...EMPTY_FORM, dtvName: prefillDTV || '' });
    }
  }, [editingReport, prefillDTV]);

  const setField = (key: keyof ReportFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.dtvName.trim()) {
      alert('Vui lòng nhập họ tên ĐTV');
      return;
    }

    if (isAD && !form.ngayHetThoiHieuTruyCuuTNHS) {
      alert('Hồ sơ AD bắt buộc phải nhập Ngày hết thời hiệu truy cứu TNHS');
      return;
    }

    const data: ReportFormData = {
      ...form,
      dtvName: form.dtvName.trim(),
      nguoiCamHoSo: form.nguoiCamHoSo.trim() || form.dtvName.trim(),
      tinhChatMucDoNghiemTrong: form.tinhChatMucDoNghiemTrong.trim(),
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
      <div className="form-group">
        <label>Họ tên ĐTV</label>
        <input
          type="text"
          className="form-control"
          list="dtv-datalist"
          value={form.dtvName}
          onChange={(event) => setField('dtvName', event.target.value)}
          placeholder="Nhập tên ĐTV..."
          autoComplete="off"
          required
        />
        <datalist id="dtv-datalist">
          {investigators.map((investigator) => (
            <option key={investigator.id} value={investigator.name} />
          ))}
        </datalist>
      </div>

      <div className="form-group">
        <label>Người cầm hồ sơ</label>
        <input
          type="text"
          className="form-control"
          list="dtv-datalist"
          value={form.nguoiCamHoSo}
          onChange={(event) => setField('nguoiCamHoSo', event.target.value)}
          placeholder={`Để trống → tự điền "${form.dtvName || 'tên ĐTV'}"`}
          autoComplete="off"
        />
      </div>

      <div className="form-group">
        <label>Loại hồ sơ</label>
        <div className="radio-group">
          {(['AK', 'AD'] as const).map((type) => (
            <label
              key={type}
              className={`radio-option ${form.loaiHoSo === type ? `selected-${type.toLowerCase()}` : ''}`}
            >
              <input
                type="radio"
                name="loaiHoSo"
                value={type}
                checked={form.loaiHoSo === type}
                onChange={() => setField('loaiHoSo', type)}
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Số tập</label>
          <input
            type="text"
            className="form-control"
            value={form.soTap}
            onChange={(event) => setField('soTap', event.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Số hồ sơ</label>
          <input
            type="text"
            className="form-control"
            value={form.soHoSo}
            onChange={(event) => setField('soHoSo', event.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Số lưu</label>
          <input
            type="text"
            className="form-control"
            value={form.soLuu}
            onChange={(event) => setField('soLuu', event.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Trích yếu</label>
        <textarea
          className="form-control"
          rows={2}
          value={form.trichYeu}
          onChange={(event) => setField('trichYeu', event.target.value)}
          placeholder="Tóm tắt nội dung vụ việc..."
        />
      </div>

      <div className="form-group">
        <label>Hồ sơ thuộc lĩnh vực của</label>
        <select
          className="form-control"
          value={form.doi}
          onChange={(event) => setField('doi', event.target.value as ReportFormData['doi'])}
          required
        >
          <option value="Đội 2">Đội 2</option>
          <option value="Đội 3">Đội 3</option>
          <option value="Đội 4">Đội 4</option>
        </select>
      </div>

      <div className="form-group">
        <label>{isAD ? 'Ngày hết thời hiệu truy cứu TNHS *' : 'Ngày hết thời hiệu truy cứu TNHS'}</label>
        <input
          type="date"
          className="form-control"
          value={form.ngayHetThoiHieuTruyCuuTNHS}
          onChange={(event) => setField('ngayHetThoiHieuTruyCuuTNHS', event.target.value)}
          required={isAD}
        />
      </div>

      <div className="form-group">
        <label>Tính chất, mức độ nghiêm trọng</label>
        <input
          type="text"
          className="form-control"
          list="severity-datalist"
          value={form.tinhChatMucDoNghiemTrong}
          onChange={(event) => setField('tinhChatMucDoNghiemTrong', event.target.value)}
          placeholder="Rất nghiêm trọng / Ít nghiêm trọng / Đặc biệt nghiêm trọng..."
          autoComplete="off"
        />
        <datalist id="severity-datalist">
          {SEVERITY_PRESETS.map((severity) => (
            <option key={severity} value={severity} />
          ))}
        </datalist>
      </div>

      <div className="form-group">
        <label>Tình trạng hiện tại</label>
        <input
          type="text"
          className="form-control"
          list="tinhtrang-datalist"
          value={form.tinhTrang}
          onChange={(event) => setField('tinhTrang', event.target.value)}
          placeholder="Đang xử lý / Đã ra quyết định không khởi tố / Đã phân công lại..."
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

      <div className="form-group">
        <label>Khó khăn, vướng mắc, đề xuất</label>
        <textarea
          className="form-control"
          rows={3}
          value={form.khoKhan}
          onChange={(event) => setField('khoKhan', event.target.value)}
          placeholder="Ghi tự do..."
        />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button
          type="button"
          className="btn-small"
          onClick={onCancel}
          style={{ flex: 1, justifyContent: 'center', padding: '14px' }}
        >
          Hủy
        </button>
        <button
          type="submit"
          className="btn-submit"
          disabled={isSubmitting || !form.dtvName.trim()}
          style={{ flex: 2 }}
        >
          <Send size={16} />
          {isSubmitting ? 'Đang lưu...' : editingReport ? 'Lưu thay đổi' : 'Lưu hồ sơ'}
        </button>
      </div>
    </form>
  );
}
