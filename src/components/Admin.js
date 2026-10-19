import { useEffect, useMemo, useState } from 'react';
import { products as initialProducts } from '../data/products';
import {
  checkServerHealth,
  createProduct as apiCreateProduct,
  deleteProduct as apiDeleteProduct,
  fetchCustomers,
  fetchOrders,
  fetchProducts,
  updateOrderStatus as apiUpdateOrderStatus,
  updateProduct as apiUpdateProduct,
} from '../services/api';

const initialCustomers = [
  { id: 1, name: 'Nguyễn Thị Lan', email: 'lan@gmail.com', totalSpent: 12500000, orders: 4 },
  { id: 2, name: 'Trần Văn Nam', email: 'nam@gmail.com', totalSpent: 8900000, orders: 3 },
  { id: 3, name: 'Lê Minh Anh', email: 'anh@gmail.com', totalSpent: 21500000, orders: 6 },
  { id: 4, name: 'Phạm Hoàng Tú', email: 'tu@gmail.com', totalSpent: 6700000, orders: 2 },
];

const initialOrders = [
  { id: 'DH1001', customer: 'Nguyễn Thị Lan', total: 4560000, status: 'Đang giao', date: '2026-09-15' },
  { id: 'DH1002', customer: 'Trần Văn Nam', total: 3180000, status: 'Đã giao', date: '2026-09-10' },
  { id: 'DH1003', customer: 'Lê Minh Anh', total: 9220000, status: 'Chờ xác nhận', date: '2026-09-12' },
  { id: 'DH1004', customer: 'Phạm Hoàng Tú', total: 2890000, status: 'Đã hủy', date: '2026-09-08' },
];

const emptyProduct = {
  id: '',
  name: '',
  category: 'Công nghệ',
  price: 0,
  image: '/images/laptop.jpg',
  description: '',
  badge: 'Mới',
};

