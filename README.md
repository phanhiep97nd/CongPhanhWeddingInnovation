# Thiệp Cưới

Nền tảng tạo thiệp cưới cá nhân: chỉnh sửa nội dung và ảnh, quản lý khách mời, thanh toán theo từng thiệp và quản trị tài khoản. Mỗi khách có liên kết riêng. Thiệp lấy nội dung và quyền tính năng từ API.

## Các gói

Mỗi thiệp bắt đầu ở gói Miễn phí: tối đa 10 khách và 6 ảnh theo cấu hình mặc định, có dòng thương hiệu, hết hạn 30 ngày sau ngày cưới (hoặc 365 ngày sau khi tạo nếu chưa có ngày cưới). Đường dẫn mới có hậu tố 4 ký tự.

Gói Cơ bản mở khách không giới hạn, tối đa 50 ảnh, xuất Excel, mã QR khách mời và bỏ dòng thương hiệu. Gói Cao cấp thêm hộp mừng cưới, ảnh khách gửi, nhạc nền riêng, đường dẫn tùy chỉnh, mẫu Tối giản và thiệp không hết hạn. Giá mặc định là 30.000đ và 99.000đ; quản trị viên có thể đổi giá và giới hạn. Nâng từ Cơ bản lên Cao cấp chỉ thanh toán chênh lệch.

## Phát triển

Yêu cầu Node.js 22+ và backend API PostgreSQL chạy trên cổng 3001. Frontend dùng Vite trên cổng 3000; proxy `/api` chuyển yêu cầu sang backend và bỏ tiền tố `/api`. Backend dùng `api/.env.example` để cấu hình `DATABASE_URL`, `JWT_SECRET`; xem [API README](api/README.md).

```sh
npm install
npm run dev
```

Tạo `.env.local` nếu cần tải ảnh lên Cloudinary:

```env
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset
VITE_LEGACY_SLUG=hythiep
```

`VITE_LEGACY_SLUG` dùng để chuyển liên kết cũ `/?id=...` sang thiệp có slug tương ứng. Mẫu trên đặt `hythiep`; nếu dùng link cũ, cần có thiệp mang slug này hoặc đặt biến bằng slug thiệp thực tế. Biến này không đổi slug đã lưu trong database. Cloudinary cần unsigned upload preset. Ảnh tải lên được thu nhỏ ở trình duyệt trước khi gửi.
Tải nhạc dùng cùng preset Cloudinary nhưng gửi tới `/video/upload`; preset cần chấp nhận tệp âm thanh tối đa 15 MB.

```sh
npm test
npm run lint
npm run build
node scripts/optimize-images.mjs
```

## Triển khai

Deploy Hỷ Thiệp lên `https://hythiep.net`, thư mục `~/apps/hythiep`, bằng Docker Compose gồm PostgreSQL local, API và web; dùng chung Cloudflare Tunnel với các project khác. Xem [hướng dẫn deploy local](docs/HOME_SERVER_SETUP.md), [chuyển dữ liệu MongoDB cũ sang PostgreSQL](docs/POSTGRESQL_MIGRATION.md) và [tự động deploy](docs/AUTO_DEPLOY.md). URL Git giữ nguyên; các file Docker/Compose đã có sẵn.

Backend hiện chỉ dùng PostgreSQL, không đọc `MONGO_URI`. Các file `vercel.json`/`middleware.js` vẫn dành cho môi trường Vercel trước đây; nginx local thay thế API rewrite và SPA fallback nhưng chưa chạy middleware tạo preview riêng từng khách. Các biến `VITE_*` phải đặt lúc build frontend.

### PayOS

Đặt `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` trong `.env` production. Compose đặt `SITE_ORIGIN=https://hythiep.net`. Webhook là `https://hythiep.net/api/payos/webhook`. Liên kết thanh toán quay về `/dashboard/:id?payment=success&orderCode=...` hoặc `payment=cancel`; trang biên tập gọi sync để xác nhận ngay cả khi webhook chưa đến.

### Quản trị

Đặt `ADMIN_EMAILS` (danh sách email phân tách bằng dấu phẩy) trong môi trường API để tự cấp quyền admin khi đăng ký/đăng nhập. Với tài khoản đã có, chạy `npm run make-admin -- <email>` trong môi trường backend có kết nối PostgreSQL. Quản trị viên mở `/admin` để xem thống kê, người dùng, đơn hàng và cài đặt giá, giới hạn.

## Hỷ 3D

Template `hy3d` dùng three.js với cây hoa chia theo đoạn đường, culling ở 22 m,
props PBR gộp theo material và cấu hình nhẹ cho điện thoại. Trang dev
`/__hy3d?intro=0&p=0.43&stats=1` hiện số tam giác, draw call và frame;
thêm `&lowPower=1` để kiểm tra chế độ nhẹ.

Có thể thay chibi bằng `public/models/bride.glb` và `groom.glb` mà không sửa code.
Model tải nền, thay cả cặp khi sẵn sàng và giữ chibi nếu tải lỗi.
Xem [hướng dẫn tạo hình, rig và animation](public/models/README.md).

