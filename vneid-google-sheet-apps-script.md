# Hướng dẫn đưa dữ liệu kích hoạt VNeID lên Google Sheet (real-time)

Cơ chế giống tab báo cáo tiến độ bên `/hs`: mỗi lần cán bộ nhập kích hoạt (hoặc admin xóa),
server tự đẩy **toàn bộ dữ liệu tháng hiện tại** lên trang tính Google qua một Apps Script.
Trang tính luôn khớp đúng mẫu báo cáo "Định danh mức 2".

Cậu chủ chỉ cần làm **1 lần** 5 bước dưới đây.

---

## Bước 1 — Tạo trang tính Google mới (riêng cho VNeID)

1. Vào https://sheets.google.com → tạo bảng tính trống mới.
2. Đặt tên, ví dụ: **"Kích hoạt Định danh mức 2"**.
3. Để nguyên, chuyển sang bước 2.

## Bước 2 — Mở trình soạn Apps Script

Trong trang tính vừa tạo: menu **Tiện ích mở rộng (Extensions)** → **Apps Script**.

## Bước 3 — Dán đoạn mã dưới đây

Xóa hết nội dung mẫu trong ô soạn thảo, dán nguyên đoạn này vào, rồi bấm **Lưu** (biểu tượng đĩa mềm):

```javascript
// Apps Script nhận dữ liệu kích hoạt VNeID từ server và ghi vào trang tính.
// Server gửi { sheetName, values (mảng 2 chiều), merges (1-based), headerRow }.
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = payload.sheetName || 'Kich hoat';

    // Mỗi tháng 1 sheet riêng; nếu đã có thì xóa sạch để ghi lại (đồng bộ cả khi xóa bản ghi)
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    } else {
      sheet.clear();
      // gỡ mọi vùng gộp ô cũ
      var oldMerges = sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 1), Math.max(sheet.getMaxColumns(), 1)).getMergedRanges();
      for (var i = 0; i < oldMerges.length; i++) oldMerges[i].breakApart();
    }

    var values = payload.values || [];
    if (values.length === 0) {
      return ContentService.createTextOutput('empty').setMimeType(ContentService.MimeType.TEXT);
    }

    // Chuẩn hóa số cột (mỗi hàng đủ 7 cột) để setValues không lỗi
    var nCols = 7;
    for (var r = 0; r < values.length; r++) {
      var row = values[r] || [];
      while (row.length < nCols) row.push('');
      values[r] = row.slice(0, nCols);
    }

    sheet.getRange(1, 1, values.length, nCols).setValues(values);

    // Gộp ô theo hướng dẫn từ server (1-based)
    var merges = payload.merges || [];
    for (var m = 0; m < merges.length; m++) {
      var mm = merges[m];
      try {
        sheet.getRange(mm.row, mm.col, mm.numRows || 1, mm.numCols || 1).merge();
      } catch (err) { /* bỏ qua ô gộp lỗi */ }
    }

    // Định dạng cho đẹp giống mẫu
    var headerRow = payload.headerRow || 6;
    sheet.getRange(1, 1).setFontWeight('bold').setFontSize(12);                 // tên đơn vị
    sheet.getRange(3, 1).setFontWeight('bold').setFontSize(14)                  // tiêu đề chính
      .setHorizontalAlignment('center');
    sheet.getRange(headerRow, 1, 1, nCols).setFontWeight('bold')                // dòng header cột
      .setBackground('#d9ead3').setHorizontalAlignment('center')
      .setBorder(true, true, true, true, true, true);
    // Kẻ viền + căn cho toàn bộ vùng dữ liệu
    if (values.length > headerRow) {
      sheet.getRange(headerRow, 1, values.length - headerRow + 1, nCols)
        .setBorder(true, true, true, true, true, true)
        .setVerticalAlignment('middle');
      // Cột CCCD (E = 5) để dạng text giữ số 0 đầu
      sheet.getRange(headerRow + 1, 5, values.length - headerRow, 1).setNumberFormat('@');
    }
    // Độ rộng cột
    var widths = [45, 200, 45, 200, 130, 110, 130];
    for (var c = 0; c < widths.length; c++) sheet.setColumnWidth(c + 1, widths[c]);

    return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err).setMimeType(ContentService.MimeType.TEXT);
  }
}
```

## Bước 4 — Triển khai (Deploy) thành Web app

1. Góc trên phải bấm **Triển khai (Deploy)** → **Bản triển khai mới (New deployment)**.
2. Bấm bánh răng cạnh "Chọn loại (Select type)" → chọn **Ứng dụng web (Web app)**.
3. Cấu hình:
   - **Mô tả**: gì cũng được (VD "VNeID sync").
   - **Thực thi với tư cách (Execute as)**: **Tôi (Me)**.
   - **Ai có quyền truy cập (Who has access)**: **Bất kỳ ai (Anyone)**.  ← quan trọng, để server gọi được.
4. Bấm **Triển khai (Deploy)**. Google sẽ hỏi cấp quyền → **Authorize access** → chọn tài khoản → "Advanced" → "Go to ... (unsafe)" → **Allow**. (Bình thường, vì là script của chính cậu chủ.)
5. Sao chép **URL ứng dụng web (Web app URL)** — dạng `https://script.google.com/macros/s/AKfyc.../exec`.

## Bước 5 — Đặt 2 biến môi trường trên Railway

Vào Railway → project `investigation-report` → tab **Variables** → thêm 2 biến:

| Tên biến | Giá trị |
|---|---|
| `VNEID_SHEETS_WEBHOOK_URL` | URL ứng dụng web ở Bước 4 (…/exec) |
| `VNEID_SHEETS_VIEW_URL` | URL trang tính ở thanh địa chỉ (dạng `https://docs.google.com/spreadsheets/d/…/edit`) |

Lưu lại → Railway tự deploy lại (~1-2 phút).

---

## Xong. Từ giờ:

- Mỗi khi cán bộ báo cáo kích hoạt (kèm ngày), server tự đẩy lên trang tính → **cập nhật ngay**.
- Admin xóa bản ghi → trang tính cũng tự cập nhật lại.
- Trong tab **Tiến độ thực hiện** (nick admin), nút **📗 Mở trang tính Google** hiện ra → bấm là mở thẳng trang tính.
- Nút **📊 Xuất Excel** vẫn còn để tải file `.xlsx` về máy khi cần.
- Mỗi tháng dữ liệu vào một sheet riêng (VD "Thang 7-2026"), không đè lên tháng cũ.

> Lưu ý bảo mật: trang tính chứa tên công dân + CCCD thật → chỉ chia sẻ link cho người có thẩm quyền.
> "Anyone" ở Bước 4 chỉ cho phép **gửi dữ liệu vào script**, không cho ai xem trang tính nếu cậu chủ
> không chia sẻ link trang tính.
