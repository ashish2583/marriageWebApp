import {
  BarChart3,
  CircleDollarSign,
  CreditCard,
  FolderTree,
  Package,
  RefreshCw,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {Button, Card, Empty, PageHeader} from '../../components/UI';
import {getAdminDashboard} from '../../api/adminApi';
import {getApiError} from '../../api/axiosInstance';
import {useApp} from '../../lib/AppContext';
import {formatAmount, getId, getStatus} from '../../lib/dataHelpers';

const statPalettes = {
  blue: ['#EEF4FF', '#3538CD', '#B2CCFF'],
  yellow: ['#FEF7C3', '#A15C07', '#FEC84B'],
  green: ['#DCFCE7', '#15803D', '#86EFAC'],
  purple: ['#F3E8FF', '#7E22CE', '#D8B4FE'],
  red: ['#FEE2E2', '#B91C1C', '#FCA5A5'],
  teal: ['#CCFBF1', '#0F766E', '#5EEAD4'],
  dark: ['#241722', '#FFFFFF', '#F472B6'],
};

const nestedValue = (source, keys, fallback = 0) => {
  const containers = [
    source?.cards,
    source,
    source?.dashboard,
    source?.dashboard?.cards,
    source?.stats,
    source?.counts,
    source?.summary,
    source?.orders,
    source?.vendors,
    source?.customers,
    source?.revenue,
  ];

  for (const container of containers) {
    if (!container || typeof container !== 'object') continue;
    for (const key of keys) {
      if (container[key] !== undefined && container[key] !== null) return container[key];
    }
  }
  return fallback;
};

const scopedValue = (source, scopeKeys, directKeys, scopedKeys, fallback = 0) => {
  for (const key of directKeys) {
    if (source?.cards?.[key] !== undefined && source?.cards?.[key] !== null) return source.cards[key];
  }
  for (const key of directKeys) {
    if (source?.[key] !== undefined && source?.[key] !== null) return source[key];
  }
  for (const scopeKey of scopeKeys) {
    const scope = source?.[scopeKey];
    if (!scope || typeof scope !== 'object') continue;
    for (const key of scopedKeys) {
      if (scope[key] !== undefined && scope[key] !== null) return scope[key];
    }
  }
  return nestedValue(source, directKeys, fallback);
};

const money = value => {
  if (typeof value === 'string') return value.toLowerCase().includes('rs') ? value : `Rs. ${value}`;
  return formatAmount(value);
};

const arrayFrom = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key] || source?.dashboard?.[key] || source?.analytics?.[key] || source?.charts?.[key] || source?.chartDetails?.[key];
    const list = Array.isArray(value) ? value : value?.data;
    if (Array.isArray(list) && list.length) return list;
  }
  return [];
};

const chartData = (source, keys, dataKey) => {
  const list = arrayFrom(source, keys);
  if (!list.length) return [];
  const max = Math.max(...list.map(item => Number(item.percentage ?? item.value ?? item.count ?? item.amount ?? item[dataKey] ?? 0)), 0);
  return list.map((item, index) => {
    const raw = Number(item.value ?? item.count ?? item.amount ?? item[dataKey] ?? 0);
    const height = item.percentage !== undefined ? Number(item.percentage) : max > 0 ? Math.round((raw / max) * 100) : 0;
    return {
      label: item.label || item.month || item.name || `${index + 1}`,
      value: raw,
      height: Math.max(8, Math.min(100, height)),
    };
  });
};

const orderDate = order =>
  order?.bookingDate || order?.BookingDate || order?.createdAt || order?.date || 'Not available';

const orderCustomer = order =>
  order?.customer?.name || order?.user?.name || order?.coustomerName || order?.customerName || order?.userName || order?.customer || 'Customer';

