# ShopTN - Dự Án Web Bán Hàng Fullstack (ReactJS + Node.js/Express + MySQL)

Dự án website bán hàng hoàn chỉnh với Frontend ReactJS, Backend RESTful API (Express.js) và Cơ sở dữ liệu quan hệ MySQL.

---

## 📁 Cấu Trúc Dự Án

```
webbanhangreacjs1/
├── server/                       # Mã nguồn Backend (Node.js & Express)
│   ├── config/
│   │   └── db.js                 # Cấu hình Pool kết nối MySQL & Tự động tạo bảng/Seed dữ liệu
│   ├── controllers/              # Bộ xử lý nghiệp vụ
│   │   ├── authController.js     # Đăng ký, đăng nhập, JWT
│   │   ├── productController.js  # CRUD sản phẩm, tìm kiếm, lọc
│   │   ├── categoryController.js # Quản lý danh mục
│   │   ├── orderController.js    # Tạo và cập nhật đơn hàng
│   │   ├── customerController.js # Thống kê khách hàng
│   │   └── statsController.js    # Thống kê tổng quan Dashboard
│   ├── database/
│   │   └── schema.sql            # Script SQL tạo CSDL và bảng mẫu
│   ├── middleware/
│   │   └── authMiddleware.js     # Xác thực JWT Token & Phân quyền Admin
│   ├── routes/                   # Các tuyến API endpoints
│   ├── .env                      # Cấu hình cổng, tài khoản MySQL
│   ├── package.json              # Dependencies backend (express, mysql2, bcryptjs, jwt...)
│   └── server.js                 # File khởi chạy máy chủ Backend (Port 5000)
├── src/                          # Mã nguồn Frontend (ReactJS)
│   ├── components/               # Các trang: Home, ProductDetail, Cart, Admin, Login, Register
│   ├── contexts/                 # AuthContext (quản lý phiên JWT), CartContext
│   ├── services/
│   │   └── api.js                # Tầng dịch vụ giao tiếp API với Backend
│   └── data/products.js          # Dữ liệu sản phẩm mẫu dự phòng
├── package.json                  # Cấu hình và lệnh chạy toàn dự án
└── README.md
```

---

## 🗄️ Hướng Dẫn Kết Nối MySQL (XAMPP / Laragon)

### Bước 1: Khởi động MySQL
1. Mở **XAMPP Control Panel** (hoặc **Laragon**).
2. Nhấn nút **Start** ở module **MySQL** (mặc định cổng `3306`).
*(Nếu dùng XAMPP thì user mặc định là `root`, password để trống).*

### Bước 2: Kiểm tra cấu hình tại `server/.env`
File `server/.env` đã được thiết lập sẵn:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=webbanhang_db
JWT_SECRET=supersecret_key_shop_tn_2026
```
*(Nếu MySQL của bạn có đặt mật khẩu, hãy điền vào `DB_PASSWORD`)*.

### Bước 3: Tự động khởi tạo CSDL
Hệ thống backend đã được tích hợp tính năng **Auto-Migration**. Khi khởi động server, backend sẽ:
- Tự động tạo cơ sở dữ liệu `webbanhang_db` nếu chưa có.
- Tự động tạo 5 bảng: `users`, `categories`, `products`, `orders`, `order_items`.
- Tự động chèn sẵn dữ liệu mẫu (sản phẩm, đơn hàng, tài khoản).

*(Bạn cũng có thể tự import file [schema.sql](file:///d:/devopbacken-db/webbanhangreacjs1/server/database/schema.sql) qua phpMyAdmin nếu muốn).*

---

## 🚀 Hướng Dẫn Khởi Chạy Dự Án

Mở 2 cửa sổ terminal (hoặc chạy lần lượt):

### 1. Khởi chạy Backend (Port 5000)
Tại thư mục gốc dự án:
```bash
npm run server
```
Hoặc:
```bash
cd server
node server.js
```
Khi chạy thành công, terminal sẽ thông báo:
> 🚀 Backend Server đang chạy tại: http://localhost:5000  
> ✅ Kết nối MySQL thành công tới database: webbanhang_db (localhost:3306)

### 2. Khởi chạy Frontend (Port 3000)
Tại một terminal khác ở thư mục gốc dự án:
```bash
npm start
```
Trình duyệt sẽ tự động mở trang web tại: `http://localhost:3000`.

---

## 🔑 Tài Khoản Thử Nghiệm Có Sẵn

- **Quản trị viên (Admin):**
  - Tên đăng nhập: `admin`
  - Mật khẩu: `admin123`
  - Truy cập: `/admin` (đăng nhập bằng quyền Admin để quản lý thêm/sửa/xóa sản phẩm, cập nhật đơn hàng)
- **Khách hàng (Customer):**
  - Tên đăng nhập: `lan` / `nam` / `anh` / `tu`
  - Mật khẩu: `123456`
  - Hoặc bấm **Đăng ký** để tạo tài khoản mới lưu trực tiếp vào MySQL.

---

## 📡 Danh Sách API Endpoints Chính

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| **GET** | `/api/health` | Kiểm tra trạng thái máy chủ và kết nối MySQL |
| **POST** | `/api/auth/register` | Đăng ký thành viên mới (lưu vào MySQL) |
| **POST** | `/api/auth/login` | Đăng nhập (trả về JWT token) |
| **GET** | `/api/auth/me` | Lấy thông tin user hiện tại |
| **GET** | `/api/products` | Lấy danh sách sản phẩm (hỗ trợ search, lọc danh mục) |
| **GET** | `/api/products/:id` | Chi tiết 1 sản phẩm |
| **POST** | `/api/products` | Thêm sản phẩm mới (Admin) |
| **PUT** | `/api/products/:id` | Cập nhật sản phẩm (Admin) |
| **DELETE** | `/api/products/:id` | Xóa sản phẩm (Admin) |
| **GET** | `/api/categories` | Lấy danh sách danh mục |
| **GET** | `/api/orders` | Danh sách đơn hàng |
| **POST** | `/api/orders` | Tạo mới đơn hàng (Lưu vào bảng orders & order_items) |
| **PUT** | `/api/orders/:id/status`| Cập nhật trạng thái đơn (Chờ xác nhận, Đang giao, Đã giao, Đã hủy) |
| **GET** | `/api/customers` | Thống kê danh sách khách hàng và mức chi tiêu |
| **GET** | `/api/stats` | Thống kê số liệu cho Admin Dashboard |
"# webbanhangreacjs-full" 
