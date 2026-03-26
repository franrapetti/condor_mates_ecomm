import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PublicCatalog from './pages/public/PublicCatalog';
import ProductDetail from './pages/public/ProductDetail';
import CheckoutSuccess from './pages/public/CheckoutSuccess';
import NotFound from './pages/public/NotFound';
import Wishlist from './pages/public/Wishlist';
import Login from './pages/admin/Login';
import AdminLayout from './components/admin/AdminLayout';
import ProductsList from './pages/admin/ProductsList';
import ProductForm from './pages/admin/ProductForm';
import OrdersList from './pages/admin/OrdersList';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalCart from './components/GlobalCart';
import MetaPixel from './components/MetaPixel';
import { WishlistProvider } from './context/WishlistContext';
import { useAnalytics } from './hooks/useAnalytics';
import { HelmetProvider } from 'react-helmet-async';
import './App.css';

const AnalyticsWrapper = () => {
  useAnalytics();
  return null;
};

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <ToastProvider>
          <CartProvider>
            <WishlistProvider>
            <Router>
              <MetaPixel />
              <AnalyticsWrapper />
              <GlobalCart />
              <Routes>
              <Route path="/" element={<PublicCatalog />} />
              <Route path="/producto/:id" element={<ProductDetail />} />
              <Route path="/success" element={<CheckoutSuccess />} />
              <Route path="/favoritos" element={<Wishlist />} />
              <Route path="/admin/login" element={<Login />} />
              
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route index element={<ProductsList />} />
                <Route path="orders" element={<OrdersList />} />
                <Route path="products/new" element={<ProductForm />} />
                <Route path="products/:id" element={<ProductForm />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
            </WishlistProvider>
          </CartProvider>
        </ToastProvider>
    </AuthProvider>
  </HelmetProvider>
  );
}

export default App;
