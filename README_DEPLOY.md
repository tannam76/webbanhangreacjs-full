# Triển khai ShopTN: GitHub → Jenkins → Docker Hub → AWS EC2

## 1. Kết quả khảo sát repository

- **Nhánh triển khai:** `main` (xác nhận từ branch đang checkout).
- **Frontend:** React 18 + Create React App / `react-scripts` 5; Node.js 24 LTS
  trong container; build bằng `npm run build`, dev bằng `npm start`.
- **Backend:** Node.js + Express 4; dependencies được khóa bởi
  `server/package-lock.json`; start bằng `node server.js` / `npm start`.
- **Database:** MySQL; schema hiện có các bảng users, categories, products,
  orders, order_items. Backend không có script test riêng.
- **Kiểm tra frontend:** `npm test -- --watchAll=false`; pipeline cài bằng
  `npm ci`, build bằng `npm run build`.
- **Cấu hình API:** CRA sử dụng biến build-time `REACT_APP_API_URL`. Image
  production đặt thành `/api`, và Nginx trong frontend proxy đường dẫn đó đến
  backend cùng mạng Docker.
- **Compose:** frontend Nginx, backend Express và MySQL là ba service tách
  biệt. Chỉ frontend publish HTTP; MySQL chỉ bind trên loopback EC2 để có thể
  truy cập qua SSH tunnel. Named volume giữ dữ liệu giữa các lần deploy.
- `server/.env` trước đây được Git theo dõi; hiện đã bỏ khỏi index nhưng vẫn
  được giữ nguyên trên máy này và bị ignore. Nếu từng chứa giá trị thật, hãy
  rotate DB/JWT credentials; xóa file khỏi commit mới không xóa dữ liệu khỏi Git
  history cũ.
- Không có file DOCX được tìm thấy trong repository hoặc dưới `D:\codedevop`;
  cấu hình này dựa trên source thực tế và tài liệu chính thức bên dưới.

## 2. File triển khai

- `Dockerfile`, `server/Dockerfile`: image multi-stage frontend và image backend
  production.
- `.dockerignore`, `server/.dockerignore`, `nginx.conf`: loại secret khỏi build
  context, cấu hình SPA và reverse proxy `/api/`.
- `docker-compose.yml`: build/chạy thử local.
- `docker-compose.prod.yml`: chạy image theo commit trên EC2.
- `.env.example`, `.env.production.example`: tên biến và giá trị mẫu, không phải
  secrets thật.
- `Jenkinsfile`: test/build, tag theo commit, push Docker Hub, chuyển file triển
  khai qua SSH và deploy/health-check.
- `scripts/ec2-install-docker.sh`: cài Docker Engine và Compose plugin trên
  Ubuntu EC2.
- `scripts/deploy-remote.sh`, `scripts/check-health.sh`,
  `scripts/rollback-remote.sh`: deploy có kiểm tra và rollback.

## 3. Biến môi trường và Jenkins Credentials

### Biến trên EC2 (`/opt/shoptn/.env.production`)

Tạo file này **trực tiếp trên EC2**; không commit vào Git và không gửi qua chat.
Copy `.env.production.example` làm mẫu, thay mọi giá trị `REPLACE_...` và
`YOUR_...`, rồi đặt quyền `chmod 600`.

| Tên | Dùng ở đâu | Ghi chú |
|---|---|---|
| `DOCKERHUB_NAMESPACE` | Compose và deploy script | Docker Hub username/organization; phải trùng cấu hình Jenkins |
| `MYSQL_DATABASE` | MySQL + backend | Tên database |
| `MYSQL_USER` | MySQL + backend | User ứng dụng riêng, không dùng root |
| `MYSQL_PASSWORD` | MySQL + backend | Mật khẩu user ứng dụng |
| `MYSQL_ROOT_PASSWORD` | Chỉ MySQL | Mật khẩu quản trị MySQL |
| `JWT_SECRET` | Backend | Giá trị ngẫu nhiên dài tối thiểu 32 ký tự |

