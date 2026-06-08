import {CalendarDays, CircleUserRound, HeartHandshake, Home, LayoutDashboard, LockKeyhole, LogOut, Menu, MessageCircleMore, PackagePlus, ShoppingBag, ShoppingCart, Tags, X} from 'lucide-react';
import {useState} from 'react';
import {NavLink, Outlet} from 'react-router-dom';
import {useApp} from '../lib/AppContext';

const customerLinks = [
  ['/', 'Discover', Home],
  ['/cart', 'My Cart', ShoppingCart],
  ['/orders', 'My Orders', ShoppingBag],
  ['/support', 'Support', MessageCircleMore],
  ['/profile', 'Profile', CircleUserRound],
];

const vendorLinks = [
  ['/vendor', 'Dashboard', LayoutDashboard],
  ['/vendor/products', 'Products', ShoppingBag],
  ['/vendor/products/new', 'Add Product', PackagePlus],
  ['/vendor/categories', 'Categories', Tags],
  ['/vendor/bookings', 'Bookings', CalendarDays],
  ['/vendor/profile', 'Profile', CircleUserRound],
];

export default function AppShell() {
  const {session, logout, cart, toast} = useApp();
  const [open, setOpen] = useState(false);
  const vendor = session?.user?.role === 'vendor';
  const links = vendor ? vendorLinks : customerLinks;
  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <button className="sidebar-close" onClick={() => setOpen(false)}><X /></button>
      <NavLink to={vendor ? '/vendor' : '/'} className="brand" onClick={() => setOpen(false)}>
        <img src="/assets/vslogo.png" alt="" /><div><strong>Merrage</strong><span>Wedding services</span></div>
      </NavLink>
      <nav>{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/' || to === '/vendor'} onClick={() => setOpen(false)}><Icon size={19} /><span>{label}</span>{label === 'My Cart' && cart.length > 0 && <b>{cart.length}</b>}</NavLink>)}</nav>
      <div className="sidebar-bottom">
        <NavLink to={vendor ? '/vendor/change-password' : '/change-password'} onClick={() => setOpen(false)}><LockKeyhole size={19} />Change Password</NavLink>
        <NavLink to={vendor ? '/vendor/privacy' : '/privacy'} onClick={() => setOpen(false)}><HeartHandshake size={19} />Privacy Policy</NavLink>
        <button onClick={logout}><LogOut size={19} />Logout</button>
      </div>
    </aside>
    {open && <button className="sidebar-shade" onClick={() => setOpen(false)} />}
    <main className="main">
      <div className="mobile-bar"><button onClick={() => setOpen(true)}><Menu /></button><strong>Merrage</strong><NavLink to={vendor ? '/vendor/profile' : '/profile'}><CircleUserRound /></NavLink></div>
      <Outlet />
    </main>
    {toast && <div className={`toast toast-${toast.tone}`}>{toast.message}</div>}
  </div>;
}
