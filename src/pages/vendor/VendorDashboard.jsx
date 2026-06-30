import {
  ArrowRight,
  Ban,
  CalendarDays,
  Edit3,
  Image as ImageIcon,
  KeyRound,
  LogOut,
  MessageCircleMore,
  PackagePlus,
  Plus,
  Server,
  ShieldCheck,
  ShoppingBag,
  Tags,
} from 'lucide-react';
import {useMemo, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {Button, Card, Field, Modal} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {extractList, productMongoId, productPublicId, todayInputValue, userIdOf} from '../../lib/dataHelpers';
import {asset} from '../../lib/demoData';

const BREAK_EVENT_LOCATION = 'I am on break221207';

const quickActions = [
  {
    to: '/vendor/products',
    icon: ShoppingBag,
    title: 'My Products',
    text: 'View and manage your service listings',
    color: '#e65472',
    soft: '#fde4ea',
  },
  {
    to: '/vendor/categories',
    icon: Tags,
    title: 'Add Category',
    text: 'Add or sync service categories',
    color: '#169c91',
    soft: '#d9f4f0',
  },
  {
    to: '/vendor/profile/edit',
    icon: Edit3,
    title: 'Edit Profile',
    text: 'Update business, address and contact info',
    color: '#7657c8',
    soft: '#ede7fc',
  },
  {
    to: '/vendor/image-server',
    icon: Server,
    title: 'Image Server Setup',
    text: 'Configure the image server and ngrok URL',
    color: '#8e3a8c',
    soft: '#f4e3f3',
  },
  {
    to: '/vendor/bookings',
    icon: Plus,
    title: 'Offline Booking',
    text: 'Create a manual customer booking',
    color: '#2777c7',
    soft: '#e0effd',
  },
  {
    to: '/vendor/bookings',
    icon: CalendarDays,
    title: 'Calendar',
    text: 'Check booking dates and customer requests',
    color: '#d05b38',
    soft: '#fbe7df',
  },
  {
    to: '/vendor/chat',
    icon: MessageCircleMore,
    title: 'Chat',
    text: 'Continue admin and customer chats',
    color: '#0e9384',
    soft: '#d9f4f0',
  },
  {
    action: 'availability',
    icon: Ban,
    title: 'Not Available',
    text: 'Block dates when you are on break',
    color: '#4b5563',
    soft: '#e5e7eb',
  },
  {
    to: '/vendor/privacy',
    icon: ShieldCheck,
    title: 'Privacy',
    text: 'Read policy, terms and booking rules',
    color: '#e4952d',
    soft: '#fff0d7',
  },
];

const userImage = user =>
  user?.profileImage ||
  user?.profilePic ||
  user?.image ||
  user?.photo ||
  user?.avatar ||
  asset('image/Wedding.jpg');

const displayName = user =>
  user?.name || user?.businessName || user?.vendorName || user?.userName || 'Vendor';

const bookingDateIso = () => {
  const today = new Date();
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())).toISOString();
};

