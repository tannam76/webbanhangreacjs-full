import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../assets/style/register.css';
import { registerUser } from '../services/api';

function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu và xác nhận mật khẩu không trùng khớp.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);

    try {
      // 1. Gửi tới MySQL Backend API
      const res = await registerUser(username, email, password);
      if (res.success) {
        setSuccessMessage('Đăng ký tài khoản thành công! Đang chuyển hướng sang Đăng nhập...');
        setTimeout(() => {
          navigate('/login');
        }, 1200);
        return;
      }
    } catch (apiError) {
      console.warn('API register error, saving to local fallback:', apiError.message);
      
      // Fallback cục bộ nếu backend offline
      const newUser = { email, username, password, role: 'customer' };
      localStorage.setItem('user', JSON.stringify(newUser));
      setSuccessMessage('Đã lưu tài khoản thành công (chế độ cục bộ)! Đang chuyển hướng...');
      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <span className="eyebrow">Thành viên mới</span>
        <h1>Đăng ký</h1>
        <p>Tạo tài khoản để mua sắm nhanh hơn và theo dõi ưu đãi mới nhất.</p>

        {errorMessage && (
          <div style={{ color: '#dc3545', backgroundColor: '#f8d7da', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div style={{ color: '#155724', backgroundColor: '#d4edda', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
            {successMessage}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="VD: user@gmail.com"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="register-username">Tên đăng nhập</label>
            <input
              id="register-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="VD: user123"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="register-password">Mật khẩu</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="confirm-password">Xác nhận mật khẩu</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              required
            />
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        <div className="auth-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </div>
      </div>
    </main>
  );
}

export default Register;
