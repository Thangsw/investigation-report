# Quản lý Hồ sơ TĐC — Project Overview

## Mục đích

Web app nội bộ cho Điều tra viên (ĐTV) nhập hồ sơ vụ án và lãnh đạo xem tổng quan.
Tách biệt hoàn toàn với project `tracking-map`, cùng stack nhưng Railway service riêng.

---

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript (strict)
- **Backend**: Express.js (CommonJS, `server.cjs`)
- **DB**: JSON file (`reports.json`, `investigators.json`) — lưu trên Railway Volume
- **Export**: `xlsx` npm package, server-side
- **Deploy**: Railway (NIXPACKS) — auto-deploy khi push GitHub

---

## URLs

| Môi trường | URL |
|---|---|
| Production | https://investigation-report-production.up.railway.app |
| GitHub repo | https://github.com/Thangsw/investigation-report |
| Railway project | https://railway.com/project/9bcfffd3-f401-4612-8a07-932b3363ce6a |

---

## Cấu trúc thư mục

```
investigation-report/
├── server.cjs               # Express backend — CRUD + Excel export
├── reports.json             # Dữ liệu hồ sơ (tự tạo, lưu vào Volume)
├── investigators.json       # Danh sách 51 ĐTV (tự tạo, lưu vào Volume)
├── railway.json             # Build: nixpacks, Start: node server.cjs
├── package.json
├── vite.config.ts           # Proxy /api → localhost:3001
└── src/
    ├── main.tsx
    ├── index.css            # Dark glassmorphism (port từ tracking-map)
    ├── types.ts             # Interface Report, Investigator, ReportFormData
    ├── api.ts               # Axios API client
    ├── App.tsx              # Router shell + top-nav
    ├── pages/
    │   ├── ReportPage.tsx   # Trang ĐTV nhập hồ sơ
    │   └── DashboardPage.tsx# Trang lãnh đạo tổng quan (refresh 30s)
    └── components/
        ├── ReportForm.tsx       # Form nhập hồ sơ
        ├── ReportList.tsx       # Danh sách hồ sơ dạng card
        ├── InvestigatorManager.tsx  # CRUD tên ĐTV
        ├── StatsCards.tsx       # Thống kê tổng hợp
        ├── FilterBar.tsx        # Bộ lọc (ĐTV, Loại, Đội)
        └── ExportButton.tsx     # Nút xuất Excel
```

---

## Form fields (thứ tự chính xác)

1. **Họ tên ĐTV** — `<input>` + `<datalist>` từ danh sách server
2. **Người cầm hồ sơ** — tự điền = tên ĐTV nếu bỏ trống
3. **Loại hồ sơ** — AK / AD (radio)
4. **Số tập / Số hồ sơ / Số lưu** — 3 input trên 1 hàng, không có placeholder VD
5. **Trích yếu** — textarea tóm tắt nội dung
6. **Hồ sơ thuộc lĩnh vực** — Đội 2 / Đội 3 / Đội 4 (select)
7. **Tình trạng hiện tại** — `<input>` + `<datalist>` 7 preset
8. **Thời hạn ra QĐ đình chỉ** — `<input type="date">`
9. **Khó khăn, vướng mắc, đề xuất** — textarea

---

## Data persistence (Railway Volume)

**Cách tracking-map làm (phải áp dụng cho project này):**
- Tạo Volume trong Railway dashboard → mount vào `/data`
- Có thể thêm env var `DATA_DIR=/data` trong service
- `server.cjs` đã sẵn sàng: ưu tiên `DATA_DIR`, nếu không có sẽ tự dùng `RAILWAY_VOLUME_MOUNT_PATH`, cuối cùng mới fallback về `__dirname`

**Trạng thái hiện tại**: chưa có Volume → dữ liệu mất khi restart service.

**Cách setup** (qua Railway dashboard):
1. Vào service `investigation-report` → tab **Volumes**
2. **New Volume** → Mount path: `/data`
3. Vào tab **Variables** → có thể thêm `DATA_DIR` = `/data` (không bắt buộc nếu dùng trực tiếp `RAILWAY_VOLUME_MOUNT_PATH`)
4. Redeploy

---

## API Endpoints

