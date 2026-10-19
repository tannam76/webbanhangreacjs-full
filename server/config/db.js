const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'webbanhang_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool = null;
let isConnected = false;

// Khởi tạo database và bảng tự động
async function initDatabase() {
  try {
    // 1. Kết nối không chọn DB trước để tạo DB nếu chưa có
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    await tempConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await tempConnection.end();

    // 2. Tạo Pool với DB đã chỉ định
    pool = mysql.createPool(dbConfig);

    // 3. Tạo bảng users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`username\` VARCHAR(100) NOT NULL UNIQUE,
        \`email\` VARCHAR(150) NOT NULL UNIQUE,
        \`password\` VARCHAR(255) NOT NULL,
        \`role\` ENUM('customer', 'admin') DEFAULT 'customer',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Tạo bảng categories
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`categories\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL UNIQUE,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Tạo bảng products
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`products\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`price\` DECIMAL(15, 2) NOT NULL DEFAULT 0,
        \`category\` VARCHAR(100) NOT NULL,
        \`image\` VARCHAR(255) DEFAULT '/images/laptop.jpg',
        \`description\` TEXT,
        \`badge\` VARCHAR(50) DEFAULT 'Mới',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Tạo bảng orders
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`orders\` (
        \`id\` VARCHAR(50) PRIMARY KEY,
        \`customer_name\` VARCHAR(150) NOT NULL,
        \`customer_email\` VARCHAR(150) DEFAULT NULL,
        \`customer_phone\` VARCHAR(50) DEFAULT NULL,
        \`customer_address\` TEXT DEFAULT NULL,
        \`total\` DECIMAL(15, 2) NOT NULL DEFAULT 0,
        \`status\` ENUM('Chờ xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy') DEFAULT 'Chờ xác nhận',
        \`user_id\` INT DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Tạo bảng order_items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`order_items\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`order_id\` VARCHAR(50) NOT NULL,
        \`product_id\` INT DEFAULT NULL,
        \`product_name\` VARCHAR(255) NOT NULL,
        \`product_price\` DECIMAL(15, 2) NOT NULL,
        \`quantity\` INT NOT NULL DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Seed categories nếu chưa có
    const [categoriesCount] = await pool.query('SELECT COUNT(*) as count FROM categories');
    if (categoriesCount[0].count === 0) {
      await pool.query(`
        INSERT INTO \`categories\` (\`name\`) VALUES
        ('Công nghệ'), ('Thời trang'), ('Phụ kiện')
      `);
      console.log('✔ Đã khởi tạo dữ liệu mẫu cho Categories');
    }

    // 9. Seed users nếu chưa có
    const [usersCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    if (usersCount[0].count === 0) {
      const hashedPasswordAdmin = await bcrypt.hash('admin123', 10);
      const hashedPasswordUser = await bcrypt.hash('123456', 10);

      await pool.query(
        `
        INSERT INTO \`users\` (\`username\`, \`email\`, \`password\`, \`role\`) VALUES
        ('admin', 'admin@gmail.com', ?, 'admin'),
        ('lan', 'lan@gmail.com', ?, 'customer'),
        ('nam', 'nam@gmail.com', ?, 'customer'),
        ('anh', 'anh@gmail.com', ?, 'customer'),
        ('tu', 'tu@gmail.com', ?, 'customer')
      `,
        [hashedPasswordAdmin, hashedPasswordUser, hashedPasswordUser, hashedPasswordUser, hashedPasswordUser]
      );
      console.log('✔ Đã khởi tạo tài khoản mẫu (admin: admin / admin123, user: 123456)');
    }

    // 10. Seed products nếu chưa có
    const [productsCount] = await pool.query('SELECT COUNT(*) as count FROM products');
    if (productsCount[0].count === 0) {
      await pool.query(`
        INSERT INTO \`products\` (\`name\`, \`price\`, \`category\`, \`image\`, \`description\`, \`badge\`) VALUES
        ('Áo khoác Urban', 890000, 'Thời trang', '/images/aokhoac.jpg', 'Áo khoác dáng hiện đại, chất liệu nhẹ, phù hợp đi làm và dạo phố.', 'Bán chạy'),
        ('Điện thoại Iphone 17 Pro Max', 12990000, 'Công nghệ', '/images/phone.jpg', 'Điện thoại màn hình sắc nét, camera ổn định và pin dùng cả ngày.', 'Mới'),
        ('Áo sơ mi Linen', 420000, 'Thời trang', '/images/shirt.jpg', 'Áo sơ mi thoáng mát, phom gọn, dễ phối cho nhiều dịp.', 'Ưu đãi'),
        ('Đồng hồ Classic', 1850000, 'Phụ kiện', '/images/watch.jpg', 'Đồng hồ mặt tối giản, dây bền, tạo điểm nhấn thanh lịch mỗi ngày.', 'Premium'),
        ('Giày Runner Pro', 1190000, 'Thời trang', '/images/shoes.jpg', 'Giày thể thao êm chân, đế bám tốt, hợp luyện tập và di chuyển.', 'Hot'),
        ('Laptop Air 14', 21990000, 'Công nghệ', '/images/laptop.jpg', 'Laptop mỏng nhẹ, hiệu năng ổn định cho học tập, văn phòng và sáng tạo.', 'Đề xuất')
      `);
      console.log('✔ Đã khởi tạo 6 sản phẩm mẫu vào MySQL');
    }

    // 11. Seed orders nếu chưa có
    const [ordersCount] = await pool.query('SELECT COUNT(*) as count FROM orders');
    if (ordersCount[0].count === 0) {
      await pool.query(`
        INSERT INTO \`orders\` (\`id\`, \`customer_name\`, \`customer_email\`, \`customer_phone\`, \`customer_address\`, \`total\`, \`status\`, \`created_at\`) VALUES
        ('DH1001', 'Nguyễn Thị Lan', 'lan@gmail.com', '0912345678', 'Hà Nội', 4560000, 'Đang giao', '2026-09-15 10:00:00'),
        ('DH1002', 'Trần Văn Nam', 'nam@gmail.com', '0987654321', 'TP. Hồ Chí Minh', 3180000, 'Đã giao', '2026-09-10 14:30:00'),
        ('DH1003', 'Lê Minh Anh', 'anh@gmail.com', '0901122334', 'Đà Nẵng', 9220000, 'Chờ xác nhận', '2026-09-12 09:15:00'),
        ('DH1004', 'Phạm Hoàng Tú', 'tu@gmail.com', '0933445566', 'Cần Thơ', 2890000, 'Đã hủy', '2026-09-08 16:45:00')
      `);

      await pool.query(`
        INSERT INTO \`order_items\` (\`order_id\`, \`product_id\`, \`product_name\`, \`product_price\`, \`quantity\`) VALUES
        ('DH1001', 1, 'Áo khoác Urban', 890000, 2),
        ('DH1001', 4, 'Đồng hồ Classic', 1850000, 1),
        ('DH1002', 5, 'Giày Runner Pro', 1190000, 2),
        ('DH1003', 2, 'Điện thoại Iphone 17 Pro Max', 12990000, 1),
        ('DH1004', 3, 'Áo sơ mi Linen', 420000, 3)
      `);
      console.log('✔ Đã khởi tạo đơn hàng mẫu vào MySQL');
    }

    isConnected = true;
    console.log(`✅ Kết nối MySQL thành công tới database: ${dbConfig.database} (${dbConfig.host}:${dbConfig.port})`);
    return true;
  } catch (error) {
    isConnected = false;
    console.error('❌ Lỗi kết nối CSDL MySQL:', error.message);
    console.warn(
      '⚠️ Gợi ý: Hãy mở XAMPP hoặc Laragon và Start dịch vụ MySQL (cổng 3306), hoặc kiểm tra file server/.env'
    );
    return false;
  }
}

// Wrapper thực hiện truy vấn an toàn
async function query(sql, params) {
  if (!pool) {
    const ok = await initDatabase();
    if (!ok || !pool) {
      throw new Error('Chưa kết nối được tới cơ sở dữ liệu MySQL. Vui lòng bật XAMPP/Laragon MySQL.');
    }
  }
  return pool.query(sql, params);
}

module.exports = {
  dbConfig,
  initDatabase,
  query,
  getPool: () => pool,
  getIsConnected: () => isConnected,
};
