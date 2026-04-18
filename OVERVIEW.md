# Quản lý Hồ sơ TĐC — Project Overview

## Mục đích

Web app nội bộ cho Điều tra viên (ĐTV) nhập hồ sơ vụ án và lãnh đạo xem tổng quan.
Tách biệt hoàn toàn với project `tracking-map`, cùng stack nhưng Railway service riêng.

---

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript (strict)
- **Backend**: Express.js (CommonJS, `server.cjs`)
- **DB**: JSON file (`reports.json`, `investigators.json`, `config.json`) — lưu trên Railway Volume `/data`
- **Export**: `xlsx` npm package, server-side
- **Backup**: Google Sheets qua Apps Script webhook (fire-and-forget)
- **Deploy**: Railway (NIXPACKS) — auto-deploy khi push GitHub

---

## URLs

| Môi trường | URL |
|---|---|
| Production | https://investigation-report-production.up.railway.app |
| Admin config | https://investigation-report-production.up.railway.app/admin |
| GitHub repo | https://github.com/Thangsw/investigation-report |
| Railway project | https://railway.com/project/9bcfffd3-f401-4612-8a07-932b3363ce6a |

---

## Cấu trúc thư mục

```
investigation-report/
├── server.cjs               # Express backend — CRUD + Excel export + config
├── reports.json             # Dữ liệu hồ sơ (Volume /data)
├── investigators.json       # Danh sách ĐTV (Volume /data)
├── config.json              # Cấu hình hệ thống (Volume /data)
├── railway.json             # Build: nixpacks, Start: node server.cjs
├── package.json
├── vite.config.ts           # Proxy /api → localhost:3001
└── src/
    ├── main.tsx
    ├── index.css            # Light glassmorphism
    ├── types.ts             # Report, Investigator, RequiredFields, AppConfig
    ├── api.ts               # Axios API client
    ├── reportMetrics.ts     # getDashboardMetrics, getDeadlineStatus, hasDifficulty
    ├── App.tsx              # Router shell + top-nav (2 nav link + /admin ẩn)
    ├── pages/
    │   ├── ReportPage.tsx   # Trang ĐTV nhập/sửa/xóa hồ sơ
    │   ├── DashboardPage.tsx# Trang lãnh đạo tổng quan (refresh 30s)
    │   └── AdminPage.tsx    # /admin — cấu hình mục tiêu + trường bắt buộc
    └── components/
        ├── ReportForm.tsx       # Form nhập hồ sơ (dynamic required fields)
        ├── ReportList.tsx       # Danh sách card, pagination 20/lần
        ├── InvestigatorManager.tsx
        ├── StatsCards.tsx       # 4 khung thống kê
        ├── FilterBar.tsx        # Bộ lọc (ĐTV, Loại, Đội, Tổ địa bàn)
        └── ExportButton.tsx
```

---

## Form fields (thứ tự trong form)

| # | Tên trường | Key | Ghi chú |
|---|---|---|---|
| 1 | Họ tên ĐTV | `dtvName` | Bắt buộc (luôn luôn) |
| 2 | Người cầm hồ sơ | `nguoiCamHoSo` | Tự điền = tên ĐTV nếu trống |
| 3 | Loại hồ sơ | `loaiHoSo` | AK / AD (radio) |
| 4 | Số tập | `soTap` | |
| 5 | Số hồ sơ | `soHoSo` | Mặc định bắt buộc |
| 6 | Số lưu + Hồ sơ hiện hành | `soLuu`, `hoSoHienHanh` | checkbox trong cùng ô |
| 7 | QĐ phân công PTT | `qdPhanCongPTT` | |
| 8 | QĐ phân công lại ĐTV | `qdPhanCongLaiDTV` | |
| 9 | QĐ khởi tố | `qdKhoiTo` | Chỉ hiện khi loại = AK |
| 10 | Trích yếu | `trichYeu` | Nếu nhập phải có địa danh |
| 11 | Hồ sơ thuộc lĩnh vực | `doi` | Đội 2 / 3 / 4 |
| 12 | Tổ địa bàn | `toBanDia` | Hoà Bình / Lạc Thuỷ (radio) |
| 13 | Ngày hết thời hiệu TNHS | `ngayHetThoiHieuTruyCuuTNHS` | YYYY-MM-DD |
| 14 | Đã thực hiện | `daThucHien` | Checkbox — tắt cảnh báo thời hiệu |
| 15 | Tính chất, mức độ nghiêm trọng | `tinhChatMucDoNghiemTrong` | datalist 4 preset |
| 16 | Tình trạng hiện tại | `tinhTrang` | datalist 7 preset |
| 17 | Kết quả giải quyết | `ketQuaGiaiQuyet` | |
| 18 | Khó khăn, vướng mắc | `khoKhan` | textarea |

---

## API Endpoints

| Method | Route | Mô tả |
|--------|-------|--------|
| GET | `/api/reports/export` | Xuất Excel (.xlsx) — **PHẢI đứng trước /:id** |
| GET | `/api/reports` | Lấy tất cả hồ sơ |
| POST | `/api/reports` | Thêm hồ sơ mới |
| PUT | `/api/reports/:id` | Cập nhật hồ sơ |
| DELETE | `/api/reports/:id` | Xóa hồ sơ |
| GET | `/api/investigators` | Danh sách ĐTV |
| POST | `/api/investigators` | Thêm ĐTV |
| PUT | `/api/investigators/:id` | Sửa tên ĐTV |
| DELETE | `/api/investigators/:id` | Xóa ĐTV |
| GET | `/api/config` | Lấy cấu hình (`AppConfig`) |
| POST | `/api/config` | Cập nhật cấu hình |

