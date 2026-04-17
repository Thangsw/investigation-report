const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3001;

const DATA_DIR = process.env.DATA_DIR || __dirname;
const reportsFile      = path.join(DATA_DIR, 'reports.json');
const investigatorsFile = path.join(DATA_DIR, 'investigators.json');

// Middleware
app.use(cors());
app.use(express.json());

// Đảm bảo thư mục DATA_DIR tồn tại
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── Data helpers ──────────────────────────────────────────────────────────────
const readReports = () => {
  if (!fs.existsSync(reportsFile)) return [];
  return JSON.parse(fs.readFileSync(reportsFile, 'utf8'));
};
const writeReports = (data) => {
  fs.writeFileSync(reportsFile, JSON.stringify(data, null, 2));
};

const readInvestigators = () => {
  if (!fs.existsSync(investigatorsFile)) return [];
  return JSON.parse(fs.readFileSync(investigatorsFile, 'utf8'));
};
const writeInvestigators = (data) => {
  fs.writeFileSync(investigatorsFile, JSON.stringify(data, null, 2));
};

// ── REPORTS ───────────────────────────────────────────────────────────────────

// PHẢI đứng trước /api/reports/:id để Express không nhầm "export" là :id
app.get('/api/reports/export', (req, res) => {
  try {
    const reports = readReports();

    const wsData = [
      [
        'STT', 'Họ tên ĐTV', 'Người cầm hồ sơ', 'Loại hồ sơ',
        'Số tập', 'Số hồ sơ', 'Số lưu', 'Trích yếu',
        'Hồ sơ thuộc lĩnh vực', 'Tình trạng hiện tại',
        'Thời hạn đình chỉ', 'Khó khăn/Vướng mắc/Đề xuất', 'Ngày tạo'
      ],
      ...reports.map((r, i) => [
        i + 1,
        r.dtvName,
        r.nguoiCamHoSo,
        r.loaiHoSo,
        r.soTap,
        r.soHoSo,
        r.soLuu,
        r.trichYeu        || '',
        r.doi,
        r.tinhTrang,
        r.thoiHanDinhChi,
        r.khoKhan,
        new Date(r.createdAt).toLocaleDateString('vi-VN')
      ])
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Độ rộng cột tự động
    ws['!cols'] = [
      { wch: 4 }, { wch: 22 }, { wch: 22 }, { wch: 10 },
      { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 35 },
      { wch: 18 }, { wch: 25 }, { wch: 20 }, { wch: 35 }, { wch: 12 }
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

app.get('/api/reports', (req, res) => {
  try {
    const reports = readReports();
    reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi đọc dữ liệu' });
  }
});

app.post('/api/reports', (req, res) => {
  try {
    const reports = readReports();
    const b = req.body;
    const thoiHanDinhChi = b.thoiHanDinhChi || '';

    if (!b.dtvName || !b.loaiHoSo || !b.doi) {
      return res.status(400).json({ error: 'Thiếu trường bắt buộc: dtvName, loaiHoSo, doi' });
    }
    if (b.loaiHoSo === 'AD' && !thoiHanDinhChi) {
      return res.status(400).json({ error: 'Hồ sơ AD bắt buộc phải có thời hạn đình chỉ' });
    }

    const now = new Date().toISOString();
    const newReport = {
      id: Date.now().toString(),
      dtvName:         b.dtvName,
      nguoiCamHoSo:    b.nguoiCamHoSo?.trim() || b.dtvName,
      loaiHoSo:        b.loaiHoSo,
      soTap:           b.soTap           || '',
      soHoSo:          b.soHoSo          || '',
      soLuu:           b.soLuu           || '',
      trichYeu:        b.trichYeu        || '',
      doi:             b.doi,
      tinhTrang:       b.tinhTrang       || '',
      thoiHanDinhChi,
      khoKhan:         b.khoKhan         || '',
      createdAt:       now,
      updatedAt:       now,
    };

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
    const idx = reports.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy hồ sơ' });

    const b = req.body;
    const existing = reports[idx];
    const nextLoaiHoSo = b.loaiHoSo ?? existing.loaiHoSo;
    const nextThoiHanDinhChi = b.thoiHanDinhChi ?? existing.thoiHanDinhChi;

    if (nextLoaiHoSo === 'AD' && !nextThoiHanDinhChi) {
      return res.status(400).json({ error: 'Hồ sơ AD bắt buộc phải có thời hạn đình chỉ' });
    }

    const updated = {
      ...existing,
      dtvName:        b.dtvName        ?? existing.dtvName,
      nguoiCamHoSo:   (b.nguoiCamHoSo?.trim()) || (b.dtvName ?? existing.dtvName),
      loaiHoSo:       nextLoaiHoSo,
      soTap:          b.soTap          ?? existing.soTap,
      soHoSo:         b.soHoSo         ?? existing.soHoSo,
      soLuu:          b.soLuu          ?? existing.soLuu,
      trichYeu:       b.trichYeu       ?? existing.trichYeu ?? '',
      doi:            b.doi            ?? existing.doi,
      tinhTrang:      b.tinhTrang      ?? existing.tinhTrang,
      thoiHanDinhChi: nextThoiHanDinhChi,
      khoKhan:        b.khoKhan        ?? existing.khoKhan,
      updatedAt:      new Date().toISOString(),
    };

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
    writeReports(reports.filter(r => r.id !== req.params.id));
    res.json({ message: 'Xóa thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi xóa dữ liệu' });
  }
});

// ── INVESTIGATORS ─────────────────────────────────────────────────────────────

app.get('/api/investigators', (req, res) => {
  try {
    res.json(readInvestigators());
  } catch (err) {
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
    const idx = investigators.findIndex(d => d.id === req.params.id);
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
    writeInvestigators(investigators.filter(d => d.id !== req.params.id));
    res.json({ message: 'Xóa thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi xóa ĐTV' });
  }
});

// ── Serve React build ─────────────────────────────────────────────────────────
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
