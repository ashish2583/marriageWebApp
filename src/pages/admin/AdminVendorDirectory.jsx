import {MessageCircleMore, RefreshCw, Search, ShieldCheck, ShieldOff, UserRound} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Button, Card, Empty, Field, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {asset} from '../../lib/demoData';
import {extractList, getId, getName, getStatus} from '../../lib/dataHelpers';

const PAGE_SIZE = 20;

const valueOrDash = value =>
  value === undefined || value === null || value === '' ? 'Not available' : String(value);

const vendorImage = vendor =>
  vendor?.profileImage || vendor?.image || vendor?.vendorImage || vendor?.photo || vendor?.avatar || asset('image/zz.jpg');

const businessName = vendor =>
  valueOrDash(vendor?.businessName || vendor?.business || vendor?.companyName || vendor?.shopName);

const mobileOf = vendor => valueOrDash(vendor?.mobile || vendor?.phone || vendor?.contact || vendor?.number);
const emailOf = vendor => valueOrDash(vendor?.email || vendor?.mail);
const addressOf = vendor =>
  valueOrDash(vendor?.address || vendor?.businessAddress || vendor?.vendorAddress || vendor?.city || vendor?.location);
const categoryOf = vendor =>
  valueOrDash(vendor?.catName || vendor?.categoryName || vendor?.category || vendor?.catId?.catName || vendor?.catId);

const statusClass = status => {
  const value = String(status || '').toLowerCase();
  if (value.includes('active') && !value.includes('inactive')) return 'active';
  if (value.includes('inactive')) return 'inactive';
  return value.includes('pending') ? 'pending' : 'neutral';
};

const isActiveVendor = vendor => {
  const status = String(getStatus(vendor) || '').toLowerCase();
  return status.includes('active') && !status.includes('inactive');
};

function VendorDetails({vendor, onClose}) {
  if (!vendor) return null;
  const detailItems = [
    ['Vendor ID', valueOrDash(getId(vendor)), true],
    ['User ID', valueOrDash(vendor?.userId || vendor?.userID)],
    ['Mobile', mobileOf(vendor)],
    ['Email', emailOf(vendor), true],
    ['Category', categoryOf(vendor)],
    ['Orders', valueOrDash(vendor?.totalOrders || vendor?.ordersCount || vendor?.orders || 0)],
    ['Address', addressOf(vendor), true],
    ['Created At', valueOrDash(vendor?.createdAt || vendor?.created_at), true],
  ];

  return (
    <div className="admin-vendor-detail-card">
      <header>
        <img src={vendorImage(vendor)} alt="" />
        <div>
          <strong>{getName(vendor)}</strong>
          <span>{businessName(vendor)}</span>
          <em className={`admin-vendor-status ${statusClass(getStatus(vendor))}`}>{getStatus(vendor)}</em>
        </div>
      </header>
      <div className="admin-vendor-detail-grid">
        {detailItems.map(([label, value, wide]) => (
          <span className={wide ? 'wide' : ''} key={label}>
            <small>{label}</small>
            {value}
          </span>
        ))}
      </div>
      <Button type="button" variant="ghost" onClick={onClose}>Close Details</Button>
    </div>
  );
}

