# Tự động deploy Hỷ Thiệp — hythiep.net khi push lên main

> GitHub Actions + self-hosted runner trên cùng home server đang chạy các project khác. Làm xong [HOME_SERVER_SETUP.md](HOME_SERVER_SETUP.md) và chuyển dữ liệu PostgreSQL nếu cần trước. Các file Docker/Compose đã có trong repo; workflow dưới đây là mẫu để bạn tạo.

## 1. Thông số và điều kiện

| Thông số | Giá trị |
|---|---|
| Repo | `https://github.com/phanhiep97nd/CongPhanhWeddingInnovation.git` |
| Nhánh deploy | `main` |
| Thư mục app | `/home/deploy/apps/hythiep` |
| Website | `https://hythiep.net` |
| User chạy runner | `deploy` |
| Thư mục runner riêng | `/home/deploy/actions-runner/hythiep` |
| Tên / label riêng | `home-server-hythiep` / `hythiep` |
| Log deploy trên server | `/home/deploy/deploy-logs/hythiep.log` |
| Kiểm tra sau deploy | `http://127.0.0.1:8050/`, `/dashboard`, `/api/`, `/api/public/pricing` |

Luồng: push `main` → runner nhận job → cập nhật code → Compose build/chạy lại → kiểm tra HTTP → lưu log. Runner chủ động kết nối GitHub, không cần mở thêm cổng Internet.

Điều kiện:

- Deploy thủ công thành công; PostgreSQL local healthy, có `.env` với `POSTGRES_PASSWORD`, `JWT_SECRET` và đủ file deploy trên server.
- Đã sao lưu DB trước lần deploy có thay đổi schema. Volume `hythiep_postgres_data` giữ dữ liệu khi build lại; tuyệt đối không dùng `down -v` trong workflow.
- Các file cấu hình deploy đã được commit/push; working tree server sạch.
- Checkout server đang ở `main`, không ở detached HEAD sau rollback.
- User `deploy` dùng được `docker compose`, `git`, `curl` và thuộc nhóm `docker`.
- Repo chỉ cho người tin cậy push code; runner có quyền Docker trên server. Workflow bên dưới chỉ nhận push `main` hoặc chạy tay trên `main`, không chạy pull request từ bên ngoài.

## 2. Đăng ký runner riêng cho repo

1. GitHub → mở repo theo URL trong bảng trên → **Settings → Actions → Runners → New self-hosted runner** → chọn Linux và kiến trúc đúng của server (`uname -m`; thường là x64).
2. SSH vào server bằng user `deploy`:

   ```bash
   mkdir -p ~/actions-runner/hythiep
   cd ~/actions-runner/hythiep
   ```

3. Copy các lệnh tải, kiểm tra checksum và giải nén từ GitHub ở thời điểm cài. Không dùng lại thư mục runner của DongNatXanh.
4. Dùng token đăng ký ngắn hạn GitHub vừa cấp:

   ```bash
   ./config.sh --url https://github.com/phanhiep97nd/CongPhanhWeddingInnovation --token TOKEN_VUA_COPY --name home-server-hythiep --labels hythiep --unattended
   sudo ./svc.sh install deploy
   sudo ./svc.sh start
   sudo ./svc.sh status
   ```

5. Trang Runners của repo phải thấy runner mới **Idle**. Không chạy thêm `./run.sh` khi đã chạy service.

Nếu vừa thêm user vào nhóm Docker, dừng/khởi động lại runner service để nhận nhóm mới. Không chạy `config.sh` bằng root.

## 3. Tạo workflow trên máy cá nhân

Tạo `.github/workflows/deploy-home.yml` trong repo Hỷ Thiệp với nội dung sau. Các đường dẫn giả định user server là `deploy`; sửa đồng bộ nếu bạn dùng user khác.