Local Docker Compose dùng cùng các tên biến trong `.env.example` (đổi tên file
thành `.env`). CRA không nhận DB password hoặc JWT secret: `REACT_APP_*` là
giá trị đóng gói vào frontend công khai, vì vậy chỉ dùng `/api`.

### Credentials trong Jenkins (Manage Jenkins → Credentials → System → Global)

| Credential ID | Kind | Nội dung |
|---|---|---|
| `github-readonly` | Username with password | GitHub username + fine-grained PAT chỉ có quyền đọc repository; gắn vào SCM job nếu repository private |
| `dockerhub-credentials` | Username with password | Docker Hub username + access token có quyền push; Jenkinsfile dùng ID này |
| `ec2-ssh-key` | SSH Username with private key | SSH user EC2 (thường là `ubuntu`) và private key; nhập trực tiếp trong Jenkins, không gửi key qua chat |
| `ec2-known-hosts` | Secret file | File known_hosts chứa host key EC2 đã xác minh độc lập; Jenkins bắt buộc `StrictHostKeyChecking=yes` |

Tạo hai repository Docker Hub là `shoptn-frontend` và `shoptn-backend`. Đặt
chúng ở chế độ **Public** để EC2 có thể pull mà không cần ghi Docker Hub token
vào EC2. Jenkins vẫn đăng nhập Docker Hub bằng credential để push.

Jenkins cần các biến môi trường (Manage Jenkins → System → Global properties):

| Tên | Giá trị |
|---|---|
| `DOCKERHUB_NAMESPACE` | Username/organization trên Docker Hub |
| `EC2_SSH_HOST` | Public DNS hoặc Elastic IP EC2 |
| `EC2_SSH_USER` | `ubuntu` (hoặc user SSH thực tế) |

## 4. A–Z: tạo máy EC2 và Docker

### 4.1 Tạo EC2 (AWS Console)

1. Tạo EC2 **Ubuntu Server 24.04 LTS**, kiến trúc amd64; chọn kích thước tối
   thiểu 2 vCPU/4 GiB RAM làm điểm bắt đầu, tăng theo tải thực tế.
2. Dùng EBS gp3 mã hóa, đủ dung lượng cho images và database; tạo AWS backup
   policy/snapshot riêng cho volume.
3. Tạo key pair `.pem`, lưu ở nơi an toàn và chỉ cấp quyền truy cập cần thiết.
4. Security Group:
   - SSH `22/tcp`: chỉ IP quản trị viên (và Jenkins nếu cần) được phép.
   - HTTP `80/tcp`: công khai chỉ khi website truy cập trực tiếp qua EC2; nếu
     dùng ALB thì chỉ cho phép từ Security Group của ALB.
   - HTTPS `443/tcp`: công khai khi kết thúc TLS tại EC2/ALB.
   - **Không mở `3306`, `8080`, hoặc cổng backend `5000` ra Internet.**
5. Gán Elastic IP nếu không dùng Load Balancer và cần địa chỉ/DNS ổn định. Jenkins
   nên ở một máy riêng, không cùng host với database/website production.

### 4.2 SSH từ Windows và cài Docker trên EC2

PowerShell Windows: đặt đường dẫn PEM và địa chỉ instance rồi kết nối:

```powershell
$Key = "$HOME\Downloads\shoptn-ec2.pem"
$HostName = "YOUR_EC2_PUBLIC_DNS_OR_IP"
ssh -i $Key ubuntu@$HostName
```

Nếu OpenSSH báo quyền file PEM quá rộng, khóa quyền đọc:

```powershell
icacls $Key /inheritance:r
icacls $Key /grant:r "$($env:USERNAME):(R)"
```

Trong terminal SSH **trên EC2**, chuyển script cài đặt từ Windows (PowerShell,
tại thư mục repository):

```powershell
scp -i $Key scripts\ec2-install-docker.sh ubuntu@${HostName}:/tmp/ec2-install-docker.sh
```

Trên EC2 chạy:

```bash
sh /tmp/ec2-install-docker.sh
```