| Method | Route | Mô tả |
|--------|-------|--------|
| GET | `/api/reports` | Lấy tất cả hồ sơ (sort mới nhất trước) |
| POST | `/api/reports` | Thêm hồ sơ mới |
| PUT | `/api/reports/:id` | Cập nhật hồ sơ |
| DELETE | `/api/reports/:id` | Xóa hồ sơ |
| **GET** | **`/api/reports/export`** | **Xuất Excel (.xlsx) — PHẢI đứng trước /:id** |
| GET | `/api/investigators` | Danh sách ĐTV |
| POST | `/api/investigators` | Thêm ĐTV |
| PUT | `/api/investigators/:id` | Sửa tên ĐTV |
| DELETE | `/api/investigators/:id` | Xóa ĐTV |

---

## Tính năng đã làm

- [x] Form nhập hồ sơ 9 trường (+ Trích yếu)
- [x] ĐTV tự lọc hồ sơ của mình bằng input tên ở đầu trang
- [x] Tự điền "Người cầm hồ sơ" = tên ĐTV nếu bỏ trống
- [x] Badge loại hồ sơ (AK/AD), badge Đội, badge Quá hạn
- [x] Highlight đỏ hồ sơ quá hạn đình chỉ
- [x] Dashboard lãnh đạo: thống kê + filter + xuất Excel
- [x] Quản lý danh sách 51 ĐTV (thêm/sửa/xóa)
- [x] Xuất Excel 13 cột
- [x] Deploy Railway (auto-deploy từ GitHub branch `master`)
- [ ] **Railway Volume** (data persistence) — chưa setup

---

## Các vấn đề đã gặp & cách giải

### 1. Bottom sheet chặn click FAB
- **Vấn đề**: `.bottom-sheet` khi đóng vẫn chiếm vùng pointer events, block click lên FAB
- **Fix**: Thêm `pointer-events: none` vào `.bottom-sheet`, `pointer-events: auto` vào `.bottom-sheet.open`

### 2. UTF-8 bị hỏng khi seed ĐTV qua bash
- **Vấn đề**: Bash trên Windows + curl không giữ được ký tự Unicode tiếng Việt (e.g., "Nguyễn" → "Nguy?n")
- **Fix**: Dùng Node.js script (`seed-dtv.cjs`) với `http` module native thay vì curl

### 3. Railway CLI không xác thực được bằng personal token UUID
- **Vấn đề**: Token từ Railway dashboard (UUID format) không hoạt động với `RAILWAY_TOKEN` env var hay config file
- **Fix**: Deploy trực tiếp qua Railway dashboard UI bằng Playwright browser

### 4. Git trên network share (Z:/)
- **Vấn đề**: `cd Z:/...` rồi `git` command bị lỗi "not in a git directory"
- **Fix**: Dùng `GIT_DIR=... GIT_WORK_TREE=... git <command>` với path tuyệt đối

---

## Cách chạy local

```bash
# Terminal 1 — Backend
node server.cjs

# Terminal 2 — Frontend dev
npm run dev
# → http://localhost:5173

# Build production
npm run build
```

---

## Deploy Railway (lần sau)

Chỉ cần push lên GitHub:
```bash
GIT_DIR="Z:/Dungderiap6/investigation-report/.git" \
GIT_WORK_TREE="Z:/Dungderiap6/investigation-report" \
git add -A && git commit -m "message" && \
git push "https://Thangsw:TOKEN@github.com/Thangsw/investigation-report.git" master
```
Railway sẽ tự động detect push và redeploy.

---

## TODO tiếp theo

- [ ] Thêm Railway Volume để persist data (xem mục "Data persistence" bên trên)
- [ ] Thêm env var `DATA_DIR=/data` trong Railway service variables
- [ ] Seed lại 51 ĐTV lên production (sau khi setup Volume)

---

## Cập nhật 2026-04-17

- Nếu chọn loại hồ sơ `AD` thì trường **Thời hạn đình chỉ** là bắt buộc.
- Nếu chọn loại hồ sơ `AK` thì trường **Thời hạn đình chỉ** có thể để trống.
- Dashboard tổng hợp đã đổi sang hướng nghiệp vụ:
  - Tổng số hồ sơ cần rút: `400`
  - Đã rút: `306`
  - Còn lại: `94`
  - Theo dõi số hồ sơ ĐTV đã cập nhật/báo cáo, tỷ lệ thực hiện, số hồ sơ phân công lại, số hồ sơ khó khăn vướng mắc
  - Cảnh báo hồ sơ **sắp đến hạn đình chỉ** trong vòng `30` ngày
  - Cảnh báo hồ sơ **quá hạn đình chỉ**
- Danh sách hồ sơ hiện hiển thị thêm badge và số ngày còn lại/quá hạn cho phần thời hạn đình chỉ.
