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
const configFile = path.join(DATA_DIR, 'config.json');
const pendingChangesFile = path.join(DATA_DIR, 'pending-changes.json');

const DEFAULT_CONFIG = {
  totalCaseTarget: 610,
  totalCaseTargetHB: 0,
  totalCaseTargetLT: 0,
  akTarget: 372,
  adTarget: 238,
  statsToBanDia: '',
  sheetsViewUrl: '',
  requiredFields: {
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
  },
};
const readConfig = () => {
  if (!fs.existsSync(configFile)) return { ...DEFAULT_CONFIG };
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configFile, 'utf8')) }; }
  catch { return { ...DEFAULT_CONFIG }; }
};
const writeConfig = (data) => fs.writeFileSync(configFile, JSON.stringify(data, null, 2));

app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const normalizeReport = (raw = {}) => {
  const createdAt = raw.createdAt || new Date().toISOString();
  const hoSoHienHanh = raw.hoSoHienHanh === true || raw.hoSoHienHanh === 'true';
  const daThucHien = raw.daThucHien === true || raw.daThucHien === 'true';

  return {
    id: raw.id || Date.now().toString(),
    dtvName: raw.dtvName || '',
    nguoiCamHoSo: raw.nguoiCamHoSo?.trim() || raw.dtvName || '',
    loaiHoSo: raw.loaiHoSo === 'AD' ? 'AD' : 'AK',
    soTap: raw.soTap || '',
    soHoSo: raw.soHoSo || '',
    soLuu: raw.soLuu || '',
    qdPhanCongPTT: raw.qdPhanCongPTT || '',
    qdPhanCongLaiDTV: raw.qdPhanCongLaiDTV || '',
    qdKhoiTo: raw.qdKhoiTo || '',
    hoSoHienHanh,
    daThucHien,
    trichYeu: raw.trichYeu || '',
    doi: raw.doi || 'Đội 2',
    toBanDia: ['Hoà Bình', 'Lạc Thuỷ'].includes(raw.toBanDia) ? raw.toBanDia : 'Hoà Bình',
    tinhTrang: raw.tinhTrang || '',
    ketQuaGiaiQuyet: raw.ketQuaGiaiQuyet || '',
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
  syncToGoogleSheets(data).catch(() => {}); // fire-and-forget, không chặn response
};

// ── Google Sheets backup (qua Apps Script web app) ────────────────────────────
// Đặt GOOGLE_SHEETS_WEBHOOK_URL trong Railway Variables để bật tính năng này.
const SHEETS_WEBHOOK = process.env.GOOGLE_SHEETS_WEBHOOK_URL || '';

function syncToGoogleSheets(reports) {
  if (!SHEETS_WEBHOOK) return Promise.resolve();
  const url = new URL(SHEETS_WEBHOOK);
  const body = JSON.stringify({ reports });
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body, 'utf8'),
    },
  };
  const lib = url.protocol === 'https:' ? require('https') : require('http');
  return new Promise((resolve) => {
    const req = lib.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.on('error', resolve);
    req.write(body);
    req.end();
  });
}

const readInvestigators = () => {
  if (!fs.existsSync(investigatorsFile)) return [];
  return JSON.parse(fs.readFileSync(investigatorsFile, 'utf8'));
};

const writeInvestigators = (data) => {
  fs.writeFileSync(investigatorsFile, JSON.stringify(data, null, 2));
};

const readPendingChanges = () => {
  if (!fs.existsSync(pendingChangesFile)) return [];
  try { return JSON.parse(fs.readFileSync(pendingChangesFile, 'utf8')); }
  catch { return []; }
};
const writePendingChanges = (data) => {
  fs.writeFileSync(pendingChangesFile, JSON.stringify(data, null, 2));
};

