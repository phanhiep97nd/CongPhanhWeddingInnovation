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

### Kho mẫu và trình sửa thiệp

Kho đã nhập có 283 mẫu: 261 thiệp cưới, 11 sinh nhật, 2 tân gia, 6 tốt nghiệp và 3 sự kiện. Trang chủ giữ phong cách Hỷ Thiệp, thêm tìm kiếm, lọc danh mục, hướng dẫn và câu hỏi thường gặp. **Khám phá mẫu** mở thiệp chạy trong khung điện thoại cho cả khách chưa đăng nhập, có mở bìa, cuộn và xem lại từ đầu. **Dùng mẫu này** chuyển sang tạo tài khoản hoặc tạo thiệp.

Editor cho chọn chữ/ảnh trên bản xem trước để sửa, thay ảnh qua HTTPS hoặc Cloudinary, hoàn tác/làm lại, bật/tắt hiệu ứng và lưu. Dùng `{khach}` trong nội dung để cá nhân hóa. Thiệp đã xuất bản dùng RSVP của dự án. Đây là layout chuyển đổi từ DOM đã lưu, không phải bộ editor gốc của các website nguồn; không hỗ trợ kéo thả tự do hoặc mọi tiện ích máy chủ của họ. Các tài nguyên thiếu trong nguồn vẫn được ghi ở `api/private/templates/import-report.json` (32 tham chiếu chưa giải quyết trong lần nhập hiện tại).

Toolbar dùng chung cho toàn bộ mẫu nhập và thiệp gốc chỉ có **Gửi lời chúc** / **Hộp quà**. Toolbar nguồn, nút thu gọn, bắn tim và like được bỏ khi nhập, giữ nguyên mã trường đã lưu. Lời chúc trên thiệp chính thức lưu trong bảng `wishes` (migration `004_invitation_wishes.sql`), đọc tối đa 50 lời gần nhất và chạy nổi trên thiệp; nội dung hiển thị dạng text, không thực thi HTML. Các route `/public/weddings/:slug/wishes` dùng cùng kiểm tra thiệp đã xuất bản/chưa hết hạn; gửi có giới hạn tần suất. Demo và editor chỉ thử lời chúc trong phiên xem, không ghi database. Hộp quà dùng cấu hình của chủ thiệp và quyền gói hiện có; nếu chưa mở thì hiện thông báo, không dùng tài khoản mẫu của nguồn.

Phần hiển thị dùng lại DOM/CSS `#blessing-box` và hiệu ứng `blessingRise` của CineLove (snapshot `thiep-cuoi-2`). `api/data/blessings.js` quản lý duy nhất phần này cho iframe và mẫu gốc: tái sử dụng khung sẵn có hoặc tạo cùng cấu trúc ở mẫu chưa có. Hai `.blessing-copy` bên trong phục vụ cuộn liên tục, chỉ có một khung hiển thị. Toolbar truyền dữ liệu vào iframe qua thông điệp được kiểm tra nguồn; không có lớp bubble React chạy chồng bên ngoài. Các trường lời chúc mẫu được retire khỏi editor nhưng giữ nguyên mã lịch sử.

Thanh hai nút cao 32 px, đặt gọn ở góc dưới với nền mờ riêng từng nút. Toolbar/nút nổi/khung điện thoại trang xem thử M-Invite được loại khỏi DOM nhập. Tên hiển thị bỏ hậu tố site; tên và URL gốc vẫn nằm trong provenance riêng của máy chủ. Nội dung hiệu ứng gõ chữ bị chụp dở được phục hồi từ đúng widget trong `source/designs`, giữ khóa nội dung đã lưu.

