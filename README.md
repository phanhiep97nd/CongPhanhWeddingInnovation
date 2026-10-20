# Thiệp Cưới

Nền tảng tạo thiệp cưới cá nhân: chỉnh sửa nội dung và ảnh, quản lý khách mời, thanh toán theo từng thiệp và quản trị tài khoản. Mỗi khách có liên kết riêng. Thiệp lấy nội dung và quyền tính năng từ API.

## Các gói

Mỗi thiệp bắt đầu ở gói Miễn phí: tối đa 10 khách và 6 ảnh theo cấu hình mặc định, có dòng thương hiệu, hết hạn 30 ngày sau ngày cưới (hoặc 365 ngày sau khi tạo nếu chưa có ngày cưới). Đường dẫn mới có hậu tố 4 ký tự.

Gói Cơ bản mở khách không giới hạn, tối đa 50 ảnh, xuất Excel, mã QR khách mời và bỏ dòng thương hiệu. Gói Cao cấp thêm hộp mừng cưới, ảnh khách gửi, nhạc nền riêng, đường dẫn tùy chỉnh, mẫu Tối giản và thiệp không hết hạn. Giá mặc định là 30.000đ và 99.000đ; quản trị viên có thể đổi giá và giới hạn. Nâng từ Cơ bản lên Cao cấp chỉ thanh toán chênh lệch.

## Phát triển

Yêu cầu Node.js và backend API chạy trên cổng 3001. Frontend dùng Vite trên cổng 3000; proxy `/api` chuyển yêu cầu sang backend và bỏ tiền tố `/api`.

```sh
npm install
npm run dev
```

Tạo `.env.local` nếu cần tải ảnh lên Cloudinary:

```env
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset
VITE_LEGACY_SLUG=congphanh
```

`VITE_LEGACY_SLUG` tùy chọn, mặc định `congphanh`; dùng để chuyển liên kết cũ `/?id=...` sang thiệp mới. Cloudinary cần unsigned upload preset. Ảnh tải lên được thu nhỏ ở trình duyệt trước khi gửi.
Tải nhạc dùng cùng preset Cloudinary nhưng gửi tới `/video/upload`; preset cần chấp nhận tệp âm thanh tối đa 15 MB.

```sh
npm test
npm run lint
npm run build
node scripts/optimize-images.mjs
```

## Triển khai

Triển khai frontend trên Vercel. `vercel.json` chuyển `/api/*` sang API Railway trước khi chuyển các đường dẫn SPA về `index.html`; cấu hình lại đích API khi thay đổi backend. Middleware ở repo root do backend quản lý trả thẻ Open Graph cho crawler. Đặt các biến `VITE_*` khi build frontend, và `API_ORIGIN` cho middleware theo môi trường triển khai. Các đường dẫn `/assets/*` được cache lâu; `/images/*` được cache một ngày.

### PayOS

Đặt `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` và `SITE_ORIGIN` trong môi trường Railway của API. `SITE_ORIGIN` là URL Vercel công khai, không có dấu `/` cuối. Cấu hình webhook PayOS tới `https://<API_RAILWAY_DOMAIN>/payos/webhook` (đường dẫn backend trực tiếp; nếu đi qua Vercel thì dùng `https://<SITE_ORIGIN>/api/payos/webhook`). Liên kết thanh toán quay về `/dashboard/:id?payment=success&orderCode=...` hoặc `payment=cancel`; trang biên tập gọi sync để xác nhận ngay cả khi webhook chưa đến.

### Quản trị

Đặt `ADMIN_EMAILS` (danh sách email phân tách bằng dấu phẩy) trên Railway để tự cấp quyền admin khi đăng ký/đăng nhập. Với tài khoản đã có, chạy `npm run make-admin -- <email>` trong môi trường backend có kết nối MongoDB. Quản trị viên mở `/admin` để xem thống kê, người dùng, đơn hàng và cài đặt giá, giới hạn.
