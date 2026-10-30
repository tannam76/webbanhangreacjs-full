import { faCheckCircle, faMinus, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import '../assets/style/cart.css';
import { AuthContext } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { formatCurrency } from '../data/products';
import { createOrder } from '../services/api';

function Cart() {
  const { cartItems, removeFromCart, updateQuantity, totalPrice, clearCart } = useCart();
  const { user } = useContext(AuthContext);

  const [discountCode, setDiscountCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [customerName, setCustomerName] = useState(user?.username || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleIncrease = (item) => {
    updateQuantity(item.id, item.quantity + 1);
  };

  const handleDecrease = (item) => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1);
    }
  };

  const handleApplyDiscount = () => {
    if (discountCode.trim().toUpperCase() === 'SAVE10') {
      setDiscountAmount(totalPrice * 0.1);
      alert('Đã áp dụng mã giảm giá 10%!');
    } else {
      alert('Mã giảm giá không hợp lệ. Hãy thử: SAVE10');
    }
  };

  const discountedTotal = Math.max(0, totalPrice - discountAmount);

  const handleCheckout = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên người nhận.');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại.');
      return;
    }
    if (!customerAddress.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ nhận hàng.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        customerName: customerName.trim(),
        customerEmail: user?.email || '',
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        total: discountedTotal,
        items: cartItems,
        userId: user?.id || null,
      };

      const res = await createOrder(orderPayload);

      if (!res?.success || !res.orderId) {
        throw new Error(res?.message || 'Máy chủ chưa xác nhận lưu đơn hàng.');
      }

      setOrderSuccess({
        orderId: res.orderId,
        total: discountedTotal,
        customerName: customerName.trim(),
      });
      clearCart();
    } catch (err) {
      console.error('Không thể lưu đơn hàng:', err);
      setErrorMessage(err.message || 'Không thể lưu đơn hàng. Vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <main className="cart cart-empty" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '4rem', color: '#28a745', marginBottom: '20px' }} />
        <h1>Đặt hàng thành công!</h1>
        <p style={{ fontSize: '1.2rem', color: '#333', margin: '12px 0' }}>
          Mã đơn hàng: <strong>{orderSuccess.orderId}</strong>
        </p>
        <p style={{ color: '#666', maxWidth: '500px', margin: '0 auto 24px' }}>
          Cảm ơn bạn <strong>{orderSuccess.customerName}</strong>. Đơn hàng trị giá{' '}
          <strong>{formatCurrency(orderSuccess.total)}</strong> đã được ghi nhận. Chúng tôi sẽ liên hệ với bạn sớm để xác nhận và giao hàng.
        </p>
        <Link to="/" className="primary-button">Tiếp tục mua sắm</Link>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="cart cart-empty">
        <h1>Giỏ hàng đang trống</h1>
        <p>Khám phá các sản phẩm nổi bật và thêm món bạn thích vào giỏ hàng.</p>
        <Link to="/" className="primary-button">Tiếp tục mua sắm</Link>
      </main>
    );
  }

  return (
    <main className="cart">
      <div className="cart-header">
        <div>
          <span className="eyebrow">Thanh toán</span>
          <h1>Giỏ hàng của bạn</h1>
        </div>
        <button className="clear-btn" onClick={clearCart}>
          <FontAwesomeIcon icon={faTrash} /> Xóa tất cả
        </button>
      </div>

      <div className="cart-layout">
        <ul className="cart-list">
          {cartItems.map((item) => (
            <li key={item.id} className="cart-item">
              <img src={item.image} alt={item.name} />
              <div className="cart-item-info">
                <span>{item.category}</span>
                <h3>{item.name}</h3>
                <p>{formatCurrency(item.price)}</p>
              </div>
              <div className="quantity">
                <button onClick={() => handleDecrease(item)} aria-label="Giảm số lượng">
                  <FontAwesomeIcon icon={faMinus} />
                </button>
                <span>{item.quantity}</span>
                <button onClick={() => handleIncrease(item)} aria-label="Tăng số lượng">
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              </div>
              <button className="remove-btn" onClick={() => removeFromCart(item.id)}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </li>
          ))}
        </ul>

        <aside className="cart-summary">
          <h2>Tóm tắt đơn hàng</h2>
          <div className="summary-row">
            <span>Tạm tính</span>
            <strong>{formatCurrency(totalPrice)}</strong>
          </div>
          <div className="summary-row">
            <span>Giảm giá</span>
            <strong>{formatCurrency(discountAmount)}</strong>
          </div>
          <div className="discount">
            <input
              type="text"
              placeholder="Nhập mã SAVE10"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
            />
            <button onClick={handleApplyDiscount}>Áp dụng</button>
          </div>
          <div className="summary-total">
            <span>Cần thanh toán</span>
            <strong>{formatCurrency(discountedTotal)}</strong>
          </div>

          <form onSubmit={handleCheckout} style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Thông tin giao hàng</h3>
            
            {errorMessage && (
              <div role="alert" style={{ color: '#dc3545', fontSize: '0.85rem', marginBottom: '10px' }}>
                {errorMessage}
              </div>
            )}

            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Họ và tên người nhận"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                required
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Số điện thoại nhận hàng"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                required
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="Địa chỉ giao hàng chi tiết"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                required
              />
            </div>

            <button type="submit" className="checkout-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi đơn hàng...' : 'Xác nhận đặt hàng'}
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}

export default Cart;
