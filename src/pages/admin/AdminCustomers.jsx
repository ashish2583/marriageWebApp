import {MessageCircleMore, RefreshCw, Search, ShieldCheck, ShieldOff, UserRound} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Button, Card, Empty, Field, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {asset} from '../../lib/demoData';
import {extractList, getId, getName, getStatus} from '../../lib/dataHelpers';

const PAGE_SIZE = 20;
const filters = ['All', 'Active', 'Inactive'];

const valueOrDash = value => value === undefined || value === null || value === '' ? 'Not available' : String(value);
const imageOf = customer => customer?.profileImage || customer?.image || customer?.customerImage || customer?.photo || customer?.avatar || asset('image/zz.jpg');
const mobileOf = customer => valueOrDash(customer?.mobile || customer?.phone || customer?.contact || customer?.number || customer?.coustomerMobile);
const emailOf = customer => valueOrDash(customer?.email || customer?.mail || customer?.coustomerEmail);
const addressOf = customer => valueOrDash(customer?.address || customer?.customerAddress || customer?.coustomerAddress || customer?.city || customer?.location);
const activeOf = customer => {
  const status = String(getStatus(customer) || '').toLowerCase();
  return status.includes('active') && !status.includes('inactive');
};
const statusClass = status => {
  const value = String(status || '').toLowerCase();
  if (value.includes('active') && !value.includes('inactive')) return 'active';
  if (value.includes('inactive')) return 'inactive';
  return value.includes('pending') ? 'pending' : 'neutral';
};

function CustomerDetails({customer, onClose}) {
  const rows = [
    ['Customer ID', valueOrDash(getId(customer)), true],
    ['User ID', valueOrDash(customer?.userId || customer?.userID)],
    ['Orders', valueOrDash(customer?.totalOrders || customer?.ordersCount || customer?.orders || 0)],
    ['Mobile', mobileOf(customer)],
    ['Email', emailOf(customer), true],
    ['Address', addressOf(customer), true],
    ['Created At', valueOrDash(customer?.createdAt || customer?.created_at), true],
  ];
  return (
    <div className="admin-manage-detail-card">
      <header>
        <img src={imageOf(customer)} alt="" />
        <div><strong>{getName(customer)}</strong><span>{mobileOf(customer)}</span><em className={`admin-vendor-status ${statusClass(getStatus(customer))}`}>{getStatus(customer)}</em></div>
      </header>
      <div className="admin-manage-detail-grid">
        {rows.map(([label, value, wide]) => <span className={wide ? 'wide' : ''} key={label}><small>{label}</small>{value}</span>)}
      </div>
      <Button type="button" variant="ghost" onClick={onClose}>Close Profile</Button>
    </div>
  );
}

