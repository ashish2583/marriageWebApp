import {useCallback, useEffect, useMemo, useState} from 'react';
import {CreditCard, Image as ImageIcon, RefreshCw, Search} from 'lucide-react';
import {Button, Card, Empty, Field, Loading, PageHeader} from '../../components/UI';
import {API_BASE_URL, apiRequest, endpoints} from '../../lib/api';
import {formatAmount, getId} from '../../lib/dataHelpers';
import {useApp} from '../../lib/AppContext';

const PAGE_SIZE = 20;

const firstValue = (...values) => values.find(value => value !== undefined && value !== null && String(value).trim() !== '') ?? '';

const listFrom = response => {
  const data = response?.data ?? response;
  const payload = data?.data ?? data;
  const candidates = [
    payload?.payments,
    payload?.payment,
    payload?.docs,
    data?.payments,
    data?.payment,
    data,
  ];
  return candidates.find(Array.isArray) || [];
};

const normalizeAsset = value => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || typeof raw !== 'string') return '';
  if (/^(https?:|blob:|data:)/i.test(raw) || raw.startsWith('/assets/')) return raw;
  const base = API_BASE_URL.replace(/\/+$/, '');
  return `${base}/${raw.replace(/^\/+/, '')}`;
};

const customerName = payment => firstValue(payment?.coustomerName, payment?.customerName, payment?.customer?.name, payment?.user?.name, payment?.name, 'Not available');
const customerMobile = payment => firstValue(payment?.coustomerMobile, payment?.customerMobile, payment?.customer?.mobile, payment?.customer?.phone, payment?.user?.mobile, payment?.mobile, payment?.phone, 'Not available');
const transactionId = payment => firstValue(payment?.TranjectionId, payment?.tranjectionId, payment?.transactionId, payment?.TransactionId, payment?.txnId, 'Not available');
const paymentMode = payment => firstValue(payment?.paymentMode, payment?.mode, 'Payment');
const paymentStatus = payment => firstValue(payment?.paymentStatus, payment?.status, 'Pending');
const paymentAmount = payment => firstValue(payment?.amount, payment?.TotalPaidAmount, payment?.totalPaidAmount, payment?.totalAmount, payment?.paidAmount, 0);
const paymentProof = payment => normalizeAsset(firstValue(payment?.paymentProofUrl, payment?.paymentProof, payment?.proofUrl, payment?.proof, ''));

const statusClass = status => {
  const text = String(status || '').toLowerCase();
  if (text.includes('success') || text.includes('paid') || text.includes('confirm') || text.includes('complete')) return 'confirmed';
  if (text.includes('reject') || text.includes('cancel') || text.includes('fail')) return 'rejected';
  return 'pending';
};

export function AdminPayments() {
  const {session, notify} = useApp();
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPayments = useCallback(async (nextPage = 1, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(PAGE_SIZE),
        paymentStatus: '',
        paymentMode: '',
        search,
      });
      const response = await apiRequest(`${endpoints.adminPayments}?${params.toString()}`, {token: session.token});
      const list = listFrom(response);
      setPayments(current => append ? [...current, ...list] : list);
      setPage(nextPage);
      setHasMore(list.length >= PAGE_SIZE);
    } catch (error) {
      notify(error.message || 'Payments not found', 'error');
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, [notify, search, session.token]);

  useEffect(() => {
    fetchPayments(1, false);
  }, [fetchPayments]);

  const visiblePayments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return payments;
    return payments.filter(payment => [
      getId(payment),
      payment?.orderId,
      payment?.orderID,
      customerName(payment),
      customerMobile(payment),
      transactionId(payment),
      paymentMode(payment),
      paymentStatus(payment),
    ].join(' ').toLowerCase().includes(term));
  }, [payments, search]);

  const paidCount = visiblePayments.filter(payment => statusClass(paymentStatus(payment)) === 'confirmed').length;
  const pendingCount = visiblePayments.filter(payment => statusClass(paymentStatus(payment)) === 'pending').length;
  const totalAmount = visiblePayments.reduce((sum, payment) => sum + Number(paymentAmount(payment) || 0), 0);

  const submitSearch = event => {
    event.preventDefault();
    fetchPayments(1, false);
  };

  return (
    <div className="page admin-ledger-page">
      <PageHeader
        eyebrow="Finance"
        title="Payments"
        text="Payment ledger with customer details, transaction IDs, proof images, and status."
        actions={<Button variant="soft" disabled={loading} onClick={() => fetchPayments(1, false)}><RefreshCw size={17} /> Refresh</Button>}
      />

      <Card className="admin-ledger-filter">
        <form onSubmit={submitSearch}>
          <Field label="Search payments" placeholder="Search name, mobile, transaction id" value={search} onChange={event => setSearch(event.target.value)} />
          <Button><Search size={17} /> Search</Button>
        </form>
        <div className="admin-ledger-summary">
          <span><small>Total records</small><strong>{visiblePayments.length}</strong></span>
          <span><small>Paid/confirmed</small><strong>{paidCount}</strong></span>
          <span><small>Pending</small><strong>{pendingCount}</strong></span>
          <span><small>Total amount</small><strong>{formatAmount(totalAmount)}</strong></span>
        </div>
      </Card>

      {loading ? <Loading /> : visiblePayments.length ? (
        <section className="admin-ledger-list">
          {visiblePayments.map((payment, index) => {
            const orderId = firstValue(payment?.orderId, payment?.orderID, getId(payment), `PAY${index + 1}`);
            const status = paymentStatus(payment);
            const proof = paymentProof(payment);
            return (
              <Card className="admin-ledger-card" key={`${orderId}-${index}`}>
                <header>
                  <div>
                    <span>Payment Ledger</span>
                    <h2>{orderId} <small>| {customerName(payment)}</small></h2>
                    <p>Mobile: {customerMobile(payment)}</p>
                  </div>
                  <b className={`admin-status ${statusClass(status)}`}>{status}</b>
                </header>
                <section className="admin-ledger-meta">
                  <span><small>Amount</small>{formatAmount(paymentAmount(payment))}</span>
                  <span><small>Mode</small>{paymentMode(payment)}</span>
                  <span><small>Transaction ID</small>{transactionId(payment)}</span>
                  <span><small>Customer Name</small>{customerName(payment)}</span>
                  <span><small>Mobile Number</small>{customerMobile(payment)}</span>
                </section>
                <div className="admin-ledger-proof">
                  <CreditCard />
                  <div>
                    <strong>Payment Proof</strong>
                    {proof ? <img src={proof} alt="Payment proof" /> : <p><ImageIcon size={15} /> Not available</p>}
                  </div>
                </div>
              </Card>
            );
          })}
        </section>
      ) : <Empty title="No payments found" text="Payment records will appear here." />}

      {!loading && hasMore && <div className="admin-load-more"><Button variant="soft" disabled={loadingMore} onClick={() => fetchPayments(page + 1, true)}>{loadingMore ? 'Loading...' : 'Load More'}</Button></div>}
    </div>
  );
}
