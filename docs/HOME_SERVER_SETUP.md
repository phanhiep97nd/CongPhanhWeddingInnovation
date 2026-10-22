# Deploy Hỷ Thiệp — hythiep.net với PostgreSQL trên server local

> Dùng cùng Ubuntu Server và Cloudflare Tunnel `hoanhoahong` như các project khác. Lệnh bên dưới chạy bằng Bash, user `deploy`. PostgreSQL riêng chạy bằng Docker trên server, không cần MongoDB/Atlas.

## 1. Kiến trúc và thông số

```text
Internet → Cloudflare HTTPS → Tunnel hoanhoahong
  → 127.0.0.1:8050 → web (nginx + React)
                       ├── /, /dashboard, /admin, /w/... → SPA
                       └── /api/* → api:3001/* → db:5432 (PostgreSQL)
                                                └── volume postgres_data
Trình duyệt → Cloudinary (ảnh/nhạc)
PayOS → https://hythiep.net/api/payos/webhook
```

| Thông số | Giá trị |
|---|---|
| Git | `https://github.com/phanhiep97nd/CongPhanhWeddingInnovation.git` |
| Nhánh | `main` |
| Thư mục server | `/home/deploy/apps/hythiep` (`~/apps/hythiep`) |
| Website / admin | `https://hythiep.net` / `https://hythiep.net/admin` |
| API | `https://hythiep.net/api` |
| WWW | `https://www.hythiep.net` → redirect 308 về domain chính |
| Cổng host | `127.0.0.1:8050` |
| Database / user PostgreSQL | `hythiep` / `hythiep` |
| PostgreSQL | `postgres:17-alpine`, cổng 5432 chỉ trong Docker |
| Volume | `hythiep_postgres_data` (Compose project `hythiep`) |

Cổng mặc định mới là 8050 vì cổng 8040 trên server đang phục vụ dịch vụ khác. Kiểm tra 8050 còn trống trước khi chạy; có thể đổi bằng `WEB_PORT` trong `.env`, rồi sửa Service URL của cả hai route Tunnel và các lệnh curl cho khớp. API và PostgreSQL không mở cổng ra host/Internet. Không cần IP public cố định hay danh sách IP Atlas.

## 2. File deploy đã có sẵn

| File | Vai trò |
|---|---|
| `docker-compose.home.yml` | Ba service db/api/web, volume PostgreSQL và health check |
| `Dockerfile.home`, `api/Dockerfile.home` | Build frontend và API theo lockfile |
| `deploy/nginx.home.conf` | SPA fallback, bỏ `/api` khi proxy, redirect www |
| `.dockerignore` | Loại file bí mật, node_modules, bản build cũ, export và backup khỏi image |
| `.env.home.example` | Mẫu biến production |
| `api/db/migrations/*.sql` | Schema PostgreSQL có version, khóa ngoại và index |

Không cần tạo lại bằng cách copy từ tài liệu. Commit/push bản code mới từ máy cá nhân trước khi pull trên server. Không commit `.env`, export hay backup DB.

API tự chạy migration chưa áp dụng khi khởi động. Migration có transaction và khóa tránh hai tiến trình chạy trùng. Có thể chạy riêng bằng `npm run db:migrate` trong API. Không chạy `seed` trên production.

Sáu bảng: users, weddings, guests, photos, orders, settings. Quan hệ dùng foreign key; nội dung thiệp linh hoạt dùng JSONB. Giữ ID 24 ký tự hex để tương thích API/link cũ. Xác nhận thanh toán và nâng gói thiệp được ghi trong cùng transaction.

## 3. Kiểm tra server và clone

```bash
docker --version
docker compose version
sudo systemctl status cloudflared --no-pager
groups
sudo ss -ltnp 'sport = :8050'
mkdir -p ~/apps/hythiep
cd ~/apps/hythiep
git clone https://github.com/phanhiep97nd/CongPhanhWeddingInnovation.git .
git switch main
```

