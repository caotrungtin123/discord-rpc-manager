# Làm mới dashboard Binix

## Mục tiêu
Đổi dashboard theo giao diện trong ảnh mẫu: nền tối, điểm nhấn hồng, thông tin gọn và các khu vực RPC, Treo Voice, Status, Auto Quest rõ ràng. Giữ nguyên phần RPC đang hoạt động; Treo Voice và Auto Quest chỉ có giao diện cùng thư mục mã khởi đầu để bạn tự hoàn thiện.

## Giao diện
- Thêm thanh điều hướng dashboard để chuyển giữa **Tổng quan**, **Rich Presence**, **Treo Voice**, **Status** và **Auto Quest**.
- Trang **Tổng quan** hiển thị lời chào, số tài khoản đang chạy theo từng loại, gói hiện tại, phiên đang hoạt động và lối truy cập nhanh như ảnh mẫu.
- Trang **Rich Presence** giữ toàn bộ trình sửa mẫu, token, đồng bộ riêng/chung, xem trước và kết nối runner hiện tại; chỉ sắp xếp lại để đồng bộ với giao diện mới.
- Trang **Treo Voice**, **Status** và **Auto Quest** có tiêu đề, mô tả, bộ lọc nhóm, nút thêm tài khoản và trạng thái trống đúng phong cách ảnh mẫu.
- Tối ưu bố cục cho điện thoại bằng thanh điều hướng cuộn ngang và các khối xếp dọc.

## Thư mục tự phát triển
- Tạo `runner/voice/` và `runner/auto_quest/` với file chạy Python tối giản, file cấu hình mẫu và README chỉ rõ điểm bạn cần tự bổ sung.
- Không kết nối hai tính năng này vào token, cơ sở dữ liệu hay tiến trình chạy thật.

## Giữ nguyên
- Đăng nhập Discord và thông tin avatar/tên người dùng.
- Tối đa 5 mẫu RPC, 5 token, chế độ đồng bộ hoặc mỗi token một mẫu.
- API runner và logic RPC hiện có.

## Kiểm tra
- Kiểm tra chuyển qua lại giữa các khu vực, chỉnh/lưu RPC, màn hình trống và hiển thị desktop/mobile.
- Xác nhận dự án không có lỗi biên dịch hoặc lỗi trình duyệt mới.
