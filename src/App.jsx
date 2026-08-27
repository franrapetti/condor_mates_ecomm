import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PublicCatalog from './pages/public/PublicCatalog';
import ProductDetail from './pages/public/ProductDetail';
import CheckoutSuccess from './pages/public/CheckoutSuccess';
import NotFound from './pages/public/NotFound';
import Wishlist from './pages/public/Wishlist';
import CorporatePage from './pages/public/CorporatePage';
import Returns from './pages/public/Returns';
import ComboBuilder from './components/ComboBuilder';
import Login from './pages/admin/Login';
import AdminLayout from './components/admin/AdminLayout';
import ProductsList from './pages/admin/ProductsList';
import ProductForm from './pages/admin/ProductForm';
import OrdersList from './pages/admin/OrdersList';
import PrepOrders from './pages/admin/PrepOrders';
import AdminSettings from './pages/admin/AdminSettings';
import AdminLeads from './pages/admin/AdminLeads';
import CsvExport from './pages/admin/CsvExport';
import ScreenshotCatalog from './pages/admin/ScreenshotCatalog';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalCart from './components/GlobalCart';
import PublicLayout from './components/PublicLayout';
import ExitIntentPopup from './components/ExitIntentPopup';
import MetaPixel from './components/MetaPixel';
import TikTokPixel from './components/TikTokPixel';
import ScrollToTop from './components/ScrollToTop';
import { WishlistProvider } from './context/WishlistContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAnalytics } from './hooks/useAnalytics';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import About from './pages/public/About';
import Shipping from './pages/public/Shipping';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const AnalyticsWrapper = () => {
  useAnalytics();
  return null;
};

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
        <ToastProvider>
          <CartProvider>
            <WishlistProvider>
              <Router>
                <ScrollToTop />
                <MetaPixel />
                <TikTokPixel />
                <AnalyticsWrapper />
                <GlobalCart />
                <ExitIntentPopup />
                <Routes>
                  <Route element={<PublicLayout />}>
                    <Route path="/" element={<PublicCatalog />} />
                    <Route path="/producto/:id" element={<ProductDetail />} />
                    <Route path="/checkout/success" element={<CheckoutSuccess />} />
                    <Route path="/favoritos" element={<Wishlist />} />
                    <Route path="/empresas" element={<CorporatePage />} />
                    <Route path="/nosotros" element={<About />} />
                    <Route path="/envios" element={<Shipping />} />
                    <Route path="/combo" element={<ComboBuilder />} />
                    <Route path="/devoluciones" element={<Returns />} />
                  </Route>
                  <Route path="/admin/login" element={<Login />} />
                  
                  <Route path="/admin" element={
                    <ProtectedRoute>
                      <AdminLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<ProductsList />} />
                    <Route path="orders" element={<OrdersList />} />
                    <Route path="prep-orders" element={<PrepOrders />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="leads" element={<AdminLeads />} />
                    <Route path="export" element={<CsvExport />} />
                    <Route path="screenshots" element={<ScreenshotCatalog />} />
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
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
