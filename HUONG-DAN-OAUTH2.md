# Hướng dẫn cài đặt đăng nhập Discord (OAuth2)

Bạn đã có sẵn một ứng dụng/bot Discord, chỉ cần khai báo thêm vài thông tin.

## 1. Lấy Client ID và Client Secret

1. Mở https://discord.com/developers/applications và chọn ứng dụng (bot) của bạn.
2. Vào mục **OAuth2**.
3. **CLIENT ID**: bấm *Copy*.
4. **CLIENT SECRET**: bấm *Reset Secret* nếu chưa từng lưu, rồi *Copy*. Chuỗi này chỉ hiện một lần.

## 2. Khai báo Redirect URI

Vẫn ở mục **OAuth2 → Redirects**, bấm *Add Redirect* và dán chính xác địa chỉ này:

```
https://<địa-chỉ-web-của-bạn>/api/public/auth/discord/callback
```

Ví dụ khi dùng địa chỉ xem thử của Lovable:

```
https://id-preview--975cea33-3cda-4ade-b8f3-0ef09798e71c.lovable.app/api/public/auth/discord/callback
```

Sau khi xuất bản (publish) hoặc gắn tên miền riêng, thêm tiếp một dòng nữa cho địa chỉ đó.
Có bao nhiêu địa chỉ dùng để đăng nhập thì thêm bấy nhiêu dòng. Nhớ bấm **Save Changes**.

## 3. Quyền (scope)

Trang web chỉ xin quyền **identify** (đọc tên và ảnh đại diện). Không cần thêm quyền nào khác,
không cần mời bot vào máy chủ nào cả. Người dùng sẽ thấy màn hình duyệt quyền quen thuộc của Discord.

## 4. Dán hai giá trị vào web

Trong khung trò chuyện của Lovable, mình sẽ mở một biểu mẫu an toàn để bạn dán:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`

Giá trị được lưu mã hoá, không nằm trong mã nguồn.

## 5. Chạy runner trên host

Thư mục `runner/` chứa toàn bộ thứ cần thiết.

```bash
cd runner
pip install -r requirements.txt
python runner.py --key <KHOÁ_RUNNER> --api https://<địa-chỉ-web-của-bạn>
```

Khoá runner nằm ở cuối trang dashboard, có nút sao chép sẵn cả câu lệnh.

Chạy nền lâu dài bằng screen/tmux hoặc systemd:

```bash
screen -S rpc
cd runner && python runner.py --key <KHOÁ_RUNNER> --api https://<địa-chỉ-web-của-bạn>
# Ctrl+A rồi D để thoát ra, screen -r rpc để quay lại
```

Runner tự tải cấu hình mới mỗi 30 giây, nên sau khi sửa trên web bạn không cần khởi động lại gì cả.

## Câu hỏi thường gặp

**Vì sao vẫn cần chạy runner?** Discord Rich Presence cần một kết nối mở liên tục tới Discord.
Trang web không giữ được kết nối đó 24/7, còn host của bạn thì có.

**Token Discord có an toàn không?** Token được mã hoá trước khi lưu, trình duyệt chỉ thấy dạng che
(ví dụ `MTMyOT••••a1b2`). Chỉ runner có khoá riêng mới lấy được token thật.

**Bị lỗi "Invalid OAuth2 redirect_uri"?** Địa chỉ trong bước 2 phải giống từng ký tự với địa chỉ
web bạn đang mở, kể cả `https://` và không có dấu `/` thừa ở cuối.
