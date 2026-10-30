import { useContext, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRightFromBracket,
  faArrowUpRightFromSquare,
  faBars,
  faBoxOpen,
  faCartShopping,
  faClock,
  faDatabase,
  faEnvelope,
  faGaugeHigh,
  faMagnifyingGlass,
  faMoneyBillWave,
  faPenToSquare,
  faPlus,
  faRotateRight,
  faStore,
  faTags,
  faTrashCan,
  faUsers,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { categories as fallbackCategories, formatCurrency, products as initialProducts } from '../data/products';
import { AuthContext } from '../contexts/AuthContext';
import {
  checkServerHealth,
  createCategory,
  createProduct as apiCreateProduct,
  deleteProduct as apiDeleteProduct,
  fetchCategories,
  fetchCustomers,
  fetchOrders,
  fetchProducts,
  fetchStats,
  updateOrderStatus as apiUpdateOrderStatus,
  updateProduct as apiUpdateProduct,
} from '../services/api';
import 'admin-lte/dist/css/adminlte.min.css';
import './Admin.css';

const navigation = [
  { id: 'dashboard', label: 'Tổng quan', icon: faGaugeHigh },
  { id: 'products', label: 'Sản phẩm', icon: faBoxOpen },
  { id: 'orders', label: 'Đơn hàng', icon: faCartShopping },
  { id: 'customers', label: 'Khách hàng', icon: faUsers },
  { id: 'categories', label: 'Danh mục', icon: faTags },
];

const orderStatuses = ['Chờ xác nhận', 'Đang giao', 'Đã giao', 'Đã hủy'];

const emptyProduct = {
  name: '',
  category: 'Công nghệ',
  price: 0,
  image: '/images/laptop.jpg',
  description: '',
  badge: 'Mới',
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
};

function Admin() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { username, logout } = useContext(AuthContext);
  const requestedSection = pathname.split('/')[2] || 'dashboard';
  const activeSection = navigation.some((item) => item.id === requestedSection) ? requestedSection : 'dashboard';
  const activePage = navigation.find((item) => item.id === activeSection);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [productList, setProductList] = useState(initialProducts);
  const [orderList, setOrderList] = useState([]);
  const [customerList, setCustomerList] = useState([]);
  const [categoryList, setCategoryList] = useState(fallbackCategories.filter((item) => item !== 'Tất cả'));
  const [serverStats, setServerStats] = useState(null);
  const [dbStatus, setDbStatus] = useState({ connected: false, checked: false });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [formData, setFormData] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  const loadData = async () => {
    setLoading(true);
    const [healthResult, productsResult, ordersResult, customersResult, categoriesResult, statsResult] =
      await Promise.allSettled([
        checkServerHealth(),
        fetchProducts(),
        fetchOrders(),
        fetchCustomers(),
        fetchCategories(),
        fetchStats(),
      ]);

    if (healthResult.status === 'fulfilled') {
      setDbStatus({
        connected: Boolean(healthResult.value.databaseConnected),
        checked: true,
        message: healthResult.value.message,
      });
    } else {
      setDbStatus({ connected: false, checked: true });
    }

    if (productsResult.status === 'fulfilled') setProductList(productsResult.value || []);
    if (ordersResult.status === 'fulfilled') setOrderList(ordersResult.value || []);
    if (customersResult.status === 'fulfilled') setCustomerList(customersResult.value || []);
    if (categoriesResult.status === 'fulfilled') {
      setCategoryList((categoriesResult.value || []).filter((category) => category !== 'Tất cả'));
    }
    if (statsResult.status === 'fulfilled') setServerStats(statsResult.value);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!actionMessage.text) return undefined;
    const timeout = window.setTimeout(() => setActionMessage({ type: '', text: '' }), 4000);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  const showNotification = (type, text) => setActionMessage({ type, text });

  const stats = useMemo(() => {
    const revenue = orderList.reduce(
      (total, order) => (order.status === 'Đã hủy' ? total : total + Number(order.total || 0)),
      0
    );
    const pending = orderList.filter((order) => order.status === 'Chờ xác nhận').length;
    return [
      { label: 'Doanh thu', value: formatCurrency(serverStats?.totalRevenue ?? revenue), icon: faMoneyBillWave, color: 'primary' },
      { label: 'Đơn hàng', value: serverStats?.totalOrders ?? orderList.length, icon: faCartShopping, color: 'success' },
      { label: 'Khách hàng', value: serverStats?.totalCustomers ?? customerList.length, icon: faUsers, color: 'warning' },
      { label: 'Sản phẩm', value: serverStats?.totalProducts ?? productList.length, icon: faBoxOpen, color: 'info' },
      { label: 'Chờ xác nhận', value: serverStats?.pendingOrders ?? pending, icon: faClock, color: 'danger' },
    ];
  }, [customerList.length, orderList, productList.length, serverStats]);

  const filteredProducts = useMemo(() => productList.filter((product) => (
    `${product.name} ${product.category} ${product.badge || ''}`.toLowerCase().includes(search.toLowerCase())
  )), [productList, search]);

  const filteredOrders = useMemo(() => orderList.filter((order) => {
    const matchesSearch = `${order.id} ${order.customer || order.customer_name || ''} ${order.email || ''}`
      .toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (statusFilter === 'Tất cả' || order.status === statusFilter);
  }), [orderList, search, statusFilter]);

  const filteredCustomers = useMemo(() => customerList.filter((customer) => (
    `${customer.name} ${customer.email}`.toLowerCase().includes(search.toLowerCase())
  )), [customerList, search]);

  const handleProductInput = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: name === 'price' ? Number(value) : value }));
  };

  const resetProductForm = () => {
    setFormData({ ...emptyProduct, category: categoryList[0] || 'Công nghệ' });
    setEditingId(null);
    setProductFormOpen(false);
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    const submitted = { ...formData, name: formData.name.trim(), price: Number(formData.price) };
    if (!submitted.name || !submitted.category) {
      showNotification('danger', 'Vui lòng nhập tên và chọn danh mục sản phẩm.');
      return;
    }

    try {
      if (editingId !== null) {
        await apiUpdateProduct(editingId, submitted);
        setProductList((items) => items.map((item) => (
          item.id === editingId ? { ...item, ...submitted } : item
        )));
        showNotification('success', `Đã cập nhật sản phẩm "${submitted.name}".`);
      } else {
        const response = await apiCreateProduct(submitted);
        const savedProduct = response?.data || { ...submitted, id: Date.now() };
        setProductList((items) => [savedProduct, ...items]);
        showNotification('success', `Đã thêm sản phẩm "${submitted.name}".`);
      }
      resetProductForm();
    } catch (error) {
      console.error('Không thể lưu sản phẩm:', error);
      showNotification('danger', error.message || 'Không thể lưu sản phẩm. Vui lòng kiểm tra kết nối máy chủ.');
    }
  };

  const editProduct = (product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name || '',
      category: product.category || categoryList[0] || 'Công nghệ',
      price: Number(product.price || 0),
      image: product.image || '',
      description: product.description || '',
      badge: product.badge || '',
    });
    setProductFormOpen(true);
    navigate('/admin/products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Xóa sản phẩm "${product.name}"?`)) return;
    try {
      await apiDeleteProduct(product.id);
      setProductList((items) => items.filter((item) => item.id !== product.id));
      if (editingId === product.id) resetProductForm();
      showNotification('success', 'Đã xóa sản phẩm.');
    } catch (error) {
      console.error('Không thể xóa sản phẩm:', error);
      showNotification('danger', error.message || 'Không thể xóa sản phẩm. Vui lòng thử lại.');
    }
  };

  const changeOrderStatus = async (order, status) => {
    try {
      await apiUpdateOrderStatus(order.id, status);
      setOrderList((orders) => orders.map((item) => (
        item.id === order.id ? { ...item, status } : item
      )));
      showNotification('success', `Đơn hàng ${order.id} đã chuyển sang "${status}".`);
    } catch (error) {
      console.error('Không thể cập nhật đơn hàng:', error);
      showNotification('danger', error.message || 'Không thể cập nhật trạng thái đơn hàng.');
    }
  };

  const submitCategory = async (event) => {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name) return;
    if (categoryList.some((category) => category.toLowerCase() === name.toLowerCase())) {
      showNotification('warning', 'Danh mục này đã tồn tại.');
      return;
    }
    try {
      const response = await createCategory(name);
      const category = response?.data?.name || name;
      setCategoryList((items) => [...items, category]);
      setNewCategory('');
      showNotification('success', `Đã thêm danh mục "${category}".`);
    } catch (error) {
      console.error('Không thể tạo danh mục:', error);
      showNotification('danger', error.message || 'Không thể tạo danh mục. Vui lòng thử lại.');
    }
  };

  const statusClass = (status) => {
    if (status === 'Đã giao') return 'text-bg-success';
    if (status === 'Đang giao') return 'text-bg-primary';
    if (status === 'Chờ xác nhận') return 'text-bg-warning';
    return 'text-bg-danger';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const headerAction = activeSection === 'products' && (
    <button
      className="btn btn-primary"
      type="button"
      onClick={() => {
        resetProductForm();
        setProductFormOpen(true);
      }}
    >
      <FontAwesomeIcon icon={faPlus} className="me-2" />
      Thêm sản phẩm
    </button>
  );

  return (
    <div className={`app-wrapper adminlte-shell ${sidebarOpen ? 'admin-sidebar-open' : ''} ${sidebarCollapsed ? 'admin-sidebar-collapsed' : ''}`}>
      <aside className="app-sidebar sidebar-dark-primary shadow" data-bs-theme="dark">
        <Link to="/admin" className="sidebar-brand">
          <span className="brand-image admin-brand-mark"><FontAwesomeIcon icon={faStore} /></span>
          <span className="brand-text fw-light">ShopTN <strong>Admin</strong></span>
        </Link>
        <div className="sidebar-wrapper">
          <div className="admin-profile">
            <div className="admin-avatar">{(username || 'A').slice(0, 1).toUpperCase()}</div>
            <div>
              <div className="admin-profile-name">{username || 'Quản trị viên'}</div>
              <span><i className={`admin-online-dot ${dbStatus.connected ? 'is-online' : ''}`} /> Quản trị viên</span>
            </div>
          </div>
          <nav className="mt-2" aria-label="Điều hướng quản trị">
            <ul className="nav sidebar-menu flex-column" role="menu">
              <li className="nav-header">QUẢN LÝ CỬA HÀNG</li>
              {navigation.map((item) => (
                <li className="nav-item" key={item.id}>
                  <NavLink
                    to={`/admin${item.id === 'dashboard' ? '' : `/${item.id}`}`}
                    end={item.id === 'dashboard'}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <FontAwesomeIcon icon={item.icon} className="nav-icon" />
                    <p>{item.label}</p>
                    {item.id === 'orders' && orderList.filter((order) => order.status === 'Chờ xác nhận').length > 0 && (
                      <span className="nav-badge badge text-bg-warning">
                        {orderList.filter((order) => order.status === 'Chờ xác nhận').length}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="sidebar-bottom">
            <Link to="/" className="nav-link" onClick={() => setSidebarOpen(false)}>
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="nav-icon" />
              <p>Xem cửa hàng</p>
            </Link>
            <button type="button" className="nav-link" onClick={handleLogout}>
              <FontAwesomeIcon icon={faArrowRightFromBracket} className="nav-icon" />
              <p>Đăng xuất</p>
            </button>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <nav className="app-header navbar navbar-expand bg-body shadow-sm">
          <div className="container-fluid">
            <button
              type="button"
              className="btn btn-link text-body admin-menu-toggle"
              aria-label={window.innerWidth <= 991
                ? (sidebarOpen ? 'Đóng menu quản trị' : 'Mở menu quản trị')
                : (sidebarCollapsed ? 'Mở rộng menu quản trị' : 'Thu gọn menu quản trị')}
              onClick={() => {
                if (window.innerWidth <= 991) {
                  setSidebarOpen((open) => !open);
                } else {
                  setSidebarCollapsed((collapsed) => !collapsed);
                }
              }}
            >
              <FontAwesomeIcon icon={sidebarOpen ? faXmark : faBars} />
            </button>
            <div className="navbar-nav">
              <span className="nav-link fw-semibold d-none d-sm-inline">Bảng điều khiển</span>
            </div>
            <div className="navbar-nav ms-auto align-items-center gap-2">
              <span className={`admin-connection-pill ${dbStatus.connected ? 'connected' : 'offline'}`}>
                <FontAwesomeIcon icon={faDatabase} />
                {dbStatus.connected ? 'MySQL trực tuyến' : 'Máy chủ ngoại tuyến'}
              </span>
              <Link to="/" className="btn btn-sm btn-outline-secondary d-none d-md-inline-flex align-items-center gap-2">
                <FontAwesomeIcon icon={faStore} /> Cửa hàng
              </Link>
            </div>
          </div>
        </nav>

        <main className="app-content admin-content">
          <div className="container-fluid">
            <div className="admin-page-heading">
              <div>
                <div className="admin-breadcrumb">TRANG CHỦ <span>/</span> {activePage.label.toUpperCase()}</div>
                <h1>{activePage.label}</h1>
              </div>
              {headerAction}
            </div>

            {dbStatus.checked && (
              <div className={`admin-db-alert ${dbStatus.connected ? 'is-connected' : 'is-offline'}`}>
                <div className="admin-db-icon"><FontAwesomeIcon icon={faDatabase} /></div>
                <div className="flex-grow-1">
                  <strong>{dbStatus.connected ? 'Đã kết nối cơ sở dữ liệu' : 'Đang ở chế độ ngoại tuyến'}</strong>
                  <div>{dbStatus.connected ? 'Dữ liệu đang được đồng bộ với máy chủ MySQL.' : 'Không thể kết nối MySQL. Một số thao tác cần máy chủ hoạt động.'}</div>
                </div>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={loadData} disabled={loading}>
                  <FontAwesomeIcon icon={faRotateRight} className={loading ? 'fa-spin me-1' : 'me-1'} />
                  Làm mới
                </button>
              </div>
            )}

            {actionMessage.text && (
              <div className={`alert alert-${actionMessage.type} admin-notification`} role="alert">
                <span>{actionMessage.text}</span>
                <button type="button" className="btn-close" aria-label="Đóng thông báo" onClick={() => setActionMessage({ type: '', text: '' })} />
              </div>
            )}

            {activeSection === 'dashboard' && (
              <>
                <div className="row g-3 mb-4">
                  {stats.map((item) => (
                    <div className="col-xxl col-xl-4 col-md-6" key={item.label}>
                      <div className={`admin-stat-card card border-0 shadow-sm stat-${item.color}`}>
                        <div className="card-body d-flex align-items-center justify-content-between">
                          <div>
                            <div className="admin-stat-label">{item.label}</div>
                            <div className="admin-stat-value">{item.value}</div>
                          </div>
                          <div className="admin-stat-icon"><FontAwesomeIcon icon={item.icon} /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="row g-4">
                  <div className="col-xl-8">
                    <section className="card admin-card h-100">
                      <div className="card-header">
                        <div>
                          <h2 className="card-title">Đơn hàng gần đây</h2>
                          <div className="admin-card-subtitle">Theo dõi các giao dịch mới nhất</div>
                        </div>
                        <Link to="/admin/orders" className="btn btn-sm btn-outline-primary">Tất cả đơn hàng</Link>
                      </div>
                      <div className="card-body p-0">
                        <div className="table-responsive">
                          <table className="table admin-table align-middle mb-0">
                            <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead>
                            <tbody>
                              {orderList.slice(0, 5).map((order) => (
                                <tr key={order.id}>
                                  <td className="fw-semibold">#{order.id}</td>
                                  <td>{order.customer || order.customer_name || 'Khách hàng'}</td>
                                  <td>{formatDate(order.date || order.created_at)}</td>
                                  <td className="fw-semibold">{formatCurrency(order.total)}</td>
                                  <td><span className={`badge ${statusClass(order.status)}`}>{order.status}</span></td>
                                </tr>
                              ))}
                              {orderList.length === 0 && <EmptyRow colSpan={5} text="Chưa có đơn hàng nào." />}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </section>
                  </div>
                  <div className="col-xl-4">
                    <section className="card admin-card h-100">
                      <div className="card-header">
                        <div>
                          <h2 className="card-title">Truy cập nhanh</h2>
                          <div className="admin-card-subtitle">Các tác vụ thường dùng</div>
                        </div>
                      </div>
                      <div className="card-body admin-quick-actions">
                        <button type="button" onClick={() => { resetProductForm(); setProductFormOpen(true); navigate('/admin/products'); }}>
                          <span className="quick-icon quick-blue"><FontAwesomeIcon icon={faPlus} /></span>
                          <span><strong>Thêm sản phẩm</strong><small>Đăng bán sản phẩm mới</small></span>
                          <span className="quick-arrow">›</span>
                        </button>
                        <Link to="/admin/orders">
                          <span className="quick-icon quick-orange"><FontAwesomeIcon icon={faClock} /></span>
                          <span><strong>Đơn chờ xác nhận</strong><small>{orderList.filter((order) => order.status === 'Chờ xác nhận').length} đơn cần xử lý</small></span>
                          <span className="quick-arrow">›</span>
                        </Link>
                        <Link to="/admin/customers">
                          <span className="quick-icon quick-green"><FontAwesomeIcon icon={faUsers} /></span>
                          <span><strong>Danh sách khách hàng</strong><small>{customerList.length} khách hàng</small></span>
                          <span className="quick-arrow">›</span>
                        </Link>
                      </div>
                    </section>
                  </div>
                  <div className="col-12">
                    <section className="card admin-card">
                      <div className="card-header">
                        <div>
                          <h2 className="card-title">Danh mục sản phẩm</h2>
                          <div className="admin-card-subtitle">Số lượng sản phẩm đang hiển thị theo danh mục</div>
                        </div>
                        <Link to="/admin/categories" className="btn btn-sm btn-outline-primary">Quản lý danh mục</Link>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          {categoryList.map((category) => (
                            <div className="col-xl-3 col-md-6" key={category}>
                              <div className="admin-category-summary">
                                <span className="admin-category-icon"><FontAwesomeIcon icon={faTags} /></span>
                                <div><strong>{category}</strong><small>{productList.filter((product) => product.category === category).length} sản phẩm</small></div>
                              </div>
                            </div>
                          ))}
                          {categoryList.length === 0 && <p className="text-muted mb-0">Chưa có danh mục.</p>}
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </>
            )}

            {activeSection === 'products' && (
              <>
                {productFormOpen && (
                  <section className="card admin-card mb-4">
                    <div className="card-header">
                      <div>
                        <h2 className="card-title">{editingId !== null ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}</h2>
                        <div className="admin-card-subtitle">Nhập đầy đủ thông tin sản phẩm bên dưới</div>
                      </div>
                      <button type="button" className="btn-close" aria-label="Đóng biểu mẫu" onClick={resetProductForm} />
                    </div>
                    <div className="card-body">
                      <form onSubmit={submitProduct}>
                        <div className="row g-3">
                          <div className="col-lg-6">
                            <label className="form-label" htmlFor="product-name">Tên sản phẩm *</label>
                            <input id="product-name" className="form-control" name="name" value={formData.name} onChange={handleProductInput} required />
                          </div>
                          <div className="col-md-6 col-lg-3">
                            <label className="form-label" htmlFor="product-category">Danh mục *</label>
                            <select id="product-category" className="form-select" name="category" value={formData.category} onChange={handleProductInput} required>
                              {categoryList.map((category) => <option key={category} value={category}>{category}</option>)}
                              {categoryList.length === 0 && <option value="">Tạo danh mục trước</option>}
                            </select>
                          </div>
                          <div className="col-md-6 col-lg-3">
                            <label className="form-label" htmlFor="product-price">Giá bán (VND) *</label>
                            <input id="product-price" className="form-control" type="number" min="0" name="price" value={formData.price} onChange={handleProductInput} required />
                          </div>
                          <div className="col-lg-6">
                            <label className="form-label" htmlFor="product-image">Đường dẫn hình ảnh</label>
                            <input id="product-image" className="form-control" name="image" value={formData.image} onChange={handleProductInput} placeholder="/images/product.jpg" />
                          </div>
                          <div className="col-lg-3">
                            <label className="form-label" htmlFor="product-badge">Nhãn</label>
                            <input id="product-badge" className="form-control" name="badge" value={formData.badge} onChange={handleProductInput} placeholder="Mới, Hot..." />
                          </div>
                          <div className="col-lg-3">
                            <label className="form-label" htmlFor="product-description">Mô tả</label>
                            <input id="product-description" className="form-control" name="description" value={formData.description} onChange={handleProductInput} />
                          </div>
                          <div className="col-12 d-flex gap-2 justify-content-end">
                            <button type="button" className="btn btn-outline-secondary" onClick={resetProductForm}>Hủy</button>
                            <button type="submit" className="btn btn-primary">{editingId !== null ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </section>
                )}
                <section className="card admin-card">
                  <div className="card-header admin-table-toolbar">
                    <div><h2 className="card-title">Danh sách sản phẩm</h2><div className="admin-card-subtitle">{filteredProducts.length} sản phẩm</div></div>
                    <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên, danh mục..." />
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table admin-table align-middle mb-0">
                        <thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá bán</th><th>Nhãn</th><th className="text-end">Thao tác</th></tr></thead>
                        <tbody>
                          {filteredProducts.map((product) => (
                            <tr key={product.id}>
                              <td>
                                <div className="d-flex align-items-center gap-3">
                                  <img className="admin-product-image" src={product.image || '/images/laptop.jpg'} alt={product.name} />
                                  <div><strong className="d-block">{product.name}</strong><small className="text-muted">{product.description || 'Chưa có mô tả'}</small></div>
                                </div>
                              </td>
                              <td>{product.category}</td>
                              <td className="fw-semibold">{formatCurrency(product.price)}</td>
                              <td><span className="badge text-bg-light border">{product.badge || '—'}</span></td>
                              <td>
                                <div className="d-flex justify-content-end gap-2">
                                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => editProduct(product)} aria-label={`Sửa ${product.name}`}><FontAwesomeIcon icon={faPenToSquare} /></button>
                                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteProduct(product)} aria-label={`Xóa ${product.name}`}><FontAwesomeIcon icon={faTrashCan} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredProducts.length === 0 && <EmptyRow colSpan={5} text="Không tìm thấy sản phẩm phù hợp." />}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </>
            )}

            {activeSection === 'orders' && (
              <section className="card admin-card">
                <div className="card-header admin-table-toolbar">
                  <div><h2 className="card-title">Quản lý đơn hàng</h2><div className="admin-card-subtitle">{filteredOrders.length} đơn hàng</div></div>
                  <div className="admin-toolbar-controls">
                    <SearchBox value={search} onChange={setSearch} placeholder="Mã đơn, khách hàng..." />
                    <select className="form-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Lọc trạng thái">
                      <option>Tất cả</option>{orderStatuses.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </div>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table admin-table align-middle mb-0">
                      <thead><tr><th>Mã đơn hàng</th><th>Khách hàng</th><th>Ngày đặt</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Trạng thái</th><th>Chi tiết</th></tr></thead>
                      <tbody>
                        {filteredOrders.map((order) => (
                          <FragmentOrder
                            key={order.id}
                            order={order}
                            statusClass={statusClass}
                            expanded={expandedOrderId === order.id}
                            onExpand={() => setExpandedOrderId((current) => current === order.id ? null : order.id)}
                            onStatusChange={(status) => changeOrderStatus(order, status)}
                          />
                        ))}
                        {filteredOrders.length === 0 && <EmptyRow colSpan={7} text="Không có đơn hàng phù hợp." />}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'customers' && (
              <section className="card admin-card">
                <div className="card-header admin-table-toolbar">
                  <div><h2 className="card-title">Danh sách khách hàng</h2><div className="admin-card-subtitle">{filteredCustomers.length} khách hàng</div></div>
                  <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên hoặc email..." />
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table admin-table align-middle mb-0">
                      <thead><tr><th>Khách hàng</th><th>Email</th><th>Số đơn hàng</th><th>Tổng chi tiêu</th><th>Trạng thái</th></tr></thead>
                      <tbody>
                        {filteredCustomers.map((customer) => (
                          <tr key={customer.id}>
                            <td><div className="d-flex align-items-center gap-3"><span className="customer-avatar">{(customer.name || 'K').slice(0, 1).toUpperCase()}</span><strong>{customer.name}</strong></div></td>
                            <td><a className="admin-email" href={`mailto:${customer.email}`}><FontAwesomeIcon icon={faEnvelope} className="me-2" />{customer.email}</a></td>
                            <td>{customer.orders || 0}</td>
                            <td className="fw-semibold">{formatCurrency(customer.totalSpent || 0)}</td>
                            <td><span className="badge text-bg-success-subtle text-success">Đang hoạt động</span></td>
                          </tr>
                        ))}
                        {filteredCustomers.length === 0 && <EmptyRow colSpan={5} text="Chưa có khách hàng phù hợp." />}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {activeSection === 'categories' && (
              <div className="row g-4">
                <div className="col-xl-4">
                  <section className="card admin-card">
                    <div className="card-header"><div><h2 className="card-title">Thêm danh mục</h2><div className="admin-card-subtitle">Tạo nhóm sản phẩm cho cửa hàng</div></div></div>
                    <div className="card-body">
                      <form onSubmit={submitCategory}>
                        <label className="form-label" htmlFor="category-name">Tên danh mục *</label>
                        <input id="category-name" className="form-control mb-3" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Ví dụ: Đồ gia dụng" required />
                        <button className="btn btn-primary w-100" type="submit"><FontAwesomeIcon icon={faPlus} className="me-2" />Thêm danh mục</button>
                      </form>
                      <p className="small text-muted mt-3 mb-0">Danh mục mới sẽ xuất hiện trong lựa chọn khi tạo sản phẩm.</p>
                    </div>
                  </section>
                </div>
                <div className="col-xl-8">
                  <section className="card admin-card">
                    <div className="card-header"><div><h2 className="card-title">Danh mục hiện có</h2><div className="admin-card-subtitle">{categoryList.length} danh mục</div></div></div>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table admin-table align-middle mb-0">
                          <thead><tr><th>Tên danh mục</th><th>Sản phẩm</th><th>Tỷ trọng</th></tr></thead>
                          <tbody>
                            {categoryList.map((category) => {
                              const count = productList.filter((product) => product.category === category).length;
                              const share = productList.length ? Math.round((count / productList.length) * 100) : 0;
                              return (
                                <tr key={category}>
                                  <td><span className="admin-category-icon me-2"><FontAwesomeIcon icon={faTags} /></span><strong>{category}</strong></td>
                                  <td>{count}</td>
                                  <td><div className="admin-progress"><span style={{ width: `${share}%` }} /></div><small className="text-muted">{share}%</small></td>
                                </tr>
                              );
                            })}
                            {categoryList.length === 0 && <EmptyRow colSpan={3} text="Chưa có danh mục nào." />}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>
        </main>
        <footer className="admin-footer">
          <span><strong>ShopTN Admin</strong> · Quản trị cửa hàng trực tuyến</span>
          <span>AdminLTE · {new Date().getFullYear()}</span>
        </footer>
      </div>
      {sidebarOpen && <button className="admin-sidebar-backdrop" type="button" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="admin-search">
      <FontAwesomeIcon icon={faMagnifyingGlass} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function EmptyRow({ colSpan, text }) {
  return <tr><td className="admin-empty-state" colSpan={colSpan}>{text}</td></tr>;
}

function FragmentOrder({ order, statusClass, expanded, onExpand, onStatusChange }) {
  const customerName = order.customer || order.customer_name || 'Khách hàng';
  const items = order.items || [];
  return (
    <>
      <tr>
        <td className="fw-semibold">#{order.id}</td>
        <td><strong className="d-block">{customerName}</strong><small className="text-muted">{order.email || order.customer_email || ''}</small></td>
        <td>{formatDate(order.date || order.created_at)}</td>
        <td>{items.length ? `${items.length} sản phẩm` : '—'}</td>
        <td className="fw-semibold">{formatCurrency(order.total)}</td>
        <td>
          <select
            className={`form-select form-select-sm admin-status-select ${statusClass(order.status)}`}
            value={order.status}
            onChange={(event) => onStatusChange(event.target.value)}
            aria-label={`Trạng thái đơn hàng ${order.id}`}
          >
            {orderStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </td>
        <td><button type="button" className="btn btn-sm btn-light" onClick={onExpand}>{expanded ? 'Thu gọn' : 'Chi tiết'}</button></td>
      </tr>
      {expanded && (
        <tr className="admin-order-detail-row">
          <td colSpan={7}>
            <div className="row g-3">
              <div className="col-md-4"><small>Điện thoại</small><strong>{order.phone || order.customer_phone || 'Chưa cung cấp'}</strong></div>
              <div className="col-md-4"><small>Địa chỉ giao hàng</small><strong>{order.address || order.customer_address || 'Chưa cung cấp'}</strong></div>
              <div className="col-md-4"><small>Sản phẩm trong đơn</small><strong>{items.length ? items.map((item) => `${item.product_name} × ${item.quantity}`).join(', ') : 'Không có thông tin chi tiết'}</strong></div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default Admin;
