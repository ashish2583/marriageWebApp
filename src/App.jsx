import {Navigate, Route, Routes} from 'react-router-dom';
import {AlertTriangle, CheckCircle2, Info, LoaderCircle, Sparkles, X} from 'lucide-react';
import AppShell from './components/AppShell';
import {useApp} from './lib/AppContext';
import {ForgotPassword, Login, Signup} from './pages/AuthPages';
import {ChangePassword, EditProfile, Privacy, Profile} from './pages/AccountPages';
import {Cart, CustomerHome, Orders, ProductDetail, Products, Support, Vendors} from './pages/customer';
import {Bookings, Categories, ProductForm, VendorDashboard, VendorProducts} from './pages/vendor';
import {AdminCategories, AdminCustomers, AdminDashboard, AdminOrders, AdminPayments, AdminProducts, AdminQueries, AdminVendors} from './pages/admin';
import {
  AdminProfile,
  AdminSettings,
  AdminVendorStatusList,
  CancellationPolicy,
  CancelledOrders,
  ChatPage,
  InvitationCardCreator,
  LocalImages,
  MakePayment,
  OrderDetail,
  PackagePlan,
  PaymentRelatedPolicy,
  PortalChargePolicy,
  VendorCancellationPolicy,
  VendorImageServerConfig,
} from './pages/ExtraPages';

const dashboardFor = role =>
  role === 'admin' ? '/admin/dashboard' : role === 'vendor' ? '/vendor/dashboard' : '/customer/dashboard';

const toastMeta = {
  success: {label: 'Success', icon: CheckCircle2},
  error: {label: 'Attention', icon: AlertTriangle},
  info: {label: 'Update', icon: Info},
};

