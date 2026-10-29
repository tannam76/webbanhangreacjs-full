const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase, query } = require('./config/db');

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
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({
      status: 'OK',
      serverTime: new Date().toISOString(),
      databaseConnected: true,
    });
  } catch (error) {
    console.error('Health check database query failed:', error.message);
    res.status(503).json({
      status: 'ERROR',
      serverTime: new Date().toISOString(),
      databaseConnected: false,
    });
  }
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

async function startServer() {
  if (!(await initDatabase())) {
    process.exitCode = 1;
    return;
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server listening on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Backend startup failed:', error);
  process.exitCode = 1;
});
