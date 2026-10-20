# Thiệp Cưới

Nền tảng tạo thiệp cưới cá nhân: tạo tài khoản, chỉnh sửa nội dung và ảnh, sắp xếp hạng mục, quản lý khách mời và nhận ảnh khách gửi. Mỗi khách có liên kết riêng. Thiệp dùng chung một mẫu giao diện và lấy toàn bộ nội dung từ API.

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

```sh
npm test
npm run lint
npm run build
node scripts/optimize-images.mjs
```

## Triển khai

Triển khai frontend trên Vercel. `vercel.json` chuyển `/api/*` sang API Railway trước khi chuyển các đường dẫn SPA về `index.html`; cấu hình lại đích API khi thay đổi backend. Middleware ở repo root do backend quản lý trả thẻ Open Graph cho crawler. Đặt các biến `VITE_*` khi build frontend, và `API_ORIGIN` cho middleware theo môi trường triển khai. Các đường dẫn `/assets/*` được cache lâu; `/images/*` được cache một ngày.