```yaml
name: Deploy HyThiep to home server

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: deploy-hythiep-home
  cancel-in-progress: false

jobs:
  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: [self-hosted, linux, hythiep]
    timeout-minutes: 30
    defaults:
      run:
        shell: bash
        working-directory: /home/deploy/apps/hythiep
    env:
      LOG: /home/deploy/deploy-logs/hythiep.log
    steps:
      - name: Kiểm tra checkout và file môi trường
        run: |
          mkdir -p "$(dirname "$LOG")"
          if [ -f "$LOG" ] && [ "$(stat -c%s "$LOG")" -gt 5000000 ]; then
            mv "$LOG" "$LOG.1"
          fi
          echo "[$(date -Is)] DEPLOY START event=$GITHUB_SHA" | tee -a "$LOG"
          test "$(git branch --show-current)" = main
          test -z "$(git status --porcelain)"
          test -f .env
          git rev-parse HEAD > /home/deploy/hythiep-previous-commit.txt

      - name: Sao lưu PostgreSQL trước cập nhật
        run: |
          umask 077
          mkdir -p backups
          backup_file="backups/hythiep-$(date -u +%Y%m%d-%H%M%S)-$GITHUB_RUN_ID.dump"
          docker compose -f docker-compose.home.yml exec -T db pg_dump -U hythiep -d hythiep -Fc > "$backup_file"
          test -s "$backup_file"
          docker compose -f docker-compose.home.yml exec -T db pg_restore --list < "$backup_file" > /dev/null
          echo "Backup OK: $backup_file" | tee -a "$LOG"

      - name: Cập nhật main bằng token tạm của job
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          auth=$(printf 'x-access-token:%s' "$GH_TOKEN" | base64 -w0)
          git -c "http.https://github.com/.extraheader=AUTHORIZATION: basic $auth" \
            pull --ff-only https://github.com/phanhiep97nd/CongPhanhWeddingInnovation.git main
          unset auth
          echo "Deploy commit $(git rev-parse HEAD)" | tee -a "$LOG"

      - name: Build và chạy
        run: |
          docker compose -f docker-compose.home.yml config --quiet
          docker compose -f docker-compose.home.yml up -d --build 2>&1 | tee -a "$LOG"

      - name: Kiểm tra web và API qua nginx
        run: |
          check() {
            for i in $(seq 1 30); do
              if curl --connect-timeout 3 --max-time 5 -fsS -o /dev/null "$1"; then
                echo "OK $1" | tee -a "$LOG"
                return 0
              fi
              sleep 2
            done
            echo "FAIL $1" | tee -a "$LOG"
            return 1
          }
          base_url="http://$(docker compose -f docker-compose.home.yml port web 80)"
          check "$base_url/"
          check "$base_url/dashboard"
          check "$base_url/api/"
          check "$base_url/api/public/pricing"
          curl --max-time 10 -fsS "$base_url/api/" \
            | python3 -c 'import json,sys; assert json.load(sys.stdin).get("status") == "ok"'
          docker compose -f docker-compose.home.yml exec -T web nginx -t

      - name: Chẩn đoán nếu lỗi
        if: failure()
        run: |
          docker compose -f docker-compose.home.yml ps 2>&1 | tee -a "$LOG"
          docker compose -f docker-compose.home.yml logs --tail=50 2>&1 | tee -a "$LOG"

      - name: Ghi kết quả
        if: always()
        env:
          DEPLOY_STATUS: ${{ job.status }}
        run: |
          echo "[$(date -Is)] DEPLOY $DEPLOY_STATUS commit=$(git rev-parse HEAD)" | tee -a "$LOG"
```

Workflow yêu cầu thêm `python3` để xác minh JSON health response; Ubuntu thường có sẵn, kiểm tra `python3 --version` trước khi chạy. Không in `docker compose config` đầy đủ hoặc `.env` ra log vì có thể lộ bí mật.

Job cập nhật phiên bản `main` mới nhất lúc chạy và ghi commit thực tế vào log; nếu có nhiều push chờ nhau, một job có thể triển khai commit mới hơn commit kích hoạt nó. Kiểm tra trạng thái xanh chỉ xác minh dịch vụ và route cơ bản, không thay thế kiểm tra đăng nhập/thanh toán trong trình duyệt.

Workflow sao lưu PostgreSQL trước khi pull/build; lỗi backup làm job dừng. Các backup nằm trong `backups/`, cần tự quản lý dung lượng và lưu thêm bản ngoài server. Workflow không tự rollback khi lỗi. API tự áp dụng SQL migration chưa chạy lúc khởi động; workflow không tự import dữ liệu cũ hoặc seed. Kiểm tra restore theo Phần 8 và đọc lưu ý rollback ở Phần 9 của hướng dẫn thủ công trước khi cập nhật schema. Đặc biệt không checkout bản MongoDB cũ rồi giữ nguyên cấu hình PostgreSQL.

