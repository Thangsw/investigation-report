const express = require('express');
const cors = require('cors');
const compression = require('compression');
const crypto = require('crypto');
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
const workProgressFile = path.join(DATA_DIR, 'work-progress-reports.json');
const vneidActivationsFile = path.join(DATA_DIR, 'vneid-activations.json');
const vneidIssuesFile = path.join(DATA_DIR, 'vneid-issues.json');
const vneidAccessLogFile = path.join(DATA_DIR, 'vneid-access-log.json');

// Admin name key (không dấu, lowercase, không cấp bậc)
const VNEID_ADMIN_KEY = 'do duc thang';

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

// ── VNeID: officer roster + badge auth ────────────────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT);
// Ưu tiên biến môi trường; nếu không có, tự sinh secret mạnh và lưu bền trên Volume /data.
// Nhờ vậy production vẫn an toàn mà không bắt buộc phải cấu hình biến tay.
const vneidSecretFile = path.join(DATA_DIR, 'vneid-secret.txt');
const resolveVneidSecret = () => {
  if (process.env.VNEID_SECRET) return process.env.VNEID_SECRET;
  try {
    if (fs.existsSync(vneidSecretFile)) {
      const saved = fs.readFileSync(vneidSecretFile, 'utf8').trim();
      if (saved) return saved;
    }
  } catch { /* rơi xuống nhánh tạo mới */ }
  const generated = crypto.randomBytes(48).toString('base64url');
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(vneidSecretFile, generated, { mode: 0o600 });
  } catch (err) {
    console.warn('VNeID: không lưu được secret ra đĩa, dùng secret tạm trong RAM —', err.message);
  }
  return generated;
};
const VNEID_SECRET = resolveVneidSecret();
const VNEID_COOKIE = 'vneid_session';
const VNEID_SESSION_DAYS = 30;

// Bỏ dấu tiếng Việt + cấp bậc, lowercase, gộp khoảng trắng → khoá so khớp tên
const VNEID_RANKS = ['thượng tá', 'trung tá', 'thiếu tá', 'đại tá', 'đại úy', 'thượng úy', 'trung úy', 'thiếu úy'];
const stripDiacritics = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
const normOfficerName = (raw) => {
  let s = String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
  for (const r of VNEID_RANKS) {
    if (s.startsWith(r + ' ')) { s = s.slice(r.length).trim(); break; }
  }
  return stripDiacritics(s);
};
const badgeDigits = (raw) => String(raw || '').replace(/\D/g, '');

// Nạp danh sách cán bộ + số hiệu 1 lần lúc khởi động
let VNEID_OFFICERS = [];
const OFFICERS_BADGE_FILE = path.join(__dirname, 'officers-badges.json');
try {
  const rawList = JSON.parse(fs.readFileSync(OFFICERS_BADGE_FILE, 'utf8'));
  VNEID_OFFICERS = rawList.map((o) => ({
    name: o.name,
    team: o.team || '',
    group: o.group || '',
    position: o.position || '',
    nameKey: normOfficerName(o.name),
    badgeKey: badgeDigits(o.badgeDigits || o.badge),
  }));
  console.log(`VNeID: loaded ${VNEID_OFFICERS.length} officers`);
} catch (err) {
  console.error('VNeID: cannot load officers-badges.json —', err.message);
}
const findOfficer = (name, badge) => {
  const nk = normOfficerName(name);
  const bk = badgeDigits(badge);
  if (!nk || !bk) return null;
  return VNEID_OFFICERS.find((o) => o.nameKey === nk && o.badgeKey === bk) || null;
};

