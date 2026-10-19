const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase, getIsConnected } = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const customerRoutes = require('./routes/customerRoutes');
const statsRoutes = require('./routes/statsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    serverTime: new Date().toISOString(),
    databaseConnected: getIsConnected(),
    message: getIsConnected()
      ? 'Backend và MySQL đã kết nối thành công!'
      : 'Backend đang chạy, nhưng chưa kết nối được MySQL. Hãy kiểm tra XAMPP/Laragon.',
  });
});

// Mounting API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/stats', statsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Endpoint ${req.originalUrl} không tồn tại.` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ.',
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`===============================================`);
  console.log(`🚀 Backend Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`📡 API Health check: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);

  // Tự động kết nối và khởi tạo CSDL MySQL
  await initDatabase();
});
