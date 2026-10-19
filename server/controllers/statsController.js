const { query } = require('../config/db');

async function getDashboardStats(req, res) {
  try {
    const [[rev]] = await query(`
      SELECT COALESCE(SUM(total), 0) AS totalRevenue 
      FROM orders 
      WHERE status != 'Đã hủy'
    `);

    const [[ordersCount]] = await query('SELECT COUNT(*) AS totalOrders FROM orders');
    const [[pendingOrders]] = await query("SELECT COUNT(*) AS pendingOrders FROM orders WHERE status = 'Chờ xác nhận'");
    const [[customersCount]] = await query("SELECT COUNT(*) AS totalCustomers FROM users WHERE role = 'customer'");
    const [[productsCount]] = await query('SELECT COUNT(*) AS totalProducts FROM products');

    return res.json({
      success: true,
      data: {
        totalRevenue: Number(rev.totalRevenue || 0),
        totalOrders: Number(ordersCount.totalOrders || 0),
        pendingOrders: Number(pendingOrders.pendingOrders || 0),
        totalCustomers: Number(customersCount.totalCustomers || 0),
        totalProducts: Number(productsCount.totalProducts || 0),
      },
    });
  } catch (error) {
    console.error('Lỗi getDashboardStats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getDashboardStats,
};