User `deploy` phải thuộc nhóm docker. Giữ dấu `.` cuối clone. Nếu đã clone, kiểm tra `git status` rồi `git pull --ff-only origin main`. Repo private: xác thực bằng SSH deploy key hoặc GitHub CLI; không đưa token vào URL. Dùng lại tunnel hiện tại.

## 4. Tạo .env production

```bash
cd ~/apps/hythiep
umask 077
cp .env.home.example .env
openssl rand -hex 32
openssl rand -hex 32
nano .env
chmod 600 .env
```

Chỉ copy khi chưa có `.env`; nếu có, sao lưu rồi sửa từng biến. Dùng hai chuỗi hex khác nhau cho password DB và JWT:

```dotenv
POSTGRES_PASSWORD=CHUOI_HEX_THU_NHAT
JWT_SECRET=CHUOI_HEX_THU_HAI
WEB_PORT=8050
ADMIN_EMAILS=email-quan-tri-cua-ban@example.com
BRAND_NAME='Hỷ Thiệp'
OG_GUEST_OVERLAY=on
OG_FONT=Roboto
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
VITE_CLOUDINARY_CLOUD_NAME=CLOUD_NAME_CUA_BAN
VITE_CLOUDINARY_UPLOAD_PRESET=UNSIGNED_PRESET_CUA_BAN
VITE_LEGACY_SLUG=hythiep
VITE_BRAND_NAME='Hỷ Thiệp'
```

Compose tự tạo `DATABASE_URL=postgresql://hythiep:<password>@db:5432/hythiep` cho API và đặt `SITE_ORIGIN`, `ALLOWED_ORIGINS` thành `https://hythiep.net`. Không cần điền URI DB vào `.env` production. Dùng password hex để tránh ký tự cần URL encode. `MONGO_URI` không còn được đọc.

Cloudinary vẫn lưu ảnh/nhạc, PostgreSQL lưu nội dung và URL. Preset upload là unsigned; nhạc dùng `/video/upload`, tối đa 15 MB theo luồng hiện tại. Không đưa khóa bí mật vào `VITE_*` vì chúng công khai trong frontend.

`VITE_LEGACY_SLUG=hythiep` là đích của link cũ `/?id=...`, cần có thiệp mang slug tương ứng. Nếu import dữ liệu, đặt bằng slug thiệp thực tế. Domain mới không tự đổi slug đã lưu.

## 5. Khởi động

Nếu cần chuyển dữ liệu đang có trên MongoDB, đọc [POSTGRESQL_MIGRATION.md](POSTGRESQL_MIGRATION.md) trước khi mở traffic hoặc tạo tài khoản mới: import yêu cầu DB đích trống.

Cài mới không dùng dữ liệu cũ:

```bash
cd ~/apps/hythiep
docker compose -f docker-compose.home.yml config --quiet
docker compose -f docker-compose.home.yml up -d --build
docker compose -f docker-compose.home.yml ps
docker compose -f docker-compose.home.yml logs api db --tail=40
curl -fsS http://127.0.0.1:8050/api/
curl -fsS http://127.0.0.1:8050/api/public/pricing
curl -I http://127.0.0.1:8050/dashboard
docker compose -f docker-compose.home.yml exec -T web nginx -t
```

Mong đợi db/api healthy, web Up; log API có `(PostgreSQL)`; `/api/` trả `{"status":"ok"}` sau khi kiểm tra DB thật; pricing trả JSON, dashboard trả 200. Schema được tạo tự động lần đầu.

## 6. Kết nối hythiep.net vào Cloudflare

1. Trên cùng tài khoản Cloudflare quản lý tunnel `hoanhoahong`, thêm domain `hythiep.net`, chọn gói phù hợp (có thể Free).
2. Kiểm tra DNS import, giữ MX/TXT nếu dùng email/xác minh.
3. Tại nơi mua domain, đổi nameserver bằng đúng nameserver Cloudflare cấp cho `hythiep.net`.
4. Nếu đang bật DNSSEC ở nhà đăng ký cũ, xử lý DS/DNSSEC theo hướng dẫn chuyển nameserver của Cloudflare; sau đó có thể bật lại theo cấu hình mới.
5. Chờ zone Active và Edge Certificate cho domain gốc/www được cấp.
6. Mở tunnel `hoanhoahong` → Published application routes, hoặc Routes → Add route → Published application, thêm:

