import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import type { Report, Investigator, ReportFormData, RequiredFields } from '../types';

const DEFAULT_REQUIRED: RequiredFields = {
  soHoSo: true,
  toBanDia: true,
  ngayHetThoiHieuTruyCuuTNHS: true,
  tinhChatMucDoNghiemTrong: true,
  trichYeu: false,
  qdPhanCongPTT: false,
  qdPhanCongLaiDTV: false,
  qdKhoiTo: false,
  tinhTrang: false,
  ketQuaGiaiQuyet: false,
  khoKhan: false,
};

const SEVERITY_PRESETS = [
  'Ít nghiêm trọng',
  'Nghiêm trọng',
  'Rất nghiêm trọng',
  'Đặc biệt nghiêm trọng',
] as const;

// FormState cho phép toBanDia = '' (chưa chọn)
type FormState = Omit<ReportFormData, 'toBanDia'> & {
  toBanDia: 'Hoà Bình' | 'Lạc Thuỷ' | '';
};

const EMPTY_FORM: FormState = {
  dtvName: '',
  nguoiCamHoSo: '',
  loaiHoSo: 'AK',
  soTap: '',
  soHoSo: '',
  soLuu: '',
  qdPhanCongPTT: '',
  qdPhanCongLaiDTV: '',
  qdKhoiTo: '',
  hoSoHienHanh: false,
  trichYeu: '',
  doi: 'Đội 2',
  toBanDia: '',
  tinhTrang: '',
  ketQuaGiaiQuyet: '',
  ngayHetThoiHieuTruyCuuTNHS: '',
  daThucHien: false,
  tinhChatMucDoNghiemTrong: '',
  khoKhan: '',
};

function hasLocationKeyword(text: string): boolean {
  const t = text.toLowerCase().normalize('NFC');
  return (
    t.includes('phường') ||
    t.includes('phuong') ||
    t.includes('xã ') ||
    t.includes(' xã') ||
    t.startsWith('xã') ||
    t.includes('thị trấn') ||
    t.includes('thi tran') ||
    t.includes('thôn') ||
    t.includes('huyện') ||
    t.includes('quận')
  );
}

interface Props {
  investigators: Investigator[];
  editingReport: Report | null;
  prefillDTV?: string;
  requiredFields?: Partial<RequiredFields>;
  onSubmit: (data: ReportFormData) => Promise<void>;
  onCancel: () => void;
}

