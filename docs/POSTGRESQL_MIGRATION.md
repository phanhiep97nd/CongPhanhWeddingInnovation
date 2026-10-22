# Chuyển dữ liệu sang PostgreSQL local

Ứng dụng dùng PostgreSQL cho toàn bộ dữ liệu tài khoản, thiệp, khách mời, ảnh, đơn hàng và cấu hình giá. Không cần MongoDB khi vận hành. Docker Compose tạo DB riêng cho Hỷ Thiệp; xem [HOME_SERVER_SETUP.md](HOME_SERVER_SETUP.md) để deploy mới.

## 1. Chọn cài mới hay giữ dữ liệu

- Nếu không cần dữ liệu cũ: chạy Compose theo hướng dẫn deploy, đăng ký tài khoản mới. Không cần import.
- Nếu cần giữ dữ liệu MongoDB: thực hiện các bước bên dưới trước khi đưa site mới vào sử dụng. Không chạy seed hay đăng ký người dùng ở DB đích trước import.

Chỉ chuyển database một lần sau khi đã kiểm tra trên bản sao. ID, hash mật khẩu, slug, mã khách, timestamps và trạng thái thanh toán được giữ nguyên; việc đổi domain không tự đổi slug dữ liệu. Nếu giữ JWT_SECRET cũ thì token chưa hết hạn có thể tiếp tục hợp lệ; đổi secret yêu cầu đăng nhập lại.

## 2. Export dữ liệu cũ

Trên máy có MongoDB Database Tools và quyền đọc DB cũ, dùng `mongoexport` để xuất sáu collection. Lấy URI riêng tư bằng prompt, không ghi URI/password vào tài liệu hoặc command history:

```bash
mkdir -p mongo-export
chmod 700 mongo-export
read -rsp 'MongoDB URI (database nguồn): ' SOURCE_MONGO_URI
echo
for collection in users weddings guests photos orders settings; do
  mongoexport --uri="$SOURCE_MONGO_URI" --collection="$collection" --jsonArray --out="mongo-export/$collection.json" || break
done
unset SOURCE_MONGO_URI
chmod 600 mongo-export/*.json
```

Chạy bằng Bash; URI phải chọn đúng database Wedding cũ. Xác nhận cả sáu file được export thành công; collection rỗng dùng `[]`. Import cũng chấp nhận JSON Lines và Extended JSON `$oid`, `$date`, `$numberLong`. Không dùng file BSON từ mongodump trực tiếp cho importer này.

Các file chứa dữ liệu cá nhân và hash mật khẩu; truyền qua SSH/SCP và giữ ở nơi hạn chế truy cập, không commit. `mongo-export/` được bỏ qua bởi Git và Docker context. Dữ liệu legacy thiếu quan hệ wedding không được tự gán chủ sở hữu: importer sẽ từ chối, cần xử lý trên bản sao với chủ sở hữu đúng trước khi nhập.

Để chuyển production, sau khi thử thành công trên bản sao, dừng ghi ở môi trường cũ và export lại bộ cuối cùng. Tránh nhận đăng ký, RSVP hoặc cập nhật thanh toán vào DB cũ trong lúc chuyển; đối soát các thanh toán đang chờ và webhook trước khi mở site mới. Importer yêu cầu dữ liệu nhất quán giữa sáu file.

## 3. Chuẩn bị DB đích và chạy thử

Copy thư mục export lên `~/apps/hythiep/mongo-export` trên server. Tạo `.env` theo hướng dẫn deploy. Đảm bảo không có dữ liệu thật trong DB PostgreSQL đích; nếu đã chạy site mới thì sao lưu và lập kế hoạch chuyển riêng, không xóa volume để vượt điều kiện DB trống.

```bash
cd ~/apps/hythiep
docker compose -f docker-compose.home.yml stop web api
docker compose -f docker-compose.home.yml up -d db
docker compose -f docker-compose.home.yml build api
docker compose -f docker-compose.home.yml run --rm -v "$PWD/mongo-export:/import:ro" api npm run db:import-mongo -- /import
```

Mặc định là **dry run**: tạo schema nếu chưa có, kiểm tra và thử ghi tất cả dữ liệu trong transaction rồi rollback dữ liệu. Chỉ khi log `Dry run OK` và số lượng đúng mới tiếp tục. Schema migration được giữ lại; các bảng nghiệp vụ vẫn trống.

Importer từ chối DB đã có dữ liệu ở bất kỳ bảng nghiệp vụ nào, không tự merge hoặc ghi đè. Foreign key, unique và CHECK constraints kiểm tra dữ liệu nguồn. Một record lỗi khiến toàn bộ lần import rollback, không để lại danh sách nhập dở. Lỗi được báo cùng thông tin để xử lý dữ liệu nguồn; không tiếp tục bằng cách bỏ qua lỗi không hiểu rõ.

## 4. Import thật và kiểm tra

```bash
docker compose -f docker-compose.home.yml run --rm -v "$PWD/mongo-export:/import:ro" api npm run db:import-mongo -- /import --apply
docker compose -f docker-compose.home.yml exec -T db psql -U hythiep -d hythiep -c "SELECT 'users' AS name, count(*) FROM users UNION ALL SELECT 'weddings', count(*) FROM weddings UNION ALL SELECT 'guests', count(*) FROM guests UNION ALL SELECT 'photos', count(*) FROM photos UNION ALL SELECT 'orders', count(*) FROM orders UNION ALL SELECT 'settings', count(*) FROM settings;"
docker compose -f docker-compose.home.yml up -d --build
```

So sánh số lượng với nguồn, đăng nhập bằng tài khoản cũ, mở link thiệp/khách cũ trên domain mới, xem RSVP, gói đã mua, đơn hàng và thống kê admin. Ảnh/nhạc vẫn cần URL Cloudinary hoặc nguồn ảnh cũ còn truy cập được. Import không tải hoặc chuyển file media.

Chỉ sau khi kiểm tra xong mới chuyển route/domain và webhook PayOS. Nếu URL cũ đã phát hành cho khách, phải giữ redirect hoặc môi trường chuyển tiếp phù hợp; đổi DB/domain không tự cập nhật link đã gửi.

## 5. Sao lưu và quay lại

Sao lưu PostgreSQL ngay sau khi import theo Phần 8 của [HOME_SERVER_SETUP.md](HOME_SERVER_SETUP.md), rồi kiểm tra restore vào DB thử. Giữ môi trường và backup MongoDB cũ đến khi xác nhận chuyển thành công.

Nếu cần quay lại bản MongoDB, khôi phục đồng bộ code cũ, cấu hình kết nối cũ và webhook cũ. Importer này chỉ có chiều MongoDB export → PostgreSQL; dữ liệu tạo mới trên PostgreSQL không tự đồng bộ ngược. Không coi checkout commit cũ là rollback dữ liệu.

Không dùng script legacy cũ để chuyển sang PostgreSQL. Nó đã được thay bằng `npm run db:import-mongo`; script mới giữ liên kết và chủ sở hữu hiện có thay vì tự tạo một thiệp mặc định.
