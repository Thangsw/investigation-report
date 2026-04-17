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
  hoSoHienHanh: false,
  trichYeu: '',
  doi: 'Đội 2',
  toBanDia: 'Hoà Bình',
  tinhTrang: '',
  ketQuaGiaiQuyet: '',
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

  useEffect(() => {
    if (editingReport) {
      setForm({
        dtvName: editingReport.dtvName,
        nguoiCamHoSo: editingReport.nguoiCamHoSo,
        loaiHoSo: editingReport.loaiHoSo,
        soTap: editingReport.soTap,
        soHoSo: editingReport.soHoSo,
        soLuu: editingReport.soLuu,
        hoSoHienHanh: editingReport.hoSoHienHanh,
        trichYeu: editingReport.trichYeu || '',
        doi: editingReport.doi,
        toBanDia: editingReport.toBanDia ?? 'Hoà Bình',
        tinhTrang: editingReport.tinhTrang,
        ketQuaGiaiQuyet: editingReport.ketQuaGiaiQuyet || '',
        ngayHetThoiHieuTruyCuuTNHS: editingReport.ngayHetThoiHieuTruyCuuTNHS,
        tinhChatMucDoNghiemTrong: editingReport.tinhChatMucDoNghiemTrong || '',
        khoKhan: editingReport.khoKhan,
      });
    } else {
      setForm({ ...EMPTY_FORM, dtvName: prefillDTV || '' });
    }
  }, [editingReport, prefillDTV]);

  const setField = <K extends keyof ReportFormData>(key: K, value: ReportFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.dtvName.trim()) {
      alert('Vui lòng nhập họ tên ĐTV');
      return;
    }

    if (!form.soHoSo.trim()) {
      alert('Vui lòng nhập Số hồ sơ');
      return;
    }

    if (!form.tinhChatMucDoNghiemTrong.trim()) {
      alert('Vui lòng nhập Tính chất, mức độ nghiêm trọng');
      return;
    }

    if (!form.ngayHetThoiHieuTruyCuuTNHS) {
      alert('Vui lòng nhập Ngày hết thời hiệu truy cứu TNHS');
      return;
    }

    // Soft warning nếu trích yếu không có địa danh
    if (form.trichYeu.trim()) {
      const lower = form.trichYeu.toLowerCase().normalize('NFC');
      const hasLocation =
        lower.includes('phường') ||
        lower.includes('phuong') ||
        lower.includes('xã') ||
        lower.includes('xa ') ||
        lower.includes('thị trấn') ||
        lower.includes('thi tran');
      if (!hasLocation) {
        const proceed = window.confirm(
          'Trích yếu chưa có địa danh cụ thể (phường/xã/thị trấn).\n\nVí dụ đúng: "Vụ lừa đảo xảy ra ngày 01/01/2024 tại phường Hoà Bình, tp. Hoà Bình"\n\nBạn có muốn tiếp tục lưu không?',
        );
        if (!proceed) return;
      }
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
          <label>Số hồ sơ *</label>
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
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.hoSoHienHanh}
              onChange={(event) => setField('hoSoHienHanh', event.target.checked)}
            />
            <span>Hồ sơ hiện hành</span>
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>Trích yếu</label>
        <textarea
          className="form-control"
          rows={3}
          value={form.trichYeu}
          onChange={(event) => setField('trichYeu', event.target.value)}
          placeholder='Vụ [...] xảy ra ngày [...] tại [...], hoặc tóm tắt vụ việc — không ghi chung chung "Lừa đảo chiếm đoạt tài sản" hoặc "Giết người"'
        />
        <p className="field-note">Cần có địa danh cụ thể (phường/xã/thị trấn) trong nội dung</p>
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
        <label>Tổ địa bàn *</label>
        <div className="radio-group">
          {(['Hoà Bình', 'Lạc Thuỷ'] as const).map((tob) => {
            const key = tob === 'Hoà Bình' ? 'hb' : 'lt';
            return (
              <label
                key={tob}
                className={`radio-option ${form.toBanDia === tob ? `selected-${key}` : ''}`}
              >
                <input
                  type="radio"
                  name="toBanDia"
                  value={tob}
                  checked={form.toBanDia === tob}
                  onChange={() => setField('toBanDia', tob)}
                />
                {tob}
              </label>
            );
          })}
        </div>
      </div>

      <div className="form-group">
        <label>Ngày hết thời hiệu truy cứu TNHS *</label>
        <input
          type="date"
          className="form-control"
          value={form.ngayHetThoiHieuTruyCuuTNHS}
          onChange={(event) => setField('ngayHetThoiHieuTruyCuuTNHS', event.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Tính chất, mức độ nghiêm trọng *</label>
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
        <label>Kết quả giải quyết</label>
        <input
          type="text"
          className="form-control"
          value={form.ketQuaGiaiQuyet}
          onChange={(event) => setField('ketQuaGiaiQuyet', event.target.value)}
          placeholder="Nhập kết quả giải quyết..."
          autoComplete="off"
        />
      </div>

      <div className="form-group">
        <label>Khó khăn, vướng mắc, đề xuất</label>
        <textarea
          className="form-control"
          rows={3}
          value={form.khoKhan}
          onChange={(event) => setField('khoKhan', event.target.value)}
          placeholder="Không tìm thấy trên phần mềm ĐTHS, Không có đầy đủ tài liệu v.v..."
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
