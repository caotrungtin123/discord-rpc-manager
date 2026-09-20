# Dashboard quản trị dành cho owner

## Trải nghiệm
- Thêm mục “Quản trị” ở cuối nhóm menu chính, chỉ hiện với Discord ID owner `951458515250192448`.
- Hiển thị danh sách dashboard người dùng, ô tìm kiếm chính xác hoặc gần đúng theo Discord User ID, tên và ảnh Discord.
- Khi chọn một người dùng, owner xem được trạng thái RPC, các mẫu và danh sách token đã che; không hiển thị token gốc.
- Cho phép owner chỉnh trạng thái chạy, cấu hình mẫu, trạng thái token và xóa dữ liệu hoặc tài khoản người dùng sau bước xác nhận.

## Bảo mật
- Lưu quyền owner trong bảng vai trò riêng, không dựa vào dữ liệu trình duyệt hay Discord ID do giao diện gửi lên.
- Mọi thao tác quản trị chạy phía máy chủ, kiểm tra phiên đăng nhập và vai trò owner trước khi đọc hoặc thay đổi dữ liệu.
- Không trả khóa runner, token mã hóa hoặc token Discord gốc về trình duyệt.

## Kiểm tra
- Xác nhận tài khoản owner nhìn thấy mục Quản trị và tìm được người dùng bằng Discord ID.
- Xác nhận người dùng thường không thấy mục này và không thể gọi thao tác quản trị.
- Kiểm tra tìm kiếm, chỉnh sửa, xác nhận xóa và hiển thị trên máy tính/điện thoại.
