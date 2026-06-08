import {Navigate, Route, Routes} from 'react-router-dom';
import AppShell from './components/AppShell';
import {useApp} from './lib/AppContext';
import {ForgotPassword, Login, Signup} from './pages/AuthPages';
import {ChangePassword, EditProfile, Privacy, Profile} from './pages/AccountPages';
import {Cart, CustomerHome, Orders, ProductDetail, Products, Support, Vendors} from './pages/CustomerPages';
import {Bookings, Categories, ProductForm, VendorDashboard, VendorProducts} from './pages/VendorPages';

function Protected({role, children}) {
  const {session} = useApp();
  if (!session) return <Navigate to="/login" replace />;
  if (role && session.user.role !== role) return <Navigate to={session.user.role === 'vendor' ? '/vendor' : '/'} replace />;
  return children;
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<Login />} /><Route path="/signup" element={<Signup />} /><Route path="/forgot-password" element={<ForgotPassword />} />
    <Route element={<Protected><AppShell /></Protected>}>
      <Route path="/" element={<Protected role="customer"><CustomerHome /></Protected>} />
      <Route path="/vendors" element={<Protected role="customer"><Vendors /></Protected>} />
      <Route path="/products" element={<Protected role="customer"><Products /></Protected>} />
      <Route path="/product/:id" element={<Protected role="customer"><ProductDetail /></Protected>} />
      <Route path="/cart" element={<Protected role="customer"><Cart /></Protected>} />
      <Route path="/orders" element={<Protected role="customer"><Orders /></Protected>} />
      <Route path="/support" element={<Protected role="customer"><Support /></Protected>} />
      <Route path="/profile" element={<Protected role="customer"><Profile /></Protected>} />
      <Route path="/profile/edit" element={<Protected role="customer"><EditProfile /></Protected>} />
      <Route path="/change-password" element={<Protected role="customer"><ChangePassword /></Protected>} />
      <Route path="/privacy" element={<Protected role="customer"><Privacy /></Protected>} />
      <Route path="/vendor" element={<Protected role="vendor"><VendorDashboard /></Protected>} />
      <Route path="/vendor/products" element={<Protected role="vendor"><VendorProducts /></Protected>} />
      <Route path="/vendor/products/new" element={<Protected role="vendor"><ProductForm /></Protected>} />
      <Route path="/vendor/products/:id/edit" element={<Protected role="vendor"><ProductForm edit /></Protected>} />
      <Route path="/vendor/categories" element={<Protected role="vendor"><Categories /></Protected>} />
      <Route path="/vendor/bookings" element={<Protected role="vendor"><Bookings /></Protected>} />
      <Route path="/vendor/profile" element={<Protected role="vendor"><Profile vendor /></Protected>} />
      <Route path="/vendor/profile/edit" element={<Protected role="vendor"><EditProfile vendor /></Protected>} />
      <Route path="/vendor/change-password" element={<Protected role="vendor"><ChangePassword /></Protected>} />
      <Route path="/vendor/privacy" element={<Protected role="vendor"><Privacy /></Protected>} />
    </Route>
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>;
}