| Subdomain | Domain | Type | URL |
|---|---|---|---|
| **Để trống** | `hythiep.net` | HTTP | `http://127.0.0.1:8050` |
| `www` | `hythiep.net` | HTTP | `http://127.0.0.1:8050` |

Hostname gốc phải là `hythiep.net`; không gõ `@` trong ô subdomain. Nếu ô URL yêu cầu giao thức, dùng `http://127.0.0.1:8050`. Cloudflare tạo DNS record cho route. Nếu trùng A/AAAA/CNAME @/www, kiểm tra rồi thay đúng record web; giữ DNS và route project khác.

Cấu hình giả định cloudflared chạy bằng systemd trên host. Nếu chạy trong container, phải điều chỉnh mạng/địa chỉ origin. Không dùng Access bắt đăng nhập cho khách mời/webhook; `/api/*` phải bypass cache.

```bash
curl -I https://hythiep.net/
curl -I 'https://www.hythiep.net/login?from=test'
curl -fsS https://hythiep.net/api/
```

Domain chính trả 200; www trả 308 giữ path/query; API trả status ok.

## 7. Kiểm tra chức năng và thanh toán

- Đăng ký/đăng nhập, tạo/sửa/xuất bản thiệp, upload ảnh; kiểm tra Network gọi cùng domain `/api/...`.
- Mở link `/w/<slug>/<code>`, gửi RSVP và kiểm tra dashboard. Với gói tương ứng thử nhạc, ảnh khách, QR và Excel. `402 PLAN_REQUIRED` là giới hạn gói.
- Đăng nhập email trong `ADMIN_EMAILS`, mở `/admin`, kiểm tra thống kê, người dùng, đơn hàng và giá.

Cấp quyền cho tài khoản đã có rồi đăng nhập lại:

```bash
docker compose -f docker-compose.home.yml exec api npm run make-admin -- email-cua-ban@example.com
```

PayOS: điền đủ ba khóa trong `.env`, chạy `docker compose -f docker-compose.home.yml up -d --force-recreate api`; webhook là `https://hythiep.net/api/payos/webhook`. Endpoint nhận POST có chữ ký; mở bằng GET không kiểm tra được webhook. Thử thanh toán, hủy và trạng thái đơn trong admin. Chỉ đổi webhook từ môi trường cũ khi server mới sẵn sàng.

Preview chia sẻ: nginx không thực thi middleware Vercel. Link thiệp vẫn mở nhưng crawler chỉ nhận preview chung, chưa có tên/ảnh riêng từng khách. Muốn giữ preview cá nhân cần bổ sung server xử lý HTML crawler. Chuyển DB không thay đổi giới hạn này.

## 8. Sao lưu và kiểm tra khôi phục PostgreSQL

Volume giữ dữ liệu khi tạo lại container hoặc chạy `down`; cần backup riêng. Chạy bằng Bash trên server:

```bash
cd ~/apps/hythiep
umask 077
mkdir -p backups
backup_file="backups/hythiep-$(date +%Y%m%d-%H%M%S).dump"
docker compose -f docker-compose.home.yml exec -T db pg_dump -U hythiep -d hythiep -Fc > "$backup_file"
test -s "$backup_file"
docker compose -f docker-compose.home.yml exec -T db pg_restore --list < "$backup_file"
chmod 600 "$backup_file"
```

Chỉ coi backup thành công khi pg_dump thoát mã 0 và đọc được archive. Giữ thêm bản ở thiết bị/kho khác, sao lưu `.env` riêng ở nơi hạn chế quyền; Cloudinary cần backup riêng. Export và backup được loại khỏi Git/Docker context.

Thử restore vào DB mới, không ghi đè production:

