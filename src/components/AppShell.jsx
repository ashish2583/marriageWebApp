import {CalendarDays, CircleUserRound, CreditCard, FileText, FolderTree, HeartHandshake, Home, Images, LayoutDashboard, LockKeyhole, LogOut, Menu, MessageCircleMore, Package, PackagePlus, PartyPopper, Server, ShieldAlert, ShoppingBag, ShoppingCart, Store, Tags, Users, X} from 'lucide-react';
import {useEffect, useState} from 'react';
import {NavLink, Outlet, useLocation} from 'react-router-dom';
import {useApp} from '../lib/AppContext';

const customerLinks = [
  ['/customer/dashboard', 'Discover', Home],
  ['/package-plan', 'Package Plan', Package],
  ['/invitation-card', 'Invitation Card', PartyPopper],
  ['/local-images', 'Local Images', Images],
  ['/cart', 'My Cart', ShoppingCart],
  ['/orders', 'My Orders', ShoppingBag],
  ['/cancelled-orders', 'Cancelled Orders', ShieldAlert],
  ['/chat', 'Chat', MessageCircleMore],
  ['/support', 'Support', MessageCircleMore],
  ['/payment-related-policy', 'Payment Related Policy', FileText],
  ['/profile', 'Profile', CircleUserRound],
];

const vendorLinks = [
  ['/vendor/dashboard', 'Dashboard', LayoutDashboard],
  ['/vendor/products', 'Products', ShoppingBag],
  ['/vendor/products/new', 'Add Product', PackagePlus],
  ['/vendor/categories', 'Categories', Tags],
  ['/vendor/bookings', 'Bookings', CalendarDays],
  ['/vendor/image-server', 'Image Server', Server],
  ['/vendor/chat', 'Chat', MessageCircleMore],
  ['/vendor/portal-charges', 'Portal Charges', ShieldAlert],
  ['/payment-related-policy', 'Payment Related Policy', FileText],
  ['/vendor/profile', 'Profile', CircleUserRound],
];

const adminLinks = [
  ['/admin/dashboard', 'Dashboard', LayoutDashboard],
  ['/admin/chat', 'Chat', MessageCircleMore],
  ['/admin/profile', 'Profile', CircleUserRound],
  ['/admin/orders', 'Orders', ShoppingBag],
  ['/admin/vendors', 'Vendors', Store],
  ['/admin/vendors/active', 'Active Vendors', Store],
  ['/admin/vendors/inactive', 'Inactive Vendors', ShieldAlert],
  ['/admin/customers', 'Customers', Users],
  ['/admin/products', 'Products', Package],
  ['/admin/categories', 'Categories', FolderTree],
  ['/admin/payments', 'Payments', CreditCard],
  ['/admin/queries', 'Queries', MessageCircleMore],
  ['/payment-related-policy', 'Payment Related Policy', FileText],
  ['/admin/settings', 'Settings', ShieldAlert],
];

export default function AppShell() {
  const {session, logout, cart} = useApp();
  const [open, setOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const location = useLocation();
  const role = session?.user?.role;
  const vendor = role === 'vendor';
  const admin = role === 'admin';
  const links = admin ? adminLinks : vendor ? vendorLinks : customerLinks;
  const homePath = admin ? '/admin/dashboard' : vendor ? '/vendor/dashboard' : '/customer/dashboard';
  const profilePath = admin ? '/admin/profile' : vendor ? '/vendor/profile' : '/profile';
  const showLoader = routeLoading;
  const currentDate = new Date().toLocaleDateString('en-IN', {weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'});

  useEffect(() => {
    setRouteLoading(true);
    const timer = window.setTimeout(() => setRouteLoading(false), 350);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);

  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <button className="sidebar-close" onClick={() => setOpen(false)}><X /></button>
      <NavLink to={homePath} className="brand" onClick={() => setOpen(false)}>
        <img src="/assets/vslogo.png" alt="" /><div><strong>Marriage</strong><span>Wedding services</span></div>
      </NavLink>
      <nav>{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to.endsWith('/dashboard')} onClick={() => setOpen(false)}><Icon size={19} /><span>{label}</span>{label === 'My Cart' && cart.length > 0 && <b>{cart.length}</b>}</NavLink>)}</nav>
      <div className="sidebar-bottom">
        {!admin && <NavLink to={vendor ? '/vendor/change-password' : '/change-password'} onClick={() => setOpen(false)}><LockKeyhole size={19} />Change Password</NavLink>}
        {!admin && <NavLink to={vendor ? '/vendor/privacy' : '/privacy'} onClick={() => setOpen(false)}><HeartHandshake size={19} />Privacy Policy</NavLink>}
        <button onClick={logout}><LogOut size={19} />Logout</button>
      </div>
    </aside>
    {open && <button className="sidebar-shade" onClick={() => setOpen(false)} />}
    <main className="main">
      <div className="mobile-bar"><button onClick={() => setOpen(true)}><Menu /></button><strong>Marriage</strong><NavLink to={profilePath}><CircleUserRound /></NavLink></div>
      <div className="top-date"><CalendarDays size={16} /><span>{currentDate}</span></div>
      <Outlet />
    </main>
    {showLoader && <div className="page-loader"><div /><span>Loading...</span></div>}
  </div>;
}
