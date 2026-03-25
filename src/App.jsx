import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PublicCatalog from './pages/public/PublicCatalog';
import ProductDetail from './pages/public/ProductDetail';
import CheckoutSuccess from './pages/public/CheckoutSuccess';
import Login from './pages/admin/Login';
import AdminLayout from './components/admin/AdminLayout';
import ProductsList from './pages/admin/ProductsList';
import ProductForm from './pages/admin/ProductForm';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalCart from './components/GlobalCart';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <Router>
            <GlobalCart />
            <Routes>
              <Route path="/" element={<PublicCatalog />} />
              <Route path="/producto/:id" element={<ProductDetail />} />
              <Route path="/success" element={<CheckoutSuccess />} />
              <Route path="/admin/login" element={<Login />} />
              
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<ProductsList />} />
                <Route path="products/new" element={<ProductForm />} />
                <Route path="products/:id" element={<ProductForm />} />
              </Route>
            </Routes>
          </Router>
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
