import { useContext, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import '../assets/style/login.css';
import { AuthContext } from '../contexts/AuthContext';
import { loginUser } from '../services/api';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const isAdminMode = useMemo(() => searchParams.get('mode') === 'admin', [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      // 1. Thử đăng nhập qua MySQL Backend API
      const res = await loginUser(username, password);
      if (res.success && res.user) {
        login(res.user, res.token);
        navigate(res.user.role === 'admin' ? '/admin' : '/');
        return;
      }
    } catch (apiError) {
      console.warn('API login failed, checking fallback:', apiError.message);

      // 2. Fallback nếu server backend/MySQL chưa bật
      const storedUser = JSON.parse(localStorage.getItem('user'));
      const adminCredentials = { username: 'admin', password: 'admin123', role: 'admin' };

      if (username === adminCredentials.username && password === adminCredentials.password) {
        login(adminCredentials);
        navigate(isAdminMode ? '/admin' : '/');
        return;
      }

      if (storedUser && storedUser.username === username && storedUser.password === password) {
        login(storedUser);
        navigate('/');
        return;
      }

      setErrorMessage(apiError.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <span className="eyebrow">{isAdminMode ? 'Quản trị hệ thống' : 'Tài khoản'}</span>
        <h1>{isAdminMode ? 'Đăng nhập Admin' : 'Đăng nhập'}</h1>
        <p>
          {isAdminMode
            ? 'Bạn cần đăng nhập bằng tài khoản quản trị để quản lý sản phẩm, đơn hàng và khách hàng.'
            : 'Quản lý đơn hàng, lưu giỏ hàng và nhận ưu đãi dành riêng cho bạn.'}
        </p>

        {errorMessage && (
          <div style={{ color: '#dc3545', backgroundColor: '#f8d7da', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="username">Tên đăng nhập</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="VD: admin hoặc tên của bạn"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="VD: admin123"
              required
            />
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Đang xử lý...' : (isAdminMode ? 'Đăng nhập quản trị' : 'Đăng nhập')}
          </button>
        </form>

        {!isAdminMode && (
          <div className="auth-switch">
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default Login;
