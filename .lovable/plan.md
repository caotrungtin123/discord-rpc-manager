# Hiện token gốc cho owner

## Mục tiêu
- Trong khu vực Quản trị, owner có thể xem hoặc ẩn token gốc của từng tài khoản.
- Danh sách mặc định vẫn hiển thị token đã che; token gốc chỉ được tải khi owner chủ động bấm xem.

## Thực hiện
- Thêm thao tác máy chủ nhận đúng `userId` và `tokenId`, xác thực phiên đăng nhập và quyền `owner`, sau đó mới đọc bản mã và giải mã token.
- Kiểm tra token thực sự thuộc người dùng đang được xem trước khi trả kết quả.
- Thêm nút biểu tượng mắt cho từng token, trạng thái đang tải, nút sao chép và tự xóa token gốc khỏi màn hình khi đổi người dùng hoặc tải lại danh sách.
- Giữ nguyên việc che token trong dữ liệu danh sách quản trị để không gửi hàng loạt token gốc xuống trình duyệt.

## Kiểm tra
- Xác nhận owner xem, ẩn và sao chép được token.
- Xác nhận yêu cầu sai người dùng/token bị từ chối và người không phải owner không thể gọi thao tác.
- Kiểm tra giao diện trên máy tính và điện thoại, cùng trạng thái biên dịch hiện tại.
