import { createContext, useEffect, useState } from 'react';
import { fetchCurrentUser } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const getInitialUser = () => {
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) return null;
      const parsedUser = JSON.parse(savedUser);
      return parsedUser?.username ? parsedUser : null;
    } catch (error) {
      console.error('Không thể đọc user/token:', error);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  };

  const [user, setUser] = useState(getInitialUser);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // ==============================
  // ĐỌC USER VÀ TOKEN TỪ LOCALSTORAGE
  // ==============================
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (savedToken) {
          setToken(savedToken);
          // Thử xác thực với backend
          try {
            const meRes = await fetchCurrentUser();
            if (meRes.success && meRes.user) {
              setUser(meRes.user);
              localStorage.setItem('user', JSON.stringify(meRes.user));
              return;
            }
          } catch (e) {
            // Nếu token hết hạn hoặc backend offline nhưng có cached user
          }
        }

        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          if (parsedUser?.username) {
            setUser(parsedUser);
          }
        }
      } catch (error) {
        console.error('Không thể đọc user/token:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // ==============================
  // LOGIN
  // ==============================
  const login = (userData, userToken = null) => {
    const normalizedUser = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      role: userData.role || 'customer',
    };

    localStorage.setItem('user', JSON.stringify(normalizedUser));
    if (userToken) {
      localStorage.setItem('token', userToken);
      setToken(userToken);
    }

    setUser(normalizedUser);
  };

  // ==============================
  // LOGOUT
  // ==============================
  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  // ==============================
  // THÔNG TIN USER
  // ==============================
  const isLoggedIn = Boolean(user);
  const username = user?.username || '';
  const role = user?.role || 'customer';
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn,
        username,
        role,
        isAdmin,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};