283 bìa CineLove, Chung Đôi và M-Invite dùng ảnh chụp phần đầu thiệp thật sau hiệu ứng mở, không dùng ảnh quảng cáo có tên site. Khi chụp, công cụ bỏ lớp mở phủ lên thiết kế và đưa lớp hiệu ứng xuất hiện về trạng thái cuối; không thay hành vi mở của thiệp thật. Dữ liệu bìa sạch nằm ở `api/private/templates/covers/` cùng manifest SHA-256 và chữ ký layout/render. Importer chỉ tái sử dụng bìa khớp chữ ký; mẫu M-Invite chưa có bìa hợp lệ tạm dùng nền trung tính, không lấy lại ảnh quảng cáo. Sau khi nhập hoặc thay renderer, chạy `node capture-template-covers.mjs` từ workspace snapshot với server thử cổng 3100 đang mở, rồi build frontend. Công cụ chụp viết lại cả bìa private và `public/template-thumbnails/`; cần chuyển kèm thư mục bìa private khi triển khai hoặc tái nhập ở máy khác.

Layout, trường nội dung và tài nguyên nằm tại `api/private/templates/`; chỉ ảnh thu nhỏ ở `public/template-thumbnails/`. Hai thư mục này bị loại khỏi Git, nên phải chuyển riêng tới máy triển khai **trước khi build Docker**. Docker API chép thư mục private vào image API; frontend chỉ chép ảnh thu nhỏ vào `dist`. Migration `003_template_library.sql` được bộ migration hiện có áp dụng khi khởi động API. Sao lưu dữ liệu và bộ mẫu trước khi thay phiên bản.

Để tạo lại từ workspace snapshot, cài dependency phát triển rồi chạy tại thư mục dự án:

```sh
node scripts/import-template-library.mjs /path/to/wedding-sites
```

API công khai chỉ cung cấp danh mục và `GET /templates/:id/demo` với nội dung mẫu mặc định. Trường chỉnh sửa yêu cầu đăng nhập; render bản nháp và lưu thiệp kiểm tra chủ sở hữu. Layout không có static route; tài nguyên dùng chữ ký theo mẫu, hết hạn sau 2 giờ. CSP và iframe sandbox giới hạn hành vi của bản render. HTML/ảnh đã gửi tới trình duyệt vẫn có thể được lưu lại; các biện pháp này bảo vệ file layout và đường dẫn tài nguyên gốc, không chống sao chép tuyệt đối.

Kiểm tra local với database PGlite tạm, không đọc `.env` và không sửa database thật:

```sh
node scripts/preview-library.cjs
```

Sau đó chạy Vite với `DEV_API_TARGET=http://127.0.0.1:3101` và cổng 3100. Dữ liệu thử mất khi tắt API. Kiểm tra tính năng bằng `npm test --prefix api -- test/template-library.test.js test/postgres.test.js`, `npm run lint`, `npm test` và `npm run build`. Kiểm tra trình duyệt bổ sung nằm trong workspace snapshot: `verify-main-project.mjs` (tạo/sửa/lưu/xuất bản/RSVP) và `verify-public-demos.mjs` (xem mẫu không đăng nhập); chạy từ workspace snapshot khi hai server thử đang hoạt động. `verify-all-template-editors.mjs --resume` kiểm tra trường chữ/ảnh đại diện trên từng mẫu qua giao diện: hoàn tác/làm lại, hiệu ứng, lưu, tải lại, render cho khách và khôi phục mẫu gốc; kết quả từng mẫu nằm trong `debug/all-template-editors.json` của workspace snapshot. `verify-editor-mobile.mjs` kiểm tra lưu/tải lại ở kích thước điện thoại cho ba nguồn. URL ảnh trong kiểm tra editor dùng fixture HTTPS; các lượt này không xác nhận upload Cloudinary thật.

Để giữ tài khoản và dữ liệu kiểm thử sau khi khởi động lại, chạy `node scripts/preview-library.cjs --persistent --seed-admin`. Chế độ này chỉ dùng PGlite local, tạo admin active với thiệp mới mặc định Premium, lưu thông tin đăng nhập trong `.local-test/TAI-KHOAN-TEST.txt` và database trong `.local-test/database`. Toàn bộ `.local-test/` bị loại khỏi Git. Khi chụp bìa hoặc kiểm tra editor hàng loạt, đặt thêm `DISABLE_HMR=true` cho Vite để việc ghi file không làm tải lại trang đang kiểm tra.

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