export default function ReportForm({
  investigators,
  editingReport,
  prefillDTV,
  requiredFields,
  onSubmit,
  onCancel,
}: Props) {
  const req: RequiredFields = { ...DEFAULT_REQUIRED, ...requiredFields };
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSubmitted(false);
    if (editingReport) {
      setForm({
        dtvName: editingReport.dtvName,
        nguoiCamHoSo: editingReport.nguoiCamHoSo,
        loaiHoSo: editingReport.loaiHoSo,
        soTap: editingReport.soTap,
        soHoSo: editingReport.soHoSo,
        soLuu: editingReport.soLuu,
        qdPhanCongPTT: editingReport.qdPhanCongPTT || '',
        qdPhanCongLaiDTV: editingReport.qdPhanCongLaiDTV || '',
        qdKhoiTo: editingReport.qdKhoiTo || '',
        hoSoHienHanh: editingReport.hoSoHienHanh,
        trichYeu: editingReport.trichYeu || '',
        doi: editingReport.doi,
        toBanDia: editingReport.toBanDia ?? '',
        tinhTrang: editingReport.tinhTrang,
        ketQuaGiaiQuyet: editingReport.ketQuaGiaiQuyet || '',
        ngayHetThoiHieuTruyCuuTNHS: editingReport.ngayHetThoiHieuTruyCuuTNHS,
        daThucHien: editingReport.daThucHien || false,
        tinhChatMucDoNghiemTrong: editingReport.tinhChatMucDoNghiemTrong || '',
        khoKhan: editingReport.khoKhan,
      });
    } else {
      setForm({ ...EMPTY_FORM, dtvName: prefillDTV || '' });
    }
  }, [editingReport, prefillDTV]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Inline validation
  const trichYeuInvalid =
    submitted && (
      (req.trichYeu && !form.trichYeu.trim()) ||
      (form.trichYeu.trim().length > 0 && !hasLocationKeyword(form.trichYeu))
    );

  const toBanDiaInvalid = submitted && req.toBanDia && !form.toBanDia;
  const soHoSoInvalid = submitted && req.soHoSo && !form.soHoSo.trim();
  const tinhChatInvalid = submitted && req.tinhChatMucDoNghiemTrong && !form.tinhChatMucDoNghiemTrong.trim();
  const ngayInvalid = submitted && req.ngayHetThoiHieuTruyCuuTNHS && !form.ngayHetThoiHieuTruyCuuTNHS;
  const qdPTTInvalid = submitted && req.qdPhanCongPTT && !form.qdPhanCongPTT.trim();
  const qdDTVInvalid = submitted && req.qdPhanCongLaiDTV && !form.qdPhanCongLaiDTV.trim();
  const qdKhoiToInvalid = submitted && req.qdKhoiTo && form.loaiHoSo === 'AK' && !form.qdKhoiTo.trim();
  const tinhTrangInvalid = submitted && req.tinhTrang && !form.tinhTrang.trim();
  const ketQuaInvalid = submitted && req.ketQuaGiaiQuyet && !form.ketQuaGiaiQuyet.trim();
  const khoKhanInvalid = submitted && req.khoKhan && !form.khoKhan.trim();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);

    if (!form.dtvName.trim()) { alert('Vui lòng nhập họ tên ĐTV'); return; }
    if (req.soHoSo && !form.soHoSo.trim()) return;
    if (req.tinhChatMucDoNghiemTrong && !form.tinhChatMucDoNghiemTrong.trim()) return;
    if (req.ngayHetThoiHieuTruyCuuTNHS && !form.ngayHetThoiHieuTruyCuuTNHS) return;
    if (req.toBanDia && !form.toBanDia) return;
    if (req.qdPhanCongPTT && !form.qdPhanCongPTT.trim()) return;
    if (req.qdPhanCongLaiDTV && !form.qdPhanCongLaiDTV.trim()) return;
    if (req.qdKhoiTo && form.loaiHoSo === 'AK' && !form.qdKhoiTo.trim()) return;
    if (req.tinhTrang && !form.tinhTrang.trim()) return;
    if (req.ketQuaGiaiQuyet && !form.ketQuaGiaiQuyet.trim()) return;
    if (req.khoKhan && !form.khoKhan.trim()) return;
    if (req.trichYeu && !form.trichYeu.trim()) return;

    // Block nếu trích yếu không có địa danh (dù bắt buộc hay không)
    if (form.trichYeu.trim() && !hasLocationKeyword(form.trichYeu)) return;

    const data: ReportFormData = {
      ...(form as ReportFormData),
      dtvName: form.dtvName.trim(),
      nguoiCamHoSo: form.nguoiCamHoSo.trim() || form.dtvName.trim(),
      tinhChatMucDoNghiemTrong: form.tinhChatMucDoNghiemTrong.trim(),
      toBanDia: form.toBanDia as 'Hoà Bình' | 'Lạc Thuỷ',
    };

    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const errStyle: React.CSSProperties = {
    fontSize: '0.76rem',
    color: '#ff4757',
    marginTop: 2,
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Họ tên ĐTV */}
      <div className="form-group">
        <label>Họ tên ĐTV</label>
        <input
          type="text"
          className="form-control"
          list="dtv-datalist"
          value={form.dtvName}
          onChange={(e) => setField('dtvName', e.target.value)}
          placeholder="Nhập tên ĐTV..."
          autoComplete="off"
        />
        <datalist id="dtv-datalist">
          {investigators.map((inv) => <option key={inv.id} value={inv.name} />)}
        </datalist>
      </div>

      {/* Người cầm */}
      <div className="form-group">
        <label>Người cầm hồ sơ</label>
        <input
          type="text"
          className="form-control"
          list="dtv-datalist"
          value={form.nguoiCamHoSo}
          onChange={(e) => setField('nguoiCamHoSo', e.target.value)}
          placeholder={`Để trống → tự điền "${form.dtvName || 'tên ĐTV'}"`}
          autoComplete="off"
        />
      </div>

      {/* Loại hồ sơ */}
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

      {/* Số tập / hồ sơ / lưu */}
      <div className="form-row">
        <div className="form-group">
          <label>Số tập</label>
          <input type="text" className="form-control" value={form.soTap}
            onChange={(e) => setField('soTap', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Số hồ sơ{req.soHoSo ? ' *' : ''}</label>
          <input type="text" className="form-control" value={form.soHoSo}
            onChange={(e) => setField('soHoSo', e.target.value)} />
          {soHoSoInvalid && <span style={errStyle}>Nhập đầy đủ thông tin</span>}
        </div>
        <div className="form-group">
          <label>Số lưu</label>
          <input type="text" className="form-control" value={form.soLuu}
            onChange={(e) => setField('soLuu', e.target.value)} />
          <label className="checkbox-row">
            <input type="checkbox" checked={form.hoSoHienHanh}
              onChange={(e) => setField('hoSoHienHanh', e.target.checked)} />
            <span>Hồ sơ hiện hành</span>
          </label>
        </div>
      </div>

      {/* QĐ phân công PTT */}
      <div className="form-group">
        <label>QĐ phân công PTT{req.qdPhanCongPTT ? ' *' : ''}</label>
        <input
          type="text"
          className="form-control"
          value={form.qdPhanCongPTT}
          onChange={(e) => setField('qdPhanCongPTT', e.target.value)}
          placeholder="Số/ký hiệu quyết định phân công PTT..."
          autoComplete="off"
        />
        {qdPTTInvalid && <span style={errStyle}>Nhập đầy đủ thông tin</span>}
      </div>

      {/* QĐ phân công lại ĐTV */}
      <div className="form-group">
        <label>QĐ phân công lại ĐTV{req.qdPhanCongLaiDTV ? ' *' : ''}</label>
        <input
          type="text"
          className="form-control"
          value={form.qdPhanCongLaiDTV}
          onChange={(e) => setField('qdPhanCongLaiDTV', e.target.value)}
          placeholder="Số/ký hiệu quyết định phân công lại ĐTV..."
          autoComplete="off"
        />
        {qdDTVInvalid && <span style={errStyle}>Nhập đầy đủ thông tin</span>}
      </div>

      {/* QĐ khởi tố — chỉ hiện với AK */}
      {form.loaiHoSo === 'AK' && (
        <div className="form-group">
          <label>Quyết định khởi tố{req.qdKhoiTo ? ' *' : ''}</label>
          <input
            type="text"
            className="form-control"
            value={form.qdKhoiTo}
            onChange={(e) => setField('qdKhoiTo', e.target.value)}
            placeholder="Số/ký hiệu quyết định khởi tố..."
            autoComplete="off"
          />
          {qdKhoiToInvalid && <span style={errStyle}>Nhập đầy đủ thông tin</span>}
        </div>
      )}

      {/* Trích yếu */}
      <div className="form-group">
        <label>Trích yếu{req.trichYeu ? ' *' : ''}</label>
        <textarea
          className="form-control"
          rows={3}
          value={form.trichYeu}
          onChange={(e) => setField('trichYeu', e.target.value)}
          placeholder='Tóm tắt nội dung vụ án/vụ việc hoặc trích yếu hồ sơ, không ghi chung chung "Lừa đảo chiếm đoạt tài sản" hoặc "Giết người"'
        />
        {trichYeuInvalid && (
          <span style={errStyle}>Nhập đầy đủ thông tin (cần có địa danh: phường/xã/thị trấn/huyện)</span>
        )}
      </div>

      {/* Đội */}
      <div className="form-group">
        <label>Hồ sơ thuộc lĩnh vực của</label>
        <select className="form-control" value={form.doi}
          onChange={(e) => setField('doi', e.target.value as ReportFormData['doi'])}>
          <option value="Đội 2">Đội 2</option>
          <option value="Đội 3">Đội 3</option>
          <option value="Đội 4">Đội 4</option>
        </select>
      </div>

      {/* Tổ địa bàn */}
      <div className="form-group">
        <label>Tổ địa bàn{req.toBanDia ? ' *' : ''}</label>
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
        {toBanDiaInvalid && <span style={errStyle}>Nhập đầy đủ thông tin</span>}
      </div>

      {/* Ngày hết thời hiệu */}
      <div className="form-group">
        <label>Ngày hết thời hiệu truy cứu TNHS{req.ngayHetThoiHieuTruyCuuTNHS ? ' *' : ''}</label>
        <input
          type="date"
          className="form-control"
          value={form.ngayHetThoiHieuTruyCuuTNHS}
          onChange={(e) => setField('ngayHetThoiHieuTruyCuuTNHS', e.target.value)}
        />
        {ngayInvalid && <span style={errStyle}>Nhập đầy đủ thông tin</span>}
        <label className="checkbox-row" style={{ marginTop: 8 }}>
          <input
            type="checkbox"
            checked={form.daThucHien}
            onChange={(e) => setField('daThucHien', e.target.checked)}
          />
          <span>Đã thực hiện (bỏ cảnh báo thời hiệu)</span>
        </label>
      </div>

      {/* Tính chất */}
      <div className="form-group">
        <label>Tính chất, mức độ nghiêm trọng{req.tinhChatMucDoNghiemTrong ? ' *' : ''}</label>
        <input
          type="text"
          className="form-control"
          list="severity-datalist"
          value={form.tinhChatMucDoNghiemTrong}
          onChange={(e) => setField('tinhChatMucDoNghiemTrong', e.target.value)}
          placeholder="nhập tay hoặc chọn"
          autoComplete="off"
        />
        <datalist id="severity-datalist">
          {SEVERITY_PRESETS.map((s) => <option key={s} value={s} />)}
        </datalist>
        {tinhChatInvalid && <span style={errStyle}>Nhập đầy đủ thông tin</span>}
      </div>

      {/* Tình trạng */}
      <div className="form-group">
        <label>Tình trạng hiện tại{req.tinhTrang ? ' *' : ''}</label>
        <input
          type="text"
          className="form-control"
          list="tinhtrang-datalist"
          value={form.tinhTrang}
          onChange={(e) => setField('tinhTrang', e.target.value)}
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
        {tinhTrangInvalid && <span style={errStyle}>Nhập đầy đủ thông tin</span>}
      </div>

      {/* Kết quả */}
      <div className="form-group">
        <label>Kết quả giải quyết{req.ketQuaGiaiQuyet ? ' *' : ''}</label>
        <input
          type="text"
          className="form-control"
          value={form.ketQuaGiaiQuyet}
          onChange={(e) => setField('ketQuaGiaiQuyet', e.target.value)}
          placeholder="Nhập kết quả giải quyết..."
          autoComplete="off"
        />
        {ketQuaInvalid && <span style={errStyle}>Nhập đầy đủ thông tin</span>}
      </div>

      {/* Khó khăn */}
      <div className="form-group">
        <label>Khó khăn, vướng mắc, đề xuất{req.khoKhan ? ' *' : ''}</label>
        <textarea
          className="form-control"
          rows={3}
          value={form.khoKhan}
          onChange={(e) => setField('khoKhan', e.target.value)}
          placeholder="Không tìm thấy trên phần mềm ĐTHS, Không có đầy đủ tài liệu v.v..."
        />
        {khoKhanInvalid && <span style={errStyle}>Nhập đầy đủ thông tin</span>}
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
