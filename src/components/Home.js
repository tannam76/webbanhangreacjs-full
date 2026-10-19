import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../data/products';
import { fetchCategories, fetchProducts } from '../services/api';

const categoryShowcase = [
  {
    title: 'Công nghệ',
    text: 'Thiết bị thông minh, hiệu năng ổn định cho học tập và làm việc.',
    image: '/images/phone.jpg',
  },
  {
    title: 'Thời trang',
    text: 'Trang phục dễ phối, phom hiện đại và phù hợp sử dụng hằng ngày.',
    image: '/images/aokhoac.jpg',
  },
  {
    title: 'Phụ kiện',
    text: 'Điểm nhấn tinh gọn giúp hoàn thiện phong cách cá nhân.',
    image: '/images/watch.jpg',
  },
];

function Home({ search }) {
  const [category, setCategory] = useState('Tất cả');
  const [categoriesList, setCategoriesList] = useState(['Tất cả', 'Công nghệ', 'Thời trang', 'Phụ kiện']);
  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 6;

  // Load categories từ backend
  useEffect(() => {
    fetchCategories()
      .then((cats) => {
        if (Array.isArray(cats) && cats.length > 0) {
          setCategoriesList(cats);
        }
      })
      .catch((err) => console.warn('Lỗi tải categories:', err));
  }, []);

  // Load products từ backend MySQL theo search & category
  useEffect(() => {
    setLoading(true);
    fetchProducts(search, category)
      .then((items) => {
        setProductList(items || []);
        setCurrentPage(1);
      })
      .catch((err) => console.warn('Lỗi tải products:', err))
      .finally(() => setLoading(false));
  }, [search, category]);

  const totalPages = Math.max(1, Math.ceil(productList.length / productsPerPage));
  const startIndex = (currentPage - 1) * productsPerPage;
  const currentProducts = productList.slice(startIndex, startIndex + productsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <main className="home-page">
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">Bộ sưu tập mới</span>
          <h1>ShopTN</h1>
          <p>
            Mua sắm sản phẩm công nghệ, thời trang và phụ kiện được tuyển chọn
            với trải nghiệm nhanh, rõ ràng và đáng tin cậy.
          </p>
          <div className="hero-actions">
            <a href="#products" className="primary-button">Xem sản phẩm</a>
            <Link to="/cart" className="secondary-button">Giỏ hàng</Link>
          </div>
        </div>
        <div className="hero-media" aria-label="Sản phẩm nổi bật">
          <img src="/images/laptop.jpg" alt="Laptop nổi bật" />
          <div className="hero-card">
            <strong>Miễn phí giao hàng</strong>
            <span>Cho đơn từ 500.000đ</span>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Cam kết dịch vụ">
        <div>
          <strong>48h</strong>
          <span>Giao hàng nhanh</span>
        </div>
        <div>
          <strong>7 ngày</strong>
          <span>Đổi trả linh hoạt</span>
        </div>
        <div>
          <strong>100%</strong>
          <span>Sản phẩm chọn lọc</span>
        </div>
      </section>

      <section className="category-section" aria-label="Danh mục nổi bật">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Khám phá</span>
            <h2>Danh mục nổi bật</h2>
          </div>
        </div>
        <div className="category-grid">
          {categoryShowcase.map((item) => (
            <button
              className="category-tile"
              key={item.title}
              onClick={() => {
                setCategory(item.title);
                setCurrentPage(1);
                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <img src={item.image} alt={item.title} />
              <span>{item.title}</span>
              <p>{item.text}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="catalog-section" id="products">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Danh mục</span>
            <h2>Sản phẩm nổi bật</h2>
          </div>
          <div className="filter">
            <label htmlFor="category">Lọc theo danh mục</label>
            <select
              id="category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              {categoriesList.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#666' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <p style={{ marginTop: '10px' }}>Đang tải danh sách sản phẩm...</p>
          </div>
        ) : currentProducts.length > 0 ? (
          <div className="product-list">
            {currentProducts.map((product) => (
              <Link to={`/product/${product.id}`} key={product.id} className="product-card">
                <span className="product-badge">{product.badge}</span>
                <img src={product.image} alt={product.name} />
                <div className="product-card-body">
                  <span>{product.category}</span>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <strong>{formatCurrency(product.price)}</strong>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Không tìm thấy sản phẩm</h3>
            <p>Thử nhập từ khóa khác hoặc chọn lại danh mục.</p>
          </div>
        )}

        <div className="pagination">
          <button onClick={handlePrevPage} disabled={currentPage === 1}>
            Trước
          </button>
          <span>Trang {currentPage} / {totalPages}</span>
          <button onClick={handleNextPage} disabled={currentPage === totalPages}>
            Sau
          </button>
        </div>
      </section>
    </main>
  );
}

export default Home;