function Admin() {
  const [activeTab, setActiveTab] = useState('products');
  const [productList, setProductList] = useState(initialProducts);
  const [customerList, setCustomerList] = useState(initialCustomers);
  const [orderList, setOrderList] = useState(initialOrders);
  const [formData, setFormData] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [dbStatus, setDbStatus] = useState({ connected: false, checked: false });
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  // Kiểm tra kết nối backend và MySQL
  const loadData = async () => {
    try {
      const health = await checkServerHealth();
      setDbStatus({
        connected: health.databaseConnected || false,
        checked: true,
        message: health.message,
      });

      // Tải dữ liệu từ backend
      const [productsRes, ordersRes, customersRes] = await Promise.allSettled([
        fetchProducts(),
        fetchOrders(),
        fetchCustomers(),
      ]);

      if (productsRes.status === 'fulfilled' && productsRes.value?.length > 0) {
        setProductList(productsRes.value);
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value?.length > 0) {
        setOrderList(ordersRes.value);
      }
      if (customersRes.status === 'fulfilled' && customersRes.value?.length > 0) {
        setCustomerList(customersRes.value);
      }
    } catch (err) {
      console.warn('Lỗi loadData Admin:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage({ type: '', text: '' }), 3500);
  };

  const stats = useMemo(() => {
    const totalRevenue = orderList.reduce(
      (sum, order) => (order.status !== 'Đã hủy' ? sum + Number(order.total || 0) : sum),
      0
    );
    const pendingOrders = orderList.filter((order) => order.status === 'Chờ xác nhận').length;

    return [
      {
        label: 'Tổng doanh thu',
        value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue),
        accent: 'primary',
      },
      { label: 'Đơn hàng', value: String(orderList.length), accent: 'success' },
      { label: 'Khách hàng', value: String(customerList.length), accent: 'warning' },
      { label: 'Sản phẩm', value: String(productList.length), accent: 'info' },
      { label: 'Chờ xác nhận', value: String(pendingOrders), accent: 'danger' },
    ];
  }, [customerList.length, orderList, productList.length]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'price' ? Number(value) : value }));
  };

  const resetForm = () => {
    setFormData(emptyProduct);
    setEditingId(null);
  };

  const handleSubmitProduct = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      showNotification('danger', 'Vui lòng nhập tên sản phẩm.');
      return;
    }

    try {
      if (editingId) {
        // Cập nhật sản phẩm qua MySQL API
        await apiUpdateProduct(editingId, formData);
        setProductList((prev) =>
          prev.map((item) => (item.id === editingId ? { ...item, ...formData, price: Number(formData.price) } : item))
        );
        showNotification('success', `Đã cập nhật sản phẩm "${formData.name}" vào CSDL MySQL.`);
      } else {
        // Tạo mới sản phẩm qua MySQL API
        const res = await apiCreateProduct(formData);
        const savedItem = res?.data || {
          ...formData,
          id: Date.now(),
          price: Number(formData.price || 0),
        };
        setProductList((prev) => [savedItem, ...prev]);
        showNotification('success', `Đã lưu sản phẩm mới "${formData.name}" vào CSDL MySQL.`);
      }
      resetForm();
    } catch (err) {
      console.warn('Lỗi lưu sản phẩm vào API:', err);
      // Fallback cục bộ
      if (editingId) {
        setProductList((prev) =>
          prev.map((item) => (item.id === editingId ? { ...item, ...formData, price: Number(formData.price) } : item))
        );
      } else {
        const newProduct = {
          ...formData,
          id: Date.now(),
          price: Number(formData.price || 0),
        };
        setProductList((prev) => [newProduct, ...prev]);
      }
      showNotification('info', 'Đã lưu thay đổi cục bộ (Backend chưa bật).');
      resetForm();
    }
  };

  const handleEditProduct = (product) => {
    setEditingId(product.id);
    setFormData({ ...product, id: product.id });
    setActiveTab('products');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này không?')) return;

    try {
      await apiDeleteProduct(productId);
      setProductList((prev) => prev.filter((item) => item.id !== productId));
      if (editingId === productId) resetForm();
      showNotification('success', 'Đã xóa sản phẩm khỏi CSDL MySQL.');
    } catch (err) {
      console.warn('Lỗi xóa sản phẩm qua API:', err);
      setProductList((prev) => prev.filter((item) => item.id !== productId));
      if (editingId === productId) resetForm();
      showNotification('info', 'Đã xóa sản phẩm khỏi bộ nhớ tạm.');
    }
  };

  const updateOrderStatus = async (orderId, nextStatus) => {
    try {
      await apiUpdateOrderStatus(orderId, nextStatus);
      setOrderList((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: nextStatus } : order)));
      showNotification('success', `Đã cập nhật đơn hàng ${orderId} thành: "${nextStatus}" trong MySQL.`);
    } catch (err) {
      console.warn('Lỗi cập nhật trạng thái đơn hàng:', err);
      setOrderList((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: nextStatus } : order)));
      showNotification('info', `Đã cập nhật trạng thái đơn ${orderId} (cục bộ).`);
    }
  };

  const statusClass = (status) => {
    if (status === 'Đã giao') return 'bg-success-subtle text-success';
    if (status === 'Đang giao') return 'bg-primary-subtle text-primary';
    if (status === 'Chờ xác nhận') return 'bg-warning-subtle text-warning';
    return 'bg-danger-subtle text-danger';
  };

  return (
    <div className="container py-4" style={{ maxWidth: 1280 }}>
      {/* Thông báo trạng thái kết nối Database */}
      <div className={`alert ${dbStatus.connected ? 'alert-success' : 'alert-warning'} d-flex justify-content-between align-items-center mb-4`}>
        <div>
          <strong>{dbStatus.connected ? '🟢 MySQL Database: Đã kết nối' : '🟡 Chế độ Cục bộ / Đang đợi MySQL'}</strong>
          <div className="small text-muted">
            {dbStatus.connected
              ? 'Máy chủ Node.js & CSDL MySQL (webbanhang_db) đang hoạt động ổn định.'
              : 'Hãy bật Apache và MySQL trên XAMPP/Laragon (cổng 3306) để đồng bộ dữ liệu vào CSDL thật.'}
          </div>
        </div>
        <button className="btn btn-sm btn-outline-secondary" onClick={loadData}>
          🔄 Kiểm tra lại kết nối
        </button>
      </div>

      {actionMessage.text && (
        <div className={`alert alert-${actionMessage.type} mb-4`} role="alert">
          {actionMessage.text}
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <p className="text-uppercase text-primary fw-semibold mb-1" style={{ letterSpacing: '0.12rem' }}>Dashboard</p>
          <h1 className="fw-bold mb-0">Admin Panel (MySQL)</h1>
        </div>
        <button className="btn btn-primary px-4 py-2 rounded-pill shadow-sm" onClick={() => { setActiveTab('products'); resetForm(); }}>
          + Thêm sản phẩm
        </button>
      </div>

      <div className="row g-3 mb-4">
        {stats.map((item) => (
          <div className="col-xl-2 col-md-4 col-sm-6" key={item.label}>
            <div className={`card border-0 shadow-sm h-100 bg-${item.accent} bg-opacity-10`}>
              <div className="card-body">
                <div className="text-muted small mb-2">{item.label}</div>
                <h3 className="fw-bold mb-0">{item.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-0">
          <div className="border-bottom d-flex flex-wrap gap-2 p-3">
            {['products', 'orders', 'customers'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`btn btn-sm rounded-pill px-3 ${activeTab === tab ? 'btn-dark' : 'btn-light text-dark'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'products' ? `Sản phẩm (${productList.length})` : tab === 'orders' ? `Đơn hàng (${orderList.length})` : `Khách hàng (${customerList.length})`}
              </button>
            ))}
          </div>

          {activeTab === 'products' && (
            <div className="row g-4 p-3">
              <div className="col-lg-4">
                <div className="card border-0 bg-light h-100">
                  <div className="card-body">
                    <h5 className="fw-bold mb-3">{editingId ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}</h5>
                    <form onSubmit={handleSubmitProduct} className="row g-3">
                      <div className="col-12">
                        <label className="form-label">Tên sản phẩm *</label>
                        <input className="form-control" name="name" value={formData.name} onChange={handleInputChange} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Danh mục *</label>
                        <select className="form-select" name="category" value={formData.category} onChange={handleInputChange}>
                          <option>Công nghệ</option>
                          <option>Thời trang</option>
                          <option>Phụ kiện</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Giá (VND) *</label>
                        <input type="number" className="form-control" name="price" value={formData.price} onChange={handleInputChange} required min="0" />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Đường dẫn hình ảnh</label>
                        <input className="form-control" name="image" value={formData.image} onChange={handleInputChange} />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Mô tả sản phẩm</label>
                        <textarea className="form-control" rows="3" name="description" value={formData.description} onChange={handleInputChange} />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Nhãn (Badge)</label>
                        <input className="form-control" name="badge" value={formData.badge} onChange={handleInputChange} placeholder="Mới, Hot, Bán chạy..." />
                      </div>
                      <div className="col-12 d-flex gap-2">
                        <button className="btn btn-primary" type="submit">{editingId ? 'Lưu thay đổi' : 'Thêm mới'}</button>
                        {editingId && (
                          <button className="btn btn-outline-secondary" type="button" onClick={resetForm}>Hủy</button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <div className="col-lg-8">
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Sản phẩm</th>
                        <th>Danh mục</th>
                        <th>Giá</th>
                        <th>Badge</th>
                        <th className="text-end">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productList.map((product) => (
                        <tr key={product.id}>
                          <td>{product.id}</td>
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <img src={product.image} alt={product.name} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 12 }} />
                              <div>
                                <div className="fw-semibold">{product.name}</div>
                                <small className="text-muted">{product.description?.slice(0, 36) || 'Không có mô tả'}</small>
                              </div>
                            </div>
                          </td>
                          <td>{product.category}</td>
                          <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}</td>
                          <td><span className="badge bg-primary-subtle text-primary">{product.badge}</span></td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2">
                              <button className="btn btn-sm btn-outline-primary" onClick={() => handleEditProduct(product)}>Sửa</button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteProduct(product.id)}>Xóa</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="p-3">
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Khách hàng</th>
                      <th>Ngày</th>
                      <th>Tổng tiền</th>
                      <th>Trạng thái</th>
                      <th>Cập nhật trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderList.map((order) => (
                      <tr key={order.id}>
                        <td className="fw-semibold">{order.id}</td>
                        <td>
                          <div>{order.customer}</div>
                          {order.phone && <small className="text-muted">{order.phone}</small>}
                        </td>
                        <td>{order.date}</td>
                        <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)}</td>
                        <td><span className={`badge rounded-pill ${statusClass(order.status)}`}>{order.status}</span></td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={order.status}
                            onChange={(event) => updateOrderStatus(order.id, event.target.value)}
                          >
                            <option>Chờ xác nhận</option>
                            <option>Đang giao</option>
                            <option>Đã giao</option>
                            <option>Đã hủy</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="p-3">
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Khách hàng</th>
                      <th>Email</th>
                      <th>Số đơn</th>
                      <th>Tổng chi tiêu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerList.map((customer) => (
                      <tr key={customer.id}>
                        <td>{customer.id}</td>
                        <td className="fw-semibold">{customer.name}</td>
                        <td>{customer.email}</td>
                        <td>{customer.orders}</td>
                        <td>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(customer.totalSpent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Admin;