```bash
docker compose -f docker-compose.home.yml exec -T db createdb -U hythiep hythiep_restore_check
docker compose -f docker-compose.home.yml exec -T db pg_restore -U hythiep -d hythiep_restore_check --no-owner --single-transaction --exit-on-error < "$backup_file"
docker compose -f docker-compose.home.yml exec -T db psql -U hythiep -d hythiep_restore_check -c 'SELECT count(*) FROM users;'
```

DB thử phải chưa tồn tại. Khôi phục production cần dừng web/api, backup trạng thái hiện tại, rồi có kế hoạch thay DB từ bản restore đã kiểm tra; không restore chồng lên DB đang phục vụ khách.

## 9. Cập nhật và vận hành

Sao lưu theo Phần 8 trước thay đổi schema, rồi:

```bash
cd ~/apps/hythiep
git status --short
git rev-parse HEAD > ~/hythiep-previous-commit.txt
git pull --ff-only origin main
docker compose -f docker-compose.home.yml up -d --build
curl -fsS http://127.0.0.1:8050/api/public/pricing
```

Tự động deploy: [AUTO_DEPLOY.md](AUTO_DEPLOY.md). Thêm migration version tiếp theo, không sửa file đã áp dụng. Không nâng major PostgreSQL bằng đổi tag image trên volume cũ: cần backup/restore hoặc pg_upgrade riêng.

| Thay đổi | Áp dụng |
|---|---|
| JWT/admin/PayOS/biến backend | Sửa .env, `up -d --force-recreate api` |
| Biến VITE_* | Sửa .env, `up -d --build web` |
| Code/nginx | `up -d --build` |
| Password DB đã có | Đổi trong DB bằng psql và `\password hythiep`, sửa .env cùng giá trị rồi tạo lại api/db |

Các lệnh up trong bảng đều kèm `docker compose -f docker-compose.home.yml`. Vào psql bằng `docker compose -f docker-compose.home.yml exec db psql -U hythiep -d hythiep`. `POSTGRES_PASSWORD` chỉ khởi tạo password khi volume trống; đổi .env đơn thuần không đổi password DB hiện tại. Dùng password hex mới khi xoay khóa.

Rollback code không tự hoàn tác schema/dữ liệu. Bản code trước khi chuyển PostgreSQL cần MongoDB, không thể chỉ checkout commit cũ rồi giữ cấu hình hiện tại. Giữ backup và môi trường cũ đến khi xác nhận chuyển đổi; nếu cần quay lại phải đồng bộ code, cấu hình, dữ liệu và webhook. Dữ liệu ghi mới trên PostgreSQL không tự đồng bộ ngược.

## 10. Sự cố và dừng site

| Triệu chứng | Kiểm tra |
|---|---|
| Thiếu POSTGRES_PASSWORD/JWT_SECRET | Tạo .env ở gốc repo từ .env.home.example, điền đủ |
| DB unhealthy | Logs db; ổ đĩa, quyền volume, tag PostgreSQL |
| Password authentication failed | Password trong DB khác .env; đồng bộ theo Phần 9, không xóa volume |
| Migration lỗi | Logs api, DB healthy và quyền tạo bảng; không xóa bảng migration thủ công |
| API trả 503/500 | Kết nối PostgreSQL/migration; health endpoint kiểm tra DB thật |
| Nginx/Cloudflare 502 | Curl loopback 8050, trạng thái web/api, route HTTP và cloudflared |
| Upload lỗi | Preset Cloudinary và build lại web sau khi đổi VITE_* |

```bash
docker compose -f docker-compose.home.yml ps
docker compose -f docker-compose.home.yml logs --tail=80 db api web
sudo journalctl -u cloudflared -n 30 --no-pager
```

Dừng riêng Hỷ Thiệp nhưng giữ DB:

```bash
cd ~/apps/hythiep
docker compose -f docker-compose.home.yml down
```

**Không thêm `-v`** nếu còn cần DB: `down -v` xóa volume PostgreSQL. Không dừng tunnel dùng chung. Nếu gỡ domain, chỉ gỡ route hythiep.net/www.hythiep.net và xử lý webhook liên quan.

Tham khảo: [Cloudflare nameserver](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/), [Cloudflare published routes](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/), [PostgreSQL pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html).
