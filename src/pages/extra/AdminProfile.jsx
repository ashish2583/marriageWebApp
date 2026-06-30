import {
  BarChart3,
  CreditCard,
  FolderTree,
  LogOut,
  MessageCircleMore,
  Package,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react';
import {Link, useNavigate} from 'react-router-dom';
import {Card, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {asset} from '../../lib/demoData';

const menuItems = [
  {
    title: 'Orders',
    subtitle: 'View all customer bookings',
    to: '/admin/orders',
    icon: ShoppingBag,
    color: '#EEF4FF',
    text: '#3538CD',
  },
  {
    title: 'Vendors',
    subtitle: 'Manage active and inactive vendors',
    to: '/admin/vendors',
    icon: Store,
    color: '#DCFCE7',
    text: '#15803D',
  },
  {
    title: 'Inactive Vendors',
    subtitle: 'Review vendors waiting for activation',
    to: '/admin/vendors/inactive',
    icon: ShieldAlert,
    color: '#FEE2E2',
    text: '#B91C1C',
  },
  {
    title: 'Active Vendors',
    subtitle: 'Approved vendors currently live',
    to: '/admin/vendors/active',
    icon: Store,
    color: '#DCFCE7',
    text: '#15803D',
  },
  {
    title: 'Customers',
    subtitle: 'Customer directory and order counts',
    to: '/admin/customers',
    icon: Users,
    color: '#CCFBF1',
    text: '#0F766E',
  },
  {
    title: 'Categories',
    subtitle: 'Add, edit and delete categories',
    to: '/admin/categories',
    icon: FolderTree,
    color: '#FEF7C3',
    text: '#A15C07',
  },
  {
    title: 'Products',
    subtitle: 'Review vendor products and inventory',
    to: '/admin/products',
    icon: Package,
    color: '#F3E8FF',
    text: '#7E22CE',
  },
  {
    title: 'Payments',
    subtitle: 'Payment mode and status reports',
    to: '/admin/payments',
    icon: CreditCard,
    color: '#FFE4E8',
    text: '#BE123C',
  },
  {
    title: 'Queries',
    subtitle: 'Customer support requests and contact details',
    to: '/admin/queries',
    icon: MessageCircleMore,
    color: '#EDE9FE',
    text: '#6D28D9',
  },
  {
    title: 'Settings',
    subtitle: 'Password, notifications and theme',
    to: '/admin/settings',
    icon: Settings,
    color: '#E0F2FE',
    text: '#0369A1',
  },
];

const adminImage = user =>
  user?.profileImage || user?.profilePic || user?.image || user?.photo || asset('image/zz.jpg');

const adminName = user =>
  user?.name || user?.fullName || user?.businessName || 'VS Group Admin';

export default function AdminProfile() {
  const {session, logout} = useApp();
  const navigate = useNavigate();
  const user = session?.user || {};

  const signOut = () => {
    logout();
    navigate('/login', {replace: true});
  };

  return (
    <div className="page admin-profile-page">
      <PageHeader eyebrow="Profile" title="Admin Profile" text="Admin controls and navigation from the mobile profile stack." />

      <section className="admin-profile-hero">
        <div className="admin-profile-orb one" />
        <div className="admin-profile-orb two" />
        <img src={adminImage(user)} alt={adminName(user)} />
        <div>
          <h2>{adminName(user)}</h2>
          <p>{user?.email || user?.phone || 'Admin account'}</p>
        </div>
        <span>ADMIN</span>
      </section>

      <Card className="admin-menu-card">
        <div className="admin-section-title">
          <div><span className="eyebrow">Admin Menu</span><h2>Controls</h2></div>
          <BarChart3 />
        </div>
        <div className="admin-menu-list">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <Link to={item.to} key={item.title} className="admin-menu-row">
                <span style={{background: item.color, color: item.text}}><Icon size={20} /></span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </div>
                <b>›</b>
              </Link>
            );
          })}
          <button type="button" className="admin-menu-row admin-logout-row" onClick={signOut}>
            <span><LogOut size={20} /></span>
            <div>
              <strong>Logout</strong>
              <small>Sign out from admin panel</small>
            </div>
          </button>
        </div>
      </Card>
    </div>
  );
}