// Cookie phiên ký HMAC: base64(payload).hmac  — payload = {n: nameKey, exp}
const signSession = (payload) => {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const mac = crypto.createHmac('sha256', VNEID_SECRET).update(body).digest('base64url');
  return `${body}.${mac}`;
};
const verifySession = (token) => {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', VNEID_SECRET).update(body).digest('base64url');
  const macBuf = Buffer.from(mac || '');
  const expBuf = Buffer.from(expected);
  if (macBuf.length !== expBuf.length || !crypto.timingSafeEqual(macBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
};
const parseCookies = (req) => {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  raw.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
};
const currentOfficer = (req) => {
  const payload = verifySession(parseCookies(req)[VNEID_COOKIE]);
  if (!payload) return null;
  return VNEID_OFFICERS.find((o) => o.nameKey === payload.n) || null;
};

const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const readVneidActivations = () => {
  if (!fs.existsSync(vneidActivationsFile)) return [];
  try { return JSON.parse(fs.readFileSync(vneidActivationsFile, 'utf8')); }
  catch { return []; }
};
const writeVneidActivations = (data) => {
  const tempFile = `${vneidActivationsFile}.${process.pid}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
  fs.renameSync(tempFile, vneidActivationsFile);
};
// Xếp hàng thao tác read-modify-write để hai request đồng thời không ghi đè nhau.
let vneidActivationQueue = Promise.resolve();
const updateVneidActivations = (updater) => {
  const operation = vneidActivationQueue.then(() => {
    const current = readVneidActivations();
    const result = updater(current);
    if (result.changed) writeVneidActivations(result.data);
    return result;
  });
  vneidActivationQueue = operation.catch(() => {});
  return operation;
};

// ── VNeID Access Log ──────────────────────────────────────────────────────────
const readVneidAccessLog = () => {
  if (!fs.existsSync(vneidAccessLogFile)) return [];
  try { return JSON.parse(fs.readFileSync(vneidAccessLogFile, 'utf8')); }
  catch { return []; }
};
const writeVneidAccessLog = (data) => {
  const tempFile = `${vneidAccessLogFile}.${process.pid}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
  fs.renameSync(tempFile, vneidAccessLogFile);
};
let vneidAccessLogQueue = Promise.resolve();
const appendVneidAccessLog = (entry) => {
  const op = vneidAccessLogQueue.then(() => {
    const current = readVneidAccessLog();
    current.push(entry);
    // Giữ tối đa 2000 bản ghi gần nhất để tránh file phình to
    if (current.length > 2000) current.splice(0, current.length - 2000);
    writeVneidAccessLog(current);
  });
  vneidAccessLogQueue = op.catch(() => {});
  return op;
};
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
};

// Báo lỗi kích hoạt (VD: TK mức 1 nhưng hệ thống báo "Bạn đã kích hoạt")
const readVneidIssues = () => {
  if (!fs.existsSync(vneidIssuesFile)) return [];
  try { return JSON.parse(fs.readFileSync(vneidIssuesFile, 'utf8')); }
  catch { return []; }
};
const writeVneidIssues = (data) => {
  const tempFile = `${vneidIssuesFile}.${process.pid}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
  fs.renameSync(tempFile, vneidIssuesFile);
};
let vneidIssueQueue = Promise.resolve();
const appendVneidIssue = (entry) => {
  const operation = vneidIssueQueue.then(() => {
    const current = readVneidIssues();
    current.push(entry);
    writeVneidIssues(current);
    return entry;
  });
  vneidIssueQueue = operation.catch(() => {});
  return operation;
};

app.use(compression());
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

const normalizeWorkProgressItem = (raw = {}, index = 0) => ({
  id: raw.id || `${Date.now()}-${index}`,
  category: raw.category || '',
  workContent: raw.workContent || '',
  summary: raw.summary || '',
  caseNumber: raw.caseNumber || '',
  progress: raw.progress || '',
  deadline: raw.deadline || '',
  difficulties: raw.difficulties || '',
  proposal: raw.proposal || '',
  primaryCase: raw.primaryCase === true || raw.primaryCase === 'true',
  completed: raw.completed === true || raw.completed === 'true',
});

const normalizeWorkProgressReport = (raw = {}) => {
  const createdAt = raw.createdAt || new Date().toISOString();
  const fallbackMonth = createdAt.slice(0, 7);
  const reportMonth = /^\d{4}-\d{2}$/.test(raw.reportMonth || '') ? raw.reportMonth : fallbackMonth;
  const positions = Array.isArray(raw.positions)
    ? raw.positions.filter((p) => ['tham_muu_tong_hop', 'doi_nghiep_vu'].includes(p))
    : [];

  return {
    id: raw.id || Date.now().toString(),
    officerName: raw.officerName?.trim() || '',
    team: raw.team?.trim() || '',
    reportMonth,
    positions,
    items: Array.isArray(raw.items)
      ? raw.items.map(normalizeWorkProgressItem).filter((item) => item.workContent.trim())
      : [],
    createdAt,
    updatedAt: raw.updatedAt || createdAt,
  };
};

const readWorkProgressReports = () => {
  if (!fs.existsSync(workProgressFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(workProgressFile, 'utf8')).map(normalizeWorkProgressReport);
  } catch {
    return [];
  }
};

const writeWorkProgressReports = (data) => {
  fs.writeFileSync(workProgressFile, JSON.stringify(data.map(normalizeWorkProgressReport), null, 2));
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
app.get('/api/work-progress', (_req, res) => {
  try {
    const reports = readWorkProgressReports();
    reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi đọc báo cáo tiến độ' });
  }
});

app.post('/api/work-progress', (req, res) => {
  try {
    const normalized = normalizeWorkProgressReport(req.body);
    if (!normalized.officerName || !normalized.team || normalized.positions.length === 0) {
      return res.status(400).json({ error: 'Thiếu Họ tên, Đội hoặc Vị trí công tác' });
    }
    if (normalized.items.length === 0) {
      return res.status(400).json({ error: 'Cần nhập ít nhất một nội dung công việc' });
    }

    const now = new Date().toISOString();
    const reports = readWorkProgressReports();
    const newReport = normalizeWorkProgressReport({
      ...normalized,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    });
    reports.push(newReport);
    writeWorkProgressReports(reports);
    res.status(201).json({ message: 'Đã lưu báo cáo tiến độ', data: newReport });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi lưu báo cáo tiến độ' });
  }
});

app.put('/api/work-progress/:id', (req, res) => {
  try {
    const reports = readWorkProgressReports();
    const idx = reports.findIndex((report) => report.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy báo cáo tiến độ' });

    const existing = reports[idx];
    const updated = normalizeWorkProgressReport({
      ...existing,
      officerName: req.body.officerName ?? existing.officerName,
      team: req.body.team ?? existing.team,
      reportMonth: req.body.reportMonth ?? existing.reportMonth,
      positions: req.body.positions ?? existing.positions,
      items: req.body.items ?? existing.items,
      updatedAt: new Date().toISOString(),
    });

    if (!updated.officerName || !updated.team || updated.positions.length === 0) {
      return res.status(400).json({ error: 'Thiếu Họ tên, Đội hoặc Vị trí công tác' });
    }
    if (updated.items.length === 0) {
      return res.status(400).json({ error: 'Cần nhập ít nhất một nội dung công việc' });
    }

    reports[idx] = updated;
    writeWorkProgressReports(reports);
    res.json({ message: 'Đã cập nhật báo cáo tiến độ', data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi cập nhật báo cáo tiến độ' });
  }
});

app.get('/api/work-progress/export', (req, res) => {
  try {
    const normalizeQueryText = (value = '') => String(value).trim().toLowerCase();
    const safeFilenamePart = (value = 'can-bo') =>
      String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^\w-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'can-bo';

    const officerFilter = normalizeQueryText(req.query.officerName);
    const teamFilter = normalizeQueryText(req.query.team);
    const monthFilter = /^\d{4}-\d{2}$/.test(req.query.reportMonth || '') ? String(req.query.reportMonth) : '';
    let reports = readWorkProgressReports();
    if (officerFilter) {
      reports = reports.filter((report) => normalizeQueryText(report.officerName) === officerFilter);
    }
    if (teamFilter) {
      reports = reports.filter((report) => normalizeQueryText(report.team) === teamFilter);
    }
    if (monthFilter) {
      reports = reports.filter((report) => report.reportMonth === monthFilter);
    }

    const officerName = reports[0]?.officerName || String(req.query.officerName || '');
    const teamName = reports[0]?.team || String(req.query.team || '');
    const isOfficerExport = Boolean(officerFilter);
    const sequenceByOfficerAndWork = new Map();
    const headers = [
      'STT',
      'Họ tên',
      'Đội',
      'Vị trí công tác',
      'Nhóm công tác',
      'Nội dung công tác',
      'Số lượng',
      'Trích yếu cụ thể',
      'Số hồ sơ',
      'Tiến độ thực hiện',
      'Thời hạn',
      'Khó khăn vướng mắc',
      'Đề xuất',
      'Thụ lý chính',
      'Đã hoàn thành',
      'Tháng báo cáo',
      'Ngày báo cáo',
    ];
    const rows = isOfficerExport
      ? [
          ['BẢNG THEO DÕI TIẾN ĐỘ CÔNG VIỆC'],
          [`- Họ và tên: ${officerName}\n- Đơn vị: ${teamName}`],
          headers,
        ]
      : [headers];
    let rowNumber = 1;

    reports.forEach((report) => {
      report.items.forEach((item) => {
        const sequenceKey = `${report.officerName}__${item.workContent}`;
        const sequence = (sequenceByOfficerAndWork.get(sequenceKey) || 0) + 1;
        sequenceByOfficerAndWork.set(sequenceKey, sequence);
        rows.push([
          rowNumber,
          report.officerName,
          report.team,
          report.positions.map((p) => p === 'doi_nghiep_vu' ? 'Đội nghiệp vụ' : 'Tham mưu tổng hợp').join(', '),
          item.category,
          item.workContent,
          sequence,
          item.summary,
          item.caseNumber,
          item.progress,
          item.deadline,
          item.difficulties,
          item.proposal,
          item.primaryCase ? '✓' : '',
          item.completed ? '✓' : '',
          report.reportMonth,
          new Date(report.createdAt).toLocaleDateString('vi-VN'),
        ]);
        rowNumber += 1;
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    if (isOfficerExport) {
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
      ];
      ws['!rows'] = [{ hpt: 24 }, { hpt: 34 }];
    }
    ws['!cols'] = [
      { wch: 5 },
      { wch: 22 },
      { wch: 18 },
      { wch: 28 },
      { wch: 32 },
      { wch: 28 },
      { wch: 10 },
      { wch: 35 },
      { wch: 18 },
      { wch: 25 },
      { wch: 14 },
      { wch: 32 },
      { wch: 32 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Bao cao tien do');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = isOfficerExport
      ? `bao-cao-tien-do-${safeFilenamePart(officerName)}.xlsx`
      : 'bao-cao-tien-do-cong-viec.xlsx';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi xuất Excel báo cáo tiến độ' });
  }
});

// ── VNeID API: login + activations ────────────────────────────────────────────
app.post('/api/vneid/login', (req, res) => {
  const { name, badge } = req.body || {};
  const officer = findOfficer(name, badge);
  if (!officer) {
    return res.status(401).json({ error: 'Sai họ tên hoặc số hiệu' });
  }
  const exp = Date.now() + VNEID_SESSION_DAYS * 24 * 60 * 60 * 1000;
  const token = signSession({ n: officer.nameKey, exp });
  res.setHeader('Set-Cookie',
    `${VNEID_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${VNEID_SESSION_DAYS * 86400}; HttpOnly; SameSite=Lax${IS_PRODUCTION ? '; Secure' : ''}`);

  // Ghi access log
  appendVneidAccessLog({
    id: `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    officerName: officer.name,
    team: officer.team,
    group: officer.group,
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'] || '',
    timestamp: new Date().toISOString(),
    action: 'login',
  }).catch(() => {});

  res.json({ name: officer.name, team: officer.team, group: officer.group, position: officer.position });
});

