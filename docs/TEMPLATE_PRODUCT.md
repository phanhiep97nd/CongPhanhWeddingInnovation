# Bộ sưu tập mẫu trong Hỷ Thiệp

## Luồng sản phẩm của dự án

Khách hàng tạo một thiệp từ tài khoản của mình, nhập thông tin ngày cưới trong editor, chọn phong cách, xem trước thiệp đã lưu, rồi thêm khách để lấy link riêng `/w/:slug/:code`. RSVP và danh sách khách dùng cùng dữ liệu của thiệp. Việc đổi phong cách không tạo thiệp mới, không đổi mã khách và không đổi link đã gửi.

Gói và thanh toán tiếp tục theo cơ chế hiện có: Miễn phí để bắt đầu; Cơ bản mở thêm quy mô khách và ảnh; Cao cấp mở bộ sưu tập phong cách, cùng các tính năng cao cấp khác. Giá và quyền sử dụng do cấu hình hiện có quản lý. Không sao chép luồng đăng ký, tạo thiệp, biên tập hoặc thanh toán của website tham chiếu.

## Phạm vi mẫu đã tích hợp

`src/lib/invitationDesigns.ts` là danh mục 24 phong cách dựng độc lập từ tên, mô tả và tông màu quan sát được trong bản lưu `ReverseEngineerAnything/.cache/hythiep-snapshot`. Trang chủ cho xem phác họa, editor cho chọn phong cách và xem thiệp đã lưu trên khung điện thoại/máy tính. `theme.design` và `theme.primary` lưu lựa chọn; API kiểm tra mã phong cách và quyền gói Cao cấp. Renderer thiệp gốc tiếp tục sở hữu nội dung, RSVP và cá nhân hóa theo khách.

Các phong cách hiện tại thể hiện bảng màu, nền giấy, chữ và nhóm trang trí. Chúng **không** phải source gốc hay bản dựng đủ từng bố cục/hiệu ứng của 24 mẫu tham chiếu. Các snapshot của CineLove, Chung Đôi, M-Invite chỉ là tài liệu khảo sát; không được đưa vào luồng sản phẩm hoặc giới thiệu như mẫu có thể chỉnh sửa. M-Invite có 66 đối tượng dữ liệu thiết kế frontend, nhưng không có TSX/JSX và backend gốc. Muốn cung cấp từng thiết kế với độ trung thực cao cần dựng và kiểm tra riêng từng mẫu trên renderer của dự án.

## Trước khi phát hành

Trước khi phát hành, xem thủ công trên điện thoại và máy tính. Kiểm tra thêm một thiệp có khách: đổi phong cách, lưu, mở link cũ của khách, xác nhận tên hiển thị và RSVP.