export function AdminVendorDirectory({mode = 'all'}) {
  const {session, notify} = useApp();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const config = useMemo(() => {
    if (mode === 'active') {
      return {
        endpoint: endpoints.adminActiveVendors,
        title: 'Active Vendors',
        subtitle: 'Currently approved and active vendors.',
        section: 'Active Vendor List',
        searchPlaceholder: 'Search active vendors',
        empty: 'No active vendors',
      };
    }
    if (mode === 'inactive') {
      return {
        endpoint: endpoints.adminInactiveVendors,
        title: 'Inactive Vendors',
        subtitle: 'Vendors that need admin review or activation.',
        section: 'Inactive Vendor List',
        searchPlaceholder: 'Search inactive vendors',
        empty: 'No inactive vendors',
      };
    }
    return {
      endpoint: endpoints.adminVendors,
      title: 'Vendors',
      subtitle: 'Activate, deactivate, chat with, and view vendors.',
      section: 'Vendor Directory',
      searchPlaceholder: 'Search vendors',
      empty: 'No vendors found',
    };
  }, [mode]);

  const fetchVendors = async (nextPage = 1, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const query = new URLSearchParams({page: String(nextPage), limit: String(PAGE_SIZE), search});
      const response = await apiRequest(`${config.endpoint}?${query.toString()}`, {token: session.token});
      const nextVendors = extractList(response);
      setVendors(current => append ? [...current, ...nextVendors] : nextVendors);
      setPage(nextPage);
      setHasMore(nextVendors.length === PAGE_SIZE);
    } catch (error) {
      notify(error.message || `${config.title} not found`, 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token, config.endpoint]);

  const updateVendorStatus = async (vendor, active) => {
    const vendorId = getId(vendor);
    if (!vendorId) {
      notify('Vendor id not found', 'error');
      return;
    }
    setLoading(true);
    try {
      const response = await apiRequest(`${endpoints.adminVendors}/${vendorId}/status`, {
        method: 'PATCH',
        token: session.token,
        body: {active},
      });
      notify(response?.message || (active ? 'Vendor activated' : 'Vendor deactivated'));
      setSelectedVendor(null);
      await fetchVendors(1, false);
    } catch (error) {
      notify(error.message || 'Vendor status not updated', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openVendorChat = vendor => {
    const vendorId = getId(vendor);
    if (!vendorId) {
      notify('Vendor id not found', 'error');
      return;
    }
    navigate('/admin/chat', {
      state: {
        startChat: {
          targetId: String(vendorId),
          targetName: getName(vendor),
          targetRole: 'vendor',
          targetImage: vendor?.profileImage || '',
          type: 'admin_vendor',
          title: getName(vendor),
        },
      },
    });
  };

  const counts = useMemo(() => ({
    total: vendors.length,
    active: vendors.filter(isActiveVendor).length,
    inactive: vendors.filter(vendor => !isActiveVendor(vendor)).length,
  }), [vendors]);

  return (
    <div className="page admin-vendors-page">
      <PageHeader
        eyebrow="Supply"
        title={config.title}
        text={config.subtitle}
        actions={<Button variant="soft" disabled={loading} onClick={() => fetchVendors(1, false)}><RefreshCw size={17} />Refresh</Button>}
      />

      <Card className="admin-vendors-filter">
        <div className="admin-vendors-summary">
          <span><strong>{counts.total}</strong><small>Total</small></span>
          <span><strong>{counts.active}</strong><small>Active</small></span>
          <span><strong>{counts.inactive}</strong><small>Inactive</small></span>
        </div>
        <form onSubmit={event => {event.preventDefault(); fetchVendors(1, false);}}>
          <Field label={config.searchPlaceholder} value={search} onChange={event => setSearch(event.target.value)} placeholder={config.searchPlaceholder} />
          <Button disabled={loading}><Search size={17} />Search</Button>
        </form>
      </Card>

      <Card className="admin-vendor-section">
        <div className="admin-section-title">
          <div><span className="eyebrow">{config.section}</span><h2>{config.title}</h2></div>
          <UserRound />
        </div>
        <div className="admin-vendor-list">
          {vendors.map(vendor => {
            const vendorId = getId(vendor);
            const selectedVendorId = getId(selectedVendor);
            const selected = selectedVendorId && vendorId && selectedVendorId === vendorId;
            const active = isActiveVendor(vendor);
            return (
              <article className="admin-vendor-row" key={vendorId || mobileOf(vendor)}>
                <div className="admin-vendor-main">
                  <img src={vendorImage(vendor)} alt="" />
                  <div>
                    <strong>{getName(vendor)}</strong>
                    <span>{businessName(vendor)} | {mobileOf(vendor)}</span>
                    <em className={`admin-vendor-status ${statusClass(getStatus(vendor))}`}>{getStatus(vendor)}</em>
                  </div>
                </div>
                <div className="admin-vendor-actions">
                  <button type="button" className="neutral" onClick={() => setSelectedVendor(selected ? null : vendor)}>
                    {mode === 'all' ? 'View Details' : 'View Profile'}
                  </button>
                  {mode === 'all' && <button type="button" className="neutral" onClick={() => openVendorChat(vendor)}><MessageCircleMore size={15} />Chat</button>}
                  {active ? (
                    <button type="button" className="danger" onClick={() => updateVendorStatus(vendor, false)}><ShieldOff size={15} />Deactivate Vendor</button>
                  ) : (
                    <button type="button" onClick={() => updateVendorStatus(vendor, true)}><ShieldCheck size={15} />Activate Vendor</button>
                  )}
                </div>
                {selected && <VendorDetails vendor={vendor} onClose={() => setSelectedVendor(null)} />}
              </article>
            );
          })}
        </div>
        {loadingMore && <div className="loading"><RefreshCw size={24} /><span>Loading more vendors...</span></div>}
        {!loading && !vendors.length && <Empty title={config.empty} text="Vendor records from the admin API will appear here." />}
      </Card>

      {hasMore && <div className="admin-load-more"><Button variant="soft" disabled={loadingMore} onClick={() => fetchVendors(page + 1, true)}>{loadingMore ? 'Loading...' : 'Load More'}</Button></div>}
    </div>
  );
}
