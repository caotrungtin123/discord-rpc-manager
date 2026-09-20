# Cập nhật RPC và đăng nhập Discord

## Thay đổi
- Xóa toàn bộ khối “Kết nối máy chạy (runner)” khỏi trang Rich Presence.
- Giữ cơ chế đăng nhập an toàn qua máy chủ, nhưng chuyển người dùng tới đúng Discord OAuth với Client ID `1400551921541976086`, callback preview đã cung cấp và các quyền `identify guilds guilds.join`.
- Kiểm tra nút đăng nhập ở cả hai vị trí trên trang chủ và xác nhận trang vẫn hoạt động tốt.

## Chi tiết kỹ thuật
- Loại bỏ mã giao diện, lệnh sao chép và tạo lại khóa runner không còn dùng trên dashboard.
- Cố định OAuth redirect URI theo URL người dùng cung cấp; vẫn thêm `state` để bảo vệ phiên đăng nhập và lưu cùng redirect URI cho bước đổi mã Discord.
