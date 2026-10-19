const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_key_shop_tn_2026';

// Đăng ký tài khoản mới
async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ username, email và password.' });
    }

    // Kiểm tra username hoặc email đã tồn tại chưa
    const [existing] = await query(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    );

    if (existing.length > 0) {
      const field = existing[0].username === username ? 'Tên đăng nhập' : 'Email';
      return res.status(400).json({ success: false, message: `${field} này đã được sử dụng.` });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);
    const role = 'customer';

    const [result] = await query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role]
    );

    const token = jwt.sign(
      { id: result.insertId, username, role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công.',
      user: {
        id: result.insertId,
        username,
        email,
        role,
      },
      token,
    });
  } catch (error) {
    console.error('Lỗi register:', error);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi hệ thống khi đăng ký.' });
  }
}

// Đăng nhập
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }

    const [rows] = await query(
      'SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    const user = rows[0];

    // So sánh mật khẩu bằng bcrypt hoặc fallback chuỗi thuần nếu user mẫu cũ
    let isMatch = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = user.password === password;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Đăng nhập thành công.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Lỗi login:', error);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi hệ thống khi đăng nhập.' });
  }
}

// Lấy thông tin user hiện tại
async function getMe(req, res) {
  try {
    const [rows] = await query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    return res.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error('Lỗi getMe:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  register,
  login,
  getMe,
};
