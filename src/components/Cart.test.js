import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { CartProvider, useCart } from '../contexts/CartContext';
import Cart from './Cart';

function AddTestProduct() {
  const { addToCart } = useCart();
  return (
    <button
      type="button"
      onClick={() => addToCart({ id: 1, name: 'Sản phẩm thử nghiệm', price: 250000, image: '/images/laptop.jpg' })}
    >
      Thêm sản phẩm thử nghiệm
    </button>
  );
}

test('keeps the cart and shows an error when the order was not saved', async () => {
  jest.spyOn(api, 'createOrder').mockRejectedValue(new Error('Máy chủ không khả dụng.'));

  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: null }}>
        <CartProvider>
          <AddTestProduct />
          <Cart />
        </CartProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Thêm sản phẩm thử nghiệm' }));
  fireEvent.change(screen.getByPlaceholderText('Họ và tên người nhận'), { target: { value: 'Khách thử nghiệm' } });
  fireEvent.change(screen.getByPlaceholderText('Số điện thoại nhận hàng'), { target: { value: '0900000000' } });
  fireEvent.change(screen.getByPlaceholderText('Địa chỉ giao hàng chi tiết'), { target: { value: 'Địa chỉ thử nghiệm' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đặt hàng' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ không khả dụng.');
  expect(screen.getByText('Sản phẩm thử nghiệm')).toBeInTheDocument();
  expect(screen.queryByText('Đặt hàng thành công!')).not.toBeInTheDocument();

  await waitFor(() => {
    expect(api.createOrder).toHaveBeenCalledTimes(1);
  });
});