Script dùng apt repository chính thức của Docker, cài Engine, Buildx và Compose
plugin; sau đó thêm user hiện tại vào nhóm `docker`. Đăng xuất rồi SSH lại để
nhóm có hiệu lực:

```bash
exit
```

PowerShell Windows:

```powershell
ssh -i $Key ubuntu@$HostName
```

EC2:

```bash
docker --version
docker compose version
sudo install -d -o ubuntu -g ubuntu -m 750 /opt/shoptn
```

Nhóm `docker` tương đương quyền root trên host; chỉ thêm user triển khai tin
cậy vào nhóm này. Cách cài đặt tham chiếu
[Docker Engine for Ubuntu](https://docs.docker.com/engine/install/ubuntu/) và
[Docker Compose plugin](https://docs.docker.com/compose/install/linux/).

### 4.3 Tạo production environment file trên EC2

PowerShell Windows: chuyển file mẫu (chỉ có placeholders) lên EC2:

```powershell
scp -i $Key .env.production.example ubuntu@${HostName}:/opt/shoptn/.env.production
ssh -i $Key ubuntu@$HostName
```

EC2: sửa trực tiếp, dùng mật khẩu ngẫu nhiên khác nhau cho app/root và JWT:

```bash
openssl rand -hex 32
nano /opt/shoptn/.env.production
chmod 600 /opt/shoptn/.env.production
```

Chạy `openssl rand -hex 32` ba lần và điền từng giá trị output lần lượt cho
`MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` và `JWT_SECRET`; chỉ dán trong terminal
cục bộ, không gửi output qua chat.

Không đặt giá trị thật vào Git, Jenkinsfile, frontend build args hoặc shell
history. Thay password trong `.env.production` **không tự đổi** password MySQL
đã ghi trong volume đang chạy; cần rotation bằng SQL riêng, có kế hoạch và backup.

## 5. Cài Jenkins trên Ubuntu

Thực hiện trên **một máy Ubuntu 24.04 riêng** (Jenkins controller/agent), không
phải EC2 chạy website. Jenkins cần Java 21+, Docker Engine, Git, SSH/SCP, tar;
Node được quản lý bằng Jenkins NodeJS plugin.

Ubuntu Jenkins host:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl fontconfig openjdk-21-jre git
sudo install -m 0755 -d /etc/apt/keyrings
sudo wget -O /etc/apt/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" \
  | sudo tee /etc/apt/sources.list.d/jenkins.list >/dev/null
sudo apt-get update
sudo apt-get install -y jenkins
sudo systemctl enable --now jenkins
java -version
sudo systemctl status jenkins --no-pager
```

Trang cài đặt ban đầu chỉ truy cập qua SSH tunnel từ PowerShell:

```powershell
$JenkinsKey = "$HOME\Downloads\jenkins.pem"
$JenkinsHost = "YOUR_JENKINS_PUBLIC_DNS_OR_IP"
```

Sau đó mở tunnel:

```powershell
ssh -i $JenkinsKey -L 8080:127.0.0.1:8080 ubuntu@$JenkinsHost
```

Mở `http://localhost:8080` trên Windows; lấy initial password bằng lệnh sau
trên Jenkins host, tạo admin cá nhân và bật cập nhật bảo mật:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Cài các plugin tối thiểu cần cho Jenkinsfile/job:

- **Pipeline** và **Git** (Pipeline SCM/checkout).
- **GitHub** (GitHub webhook trigger `githubPush()`).
- **Credentials Binding** (Docker Hub secret).
- **SSH Agent** (EC2 SSH key).
- **NodeJS** (cài Node.js 24 LTS qua Global Tool Configuration).

Trong **Manage Jenkins → Tools → NodeJS installations**, tạo tool tên chính xác
`Node24`, chọn Node 24 LTS. Cài Docker Engine trên Jenkins host từ Docker apt
repository như trong mục 4.2; sau đó:

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

Xác nhận agent build có `node`, `npm`, `docker`, `ssh`, `scp`, `tar`; chạy Docker
trên Jenkins yêu cầu quyền cao, nên giới hạn executor/network và không chạy
pipeline từ nhánh không tin cậy. Đặt Jenkins sau HTTPS reverse proxy/domain hoặc
VPN; không mở port 8080 công khai. Tham khảo
[Jenkins Linux installation](https://pkg.jenkins.io/debian-stable/) và
[Jenkins Java support policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/).

## 6. Jenkins Credentials, job và webhook

1. Tạo Credentials theo bảng mục 3. Nếu GitHub repository public, chọn SCM
   checkout không credential; nếu private, chọn `github-readonly`.
2. Tạo **Pipeline** job (single-branch) tên `shoptn-production`.
3. **Pipeline → Definition:** `Pipeline script from SCM`; SCM `Git`; Repository
   URL `https://github.com/tannam76/webbanhangreacjs-full.git`; Credentials
   `github-readonly` nếu private; Branch Specifier `*/main`; Script Path
   `Jenkinsfile`.
4. Cấu hình 3 global properties `DOCKERHUB_NAMESPACE`, `EC2_SSH_HOST`,
   `EC2_SSH_USER` đúng với thực tế. Không thêm password/token vào properties.
5. Cấu hình HTTPS URL Jenkins có thể nhận webhook GitHub, cài GitHub plugin,
   rồi thêm webhook ở GitHub → **Settings → Webhooks**:
   `https://YOUR_JENKINS_DOMAIN/github-webhook/`, Content type JSON, event
   **Just the push event**. Không dùng HTTP hoặc mở port 8080 ra Internet.
6. Chạy **Build Now** lần đầu; xem console log. Jenkinsfile giới hạn deploy vào
   `main`. Mỗi image được tag bằng 12 ký tự commit SHA.

### Xác minh SSH host key bắt buộc

Không tin kết quả `ssh-keyscan` nếu chưa xác thực fingerprint:

1. Từ EC2 console/đường truy cập quản trị tin cậy, lấy fingerprint host key:

   ```bash
   sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
   ```
2. PowerShell Windows:

   ```powershell
   ssh-keyscan -t ed25519 YOUR_EC2_PUBLIC_DNS_OR_IP > .\ec2-known-hosts
   ssh-keygen -lf .\ec2-known-hosts
   ```

3. So sánh fingerprint hai nơi. Chỉ khi khớp mới tải `ec2-known-hosts` thành
   Jenkins Secret file credential ID `ec2-known-hosts`. Jenkinsfile bật
   `StrictHostKeyChecking=yes`; không dùng `StrictHostKeyChecking=no`.
4. Nếu host key thay đổi do tạo instance mới, xác minh fingerprint mới và cập
   nhật credential file có chủ đích.

## 7. HTTPS, domain và database client

- **Có domain:** tạo AWS Application Load Balancer, cấp certificate trong AWS
  Certificate Manager cùng region với ALB, validate DNS, target group EC2 port
  80, listener HTTPS 443 (redirect HTTP 80 sang HTTPS). Security Group EC2 chỉ
  nhận port 80 từ Security Group ALB; Route 53 alias domain tới ALB. Dùng ACM
  quản lý gia hạn certificate.
- **Không có domain/ALB:** truy cập HTTP qua `http://EC2_PUBLIC_IP`; chỉ là
  phương án thử nghiệm, không gửi thông tin nhạy cảm qua kết nối này.
- Jenkins webhook cũng cần HTTPS và GitHub truy cập được; không mở port 8080.
- MySQL Workbench trên Windows: mở SSH tunnel trong PowerShell (để terminal này
  chạy trong lúc dùng Workbench):

  ```powershell
  ssh -i $Key -N -L 3307:127.0.0.1:3306 ubuntu@$HostName
  ```

  Tạo Workbench connection `Standard TCP/IP`: Hostname `127.0.0.1`, Port
  `3307`, Username `shoptn_app`, Password `MYSQL_PASSWORD`,
  Default Schema `webbanhang_db`. Cổng 3306 không được mở trên Security Group.

## 8. Khởi tạo database, dữ liệu và backup

- Khi MySQL khởi động với **volume mới, trống**, official MySQL image tạo
  database/user theo `.env.production`, rồi thực thi `schema.sql` và `seed.sql`
  đúng một lần. Seed chỉ chứa categories và products công khai; không có tài
  khoản dùng chung, password, hoặc đơn hàng mẫu.
- Backend chỉ kết nối tới database; không tự tạo schema, admin hoặc dữ liệu.
  Thay đổi schema sau deploy đầu cần migration có versioning, backup, kiểm thử
  tương thích và kế hoạch rollback riêng. Không sửa `schema.sql` với kỳ vọng
  volume đã có dữ liệu sẽ tự chạy lại.
- Đăng ký tài khoản đầu tiên qua website. Nếu cần cấp quyền admin, dùng MySQL
  Workbench qua SSH tunnel hoặc MySQL client bên trong EC2 để chạy thủ công sau
  khi kiểm tra username:

  ```sql
  UPDATE users SET role = 'admin' WHERE username = 'YOUR_REGISTERED_USERNAME';
  ```

- `mysql-data` được giữ qua `docker compose down` và redeploy. Thiết lập AWS
  backup/snapshot và backup MySQL ngoài máy; kiểm thử restore trước production.
  Không chạy `docker compose down -v`, `docker volume rm`, `docker system prune`
  hoặc `docker image prune` để xử lý deploy lỗi. Những thao tác này có thể làm
  mất dữ liệu/ảnh cần rollback.

## 9. Kiểm tra, xác nhận và rollback

Trên EC2:

```bash
cd /opt/shoptn
./scripts/check-health.sh http://127.0.0.1
docker compose --env-file .env.production --env-file .deploy.env \
  -f docker-compose.prod.yml ps
docker compose --env-file .env.production --env-file .deploy.env \
  -f docker-compose.prod.yml logs --tail=100 backend frontend db
```

Health check kiểm tra trang Nginx, `/api/health` và giá trị
`databaseConnected: true`. Mở website bằng domain/IP, đăng ký user, xác nhận
API `GET /api/products` trả kết quả, tạo dữ liệu thử nghiệm rồi redeploy một
commit mới và kiểm tra dữ liệu còn nguyên. Trên GitHub push commit vào `main`,
xác nhận webhook được giao, Jenkins build/test/push hai image tag commit rồi
deploy và health-check thành công.

Pipeline tự trả lại tag trước nếu image mới pull/start/health-check lỗi. Rollback
thủ công trên EC2 (dùng 12 ký tự commit SHA đã deploy trước):

```bash
cd /opt/shoptn
./scripts/rollback-remote.sh PREVIOUS_COMMIT_SHA
```

Các image không bị prune. Database volume không bị xóa/khôi phục tự động; rollback
ứng dụng chỉ an toàn khi database schema tương thích ngược. Nếu deploy đầu tiên
thất bại thì chưa có tag trước để tự rollback; sửa nguyên nhân rồi chạy pipeline
lại và giữ nguyên volume để điều tra.

## 10. Các bước còn phụ thuộc hạ tầng

Chưa có quyền truy cập AWS, Jenkins, GitHub Settings hoặc Docker Hub trong
workspace này, vì vậy chưa tạo instance, secrets/credentials, webhook, domain,
push image hoặc chạy deploy. Cần điền Docker Hub namespace, EC2 host/user,
Jenkins URL, credentials và secret values trực tiếp ở hệ thống tương ứng.

Tài liệu tham khảo chính thức (được kiểm tra ngày 2026-10-29):

- [Node.js release status](https://nodejs.org/en/about/previous-releases)
- [Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Docker Compose plugin on Linux](https://docs.docker.com/compose/install/linux/)
- [Jenkins Debian/Ubuntu package repository](https://pkg.jenkins.io/debian-stable/)
- [Jenkins Java support policy](https://www.jenkins.io/doc/book/platform-information/support-policy-java/)
