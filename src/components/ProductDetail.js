import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import '../assets/style/product-detail.css';
import { useCart } from '../contexts/CartContext';
import { formatCurrency } from '../data/products';
import { fetchProductById, fetchProducts } from '../services/api';

function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchProductById(id)
      .then((data) => {
        setProduct(data);
        if (data?.category) {
          fetchProducts('', data.category).then((all) => {
            const related = all.filter((p) => p.id !== data.id).slice(0, 3);
            setRelatedProducts(related);
          });
        }
      })
      .catch((err) => console.warn('Lỗi tải sản phẩm:', err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="product-detail-container" style={{ textAlign: 'center', padding: '60px 0' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
        <p style={{ marginTop: '12px' }}>Đang tải thông tin sản phẩm...</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="product-detail-container">
        <div className="product-not-found">
          <h2>Không tìm thấy sản phẩm</h2>
          <Link to="/" className="secondary-button">Quay về trang chủ</Link>
        </div>
      </main>
    );
  }

  const handleAddToCart = () => {
    addToCart(product);
    setMessage('Đã thêm sản phẩm vào giỏ hàng.');
    setTimeout(() => setMessage(''), 1800);
  };

  return (
    <main className="product-detail-container">
      <section className="product-detail-card">
        <div className="product-image">
          <img src={product.image} alt={product.name} />
        </div>
        <div className="product-info">
          <span className="eyebrow">{product.category}</span>
          <h1 className="product-name">{product.name}</h1>
          <p className="product-price">{formatCurrency(product.price)}</p>
          <p className="product-description">{product.description}</p>
          <ul className="product-benefits">
            <li>Đổi trả trong 7 ngày</li>
            <li>Kiểm tra hàng trước khi nhận</li>
            <li>Hỗ trợ tư vấn nhanh</li>
          </ul>
          <button className="add-to-cart-button" onClick={handleAddToCart}>
            Thêm vào giỏ hàng
          </button>
          {message && <div className="success-message">{message}</div>}
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="related-products" aria-label="Sản phẩm liên quan">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Có thể bạn thích</span>
              <h2>Sản phẩm liên quan</h2>
            </div>
          </div>
          <div className="related-grid">
            {relatedProducts.map((item) => (
              <Link to={`/product/${item.id}`} className="related-card" key={item.id}>
                <img src={item.image} alt={item.name} />
                <div>
                  <span>{item.category}</span>
                  <h3>{item.name}</h3>
                  <strong>{formatCurrency(item.price)}</strong>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default ProductDetail;
