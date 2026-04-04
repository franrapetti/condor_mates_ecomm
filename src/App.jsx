import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PublicCatalog from './pages/public/PublicCatalog';
import ProductDetail from './pages/public/ProductDetail';
import CheckoutSuccess from './pages/public/CheckoutSuccess';
import NotFound from './pages/public/NotFound';
import Wishlist from './pages/public/Wishlist';
import CorporatePage from './pages/public/CorporatePage';
import ComboBuilder from './components/ComboBuilder';
import Login from './pages/admin/Login';
import AdminLayout from './components/admin/AdminLayout';
import ProductsList from './pages/admin/ProductsList';
import ProductForm from './pages/admin/ProductForm';
import OrdersList from './pages/admin/OrdersList';
import ManualSales from './pages/admin/ManualSales';
import AdminSettings from './pages/admin/AdminSettings';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalCart from './components/GlobalCart';
import PublicLayout from './components/PublicLayout';
import ExitIntentPopup from './components/ExitIntentPopup';
import MetaPixel from './components/MetaPixel';
import { WishlistProvider } from './context/WishlistContext';
import { ThemeProvider } from './context/ThemeContext';
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
      <ThemeProvider>
        <AuthProvider>
        <ToastProvider>
          <CartProvider>
            <WishlistProvider>
              <Router>
                <MetaPixel />
                <AnalyticsWrapper />
                <GlobalCart />
                <ExitIntentPopup />
                <Routes>
                  <Route element={<PublicLayout />}>
                    <Route path="/" element={<PublicCatalog />} />
                    <Route path="/producto/:id" element={<ProductDetail />} />
                    <Route path="/success" element={<CheckoutSuccess />} />
                    <Route path="/favoritos" element={<Wishlist />} />
                    <Route path="/empresas" element={<CorporatePage />} />
                    <Route path="/combo" element={<ComboBuilder />} />
                  </Route>
                  <Route path="/admin/login" element={<Login />} />
                  
                  <Route path="/admin" element={
                    <ProtectedRoute>
                      <AdminLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<ProductsList />} />
                    <Route path="orders" element={<OrdersList />} />
                    <Route path="manual-sales" element={<ManualSales />} />
                    <Route path="settings" element={<AdminSettings />} />
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
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