function GlobalFeedback() {
  const {toast, loading, dismissToast} = useApp();
  const meta = toastMeta[toast?.tone] || toastMeta.success;
  const ToastIcon = meta.icon;

  return <>
    {loading && (
      <div className="global-loader" role="status" aria-live="polite">
        <section className="global-loader-card">
          <div className="global-loader-mark">
            <span />
            <img src="/assets/vslogo.png" alt="" />
            <LoaderCircle />
          </div>
          <div>
            <span className="global-loader-kicker"><Sparkles size={14} /> Marriage Services</span>
            <strong>Preparing your experience</strong>
            <small>Please wait while we sync the latest details.</small>
          </div>
          <i />
        </section>
      </div>
    )}
    {toast && (
      <div className={`toast toast-${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
        <span className="toast-icon"><ToastIcon size={21} /></span>
        <span className="toast-copy">
          <strong>{meta.label}</strong>
          <small>{toast.message}</small>
        </span>
        <button type="button" onClick={dismissToast} aria-label="Dismiss notification"><X size={17} /></button>
        <i />
      </div>
    )}
  </>;
}

function Protected({role, children}) {
  const {session} = useApp();
  if (!session) return <Navigate to="/login" replace />;
  if (role && session.user.role !== role) 
    return <Navigate to={dashboardFor(session.user.role)} replace />;
  return children;
}

export default function App() {
  return <>
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/payment-related-policy" element={<PaymentRelatedPolicy />} />
    <Route element={<Protected><AppShell /></Protected>}>
      <Route path="/" element={<Navigate to="/customer/dashboard" replace />} />
      <Route path="/customer" element={<Navigate to="/customer/dashboard" replace />} />
      <Route path="/customer/dashboard" element={<Protected role="customer"><CustomerHome /></Protected>} />
      <Route path="/home" element={<Navigate to="/customer/dashboard" replace />} />
      <Route path="/vendors" element={<Protected role="customer"><Vendors /></Protected>} />
      <Route path="/products" element={<Protected role="customer"><Products /></Protected>} />
      <Route path="/product/:id" element={<Protected role="customer"><ProductDetail /></Protected>} />
      <Route path="/cart" element={<Protected role="customer"><Cart /></Protected>} />
      <Route path="/my-cart" element={<Navigate to="/cart" replace />} />
      <Route path="/orders" element={<Protected role="customer"><Orders /></Protected>} />
      <Route path="/my-order" element={<Navigate to="/orders" replace />} />
      <Route path="/orders/:id" element={<Protected role="customer"><OrderDetail /></Protected>} />
      <Route path="/cancelled-orders" element={<Protected role="customer"><CancelledOrders /></Protected>} />
      <Route path="/my-cancelled-orders" element={<Navigate to="/cancelled-orders" replace />} />
      <Route path="/package-plan" element={<Protected role="customer"><PackagePlan /></Protected>} />
      <Route path="/make-payment" element={<Protected role="customer"><MakePayment /></Protected>} />
      <Route path="/cancellation-policy" element={<Protected role="customer"><CancellationPolicy /></Protected>} />
      <Route path="/invitation-card" element={<Protected role="customer"><InvitationCardCreator /></Protected>} />
      <Route path="/local-images" element={<Protected role="customer"><LocalImages /></Protected>} />
      <Route path="/chat" element={<Protected role="customer"><ChatPage role="customer" /></Protected>} />
      <Route path="/support" element={<Protected role="customer"><Support /></Protected>} />
      <Route path="/connect-admin" element={<Navigate to="/support" replace />} />
      <Route path="/profile" element={<Protected role="customer"><Profile /></Protected>} />
      <Route path="/profile/edit" element={<Protected role="customer"><EditProfile /></Protected>} />
      <Route path="/change-password" element={<Protected role="customer"><ChangePassword /></Protected>} />
      <Route path="/privacy" element={<Protected role="customer"><Privacy /></Protected>} />
      <Route path="/app/payment-related-policy" element={<PaymentRelatedPolicy />} />
      <Route path="/bookform" element={<Navigate to="/cart" replace />} />
      <Route path="/checkout" element={<Navigate to="/cart" replace />} />
      <Route path="/vendor" element={<Navigate to="/vendor/dashboard" replace />} />
      <Route path="/vendor/dashboard" element={<Protected role="vendor"><VendorDashboard /></Protected>} />
      <Route path="/vendor/home" element={<Navigate to="/vendor/dashboard" replace />} />
      <Route path="/vendor/products" element={<Protected role="vendor"><VendorProducts /></Protected>} />
      <Route path="/vendor/products/new" element={<Protected role="vendor"><ProductForm /></Protected>} />
      <Route path="/vendor/add-product" element={<Navigate to="/vendor/products/new" replace />} />
      <Route path="/vendor/products/:id/edit" element={<Protected role="vendor"><ProductForm edit /></Protected>} />
      <Route path="/vendor/categories" element={<Protected role="vendor"><Categories /></Protected>} />
      <Route path="/vendor/add-category" element={<Navigate to="/vendor/categories" replace />} />
      <Route path="/vendor/bookings" element={<Protected role="vendor"><Bookings /></Protected>} />
      <Route path="/vendor/custom-booking" element={<Navigate to="/vendor/bookings" replace />} />
      <Route path="/vendor/booking-calendar" element={<Navigate to="/vendor/bookings" replace />} />
      <Route path="/vendor/image-server" element={<Protected role="vendor"><VendorImageServerConfig /></Protected>} />
      <Route path="/vendor/portal-charges" element={<Protected role="vendor"><PortalChargePolicy /></Protected>} />
      <Route path="/vendor/chat" element={<Protected role="vendor"><ChatPage role="vendor" /></Protected>} />
      <Route path="/vendor/cancellation-policy" element={<Protected role="vendor"><VendorCancellationPolicy /></Protected>} />
      <Route path="/vendor/profile" element={<Protected role="vendor"><Profile vendor /></Protected>} />
      <Route path="/vendor/profile/edit" element={<Protected role="vendor"><EditProfile vendor /></Protected>} />
      <Route path="/vendor/change-password" element={<Protected role="vendor"><ChangePassword /></Protected>} />
      <Route path="/vendor/privacy" element={<Protected role="vendor"><Privacy /></Protected>} />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard" element={<Protected role="admin"><AdminDashboard /></Protected>} />
      <Route path="/admin/home" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/orders" element={<Protected role="admin"><AdminOrders /></Protected>} />
      <Route path="/admin/vendors" element={<Protected role="admin"><AdminVendors /></Protected>} />
      <Route path="/admin/vendors/active" element={<Protected role="admin"><AdminVendorStatusList status="active" /></Protected>} />
      <Route path="/admin/vendors/inactive" element={<Protected role="admin"><AdminVendorStatusList status="inactive" /></Protected>} />
      <Route path="/admin/active-vendors" element={<Navigate to="/admin/vendors/active" replace />} />
      <Route path="/admin/inactive-vendors" element={<Navigate to="/admin/vendors/inactive" replace />} />
      <Route path="/admin/customers" element={<Protected role="admin"><AdminCustomers /></Protected>} />
      <Route path="/admin/products" element={<Protected role="admin"><AdminProducts /></Protected>} />
      <Route path="/admin/categories" element={<Protected role="admin"><AdminCategories /></Protected>} />
      <Route path="/admin/payments" element={<Protected role="admin"><AdminPayments /></Protected>} />
      <Route path="/admin/queries" element={<Protected role="admin"><AdminQueries /></Protected>} />
      <Route path="/admin/chat" element={<Protected role="admin"><ChatPage role="admin" /></Protected>} />
      <Route path="/admin/profile" element={<Protected role="admin"><AdminProfile /></Protected>} />
      <Route path="/admin/settings" element={<Protected role="admin"><AdminSettings /></Protected>} />
    </Route>
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
  <GlobalFeedback />
  </>;
}
