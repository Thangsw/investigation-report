const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3001;

const DATA_DIR = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const reportsFile = path.join(DATA_DIR, 'reports.json');
const investigatorsFile = path.join(DATA_DIR, 'investigators.json');

app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const normalizeReport = (raw = {}) => {
  const createdAt = raw.createdAt || new Date().toISOString();

  return {
    id: raw.id || Date.now().toString(),
    dtvName: raw.dtvName || '',
    nguoiCamHoSo: raw.nguoiCamHoSo?.trim() || raw.dtvName || '',
    loaiHoSo: raw.loaiHoSo === 'AD' ? 'AD' : 'AK',
    soTap: raw.soTap || '',
    soHoSo: raw.soHoSo || '',
    soLuu: raw.soLuu || '',
    trichYeu: raw.trichYeu || '',
    doi: raw.doi || 'Đội 2',
    tinhTrang: raw.tinhTrang || '',
    ngayHetThoiHieuTruyCuuTNHS: raw.ngayHetThoiHieuTruyCuuTNHS || raw.thoiHanDinhChi || '',
    tinhChatMucDoNghiemTrong: raw.tinhChatMucDoNghiemTrong || '',
    khoKhan: raw.khoKhan || '',
    createdAt,
    updatedAt: raw.updatedAt || createdAt,
  };
};

const readReports = () => {
  if (!fs.existsSync(reportsFile)) return [];
  return JSON.parse(fs.readFileSync(reportsFile, 'utf8')).map(normalizeReport);
};

const writeReports = (data) => {
  fs.writeFileSync(reportsFile, JSON.stringify(data.map(normalizeReport), null, 2));
};

const readInvestigators = () => {
  if (!fs.existsSync(investigatorsFile)) return [];
  return JSON.parse(fs.readFileSync(investigatorsFile, 'utf8'));
};

const writeInvestigators = (data) => {
  fs.writeFileSync(investigatorsFile, JSON.stringify(data, null, 2));
};

