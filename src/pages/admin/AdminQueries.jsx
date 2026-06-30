import {useCallback, useEffect, useMemo, useState} from 'react';
import {RefreshCw, Search, Trash2} from 'lucide-react';
import {Button, Card, Empty, Field, Loading, PageHeader} from '../../components/UI';
import {apiRequest, endpoints} from '../../lib/api';
import {useApp} from '../../lib/AppContext';

const PAGE_SIZE = 20;
const STATUS_FILTERS = ['All', 'Pending', 'Processing', 'Confirmed', 'Completed'];
const NEXT_STATUSES = ['Pending', 'Processing', 'Confirmed'];

const firstValue = (...values) => values.find(value => value !== undefined && value !== null && String(value).trim() !== '') ?? '';

const listFrom = response => {
  const data = response?.data ?? response;
  const payload = data?.data ?? data;
  const candidates = [
    payload?.quries,
    payload?.queries,
    payload?.userQuries,
    payload?.userQueries,
    payload?.customerQueries,
    payload?.docs,
    data?.quries,
    data?.queries,
    data,
  ];
  return candidates.find(Array.isArray) || [];
};

const mongoId = query => {
  const id = firstValue(query?._id?.$oid, query?._id, query?.id);
  return typeof id === 'object' ? '' : id;
};
const queryId = query => firstValue(query?.quryId, query?.queryId, mongoId(query), 'Not available');
const queryStatus = query => firstValue(query?.quiryStatus, query?.quryStatus, query?.queryStatus, query?.status, 'Pending');
const customerName = query => firstValue(query?.coustomerName, query?.customerName, query?.name, 'Not available');
const customerMobile = query => firstValue(query?.coustomerMobile, query?.customerMobile, query?.mobile, query?.phone, 'Not available');
const customerEmail = query => firstValue(query?.coustomerEmail, query?.customerEmail, query?.email, 'Not available');
const customerAddress = query => firstValue(query?.coustomerAddress, query?.customerAddress, query?.address, 'Not available');
const customerLocation = query => firstValue(query?.coustomerLocation, query?.customerLocation, query?.location, query?.query, query?.message, 'Not available');