## 4. Chuẩn bị server trước lần chạy đầu

Nếu remote đang chứa token cũ, đổi về URL sạch:

```bash
cd ~/apps/hythiep
git remote set-url origin https://github.com/phanhiep97nd/CongPhanhWeddingInnovation.git
git status --short
git branch --show-current
python3 --version
```

Workflow sử dụng token tạm của GitHub, không cần lưu PAT trong `.git/config`. Với repo private, `git pull` thủ công vẫn cần SSH key hoặc GitHub CLI đã đăng nhập; URL sạch một mình không cấp quyền truy cập.

Nếu đã tạo file deploy trực tiếp trên server, chúng phải giống bản đã commit. Di chuyển bản tạo tay chưa theo dõi ra nơi sao lưu trước khi pull nếu tên file trùng; giữ `.env` tại chỗ và không dùng lệnh xóa sạch working tree.

## 5. Chạy thử và sử dụng hằng ngày

Commit và push workflow từ máy cá nhân. GitHub → **Actions → Deploy HyThiep to home server → Run workflow**, chọn `main`, hoặc push một commit mới lên `main`.

Sau job xanh, kiểm tra `https://hythiep.net`, đăng nhập, thiệp công khai và `/admin`. Xem log cục bộ:

```bash
tail -n 100 /home/deploy/deploy-logs/hythiep.log
```

| Việc | Thao tác |
|---|---|
| Deploy code mới | Push `main` |
| Deploy lại | Actions → Run workflow → `main` |
| Đổi bí mật API | SSH sửa `.env`, chạy `up -d --force-recreate api` hoặc Run workflow |
| Đổi biến frontend | SSH sửa `.env`, Run workflow để build lại |
| Xem lỗi build | Tab Actions; log deploy trên server |
| Sau rollback detached HEAD | Xác định bản sửa mong muốn trên `main`, `git switch main`, rồi Run workflow |

Không sửa code trên server trong khi job deploy đang chạy. Khi muốn rollback, chờ job đang chạy kết thúc, tránh push mới trong lúc khôi phục.

## 6. Xử lý sự cố

| Triệu chứng | Xử lý |
|---|---|
| Waiting for a runner | Runner đúng repo phải online và có label `hythiep`; kiểm tra `sudo ./svc.sh status` trong thư mục runner Hỷ Thiệp |
| Bước kiểm tra checkout lỗi | Đảm bảo nhánh `main`, working tree sạch, `.env` tồn tại; dùng `git status` để kiểm tra thay vì reset/xóa mù |
| Git pull không fast-forward | Lịch sử `main` server lệch remote; xem commit và bảo toàn thay đổi trước khi đồng bộ |
| Git báo file untracked bị ghi đè | File deploy tạo tay trùng file mới trong repo; sao lưu rồi chuyển bản tạo tay ra ngoài repo |
| Git 403 / repository not found | Kiểm tra quyền Actions `contents: read`, URL repo và chính sách Actions của repo |
| Không có quyền Docker socket | Thêm `deploy` vào nhóm Docker nếu thiếu, rồi stop/start runner service |
| Build/API/health check lỗi | Xem Compose logs; đối chiếu phần xử lý sự cố trong HOME_SERVER_SETUP.md |
| Job xanh nhưng domain lỗi | Kiểm tra cloudflared, DNS và Published application route; health check chạy trên loopback |

```bash
cd ~/actions-runner/hythiep
sudo ./svc.sh status
# Chỉ chạy nếu cần khởi động lại runner:
sudo ./svc.sh stop
sudo ./svc.sh start
```

## 7. Gỡ runner khi không dùng nữa

GitHub → Settings → Actions → Runners → chọn đúng `home-server-hythiep` → Remove → lấy token gỡ. Trên server:

```bash
cd ~/actions-runner/hythiep
sudo ./svc.sh stop
sudo ./svc.sh uninstall
./config.sh remove --token TOKEN_GO_VUA_COPY
```

Việc này chỉ gỡ runner Hỷ Thiệp, không dừng website hay runner của project khác. Tạm dừng workflow trong GitHub Actions nếu muốn dừng tự động deploy mà vẫn giữ runner.

Tham khảo: [GitHub: cấu hình self-hosted runner thành service](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/configure-the-application?platform=linux).
