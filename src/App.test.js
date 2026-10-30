import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';
import { CartProvider } from './contexts/CartContext';

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

test('renders admin page at /admin route when logged in as admin', async () => {
  localStorage.setItem('user', JSON.stringify({ username: 'admin', password: 'admin123', role: 'admin' }));
  window.history.pushState({}, '', '/admin');

  render(
    <CartProvider>
      <App />
    </CartProvider>
  );

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Tổng quan' })).toBeInTheDocument();
  });

  expect(screen.getByRole('link', { name: /ShopTN Admin/i })).toBeInTheDocument();
  const adminNavigation = screen.getByRole('navigation', { name: 'Điều hướng quản trị' });
  expect(within(adminNavigation).getByRole('link', { name: /Danh mục/i })).toHaveAttribute('href', '/admin/categories');

  for (const [label, heading] of [
    ['Sản phẩm', 'Sản phẩm'],
    ['Đơn hàng', 'Đơn hàng'],
    ['Khách hàng', 'Khách hàng'],
    ['Danh mục', 'Danh mục'],
  ]) {
    fireEvent.click(within(adminNavigation).getByRole('link', { name: label, exact: true }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeInTheDocument();
    });
  }
});

test('account button opens logout menu for logged in user', async () => {
  localStorage.setItem('user', JSON.stringify({ username: 'demo', password: '123456', role: 'customer' }));

  render(
    <CartProvider>
      <App />
    </CartProvider>
  );

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /demo/i })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('button', { name: /demo/i }));

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /đăng xuất/i })).toBeInTheDocument();
  });
});

test('logout redirects to login page and clears session', async () => {
  localStorage.setItem('user', JSON.stringify({ username: 'demo', password: '123456', role: 'customer' }));

  render(
    <CartProvider>
      <App />
    </CartProvider>
  );

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /demo/i })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('button', { name: /demo/i }));
  fireEvent.click(screen.getByRole('button', { name: /đăng xuất/i }));

  await waitFor(() => {
    expect(localStorage.getItem('user')).toBeNull();
    expect(window.location.pathname).toBe('/login');
  });
});
