const { query, getPool } = require('../config/db');
const { randomUUID } = require('crypto');

// Lấy danh sách tất cả đơn hàng
async function getAllOrders(req, res) {
  try {
    const [orders] = await query(`
      SELECT 
        o.id,
        o.customer_name AS customer,
        o.customer_email AS email,
        o.customer_phone AS phone,
        o.customer_address AS address,
        CAST(o.total AS DOUBLE) AS total,
        o.status,
        DATE_FORMAT(o.created_at, '%Y-%m-%d') AS date,
        o.created_at
      FROM orders o
      ORDER BY o.created_at DESC
    `);

    // Lấy kèm chi tiết items cho mỗi đơn
    const [items] = await query('SELECT * FROM order_items');

    const ordersWithItems = orders.map((order) => ({
      ...order,
      total: Number(order.total),
      items: items
        .filter((item) => item.order_id === order.id)
        .map((item) => ({
          ...item,
          product_price: Number(item.product_price),
        })),
    }));

    return res.json({
      success: true,
      total: ordersWithItems.length,
      data: ordersWithItems,
    });
  } catch (error) {
    console.error('Lỗi getAllOrders:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Lấy chi tiết 1 đơn hàng
async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const [orders] = await query('SELECT * FROM orders WHERE id = ? LIMIT 1', [id]);

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    const [items] = await query('SELECT * FROM order_items WHERE order_id = ?', [id]);

    const order = {
      ...orders[0],
      total: Number(orders[0].total),
      items: items.map((i) => ({ ...i, product_price: Number(i.product_price) })),
    };

    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('Lỗi getOrderById:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Tạo mới đơn hàng (Từ giỏ hàng Checkout)
async function createOrder(req, res) {
  const pool = getPool();
  let connection;

  try {
    const {
      customerName = 'Khách mua hàng',
      customerEmail = '',
      customerPhone = '',
      customerAddress = '',
      total = 0,
      items = [],
      userId = null,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng đang trống, không thể tạo đơn.' });
    }

    const orderId = `DH${randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO orders (id, customer_name, customer_email, customer_phone, customer_address, total, status, user_id)
       VALUES (?, ?, ?, ?, ?, ?, 'Chờ xác nhận', ?)`,
      [orderId, customerName, customerEmail, customerPhone, customerAddress, Number(total), userId]
    );

    for (const item of items) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.id || null, item.name || 'Sản phẩm', Number(item.price) || 0, item.quantity || 1]
      );
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công!',
      orderId,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Lỗi createOrder:', error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
}

// Cập nhật trạng thái đơn hàng (Admin)
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['Chờ xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái đơn hàng không hợp lệ.' });
    }

    const [result] = await query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng cần cập nhật.' });
    }

    return res.json({
      success: true,
      message: 'Cập nhật trạng thái đơn hàng thành công.',
      status,
    });
  } catch (error) {
    console.error('Lỗi updateOrderStatus:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
};