app.get('/api/reports/export', (req, res) => {
  try {
    let reports = readReports();

    // Optional query-param filtering
    const { dtvName, loaiHoSo, doi, toBanDia, ids } = req.query;
    if (ids) {
      const idSet = new Set(String(ids).split(','));
      reports = reports.filter(r => idSet.has(r.id));
    } else {
      if (dtvName)   reports = reports.filter(r => r.dtvName === dtvName);
      if (loaiHoSo)  reports = reports.filter(r => r.loaiHoSo === loaiHoSo);
      if (doi)       reports = reports.filter(r => r.doi === doi);
      if (toBanDia)  reports = reports.filter(r => r.toBanDia === toBanDia);
    }

    const wsData = [
      [
        'STT',
        'Họ tên ĐTV',
        'Người cầm hồ sơ',
        'Loại hồ sơ',
        'Số tập',
        'Số hồ sơ',
        'Số lưu',
        'QĐ phân công PTT',
        'QĐ phân công lại ĐTV',
        'QĐ khởi tố',
        'Hồ sơ hiện hành',
        'Trích yếu',
        'Hồ sơ thuộc lĩnh vực',
        'Tổ địa bàn',
        'Ngày hết thời hiệu truy cứu TNHS',
        'Tính chất, mức độ nghiêm trọng',
        'Tình trạng hiện tại',
        'Kết quả giải quyết',
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
        report.qdPhanCongPTT || '',
        report.qdPhanCongLaiDTV || '',
        report.qdKhoiTo || '',
        report.hoSoHienHanh ? '✓' : '',
        report.trichYeu || '',
        report.doi,
        report.toBanDia || 'Hoà Bình',
        report.ngayHetThoiHieuTruyCuuTNHS,
        report.tinhChatMucDoNghiemTrong || '',
        report.tinhTrang,
        report.ketQuaGiaiQuyet || '',
        report.khoKhan,
        new Date(report.createdAt).toLocaleDateString('vi-VN'),
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 4 },   // STT
      { wch: 22 },  // dtvName
      { wch: 22 },  // nguoiCamHoSo
      { wch: 10 },  // loaiHoSo
      { wch: 8 },   // soTap
      { wch: 14 },  // soHoSo
      { wch: 10 },  // soLuu
      { wch: 18 },  // qdPhanCongPTT
      { wch: 22 },  // qdPhanCongLaiDTV
      { wch: 18 },  // qdKhoiTo
      { wch: 14 },  // hoSoHienHanh
      { wch: 35 },  // trichYeu
      { wch: 18 },  // doi
      { wch: 14 },  // toBanDia
      { wch: 18 },  // ngayHetThoiHieu
      { wch: 24 },  // tinhChat
      { wch: 25 },  // tinhTrang
      { wch: 25 },  // ketQua
      { wch: 35 },  // khoKhan
      { wch: 12 },  // createdAt
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
      qdPhanCongPTT: body.qdPhanCongPTT || '',
      qdPhanCongLaiDTV: body.qdPhanCongLaiDTV || '',
      qdKhoiTo: body.qdKhoiTo || '',
      hoSoHienHanh: Boolean(body.hoSoHienHanh),
      trichYeu: body.trichYeu || '',
      doi: body.doi,
      toBanDia: body.toBanDia || 'Hoà Bình',
      tinhTrang: body.tinhTrang || '',
      ketQuaGiaiQuyet: body.ketQuaGiaiQuyet || '',
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
      qdPhanCongPTT: body.qdPhanCongPTT ?? existing.qdPhanCongPTT ?? '',
      qdPhanCongLaiDTV: body.qdPhanCongLaiDTV ?? existing.qdPhanCongLaiDTV ?? '',
      qdKhoiTo: body.qdKhoiTo ?? existing.qdKhoiTo ?? '',
      hoSoHienHanh: body.hoSoHienHanh ?? existing.hoSoHienHanh ?? false,
      trichYeu: body.trichYeu ?? existing.trichYeu ?? '',
      doi: body.doi ?? existing.doi,
      toBanDia: body.toBanDia ?? existing.toBanDia ?? 'Hoà Bình',
      tinhTrang: body.tinhTrang ?? existing.tinhTrang,
      ketQuaGiaiQuyet: body.ketQuaGiaiQuyet ?? existing.ketQuaGiaiQuyet ?? '',
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

app.get('/api/config', (_req, res) => {
  const cfg = readConfig();
  // Env var takes priority over admin-configured URL
  if (process.env.GOOGLE_SHEETS_VIEW_URL) {
    cfg.sheetsViewUrl = process.env.GOOGLE_SHEETS_VIEW_URL;
  }
  res.json(cfg);
});

app.post('/api/config', (req, res) => {
  try {
    const current = readConfig();
    const updated = { ...current };
    if (typeof req.body.totalCaseTargetHB === 'number' && req.body.totalCaseTargetHB >= 0) updated.totalCaseTargetHB = Math.round(req.body.totalCaseTargetHB);
    if (typeof req.body.totalCaseTargetLT === 'number' && req.body.totalCaseTargetLT >= 0) updated.totalCaseTargetLT = Math.round(req.body.totalCaseTargetLT);
    updated.totalCaseTarget = (updated.totalCaseTargetHB || 0) + (updated.totalCaseTargetLT || 0) || updated.totalCaseTarget;
    if (typeof req.body.akTarget === 'number' && req.body.akTarget >= 0) updated.akTarget = Math.round(req.body.akTarget);
    if (typeof req.body.adTarget === 'number' && req.body.adTarget >= 0) updated.adTarget = Math.round(req.body.adTarget);
    if (['', 'Hoà Bình', 'Lạc Thuỷ'].includes(req.body.statsToBanDia)) updated.statsToBanDia = req.body.statsToBanDia;
    if (typeof req.body.sheetsViewUrl === 'string') updated.sheetsViewUrl = req.body.sheetsViewUrl.trim();
    if (req.body.requiredFields && typeof req.body.requiredFields === 'object') {
      updated.requiredFields = { ...DEFAULT_CONFIG.requiredFields, ...req.body.requiredFields };
    }
    writeConfig(updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lưu cấu hình' });
  }
});

// ── Pending Changes ───────────────────────────────────────────────────────────

app.get('/api/pending-changes', (_req, res) => {
  try {
    const changes = readPendingChanges();
    changes.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    res.json(changes);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi đọc danh sách yêu cầu' });
  }
});

app.post('/api/pending-changes', (req, res) => {
  try {
    const { type, reportId, reportSnapshot, newData, requestedBy } = req.body;
    if (!type || !reportId || !reportSnapshot || !requestedBy) {
      return res.status(400).json({ error: 'Thiếu thông tin yêu cầu' });
    }
    // Replace any existing pending change for the same report (keep only latest request)
    let changes = readPendingChanges();
    changes = changes.filter((c) => !(c.reportId === reportId && c.status === 'pending'));
    const entry = {
      id: Date.now().toString(),
      type,
      reportId,
      reportSnapshot,
      newData: newData || null,
      requestedBy,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    changes.push(entry);
    writePendingChanges(changes);
    res.status(201).json({ message: 'Yêu cầu đã được gửi', data: entry });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi gửi yêu cầu' });
  }
});

app.put('/api/pending-changes/:id/approve', (req, res) => {
  try {
    const changes = readPendingChanges();
    const idx = changes.findIndex((c) => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });

    const entry = changes[idx];
    if (entry.status !== 'pending') return res.status(400).json({ error: 'Yêu cầu đã được xử lý' });

    const reports = readReports();
    if (entry.type === 'delete') {
      writeReports(reports.filter((r) => r.id !== entry.reportId));
    } else if (entry.type === 'edit' && entry.newData) {
      const rIdx = reports.findIndex((r) => r.id === entry.reportId);
      if (rIdx !== -1) {
        reports[rIdx] = normalizeReport({ ...reports[rIdx], ...entry.newData, updatedAt: new Date().toISOString() });
        writeReports(reports);
      }
    }

    changes[idx] = { ...entry, status: 'approved' };
    writePendingChanges(changes);
    res.json({ message: 'Đã phê duyệt', data: changes[idx] });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi phê duyệt' });
  }
});

app.put('/api/pending-changes/:id/reject', (req, res) => {
  try {
    const changes = readPendingChanges();
    const idx = changes.findIndex((c) => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy yêu cầu' });

    const entry = changes[idx];
    if (entry.status !== 'pending') return res.status(400).json({ error: 'Yêu cầu đã được xử lý' });

    changes[idx] = { ...entry, status: 'rejected' };
    writePendingChanges(changes);
    res.json({ message: 'Đã từ chối', data: changes[idx] });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi từ chối' });
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
