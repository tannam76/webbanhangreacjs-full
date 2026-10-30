import { products as fallbackProducts, categories as fallbackCategories } from '../data/products';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper gửi request kèm JWT token nếu có
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Lỗi yêu cầu: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.warn(`[API Warning] Endpoint ${endpoint}:`, error.message);
    throw error;
  }
}

// 1. Health check
export async function checkServerHealth() {
  try {
    return await request('/health');
  } catch (error) {
    return { status: 'OFFLINE', databaseConnected: false, error: error.message };
  }
}

// 2. Products API
export async function fetchProducts(search = '', category = 'Tất cả') {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category && category !== 'Tất cả') params.append('category', category);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await request(`/products${queryStr}`);
    return res.data || [];
  } catch (error) {
    console.info('Sử dụng dữ liệu sản phẩm dự phòng cục bộ do chưa kết nối được MySQL.');
    return fallbackProducts.filter((product) => {
      const matchSearch = product.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = category === 'Tất cả' || product.category === category;
      return matchSearch && matchCategory;
    });
  }
}

export async function fetchProductById(id) {
  try {
    const res = await request(`/products/${id}`);
    return res.data;
  } catch (error) {
    return fallbackProducts.find((p) => p.id === Number(id)) || null;
  }
}

export async function createProduct(productData) {
  return request('/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
}

export async function updateProduct(id, productData) {
  return request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  });
}

export async function deleteProduct(id) {
  return request(`/products/${id}`, {
    method: 'DELETE',
  });
}

// 3. Categories API
export async function fetchCategories() {
  try {
    const res = await request('/categories');
    return res.data || fallbackCategories;
  } catch (error) {
    return fallbackCategories;
  }
}

export async function createCategory(name) {
  return request('/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

// 4. Auth API
export async function loginUser(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function registerUser(username, email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

export async function fetchCurrentUser() {
  return request('/auth/me');
}

// 5. Orders API
export async function fetchOrders() {
  try {
    const res = await request('/orders');
    return res.data || [];
  } catch (error) {
    console.info('Không thể tải đơn hàng từ MySQL, dùng danh sách rỗng.');
    return [];
  }
}

export async function createOrder(orderData) {
  return request('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

export async function updateOrderStatus(orderId, status) {
  return request(`/orders/${orderId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// 6. Customers API
export async function fetchCustomers() {
  try {
    const res = await request('/customers');
    return res.data || [];
  } catch (error) {
    return [];
  }
}

// 7. Stats API
export async function fetchStats() {
  try {
    const res = await request('/stats');
    return res.data;
  } catch (error) {
    return null;
  }
}

export { API_BASE_URL };
