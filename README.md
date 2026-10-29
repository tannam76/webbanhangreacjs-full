# ShopTN - Website bán hàng

Ứng dụng full-stack gồm:

- Frontend React 18, Create React App (`react-scripts` 5).
- Backend Node.js/Express 4, REST API trên cổng 5000.
- MySQL 8.4 với dữ liệu bền vững qua Docker volume.

## Chạy local bằng Docker

PowerShell tại thư mục gốc:

```powershell
Copy-Item .env.example .env
notepad .env
docker compose up --build
```

Thay các mật khẩu mẫu trong `.env` trước khi chạy. Website mở tại
`http://localhost:8080`; API health check tại `http://localhost:8080/api/health`.
Frontend proxy `/api` qua Nginx đến backend; không cần đưa thông tin đăng nhập
database vào biến build của React.

Lần đầu MySQL tạo bảng và danh mục/sản phẩm khởi tạo từ các file SQL trong
`server/database/`. Tài khoản, đơn hàng và dữ liệu tiếp theo do người dùng tạo
được lưu trong named volume `mysql-data`. Ứng dụng không tự tạo tài khoản quản
trị hoặc ghi seed vào database hiện có. Để có dữ liệu catalog trên database mới,
MySQL chạy `seed.sql` đúng một lần cùng lúc khởi tạo schema.

Để chạy backend trực tiếp thay vì Docker, cài Node.js LTS và các dependencies:

```powershell
npm ci
npm ci --prefix server
Copy-Item server\.env.example server\.env
```

Điền `server/.env` với một database đã được chuẩn bị từ
[`server/database/schema.sql`](./server/database/schema.sql), sau đó chạy
`npm run server`. Frontend phát triển chạy bằng `npm start`; cấu hình API phát
triển cục bộ bằng `REACT_APP_API_URL` trước khi chạy lệnh `npm start`.

## Các API chính

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/health` | Trạng thái API và kết nối MySQL |
| POST | `/api/auth/register` | Tạo tài khoản khách hàng |
| POST | `/api/auth/login` | Đăng nhập và nhận JWT |
| GET | `/api/auth/me` | Thông tin tài khoản hiện tại |
| GET/POST | `/api/products` | Liệt kê / tạo sản phẩm |
| GET/PUT/DELETE | `/api/products/:id` | Đọc / cập nhật / xóa sản phẩm |
| GET | `/api/categories` | Danh mục sản phẩm |
| GET/POST | `/api/orders` | Danh sách / tạo đơn hàng |
| PUT | `/api/orders/:id/status` | Cập nhật trạng thái đơn |
| GET | `/api/customers` | Thống kê khách hàng |
| GET | `/api/stats` | Số liệu dashboard |

## CI/CD và triển khai AWS

Hướng dẫn đầy đủ về Docker, Jenkins, Docker Hub, AWS EC2, credentials, HTTPS,
backup, kiểm tra sức khỏe và rollback nằm trong
[`README_DEPLOY.md`](./README_DEPLOY.md).