app.post('/api/vneid/logout', (_req, res) => {
  res.setHeader('Set-Cookie', `${VNEID_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${IS_PRODUCTION ? '; Secure' : ''}`);
  res.json({ ok: true });
});

// Ai đang đăng nhập (client dùng để hiện tên + tiến độ của chính mình)
app.get('/api/vneid/me', (req, res) => {
  const officer = currentOfficer(req);
  if (!officer) return res.status(401).json({ error: 'Chưa đăng nhập' });
  res.json({ name: officer.name, team: officer.team, group: officer.group, position: officer.position });
});

// Log kích hoạt — chỉ tính theo tháng (mặc định tháng hiện tại). "Reset mùng 1" = lọc theo tháng.
app.get('/api/vneid/activations', (req, res) => {
  if (!currentOfficer(req)) return res.status(401).json({ error: 'Chưa đăng nhập' });
  const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : monthKey();
  const all = readVneidActivations();
  res.json({ month, activations: all.filter((a) => a.month === month) });
});

app.post('/api/vneid/activations', async (req, res) => {
  const officer = currentOfficer(req);
  if (!officer) return res.status(401).json({ error: 'Chưa đăng nhập' });
  const cccd = String(req.body?.cccd || '').replace(/\D/g, '');
  if (!/^\d{12}$/.test(cccd)) return res.status(400).json({ error: 'Số CCCD phải gồm 12 chữ số' });

  const month = monthKey();
  try {
    const result = await updateVneidActivations((all) => {
      const existing = all.find((a) => a.cccd === cccd && a.month === month);
      if (existing) return { changed: false, data: all, entry: existing, created: false };

      const entry = {
        cccd,
        officerName: officer.name,   // lấy từ cookie, không tin client
        month,
        timestamp: new Date().toISOString(),
      };
      return { changed: true, data: [...all, entry], entry, created: true };
    });
    res.status(result.created ? 201 : 200).json({
      ok: true,
      alreadyActivated: !result.created,
      data: result.entry,
    });
  } catch (err) {
    console.error('VNeID activation write failed:', err);
    res.status(500).json({ error: 'Không lưu được dữ liệu kích hoạt' });
  }
});

