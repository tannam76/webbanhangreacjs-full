const { query } = require('../config/db');

async function getAllCustomers(req, res) {
  try {
    // Lấy danh sách khách hàng từ bảng users hoặc tổng hợp từ bảng orders
    const [customers] = await query(`
      SELECT 
        u.id,
        u.username AS name,
        u.email,
        COALESCE(SUM(CASE WHEN o.status != 'Đã hủy' THEN o.total ELSE 0 END), 0) AS totalSpent,
        COUNT(o.id) AS orders
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id OR o.customer_email = u.email
      WHERE u.role = 'customer'
      GROUP BY u.id, u.username, u.email
      ORDER BY totalSpent DESC
    `);

    // Format giá trị số
    const formatted = customers.map((c) => ({
      ...c,
      id: Number(c.id),
      totalSpent: Number(c.totalSpent),
      orders: Number(c.orders),
    }));

    return res.json({
      success: true,
      total: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error('Lỗi getAllCustomers:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAllCustomers,
};