app.get('/api/reports/export', (_req, res) => {
  try {
    const reports = readReports();

    const wsData = [
      [
        'STT',
        'Họ tên ĐTV',
        'Người cầm hồ sơ',
        'Loại hồ sơ',
        'Số tập',
        'Số hồ sơ',
        'Số lưu',
        'Trích yếu',
        'Hồ sơ thuộc lĩnh vực',
        'Ngày hết thời hiệu truy cứu TNHS',
        'Tính chất, mức độ nghiêm trọng',
        'Tình trạng hiện tại',
        'Khó khăn/Vướng mắc/Đề xuất',
        'Ngày tạo',
      ],
      ...reports.map((report, index) => [
        index + 1,
        report.dtvName,
        report.nguoiCamHoSo,
        report.loaiHoSo,
        report.soTap,
        report.soHoSo,
        report.soLuu,
        report.trichYeu || '',
        report.doi,
        report.ngayHetThoiHieuTruyCuuTNHS,
        report.tinhChatMucDoNghiemTrong || '',
        report.tinhTrang,
        report.khoKhan,
        new Date(report.createdAt).toLocaleDateString('vi-VN'),
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 4 },
      { wch: 22 },
      { wch: 22 },
      { wch: 10 },
      { wch: 8 },
      { wch: 14 },
      { wch: 10 },
      { wch: 35 },
      { wch: 18 },
      { wch: 18 },
      { wch: 24 },
      { wch: 25 },
      { wch: 35 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Hồ sơ');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="ho-so-dieu-tra.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi xuất Excel' });
  }
});

app.get('/api/reports', (_req, res) => {
  try {
    const reports = readReports();
    reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(reports);
  } catch (_err) {
    res.status(500).json({ error: 'Lỗi đọc dữ liệu' });
  }
});

app.post('/api/reports', (req, res) => {
  try {
    const reports = readReports();
    const body = req.body;
    const ngayHetThoiHieuTruyCuuTNHS = body.ngayHetThoiHieuTruyCuuTNHS || body.thoiHanDinhChi || '';

    if (!body.dtvName || !body.loaiHoSo || !body.doi) {
      return res.status(400).json({ error: 'Thiếu trường bắt buộc: dtvName, loaiHoSo, doi' });
    }

    if (body.loaiHoSo === 'AD' && !ngayHetThoiHieuTruyCuuTNHS) {
      return res.status(400).json({ error: 'Hồ sơ AD bắt buộc phải có ngày hết thời hiệu truy cứu TNHS' });
    }

    const now = new Date().toISOString();
    const newReport = normalizeReport({
      id: Date.now().toString(),
      dtvName: body.dtvName,
      nguoiCamHoSo: body.nguoiCamHoSo?.trim() || body.dtvName,
      loaiHoSo: body.loaiHoSo,
      soTap: body.soTap || '',
      soHoSo: body.soHoSo || '',
      soLuu: body.soLuu || '',
      trichYeu: body.trichYeu || '',
      doi: body.doi,
      tinhTrang: body.tinhTrang || '',
      ngayHetThoiHieuTruyCuuTNHS,
      tinhChatMucDoNghiemTrong: body.tinhChatMucDoNghiemTrong || '',
      khoKhan: body.khoKhan || '',
      createdAt: now,
      updatedAt: now,
    });

    reports.push(newReport);
    writeReports(reports);
    res.status(201).json({ message: 'Thêm hồ sơ thành công', data: newReport });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi ghi dữ liệu' });
  }
});

app.put('/api/reports/:id', (req, res) => {
  try {
    const reports = readReports();
    const idx = reports.findIndex((report) => report.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy hồ sơ' });

    const body = req.body;
    const existing = reports[idx];
    const nextLoaiHoSo = body.loaiHoSo ?? existing.loaiHoSo;
    const nextNgayHetThoiHieuTruyCuuTNHS =
      body.ngayHetThoiHieuTruyCuuTNHS ??
      body.thoiHanDinhChi ??
      existing.ngayHetThoiHieuTruyCuuTNHS ??
      '';

    if (nextLoaiHoSo === 'AD' && !nextNgayHetThoiHieuTruyCuuTNHS) {
      return res.status(400).json({ error: 'Hồ sơ AD bắt buộc phải có ngày hết thời hiệu truy cứu TNHS' });
    }

    const updated = normalizeReport({
      ...existing,
      dtvName: body.dtvName ?? existing.dtvName,
      nguoiCamHoSo: body.nguoiCamHoSo?.trim() || body.dtvName || existing.dtvName,
      loaiHoSo: nextLoaiHoSo,
      soTap: body.soTap ?? existing.soTap,
      soHoSo: body.soHoSo ?? existing.soHoSo,
      soLuu: body.soLuu ?? existing.soLuu,
      trichYeu: body.trichYeu ?? existing.trichYeu ?? '',
      doi: body.doi ?? existing.doi,
      tinhTrang: body.tinhTrang ?? existing.tinhTrang,
      ngayHetThoiHieuTruyCuuTNHS: nextNgayHetThoiHieuTruyCuuTNHS,
      tinhChatMucDoNghiemTrong:
        body.tinhChatMucDoNghiemTrong ?? existing.tinhChatMucDoNghiemTrong ?? '',
      khoKhan: body.khoKhan ?? existing.khoKhan,
      updatedAt: new Date().toISOString(),
    });

    reports[idx] = updated;
    writeReports(reports);
    res.json({ message: 'Cập nhật thành công', data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi cập nhật dữ liệu' });
  }
});

app.delete('/api/reports/:id', (req, res) => {
  try {
    const reports = readReports();
    writeReports(reports.filter((report) => report.id !== req.params.id));
    res.json({ message: 'Xóa thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi xóa dữ liệu' });
  }
});

app.get('/api/investigators', (_req, res) => {
  try {
    res.json(readInvestigators());
  } catch (_err) {
    res.status(500).json({ error: 'Lỗi đọc danh sách ĐTV' });
  }
});

app.post('/api/investigators', (req, res) => {
  try {
    const investigators = readInvestigators();
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ error: 'Tên ĐTV không được để trống' });

    const newDTV = { id: Date.now().toString(), name };
    investigators.push(newDTV);
    writeInvestigators(investigators);
    res.status(201).json({ message: 'Thêm ĐTV thành công', data: newDTV });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi thêm ĐTV' });
  }
});

app.put('/api/investigators/:id', (req, res) => {
  try {
    const investigators = readInvestigators();
    const idx = investigators.findIndex((investigator) => investigator.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy ĐTV' });

    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ error: 'Tên ĐTV không được để trống' });

    investigators[idx] = { ...investigators[idx], name };
    writeInvestigators(investigators);
    res.json({ message: 'Cập nhật thành công', data: investigators[idx] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi cập nhật ĐTV' });
  }
});

app.delete('/api/investigators/:id', (req, res) => {
  try {
    const investigators = readInvestigators();
    writeInvestigators(investigators.filter((investigator) => investigator.id !== req.params.id));
    res.json({ message: 'Xóa thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi xóa ĐTV' });
  }
});

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Investigation Report Backend running on http://localhost:${PORT}`);
});