// Báo lỗi kích hoạt cho 1 công dân (VD: TK mức 1 nhưng hệ thống báo "Bạn đã kích hoạt")
app.get('/api/vneid/issues', (req, res) => {
  if (!currentOfficer(req)) return res.status(401).json({ error: 'Chưa đăng nhập' });
  res.json({ issues: readVneidIssues() });
});

app.post('/api/vneid/issues', async (req, res) => {
  const officer = currentOfficer(req);
  if (!officer) return res.status(401).json({ error: 'Chưa đăng nhập' });
  const cccd = String(req.body?.cccd || '').replace(/\D/g, '');
  if (!/^\d{12}$/.test(cccd)) return res.status(400).json({ error: 'Số CCCD phải gồm 12 chữ số' });
  const description = String(req.body?.description || '').trim().slice(0, 2000);
  if (!description) return res.status(400).json({ error: 'Vui lòng nhập nội dung lỗi' });

  const entry = {
    id: `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    cccd,
    residentName: String(req.body?.residentName || '').trim().slice(0, 200),
    description,
    officerName: officer.name,   // lấy từ cookie, không tin client
    month: monthKey(),
    timestamp: new Date().toISOString(),
  };
  try {
    await appendVneidIssue(entry);
    res.status(201).json({ ok: true, data: entry });
  } catch (err) {
    console.error('VNeID issue write failed:', err);
    res.status(500).json({ error: 'Không lưu được báo lỗi' });
  }
});

// ── VNeID Admin APIs (chỉ dành cho admin) ─────────────────────────────────────
const isAdmin = (req) => {
  const officer = currentOfficer(req);
  return officer && officer.nameKey === VNEID_ADMIN_KEY;
};

// Mục 1: Log chung — toàn bộ lịch sử đăng nhập
app.get('/api/vneid/admin/access-log', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Không có quyền truy cập' });
  const log = readVneidAccessLog();
  log.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ log });
});

// Mục 2: Thống kê truy cập theo cán bộ — đếm lần, lần đầu, lần cuối
app.get('/api/vneid/admin/access-stats', (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Không có quyền truy cập' });
  const log = readVneidAccessLog();
  // Tổng hợp theo tên cán bộ
  const statsMap = {};
  for (const entry of log) {
    const key = entry.officerName;
    if (!statsMap[key]) {
      statsMap[key] = { officerName: key, team: entry.team, group: entry.group, count: 0, firstAccess: entry.timestamp, lastAccess: entry.timestamp };
    }
    statsMap[key].count++;
    if (entry.timestamp < statsMap[key].firstAccess) statsMap[key].firstAccess = entry.timestamp;
    if (entry.timestamp > statsMap[key].lastAccess) statsMap[key].lastAccess = entry.timestamp;
  }
  const accessed = Object.values(statsMap).sort((a, b) => b.count - a.count);
  // Cán bộ chưa từng truy cập
  const accessedNames = new Set(accessed.map((s) => s.officerName));
  const neverAccessed = VNEID_OFFICERS
    .filter((o) => !accessedNames.has(o.name))
    .map((o) => ({ officerName: o.name, team: o.team, group: o.group }));
  res.json({ accessed, neverAccessed });
});

// ── VNeID gate: chặn /vneid và /vneid/* (gồm data.js) khi chưa đăng nhập ────────
const vneidGateHtml = () => `<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Đăng nhập — Kích hoạt VNeID</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:system-ui,-apple-system,'Segoe UI',sans-serif;
    background:#080c14;background-image:radial-gradient(at 10% 15%,rgba(6,182,212,.14),transparent 50%),radial-gradient(at 90% 85%,rgba(79,70,229,.12),transparent 50%);
    color:#f8fafc;padding:20px}
  .card{width:100%;max-width:400px;background:rgba(15,23,42,.85);backdrop-filter:blur(16px);
    border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:34px 28px;
    box-shadow:0 20px 60px rgba(0,0,0,.45)}
  .logo{width:56px;height:56px;border-radius:14px;margin:0 auto 18px;
    background:linear-gradient(135deg,#06b6d4,#4f46e5);display:flex;align-items:center;justify-content:center}
  .logo svg{width:30px;height:30px;stroke:#fff;fill:none;stroke-width:2}
  h1{font-size:1.25rem;font-weight:800;text-align:center;margin-bottom:6px}
  p.sub{font-size:.85rem;color:#94a3b8;text-align:center;margin-bottom:24px}
  label{display:block;font-size:.82rem;font-weight:600;color:#cbd5e1;margin:14px 0 6px}
  input{width:100%;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.14);
    background:rgba(255,255,255,.05);color:#f8fafc;font-size:1rem;outline:none}
  input:focus{border-color:#06b6d4}
  .hint{font-size:.75rem;color:#64748b;margin-top:4px}
  button{width:100%;margin-top:22px;padding:13px;border:none;border-radius:10px;cursor:pointer;
    background:linear-gradient(135deg,#06b6d4,#4f46e5);color:#fff;font-size:1rem;font-weight:700}
  button:disabled{opacity:.6;cursor:default}
  .err{margin-top:14px;font-size:.85rem;color:#f43f5e;text-align:center;min-height:1.2em}
</style></head>
<body>
  <form class="card" id="gate-form" autocomplete="off">
    <div class="logo"><svg viewBox="0 0 24 24"><path d="M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-4z"/></svg></div>
    <h1>Kích hoạt VNeID</h1>
    <p class="sub">Nhập thông tin cán bộ để truy cập</p>
    <label for="name">Họ tên đầy đủ</label>
    <input id="name" name="name" type="text" autocomplete="off" placeholder="VD: Trần Hà Linh" required>
    <label for="badge">Số hiệu</label>
    <input id="badge" name="badge" type="text" autocomplete="off" inputmode="numeric" required>
    <button type="submit" id="submit-btn">Truy cập</button>
    <div class="err" id="err"></div>
  </form>
  <script>
    const form = document.getElementById('gate-form');
    const btn = document.getElementById('submit-btn');
    const err = document.getElementById('err');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      btn.disabled = true; btn.textContent = 'Đang kiểm tra...';
      try {
        const res = await fetch('/api/vneid/login', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ name: document.getElementById('name').value, badge: document.getElementById('badge').value })
        });
        if (res.ok) { window.location.reload(); return; }
        const data = await res.json().catch(() => ({}));
        err.textContent = data.error || 'Đăng nhập thất bại';
      } catch (_e) {
        err.textContent = 'Lỗi kết nối, thử lại';
      }
      btn.disabled = false; btn.textContent = 'Truy cập';
    });
  </script>
</body></html>`;

app.use('/vneid', (req, res, next) => {
  if (currentOfficer(req)) return next();
  res.status(401).type('html').send(vneidGateHtml());
});

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Investigation Report Backend running on http://localhost:${PORT}`);
});