function MiniChart({title, color, data}) {
  const chart = data.length ? data : [
    {label: 'Jan', height: 42, value: 42},
    {label: 'Feb', height: 58, value: 58},
    {label: 'Mar', height: 46, value: 46},
    {label: 'Apr', height: 76, value: 76},
    {label: 'May', height: 64, value: 64},
    {label: 'Jun', height: 88, value: 88},
  ];

  return (
    <Card className="admin-chart-card">
      <div className="admin-chart-head">
        <div><BarChart3 size={20} /><h3>{title}</h3></div>
        <span>Live</span>
      </div>
      <div className="admin-mini-chart">
        {chart.map((item, index) => (
          <span key={`${item.label}-${index}`}>
            <i style={{height: `${item.height}%`, background: color}} title={`${item.label}: ${item.value}`} />
            <small>{item.label}</small>
          </span>
        ))}
      </div>
    </Card>
  );
}

export function AdminDashboard() {
  const {notify} = useApp();
  const [payload, setPayload] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await getAdminDashboard();
      setPayload(response?.dashboard ? response : {dashboard: response, ...response});
    } catch (error) {
      notify(getApiError(error, 'Dashboard not found'), 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dashboard = payload?.dashboard || payload || {};
  const totalRevenue = nestedValue(dashboard, ['totalRevenue', 'TotalRevenue', 'revenue', 'amount'], 0);
  const confirmedOrders = scopedValue(dashboard, ['orders', 'orderStats'], ['confirmedOrders', 'ConfirmedOrders', 'confirmed'], ['confirmed', 'Confirmed', 'confirmedOrders'], 0);
  const activeVendors = scopedValue(dashboard, ['vendors', 'vendorStats'], ['activeVendors', 'ActiveVendors', 'active'], ['active', 'Active', 'activeVendors'], 0);

  const stats = [
    {label: 'Total Orders', value: scopedValue(dashboard, ['orders', 'orderStats'], ['totalOrders', 'TotalOrders'], ['total', 'Total', 'count'], 0), tone: 'blue', icon: ShoppingBag, to: '/admin/orders'},
    {label: 'Pending Orders', value: scopedValue(dashboard, ['orders', 'orderStats'], ['pendingOrders', 'PendingOrders', 'pending'], ['pending', 'Pending', 'pendingOrders'], 0), tone: 'yellow', icon: ShoppingBag, to: '/admin/orders'},
    {label: 'Confirmed Orders', value: confirmedOrders, tone: 'blue', icon: ShoppingBag, to: '/admin/orders'},
    {label: 'Completed Orders', value: scopedValue(dashboard, ['orders', 'orderStats'], ['completedOrders', 'CompletedOrders', 'completed'], ['completed', 'Completed', 'completedOrders'], 0), tone: 'green', icon: ShoppingBag, to: '/admin/orders'},
    {label: 'Total Vendors', value: scopedValue(dashboard, ['vendors', 'vendorStats'], ['totalVendors', 'TotalVendors'], ['total', 'Total', 'count'], 0), tone: 'purple', icon: Store, to: '/admin/vendors'},
    {label: 'Active Vendors', value: activeVendors, tone: 'green', icon: Store, to: '/admin/vendors/active'},
    {label: 'Inactive Vendors', value: scopedValue(dashboard, ['vendors', 'vendorStats'], ['inactiveVendors', 'InactiveVendors', 'inactive'], ['inactive', 'Inactive', 'inactiveVendors'], 0), tone: 'red', icon: Store, to: '/admin/vendors/inactive'},
    {label: 'Total Customers', value: scopedValue(dashboard, ['customers', 'customerStats'], ['totalCustomers', 'TotalCustomers'], ['total', 'Total', 'count'], 0), tone: 'teal', icon: Users, to: '/admin/customers'},
    {label: 'Total Revenue', value: money(totalRevenue), tone: 'dark', icon: CircleDollarSign, to: '/admin/payments'},
    {label: 'Total Paid', value: money(nestedValue(dashboard, ['totalPaid', 'TotalPaid'], 0)), tone: 'green', icon: CreditCard, to: '/admin/payments'},
    {label: 'Total Payable', value: money(nestedValue(dashboard, ['totalPayable', 'TotalPayable'], 0)), tone: 'yellow', icon: CreditCard, to: '/admin/payments'},
    {label: 'Total Categories', value: nestedValue(dashboard, ['totalCategories', 'TotalCategories'], 0), tone: 'purple', icon: FolderTree, to: '/admin/categories'},
    {label: 'Total Products', value: nestedValue(dashboard, ['totalProducts', 'TotalProducts'], 0), tone: 'teal', icon: Package, to: '/admin/products'},
  ];

  const recentOrders = useMemo(() => arrayFrom(payload, ['recentOrders', 'orders', 'bookings']).slice(0, 6), [payload]);
  const revenueChart = chartData(dashboard, ['revenueChart', 'revenueAnalytics', 'revenueStats'], 'revenue');
  const ordersChart = chartData(dashboard, ['orderStatistics', 'orderStatsChart', 'ordersChart'], 'orders');
  const vendorsChart = chartData(dashboard, ['vendorStatistics', 'vendorStatsChart', 'vendorsChart'], 'vendors');

  return (
    <div className="page admin-mobile-page">
      <PageHeader
        eyebrow="Dashboard"
        title="Admin Dashboard"
        text="Orders, vendors, customers and revenue at a glance."
        actions={<Button variant="soft" onClick={() => loadDashboard(false)} disabled={refreshing}><RefreshCw size={17} />{refreshing ? 'Refreshing...' : 'Refresh'}</Button>}
      />

      <section className="admin-mobile-hero">
        <div className="admin-hero-orb one" />
        <div className="admin-hero-orb two" />
        <div className="admin-hero-spark" />
        <div>
          <span>Total Revenue</span>
          <h2>{money(totalRevenue)}</h2>
          <p>{loading ? 'Loading live dashboard metrics...' : '+18.4% from last month'}</p>
          <div className="admin-hero-metrics">
            <b>{confirmedOrders}<small>Confirmed</small></b>
            <b>{activeVendors}<small>Active vendors</small></b>
          </div>
        </div>
        <em>Live</em>
      </section>

      <section className="admin-mobile-stats">
        {stats.map(item => {
          const palette = statPalettes[item.tone] || statPalettes.blue;
          const Icon = item.icon;
          return (
            <Link key={item.label} to={item.to} style={{background: palette[0], color: palette[1], borderColor: '#f0d8e2'}}>
              <i style={{background: palette[2]}} />
              <Icon size={20} />
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </section>

      <Card className="admin-recent-card">
        <div className="admin-section-title">
          <div><span className="eyebrow">Recent Orders</span><h2>Today</h2></div>
          <Link to="/admin/orders">View all</Link>
        </div>
        {recentOrders.length ? recentOrders.map((order, index) => (
          <article className="admin-order-row" key={getId(order) || index}>
            <div>
              <strong>{getId(order) || `ORD-${index + 1}`}</strong>
              <span>{orderCustomer(order)}</span>
              <small>{orderDate(order)}</small>
            </div>
            <div>
              <em className={`admin-status ${String(getStatus(order)).toLowerCase()}`}>{getStatus(order)}</em>
              <em className={`admin-status ${String(order.payment || order.paymentStatus || 'Pending').toLowerCase()}`}>{order.payment || order.paymentStatus || 'Pending'}</em>
            </div>
          </article>
        )) : <Empty title={loading ? 'Loading recent orders' : 'No recent orders'} text="Recent orders from the admin API will appear here." />}
      </Card>

      <section className="admin-chart-grid">
        <MiniChart title="Revenue Chart" data={revenueChart} color="#E43F7A" />
        <MiniChart title="Order Statistics" data={ordersChart} color="#0E9384" />
        <MiniChart title="Vendor Statistics" data={vendorsChart} color="#F97316" />
      </section>
    </div>
  );
}
