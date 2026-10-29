-- Runs only when the MySQL data volume is initialized for the first time.
-- These rows are public catalog data, not accounts, orders, or credentials.

INSERT INTO `categories` (`id`, `name`) VALUES
(1, 'Công nghệ'),
(2, 'Thời trang'),
(3, 'Phụ kiện');

INSERT INTO `products` (`id`, `name`, `price`, `category`, `image`, `description`, `badge`) VALUES
(1, 'Áo khoác Urban', 890000, 'Thời trang', '/images/aokhoac.jpg', 'Áo khoác dáng hiện đại, chất liệu nhẹ, phù hợp đi làm và dạo phố.', 'Bán chạy'),
(2, 'Điện thoại Iphone 17 Pro Max', 12990000, 'Công nghệ', '/images/phone.jpg', 'Điện thoại màn hình sắc nét, camera ổn định và pin dùng cả ngày.', 'Mới'),
(3, 'Áo sơ mi Linen', 420000, 'Thời trang', '/images/shirt.jpg', 'Áo sơ mi thoáng mát, phom gọn, dễ phối cho nhiều dịp.', 'Ưu đãi'),
(4, 'Đồng hồ Classic', 1850000, 'Phụ kiện', '/images/watch.jpg', 'Đồng hồ mặt tối giản, dây bền, tạo điểm nhấn thanh lịch mỗi ngày.', 'Premium'),
(5, 'Giày Runner Pro', 1190000, 'Thời trang', '/images/shoes.jpg', 'Giày thể thao êm chân, đế bám tốt, hợp luyện tập và di chuyển.', 'Hot'),
(6, 'Laptop Air 14', 21990000, 'Công nghệ', '/images/laptop.jpg', 'Laptop mỏng nhẹ, hiệu năng ổn định cho học tập, văn phòng và sáng tạo.', 'Đề xuất');
