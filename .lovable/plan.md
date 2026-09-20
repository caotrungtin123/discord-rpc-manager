# Discord RPC Dashboard

Chuyển toàn bộ việc chỉnh `config.json` sang một web dashboard, mỗi người dùng có dữ liệu riêng, đăng nhập bằng Discord (OAuth2 qua bot của bạn).

## Kiến trúc (điểm quan trọng nhất)

Kết nối RPC tới Discord phải giữ một kết nối mở liên tục 24/7 — web không làm được việc đó. Nên chia làm 2 phần:

```text
[Web dashboard]  ->  lưu cấu hình + token (mã hoá)
       |  API key riêng của mỗi tài khoản
       v
[Runner Python trên host của bạn]  -> tự tải cấu hình mới mỗi 30s -> Discord
```

Bạn chỉ chạy runner 1 lần trên host; sau đó mọi thay đổi làm trên web, runner tự cập nhật, không cần sửa file nữa.

## Chức năng dashboard

- **Đăng nhập Discord**: nút "Đăng nhập với Discord", người dùng bấm duyệt như các bot khác, quay lại là vào thẳng dashboard.
- **Tối đa 5 mẫu RPC (preset)**: tên hoạt động, text 1/2/3, ảnh lớn, ảnh nhỏ, 2 nút bấm, thời lượng, platform (Meta Quest / Xbox / PlayStation), spoof device.
- **Tối đa 5 token**: mỗi token dán vào ô riêng, hiện dạng che, có tên gợi nhớ, bật/tắt từng cái.
- **Chế độ đồng bộ / riêng**: một công tắc. Đồng bộ = tất cả token dùng chung 1 preset. Riêng = mỗi token chọn preset của nó.
- **Xem trước trực tiếp**: bên phải luôn hiện thẻ RPC Discord giống thật (ảnh lớn, ảnh nhỏ, tên, 2 dòng text, nút, thanh thời gian), cập nhật ngay khi gõ. Các placeholder như nhiệt độ, uptime được hiện bằng số mẫu để thấy kết quả.
- **Khoá API của runner**: trang cài đặt hiện lệnh chạy runner kèm khoá, có nút sao chép và nút tạo khoá mới.

## Giao diện

Tối màu kiểu Discord: nền than chì, xám xanh, điểm nhấn tím chàm Discord, bo góc mềm, font gọn. Không dùng giao diện mặc định nhạt nhẽo.

## Phần kỹ thuật

- Bật Lovable Cloud: bảng `profiles`, `presets`, `tokens`, `runner_keys`, RLS theo `auth.uid()`, giới hạn 5 bằng ràng buộc phía server.
- Đăng nhập Discord bằng provider Discord của Cloud Auth — dùng Client ID/Secret của bot bạn đã có.
- Token Discord được mã hoá trước khi lưu, không bao giờ trả về trình duyệt ở dạng gốc; chỉ runner lấy được qua khoá API.
- Endpoint `/api/public/runner/config` trả cấu hình đầy đủ cho runner, xác thực bằng header khoá API.
- Bản Python cập nhật: `runner.py` thay `rpc.py` — giữ nguyên `gateway.py` và `placeholders.py`, thay phần đọc `config.json` bằng gọi API, hỗ trợ nhiều token cùng lúc.
- File `HUONG-DAN-OAUTH2.md`: hướng dẫn từng bước lấy Client ID/Secret, thêm Redirect URI, bật scope `identify`, và cách chạy runner trên host.

## Thứ tự làm

1. Bật Cloud, tạo bảng + RLS.
2. Đăng nhập Discord + trang auth.
3. Dashboard: preset, token, chế độ đồng bộ/riêng.
4. Khung xem trước RPC.
5. API cho runner + khoá API.
6. `runner.py` + file hướng dẫn OAuth2.