---

## Config (`config.json` / `AppConfig`)

```json
{
  "totalCaseTarget": 610,
  "akTarget": 372,
  "adTarget": 238,
  "requiredFields": {
    "soHoSo": true,
    "toBanDia": true,
    "ngayHetThoiHieuTruyCuuTNHS": true,
    "tinhChatMucDoNghiemTrong": true,
    "trichYeu": false,
    "qdPhanCongPTT": false,
    "qdPhanCongLaiDTV": false,
    "qdKhoiTo": false,
    "tinhTrang": false,
    "ketQuaGiaiQuyet": false,
    "khoKhan": false
  }
}
```

Chỉnh qua trang `/admin` — không cần sửa code.

---

## Tính năng đã hoàn thiện

### Nhập hồ sơ (`/reports`)
- [x] Form 18 trường, validation động theo config
- [x] Label `*` hiện tự động theo `requiredFields`
- [x] ĐTV lọc hồ sơ của mình bằng input tên
- [x] Tra cứu + xuất Excel theo bộ lọc
- [x] Quản lý danh sách ĐTV (thêm/sửa/xóa)

### Báo cáo tổng hợp (`/`)
- [x] Section 1 — Tổng số vụ tạm đình chỉ đến 22/03/2026:
  - Hàng 1: Cần thực hiện / Đã thực hiện / Còn lại / Tỉ lệ
  - Hàng 2: AK cần / AK đã / AD cần / AD đã
  - Hàng 3: AK còn lại / Tỉ lệ AK / AD còn lại / Tỉ lệ AD
- [x] Section 2 — Tiến độ đơn vị: phân công lại / sắp hết TNHS / quá TNHS / khó khăn (clickable → spotlight list)
- [x] Section 3 — Phân bố AK/AD/Đội 2-3-4
- [x] Section 4 — Bar chart theo ĐTV (tên rộng 175px cố định)
- [x] Refresh tự động mỗi 30 giây
- [x] "Thêm hồ sơ" trực tiếp từ dashboard

### ReportList
- [x] Pagination 20 hồ sơ/trang, nút "Xem thêm (N còn lại)"
- [x] Reset về trang 1 khi filter thay đổi
- [x] Badge: AK/AD, Đội, Tổ địa bàn, Hiện hành, Sắp hết thời hiệu, Quá thời hiệu
- [x] Cảnh báo thời hiệu bị tắt nếu `daThucHien = true`
- [x] Label in đậm: Người cầm, Hồ sơ, Tính chất
- [x] Khó khăn/vướng mắc: in nghiêng màu đỏ

### Admin (`/admin` — không có nav link)
- [x] Chỉnh mục tiêu: Tổng / AK / AD
- [x] Tick checkbox để đặt trường bắt buộc trong form nhập hồ sơ

### Khác
- [x] Deploy Railway — Volume `/data`, env var `GOOGLE_SHEETS_WEBHOOK_URL`
- [x] Google Sheets backup (Apps Script webhook, fire-and-forget)
- [x] Xuất Excel đầy đủ cột (bao gồm các trường mới)

---

## Railway Volume & Deploy

```
DATA_DIR=/data              (hoặc tự detect RAILWAY_VOLUME_MOUNT_PATH)
GOOGLE_SHEETS_WEBHOOK_URL=  (Apps Script web app URL)
PORT=                       (Railway tự set)
```

Push GitHub → Railway auto-deploy:
```bash
cd "z:/Dungderiap6/investigation-report"
git add <files> && git commit -m "message" && git push
```

---

## Chạy local

```bash
# Terminal 1
node server.cjs          # → http://localhost:3001

# Terminal 2
npm run dev              # → http://localhost:5173
```

---

## Các vấn đề đã gặp & cách giải

### 1. Bottom sheet chặn click FAB
`pointer-events: none` trên `.bottom-sheet`, `pointer-events: auto` trên `.bottom-sheet.open`

### 2. UTF-8 bị hỏng khi seed ĐTV
Dùng Node.js script `seed-dtv.cjs` thay vì curl trên Windows bash.

### 3. Git trên network share (Z:/)
`git config --global --add safe.directory '%(prefix)///192.168.1.3/...'`

### 4. TypeScript `toBanDia` type mismatch
Local `FormState` type với `toBanDia: 'Hoà Bình' | 'Lạc Thuỷ' | ''` thay vì dùng trực tiếp `ReportFormData`.

### 5. Bar chart tên ĐTV misalign
`flex: 0 0 175px` cố định cho `.bar-name` — không dùng `flex: 0 0 auto` (gây lệch cột số).

---

## Commits quan trọng

| Hash | Nội dung |
|------|----------|
| `cad9b49` | Admin page, configurable total target, full DTV names in bar chart |
| `45bdb72` | Pagination, daThucHien field, ReportList styling, bar name fix |
| `0e693c7` | AK/AD targets, configurable required fields in admin |
