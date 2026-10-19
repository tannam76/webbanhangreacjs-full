-- =============================================
-- DATABASE SCHEMA: webbanhang_db
-- CSDL Web Bán Hàng ReactJS (ShopTN)
-- =============================================

CREATE DATABASE IF NOT EXISTS `webbanhang_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `webbanhang_db`;

-- 1. BẢNG USERS (Tài khoản người dùng và quản trị viên)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('customer', 'admin') DEFAULT 'customer',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BẢNG CATEGORIES (Danh mục sản phẩm)
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BẢNG PRODUCTS (Sản phẩm)
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `category` VARCHAR(100) NOT NULL,
  `image` VARCHAR(255) DEFAULT '/images/laptop.jpg',
  `description` TEXT,
  `badge` VARCHAR(50) DEFAULT 'Mới',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. BẢNG ORDERS (Đơn hàng)
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(50) PRIMARY KEY,
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_email` VARCHAR(150) DEFAULT NULL,
  `customer_phone` VARCHAR(50) DEFAULT NULL,
  `customer_address` TEXT DEFAULT NULL,
  `total` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `status` ENUM('Chờ xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy') DEFAULT 'Chờ xác nhận',
  `user_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. BẢNG ORDER_ITEMS (Chi tiết đơn hàng)
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` VARCHAR(50) NOT NULL,
  `product_id` INT DEFAULT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `product_price` DECIMAL(15, 2) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
-- =============================================

-- Danh mục
INSERT IGNORE INTO `categories` (`id`, `name`) VALUES
(1, 'Công nghệ'),
(2, 'Thời trang'),
(3, 'Phụ kiện');

-- Tài khoản: Mật khẩu mặc định là 'admin123' cho admin (đã mã hóa bcrypt) và '123456' cho user
INSERT IGNORE INTO `users` (`id`, `username`, `email`, `password`, `role`) VALUES
(1, 'admin', 'admin@gmail.com', '$2a$10$wK5WJm5JvXlXzE0X8uG9feQkF8H4p29F0/U.zUe49rM9F8Rz5i0uS', 'admin'),
(2, 'lan', 'lan@gmail.com', '$2a$10$wK5WJm5JvXlXzE0X8uG9feQkF8H4p29F0/U.zUe49rM9F8Rz5i0uS', 'customer'),
(3, 'nam', 'nam@gmail.com', '$2a$10$wK5WJm5JvXlXzE0X8uG9feQkF8H4p29F0/U.zUe49rM9F8Rz5i0uS', 'customer'),
(4, 'anh', 'anh@gmail.com', '$2a$10$wK5WJm5JvXlXzE0X8uG9feQkF8H4p29F0/U.zUe49rM9F8Rz5i0uS', 'customer'),
(5, 'tu', 'tu@gmail.com', '$2a$10$wK5WJm5JvXlXzE0X8uG9feQkF8H4p29F0/U.zUe49rM9F8Rz5i0uS', 'customer');

-- Sản phẩm ban đầu
INSERT IGNORE INTO `products` (`id`, `name`, `price`, `category`, `image`, `description`, `badge`) VALUES
(1, 'Áo khoác Urban', 890000, 'Thời trang', '/images/aokhoac.jpg', 'Áo khoác dáng hiện đại, chất liệu nhẹ, phù hợp đi làm và dạo phố.', 'Bán chạy'),
(2, 'Điện thoại Iphone 17 Pro Max', 12990000, 'Công nghệ', '/images/phone.jpg', 'Điện thoại màn hình sắc nét, camera ổn định và pin dùng cả ngày.', 'Mới'),
(3, 'Áo sơ mi Linen', 420000, 'Thời trang', '/images/shirt.jpg', 'Áo sơ mi thoáng mát, phom gọn, dễ phối cho nhiều dịp.', 'Ưu đãi'),
(4, 'Đồng hồ Classic', 1850000, 'Phụ kiện', '/images/watch.jpg', 'Đồng hồ mặt tối giản, dây bền, tạo điểm nhấn thanh lịch mỗi ngày.', 'Premium'),
(5, 'Giày Runner Pro', 1190000, 'Thời trang', '/images/shoes.jpg', 'Giày thể thao êm chân, đế bám tốt, hợp luyện tập và di chuyển.', 'Hot'),
(6, 'Laptop Air 14', 21990000, 'Công nghệ', '/images/laptop.jpg', 'Laptop mỏng nhẹ, hiệu năng ổn định cho học tập, văn phòng và sáng tạo.', 'Đề xuất');

-- Đơn hàng mẫu
INSERT IGNORE INTO `orders` (`id`, `customer_name`, `customer_email`, `customer_phone`, `customer_address`, `total`, `status`, `created_at`) VALUES
('DH1001', 'Nguyễn Thị Lan', 'lan@gmail.com', '0912345678', 'Hà Nội', 4560000, 'Đang giao', '2026-09-15 10:00:00'),
('DH1002', 'Trần Văn Nam', 'nam@gmail.com', '0987654321', 'TP. Hồ Chí Minh', 3180000, 'Đã giao', '2026-09-10 14:30:00'),
('DH1003', 'Lê Minh Anh', 'anh@gmail.com', '0901122334', 'Đà Nẵng', 9220000, 'Chờ xác nhận', '2026-09-12 09:15:00'),
('DH1004', 'Phạm Hoàng Tú', 'tu@gmail.com', '0933445566', 'Cần Thơ', 2890000, 'Đã hủy', '2026-09-08 16:45:00');

-- Chi tiết đơn hàng mẫu
INSERT IGNORE INTO `order_items` (`order_id`, `product_id`, `product_name`, `product_price`, `quantity`) VALUES
('DH1001', 1, 'Áo khoác Urban', 890000, 2),
('DH1001', 4, 'Đồng hồ Classic', 1850000, 1),
('DH1002', 5, 'Giày Runner Pro', 1190000, 2),
('DH1003', 2, 'Điện thoại Iphone 17 Pro Max', 12990000, 1),
('DH1004', 3, 'Áo sơ mi Linen', 420000, 3);
