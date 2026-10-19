const { query } = require('../config/db');

async function getAllCategories(req, res) {
  try {
    const [rows] = await query('SELECT * FROM categories ORDER BY id ASC');
    const categoryNames = ['Tất cả', ...rows.map((r) => r.name)];

    return res.json({
      success: true,
      data: categoryNames,
      details: rows,
    });
  } catch (error) {
    console.error('Lỗi getAllCategories:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function createCategory(req, res) {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Tên danh mục là bắt buộc.' });
    }

    const [result] = await query('INSERT INTO categories (name) VALUES (?)', [name]);

    return res.status(201).json({
      success: true,
      message: 'Tạo danh mục thành công.',
      data: { id: result.insertId, name },
    });
  } catch (error) {
    console.error('Lỗi createCategory:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAllCategories,
  createCategory,
};