export function VendorDashboard() {
  const {session, localProducts, localCategories, notify, logout} = useApp();
  const navigate = useNavigate();
  const user = session?.user || {};
  const vendorId = userIdOf(user);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [range, setRange] = useState({start: '', end: ''});
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => [
    {icon: ShoppingBag, label: 'Products', value: localProducts.length},
    {icon: Tags, label: 'Categories', value: localCategories.length},
    {icon: CalendarDays, label: 'Today', value: new Date().toLocaleDateString('en-IN')},
  ], [localCategories.length, localProducts.length]);

  const fetchVendorProducts = async () => {
    const response = await apiRequest(endpoints.vendorProducts, {
      method: 'POST',
      token: session.token,
      body: {userId: vendorId},
    });
    const products = extractList(response);
    return products.length ? products : localProducts;
  };

  const buildBreakProducts = products =>
    products
      .map(product => ({
        publicId: productPublicId(product),
        mongoId: productMongoId(product),
        product,
      }))
      .filter(item => item.publicId && item.mongoId)
      .map(item => ({
        productID: item.publicId,
        product: item.mongoId,
        quantity: 1,
        BookingStartDate: new Date(range.start),
        BookingEndDate: new Date(range.end),
        venderUserId: vendorId,
        eventLocation: BREAK_EVENT_LOCATION,
        distance: 0,
        travelPerKilometer: 0,
        totalTravelCharge: 0,
      }));

  const openAvailability = () => {
    setRange({start: '', end: ''});
    setAvailabilityOpen(true);
  };

  const submitAvailability = async event => {
    event.preventDefault();
    if (!vendorId) {
      notify('Vendor profile was not found. Please login again.', 'error');
      return;
    }
    if (!range.start) {
      notify('Please select start date.', 'error');
      return;
    }
    if (!range.end) {
      notify('Please select end date.', 'error');
      return;
    }
    if (new Date(range.end) < new Date(range.start)) {
      notify('End date must be after start date.', 'error');
      return;
    }

    setSaving(true);
    try {
      const products = await fetchVendorProducts();
      const breakProducts = buildBreakProducts(products);
      if (!breakProducts.length) {
        notify('No vendor products found for blocking dates.', 'error');
        return;
      }

      const body = new FormData();
      body.append('userID', vendorId);
      body.append('products', JSON.stringify(breakProducts));
      body.append('bookingDate', bookingDateIso());
      body.append('paymentMode', 'cash');
      body.append('paymentStatus', 'pending');
      body.append('bookingDetails', 'I am on break');
      body.append('coustomerName', 'break');
      body.append('coustomeraddress', 'break');
      body.append('bookingPlace', 'break');
      body.append('coustomerMobile', '0');
      body.append('coustomerMobile2', '0');
      body.append('TotalPayableAmount', '0');
      body.append('TotalPaidAmount', '0');
      body.append('TranjectionId', 'break');

      const response = await apiRequest(endpoints.createBooking, {
        method: 'POST',
        token: session.token,
        body,
      });
      notify(response?.message || 'Not available dates saved.');
      setAvailabilityOpen(false);
    } catch (error) {
      notify(error.message || 'Unable to save not available dates.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', {replace: true});
  };

  const renderAction = item => {
    const Icon = item.icon;
    const content = (
      <>
        <span className="vendor-mobile-card-icon" style={{background: item.soft, color: item.color}}>
          <Icon size={24} />
        </span>
        <span>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </span>
        <ArrowRight className="vendor-mobile-card-arrow" size={20} />
      </>
    );

    if (item.action === 'availability') {
      return (
        <button
          key={item.title}
          type="button"
          className="vendor-mobile-card"
          style={{background: item.color}}
          onClick={openAvailability}
        >
          {content}
        </button>
      );
    }

    return (
      <Link key={item.title} className="vendor-mobile-card" style={{background: item.color}} to={item.to}>
        {content}
      </Link>
    );
  };

  return (
    <div className="page vendor-dashboard-page">
      <section className="vendor-mobile-hero">
        <div className="vendor-hero-top">
          <div className="vendor-profile-row">
            <span className="vendor-avatar-ring"><img src={userImage(user)} alt={displayName(user)} /></span>
            <div>
              <span className="eyebrow light">Vendor dashboard</span>
              <h1>{displayName(user)}</h1>
              <p>{user?.address || user?.email || 'Manage your wedding services from one place.'}</p>
            </div>
          </div>
          <Link className="vendor-profile-edit" to="/vendor/profile/edit">
            <Edit3 size={18} />
            Edit Profile
          </Link>
        </div>

        <Link className="vendor-primary-card" to="/vendor/products/new">
          <span><PackagePlus size={30} /></span>
          <div>
            <h2>Add a new product</h2>
            <p>Create a product with images, video, price, dates and booking details.</p>
          </div>
          <ArrowRight size={24} />
        </Link>
      </section>

      <div className="stat-grid">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <Icon />
              <div><strong>{stat.value}</strong><span>{stat.label}</span></div>
            </Card>
          );
        })}
      </div>

      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Vendor tools</span>
            <h2>Quick actions</h2>
          </div>
          <span>Same flow as mobile app</span>
        </div>
        <div className="vendor-mobile-grid">{quickActions.map(renderAction)}</div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Account</span>
            <h2>Utilities</h2>
          </div>
        </div>
        <div className="vendor-account-actions">
          <Link to="/vendor/change-password"><KeyRound size={20} />Change Password</Link>
          <button type="button" onClick={handleLogout}><LogOut size={20} />Logout</button>
        </div>
      </section>

      {availabilityOpen && (
        <Modal title="Not Available" onClose={() => setAvailabilityOpen(false)}>
          <form className="vendor-availability-form" onSubmit={submitAvailability}>
            <p className="modal-copy">
              Select the date range you want to block. The system creates a break booking for all your products.
            </p>
            <div className="form-grid">
              <Field
                label="Start date"
                type="date"
                min={todayInputValue()}
                value={range.start}
                onChange={event => setRange(value => ({...value, start: event.target.value}))}
              />
              <Field
                label="End date"
                type="date"
                min={range.start || todayInputValue()}
                value={range.end}
                onChange={event => setRange(value => ({...value, end: event.target.value}))}
              />
            </div>
            <Card className="vendor-availability-summary">
              <ImageIcon size={22} />
              <div>
                <strong>{localProducts.length} products will be blocked</strong>
                <span>Payment mode cash, payable amount Rs. 0, paid amount Rs. 0</span>
              </div>
            </Card>
            <div className="modal-actions">
              <Button type="button" variant="ghost" onClick={() => setAvailabilityOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Not Available'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
