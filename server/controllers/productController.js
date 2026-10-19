const { query } = require('../config/db');

// Lấy danh sách sản phẩm (có hỗ trợ tìm kiếm, lọc theo category, phân trang)
async function getAllProducts(req, res) {
  try {
    const { search = '', category = 'Tất cả', page = 1, limit = 100 } = req.query;

    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search.trim()) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (category && category !== 'Tất cả') {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY id DESC';

    const [products] = await query(sql, params);

    // Format giá dạng số để React nhận diện chuẩn
    const formatted = products.map((p) => ({
      ...p,
      id: Number(p.id),
      price: Number(p.price),
    }));

    return res.json({
      success: true,
      total: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error('Lỗi getAllProducts:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Lấy chi tiết 1 sản phẩm theo ID
async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
    }

    const product = {
      ...rows[0],
      id: Number(rows[0].id),
      price: Number(rows[0].price),
    };

    return res.json({ success: true, data: product });
  } catch (error) {
    console.error('Lỗi getProductById:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Thêm mới sản phẩm (Admin)
async function createProduct(req, res) {
  try {
    const { name, price, category, image, description, badge } = req.body;

    if (!name || price === undefined || !category) {
      return res.status(400).json({ success: false, message: 'Tên sản phẩm, giá và danh mục là bắt buộc.' });
    }

    const [result] = await query(
      `INSERT INTO products (name, price, category, image, description, badge)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        Number(price) || 0,
        category,
        image || '/images/laptop.jpg',
        description || '',
        badge || 'Mới',
      ]
    );

    const [newProduct] = await query('SELECT * FROM products WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm thành công.',
      data: {
        ...newProduct[0],
        id: Number(newProduct[0].id),
        price: Number(newProduct[0].price),
      },
    });
  } catch (error) {
    console.error('Lỗi createProduct:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Cập nhật sản phẩm (Admin)
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, price, category, image, description, badge } = req.body;

    const [check] = await query('SELECT id FROM products WHERE id = ?', [id]);
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm để cập nhật.' });
    }

    await query(
      `UPDATE products 
       SET name = ?, price = ?, category = ?, image = ?, description = ?, badge = ?
       WHERE id = ?`,
      [
        name,
        Number(price) || 0,
        category,
        image,
        description,
        badge,
        id,
      ]
    );

    const [updated] = await query('SELECT * FROM products WHERE id = ?', [id]);

    return res.json({
      success: true,
      message: 'Cập nhật sản phẩm thành công.',
      data: {
        ...updated[0],
        id: Number(updated[0].id),
        price: Number(updated[0].price),
      },
    });
  } catch (error) {
    console.error('Lỗi updateProduct:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Xóa sản phẩm (Admin)
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    const [result] = await query('DELETE FROM products WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm để xóa.' });
    }

    return res.json({ success: true, message: 'Đã xóa sản phẩm thành công.' });
  } catch (error) {
    console.error('Lỗi deleteProduct:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
