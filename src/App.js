import { useContext, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import { AuthContext, AuthProvider } from './contexts/AuthContext';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './assets/style.css';

import Admin from './components/Admin';
import Cart from './components/Cart';
import Footer from './components/Footer';
import Header from './components/Header';
import Home from './components/Home';
import Login from './components/Login';
import ProductDetail from './components/ProductDetail';
import Register from './components/Register';

function ProtectedAdminRoute({ children }) {
  const { isAdmin, isLoggedIn } = useContext(AuthContext);

  if (!isLoggedIn) {
    return <Navigate to="/login?mode=admin" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppLayout({ search, setSearch }) {
  const { pathname } = useLocation();
  const isAdminPage = pathname.startsWith('/admin');

  return (
    <>
      {!isAdminPage && <Header search={search} setSearch={setSearch} />}
      <Routes>
        <Route path="/" element={<Home search={search} />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/*" element={<ProtectedAdminRoute><Admin /></ProtectedAdminRoute>} />
      </Routes>
      {!isAdminPage && <Footer />}
    </>
  );
}

function App() {
  const [search, setSearch] = useState('');

  return (
    <AuthProvider>
      <Router>
        <AppLayout search={search} setSearch={setSearch} />
      </Router>
    </AuthProvider>
  );
}

export default App;