export function AdminCustomers() {
  const {session, notify} = useApp();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const endpointFor = status => status === 'Active' ? endpoints.adminActiveCustomers : status === 'Inactive' ? endpoints.adminInactiveCustomers : endpoints.adminCustomers;

  const fetchCustomers = async (nextPage = 1, append = false, nextStatus = statusFilter) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const query = new URLSearchParams({page: String(nextPage), limit: String(PAGE_SIZE), search});
      const response = await apiRequest(`${endpointFor(nextStatus)}?${query.toString()}`, {token: session.token});
      const nextCustomers = extractList(response);
      setCustomers(current => append ? [...current, ...nextCustomers] : nextCustomers);
      setPage(nextPage);
      setHasMore(nextCustomers.length === PAGE_SIZE);
    } catch (error) {
      notify(error.message || 'Customers not found', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const updateCustomerStatus = async (customer, active) => {
    const customerId = getId(customer);
    if (!customerId) return notify('Customer id not found', 'error');
    const body = {active, isActive: active, status: active ? 'Active' : 'Inactive'};
    setLoading(true);
    try {
      let response;
      try {
        response = await apiRequest(`${endpoints.adminCustomers}/${customerId}/status`, {method: 'PATCH', token: session.token, body});
      } catch {
        response = await apiRequest(`${endpoints.adminCustomers}/${customerId}/status`, {method: 'PUT', token: session.token, body});
      }
      notify(response?.message || 'Customer status updated');
      setSelectedCustomer(null);
      await fetchCustomers(1, false, statusFilter);
    } catch (error) {
      notify(error.message || 'Customer status not updated', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCustomerChat = customer => {
    const customerId = getId(customer);
    if (!customerId) return notify('Customer id not found', 'error');
    navigate('/admin/chat', {state: {startChat: {targetId: String(customerId), targetName: getName(customer), targetRole: 'customer', targetImage: customer?.profileImage || '', type: 'customer_admin', title: getName(customer)}}});
  };

  const counts = useMemo(() => ({total: customers.length, active: customers.filter(activeOf).length, inactive: customers.filter(item => !activeOf(item)).length}), [customers]);

  return (
    <div className="page admin-manage-page">
      <PageHeader eyebrow="Demand" title="Customers" text="Customer directory and order counts." actions={<Button variant="soft" disabled={loading} onClick={() => fetchCustomers(1, false, statusFilter)}><RefreshCw size={17} />Refresh</Button>} />
      <Card className="admin-manage-filter">
        <div className="admin-manage-summary"><span><strong>{counts.total}</strong><small>Total</small></span><span><strong>{counts.active}</strong><small>Active</small></span><span><strong>{counts.inactive}</strong><small>Inactive</small></span></div>
        <form onSubmit={event => {event.preventDefault(); fetchCustomers(1, false, statusFilter);}}><Field label="Search customers" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search customers" /><Button disabled={loading}><Search size={17} />Search</Button></form>
      </Card>
      <Card className="admin-status-filter-card"><h2>Filter by Status</h2><div className="admin-status-filter-row">{filters.map(filter => <button type="button" className={statusFilter === filter ? 'active' : ''} key={filter} onClick={() => {setStatusFilter(filter); fetchCustomers(1, false, filter);}}>{filter}</button>)}</div></Card>
      <Card className="admin-manage-section">
        <div className="admin-section-title"><div><span className="eyebrow">Customer List</span><h2>Customers</h2></div><UserRound /></div>
        <div className="admin-manage-list">
          {customers.map(customer => {
            const customerId = getId(customer);
            const selectedId = getId(selectedCustomer);
            const selected = selectedId && customerId && selectedId === customerId;
            const active = activeOf(customer);
            return (
              <article className="admin-manage-row" key={customerId || mobileOf(customer)}>
                <div className="admin-manage-main"><img src={imageOf(customer)} alt="" /><div><strong>{getName(customer)}</strong><span>{mobileOf(customer)} | {addressOf(customer)}</span><small>Total Orders: {customer?.totalOrders || customer?.ordersCount || customer?.orders || 0}</small><em className={`admin-vendor-status ${statusClass(getStatus(customer))}`}>{getStatus(customer)}</em></div></div>
                <div className="admin-manage-actions">
                  <button type="button" className="neutral" onClick={() => setSelectedCustomer(selected ? null : customer)}>View Profile</button>
                  <button type="button" className="neutral" onClick={() => openCustomerChat(customer)}><MessageCircleMore size={15} />Chat</button>
                  {active ? <button type="button" className="danger" onClick={() => updateCustomerStatus(customer, false)}><ShieldOff size={15} />Deactivate</button> : <button type="button" onClick={() => updateCustomerStatus(customer, true)}><ShieldCheck size={15} />Activate</button>}
                </div>
                {selected && <CustomerDetails customer={customer} onClose={() => setSelectedCustomer(null)} />}
              </article>
            );
          })}
        </div>
        {loadingMore && <div className="loading"><RefreshCw size={24} /><span>Loading more customers...</span></div>}
        {!loading && !customers.length && <Empty title="No customers found" text="Customer records from the admin API will appear here." />}
      </Card>
      {hasMore && <div className="admin-load-more"><Button variant="soft" disabled={loadingMore} onClick={() => fetchCustomers(page + 1, true, statusFilter)}>{loadingMore ? 'Loading...' : 'Load More'}</Button></div>}
    </div>
  );
}