const formatDate = value => {
  if (!value) return 'Not available';
  const parsed = new Date(value?.$date || value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('en-IN', {day: '2-digit', month: '2-digit', year: 'numeric'});
};

const statusClass = status => {
  const text = String(status || '').toLowerCase();
  if (text.includes('confirm') || text.includes('complete')) return 'confirmed';
  if (text.includes('process')) return 'processing';
  if (text.includes('reject') || text.includes('delete') || text.includes('cancel')) return 'rejected';
  return 'pending';
};

export function AdminQueries() {
  const {session, notify} = useApp();
  const [queries, setQueries] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingId, setSavingId] = useState('');

  const fetchQueries = useCallback(async (nextPage = 1, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(PAGE_SIZE),
        search,
        status: statusFilter === 'All' ? '' : statusFilter,
      });
      const response = await apiRequest(`${endpoints.adminQueries}?${params.toString()}`, {token: session.token});
      const list = listFrom(response);
      setQueries(current => append ? [...current, ...list] : list);
      setPage(nextPage);
      setHasMore(list.length >= PAGE_SIZE);
    } catch (error) {
      notify(error.message || 'Queries not found', 'error');
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, [notify, search, session.token, statusFilter]);

  useEffect(() => {
    fetchQueries(1, false);
  }, [fetchQueries]);

  const visibleQueries = useMemo(() => {
    const term = search.trim().toLowerCase();
    return queries.filter(query => {
      const matchesStatus = statusFilter === 'All' || queryStatus(query).toLowerCase() === statusFilter.toLowerCase();
      const matchesSearch = !term || [
        queryId(query),
        customerName(query),
        customerMobile(query),
        customerEmail(query),
        customerAddress(query),
        customerLocation(query),
        queryStatus(query),
      ].join(' ').toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [queries, search, statusFilter]);

  const updateStatus = async (query, nextStatus) => {
    const id = mongoId(query);
    if (!id) return notify('Query id not found', 'error');
    setSavingId(`${id}-${nextStatus}`);
    try {
      const response = await apiRequest(`${endpoints.adminQueries}/${id}/status`, {
        method: 'PATCH',
        token: session.token,
        body: {quiryStatus: nextStatus},
      });
      setQueries(current => current.map(item => mongoId(item) === id ? {...item, quiryStatus: nextStatus, status: nextStatus} : item));
      notify(response?.message || `Query marked ${nextStatus}`);
    } catch (error) {
      notify(error.message || 'Unable to update query status', 'error');
    } finally {
      setSavingId('');
    }
  };

  const deleteQuery = async query => {
    const id = mongoId(query);
    if (!id) return notify('Query id not found', 'error');
    if (!window.confirm('Delete this query?')) return;
    setSavingId(`${id}-delete`);
    try {
      const response = await apiRequest(`${endpoints.adminQueries}/${id}`, {
        method: 'DELETE',
        token: session.token,
      });
      setQueries(current => current.filter(item => mongoId(item) !== id));
      notify(response?.message || 'Query deleted');
    } catch (error) {
      notify(error.message || 'Unable to delete query', 'error');
    } finally {
      setSavingId('');
    }
  };

  const submitSearch = event => {
    event.preventDefault();
    fetchQueries(1, false);
  };

  return (
    <div className="page admin-ledger-page">
      <PageHeader
        eyebrow="Support"
        title="Queries"
        text="Customer and vendor support queries with status management."
        actions={<Button variant="soft" disabled={loading} onClick={() => fetchQueries(1, false)}><RefreshCw size={17} /> Refresh</Button>}
      />

      <Card className="admin-ledger-filter admin-query-filter">
        <form onSubmit={submitSearch}>
          <Field label="Search queries" placeholder="Search name, mobile, email, location" value={search} onChange={event => setSearch(event.target.value)} />
          <Button><Search size={17} /> Search</Button>
        </form>
        <div className="admin-query-status-tabs" aria-label="Filter by Status">
          {STATUS_FILTERS.map(status => (
            <button type="button" className={statusFilter === status ? 'active' : ''} onClick={() => setStatusFilter(status)} key={status}>
              {status}
            </button>
          ))}
        </div>
      </Card>

      {loading ? <Loading /> : visibleQueries.length ? (
        <section className="admin-ledger-list">
          {visibleQueries.map((query, index) => {
            const id = mongoId(query) || String(index);
            const status = queryStatus(query);
            return (
              <Card className="admin-query-card" key={`${id}-${index}`}>
                <header>
                  <div>
                    <span>Query</span>
                    <h2>{customerName(query)} <small>| {queryId(query)}</small></h2>
                    <p>{customerLocation(query)}</p>
                  </div>
                  <b className={`admin-status ${statusClass(status)}`}>{status}</b>
                </header>
                <section className="admin-ledger-meta">
                  <span><small>User ID</small>{firstValue(query?.userId, query?.userID, 'Not available')}</span>
                  <span><small>Mobile</small>{customerMobile(query)}</span>
                  <span><small>Email</small>{customerEmail(query)}</span>
                  <span><small>Address</small>{customerAddress(query)}</span>
                  <span><small>Location</small>{customerLocation(query)}</span>
                  <span><small>Created At</small>{formatDate(query?.createdAt)}</span>
                  <span><small>Updated At</small>{formatDate(query?.updatedAt)}</span>
                </section>
                <div className="admin-query-actions">
                  {NEXT_STATUSES.map(nextStatus => (
                    <button type="button" disabled={savingId === `${id}-${nextStatus}`} onClick={() => updateStatus(query, nextStatus)} key={nextStatus}>
                      {savingId === `${id}-${nextStatus}` ? 'Saving...' : nextStatus}
                    </button>
                  ))}
                  <button type="button" className="danger" disabled={savingId === `${id}-delete`} onClick={() => deleteQuery(query)}>
                    <Trash2 size={15} /> {savingId === `${id}-delete` ? 'Deleting...' : 'Delete Query'}
                  </button>
                </div>
              </Card>
            );
          })}
        </section>
      ) : <Empty title="No queries found" text="Support requests will appear here." />}

      {!loading && hasMore && <div className="admin-load-more"><Button variant="soft" disabled={loadingMore} onClick={() => fetchQueries(page + 1, true)}>{loadingMore ? 'Loading...' : 'Load More'}</Button></div>}
    </div>
  );
}
