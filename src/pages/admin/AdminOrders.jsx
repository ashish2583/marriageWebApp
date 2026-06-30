import {CalendarDays, CreditCard, RefreshCw, Search, ShieldCheck, X} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {Button, Card, Empty, Field, Modal, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {asset} from '../../lib/demoData';
import {extractList, formatAmount, getId, getStatus} from '../../lib/dataHelpers';

const PAGE_SIZE = 20;

const valueOrDash = value =>
  value === undefined || value === null || value === '' ? 'Not available' : String(value);

const numberFrom = (...values) => {
  for (const value of values) {
    const amount = Number(value);
    if (Number.isFinite(amount)) return amount;
  }
  return null;
};

const amountOrDash = value =>
  value === undefined || value === null || value === '' ? 'Not available' : formatAmount(value);

const normalizeDate = value => {
  const raw = value?.$date || value;
  if (!raw) return 'Not available';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return String(raw);
  return parsed.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
};

const orderIdOf = order => order?.orderId || order?.orderID || order?._id?.$oid || getId(order);
const customerNameOf = order =>
  valueOrDash(order?.coustomerName || order?.customerName || order?.customer?.name || order?.user?.name || order?.name);
const orderDateOf = order => order?.bookingDate || order?.BookingDate || order?.orderDate || order?.createdAt;

const orderProductsOf = order => {
  if (Array.isArray(order?.products)) return order.products;
  if (Array.isArray(order?.orderProducts)) return order.orderProducts;
  if (Array.isArray(order?.selectedProducts)) return order.selectedProducts;
  if (order?.productID || order?.product) return [order];
  return [];
};

const productObjectOf = item => {
  if (item?.product && typeof item.product === 'object') return item.product;
  if (item?.products && typeof item.products === 'object') return item.products;
  return item || {};
};

const productTitleOf = item => {
  const product = productObjectOf(item);
  return product?.proName || product?.name || item?.proName || item?.productName || item?.productID || 'Selected product';
};

const productIdOf = item => {
  const product = productObjectOf(item);
  return item?.productID || product?.productID || product?.productId || product?._id || '';
};

const productPublicIdOf = item => {
  const product = productObjectOf(item);
  return item?.productID || product?.productID || product?.proId || '';
};

const productMongoIdOf = item => {
  if (item?.product && typeof item.product === 'object') return getId(item.product);
  if (typeof item?.product === 'string') return item.product;
  if (item?.products && typeof item.products === 'object') return getId(item.products);
  if (typeof item?.products === 'string') return item.products;
  return item?.product_id || item?.productId || '';
};

const quantityOf = item => Number(item?.quantity || item?.qty || 1);
const priceOf = item => {
  const product = productObjectOf(item);
  return product?.price || item?.price || item?.amount || 0;
};

const productImageOf = item => {
  const product = productObjectOf(item);
  const image = product?.proImage || item?.proImage || product?.image || item?.image || product?.productImage || item?.productImage;
  return (Array.isArray(image) ? image[0] : image) || asset('image/Wedding.jpg');
};

const productStartOf = item => {
  const product = productObjectOf(item);
  return item?.BookingStartDate || item?.bookingStartDate || item?.startDate || product?.BookingStartDate || product?.bookingStartDate || '';
};

const productEndOf = item => {
  const product = productObjectOf(item);
  return item?.BookingEndDate || item?.bookingEndDate || item?.endDate || product?.BookingEndDate || product?.bookingEndDate || '';
};

const additionalThingsOf = item => {
  const product = productObjectOf(item);
  return [
    item?.additionalThings,
    item?.additionalThing,
    item?.orderedProduct?.additionalThings,
    item?.orderedProduct?.additionalThing,
    product?.additionalThings,
    product?.additionalThing,
  ].find(Array.isArray) || [];
};

const additionalOrderAmountOf = order =>
  orderProductsOf(order).reduce((total, product) =>
    total + additionalThingsOf(product).reduce((sum, item) => {
      const amount = Number(item?.additionalAmount || 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0), 0);

const otherTimePaymentsOf = order =>
  [order?.OtherTimePaidAmount, order?.otherTimePaidAmount, order?.otherTimePayments, order?.otherTimePayment].find(Array.isArray) || [];

const otherTimeAmountOf = item => {
  const amount = Number(item?.otherTimeAmount || 0);
  return Number.isFinite(amount) ? amount : 0;
};

const otherTimeTotalOf = order =>
  otherTimePaymentsOf(order).reduce((total, item) => total + otherTimeAmountOf(item), 0);

const receivedAmountOf = item => {
  const product = productObjectOf(item);
  return numberFrom(
    item?.recivedAmountFromCustomer,
    item?.receivedAmountFromCustomer,
    product?.recivedAmountFromCustomer,
    product?.receivedAmountFromCustomer,
  ) || 0;
};

const receivedTotalOf = order =>
  orderProductsOf(order).reduce((total, item) => total + receivedAmountOf(item), 0);

const travelChargeOf = (order, products) => {
  const orderCharge = numberFrom(order?.TotalTravelCharge, order?.totalTravelCharge, order?.travelChargeTotal, order?.TravelChargeTotal, order?.travelCharge, order?.TravelCharge);
  if (orderCharge !== null) return orderCharge;
  const productCharge = products.reduce((total, item) => {
    const product = productObjectOf(item);
    return total + (numberFrom(item?.totalTravelCharge, item?.TotalTravelCharge, item?.travelCharge, product?.totalTravelCharge, product?.TotalTravelCharge) || 0);
  }, 0);
  return products.length ? productCharge : null;
};

const payableOf = order => numberFrom(order?.TotalPayableAmount, order?.totalPayableAmount, order?.totalAmount, order?.amount);
const paidOf = order => numberFrom(order?.TotalPaidAmount, order?.totalPaidAmount, order?.paidAmount, order?.PaidAmount);

const statusClass = value => String(value || 'pending').toLowerCase().replace(/\s+/g, '-');

const receivedPayload = (order, product, status) => {
  const payload = {orderId: orderIdOf(order), status};
  const publicProductId = productPublicIdOf(product);
  const mongoProductId = productMongoIdOf(product);
  if (publicProductId) payload.productID = publicProductId;
  if (mongoProductId && mongoProductId !== publicProductId) payload.productId = mongoProductId;
  return payload;
};

export function AdminOrders() {
  const {session, notify} = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchOrders = async (nextPage = 1, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const query = new URLSearchParams({page: String(nextPage), limit: String(PAGE_SIZE), search, status: ''});
      const response = await apiRequest(`${endpoints.adminOrders}?${query.toString()}`, {token: session.token});
      const nextOrders = extractList(response);
      setOrders(current => append ? [...current, ...nextOrders] : nextOrders);
      setPage(nextPage);
      setHasMore(nextOrders.length === PAGE_SIZE);
    } catch (error) {
      notify(error.message || 'Orders not found', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const updateStatus = async (order, status) => {
    const orderId = orderIdOf(order);
    if (!orderId) {
      notify('Order id not found', 'error');
      return;
    }
    setLoading(true);
    try {
      const response = await apiRequest(`${endpoints.adminOrders}/${orderId}/status`, {
        method: 'PATCH',
        token: session.token,
        body: {status},
      });
      notify(response?.message || `Order ${status}`);
      await fetchOrders(1, false);
    } catch (error) {
      notify(error.message || 'Order status not updated', 'error');
    } finally {
      setLoading(false);
    }
  };

  const runPaymentStatusUpdate = async () => {
    const action = confirmAction;
    if (!action) return;
    setConfirmAction(null);
    setLoading(true);
    try {
      const response = await apiRequest(action.type === 'otherTime' ? endpoints.updateOtherTimePaymentStatus : endpoints.updateReceivedAmountFromCustomerStatus, {
        method: 'PUT',
        token: session.token,
        body: action.payload,
      });
      const updatedOrder = response?.data;
      if (updatedOrder) {
        setPaymentOrder(updatedOrder);
        setOrders(current => current.map(item => orderIdOf(item) === orderIdOf(updatedOrder) ? updatedOrder : item));
      }
      notify(response?.message || 'Payment status updated');
    } catch (error) {
      notify(error.message || 'Payment status not updated', 'error');
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(order => /pending/i.test(getStatus(order))).length,
    confirmed: orders.filter(order => /confirm/i.test(getStatus(order))).length,
  }), [orders]);

  return (
    <div className="page admin-orders-page">
      <PageHeader
        eyebrow="Operations"
        title="Admin Orders"
        text="View every platform booking, update order status, inspect product details, and verify payment history."
        actions={<Button variant="soft" disabled={loading} onClick={() => fetchOrders(1, false)}><RefreshCw size={17} /> Refresh</Button>}
      />

      <Card className="admin-orders-filter">
        <div className="admin-orders-summary">
          <span><strong>{summary.total}</strong><small>Total Orders</small></span>
          <span><strong>{summary.pending}</strong><small>Pending</small></span>
          <span><strong>{summary.confirmed}</strong><small>Confirmed</small></span>
        </div>
        <form onSubmit={event => {event.preventDefault(); fetchOrders(1, false);}}>
          <Field label="Search orders" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order or customer" />
          <Button disabled={loading}><Search size={17} /> Search</Button>
        </form>
      </Card>

      <section className="admin-order-list">
        {orders.map(order => {
          const orderId = orderIdOf(order);
          const products = orderProductsOf(order);
          const paymentStatus = order?.paymentStatus || order?.payment || 'Pending';
          const travelCharge = travelChargeOf(order, products);
          const totalPayable = payableOf(order);
          const totalPaid = paidOf(order);
          const additionalOrderAmount = additionalOrderAmountOf(order);

          return (
            <Card className="admin-order-card-mobile" key={orderId || JSON.stringify(order).slice(0, 24)}>
              <div className="admin-order-card-head">
                <div>
                  <span>Order ID</span>
                  <h2>{valueOrDash(orderId)}</h2>
                  <p>Customer: {customerNameOf(order)}</p>
                  <small><CalendarDays size={14} /> Order Date: {normalizeDate(orderDateOf(order))}</small>
                </div>
                <em className={`admin-status ${statusClass(getStatus(order))}`}>{getStatus(order)}</em>
              </div>

              <div className="admin-order-info-row">
                <span>Payment: {paymentStatus}</span>
                <strong>{amountOrDash(totalPayable)}</strong>
              </div>

              <div className="admin-order-actions">
                <em className={`admin-status ${statusClass(paymentStatus)}`}>{paymentStatus}</em>
                <button type="button" onClick={() => updateStatus(order, 'Confirmed')}><ShieldCheck size={16} />Confirm</button>
                <button type="button" className="danger" onClick={() => updateStatus(order, 'Cancelled')}><X size={16} />Cancel Order</button>
                <button type="button" className="soft" onClick={() => setPaymentOrder(order)}><CreditCard size={16} />Payment History</button>
              </div>

              <div className="admin-order-detail-panel">
                <span><small>Order ID</small>{valueOrDash(orderId)}</span>
                <span><small>Order Date</small>{normalizeDate(orderDateOf(order))}</span>
                <span><small>Customer Name</small>{customerNameOf(order)}</span>
                <span><small>Travel Charge</small>{amountOrDash(travelCharge)}</span>
                <span><small>Total Payable</small>{amountOrDash(totalPayable)}</span>
                <span><small>Additional Order</small>{amountOrDash(additionalOrderAmount)}</span>
                <span><small>Total Paid</small>{amountOrDash(totalPaid)}</span>
              </div>

              <h3 className="admin-product-section-title">Selected Product Details</h3>
              <div className="admin-product-card-list">
                {products.length ? products.map((product, index) => (
                  <article className="admin-product-card-mobile" key={`${productIdOf(product) || index}-${index}`}>
                    <img src={productImageOf(product)} alt="" />
                    <div>
                      <strong>{index + 1}. {productTitleOf(product)}</strong>
                      <p>Product ID: {valueOrDash(productIdOf(product))}</p>
                      <p>Qty: {quantityOf(product)}</p>
                      <p>Price: {formatAmount(priceOf(product))}</p>
                      <p>From: {normalizeDate(productStartOf(product))}</p>
                      <p>To: {normalizeDate(productEndOf(product))}</p>
                    </div>
                  </article>
                )) : <p className="admin-empty-products">No product details available</p>}
              </div>
            </Card>
          );
        })}
      </section>

      {!loading && !orders.length && <Empty title="No orders found" text="Live admin orders will appear here." />}
      {hasMore && <div className="admin-load-more"><Button variant="soft" disabled={loadingMore} onClick={() => fetchOrders(page + 1, true)}>{loadingMore ? 'Loading...' : 'Load More'}</Button></div>}

      {paymentOrder && (
        <Modal title="Payment History" onClose={() => setPaymentOrder(null)} wide>
          <PaymentHistory
            order={paymentOrder}
            onClose={() => setPaymentOrder(null)}
            onAction={setConfirmAction}
          />
        </Modal>
      )}

      {confirmAction && (
        <Modal title="Confirm status" onClose={() => setConfirmAction(null)}>
          <p className="modal-copy">Are you sure you want to {confirmAction.label}?</p>
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>No</Button>
            <Button onClick={runPaymentStatusUpdate}>Yes</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PaymentHistory({order, onAction}) {
  const products = orderProductsOf(order);
  const otherTimePayments = otherTimePaymentsOf(order);
  const receivedProducts = products.filter(product => receivedAmountOf(product) > 0);

  return (
    <div className="admin-payment-history">
      <div className="admin-payment-summary">
        <span><small>Initial Paid</small><strong>{amountOrDash(paidOf(order))}</strong></span>
        <span><small>Other Time Paid</small><strong>{formatAmount(otherTimeTotalOf(order))}</strong></span>
        <span><small>Received Customer</small><strong>{formatAmount(receivedTotalOf(order))}</strong></span>
      </div>

      <h3>Other Time Paid Amount</h3>
      {otherTimePayments.length ? otherTimePayments.map((payment, index) => (
        <article className="admin-history-card" key={getId(payment) || `${payment?.otherTimeTranjectionId}-${index}`}>
          <div><strong>{formatAmount(payment?.otherTimeAmount || 0)}</strong><em className={`admin-status ${statusClass(payment?.otherTimeStatus)}`}>{payment?.otherTimeStatus || 'Pending'}</em></div>
          <p>{payment?.otherTimeDetails || 'No details added'}</p>
          <small>Mode: {payment?.otherTimePaymentMode || 'Not available'} | Payment: {payment?.otherTimePaymentStatus || 'pending'}</small>
          {payment?.otherTimeTranjectionId && <small>Transaction: {payment.otherTimeTranjectionId}</small>}
          {payment?.createdAt && <small>Date: {normalizeDate(payment.createdAt)}</small>}
          {payment?.otherTimePaymentProofUrl && <img src={payment.otherTimePaymentProofUrl} alt="" />}
          <div className="admin-history-actions">
            <button type="button" onClick={() => onAction({type: 'otherTime', label: 'accept other time payment', payload: {orderId: orderIdOf(order), otherTimePaymentId: getId(payment), status: 'Accepted'}})}>Accept</button>
            <button type="button" className="reject" onClick={() => onAction({type: 'otherTime', label: 'reject other time payment', payload: {orderId: orderIdOf(order), otherTimePaymentId: getId(payment), status: 'Rejected'}})}>Reject</button>
          </div>
        </article>
      )) : <p className="admin-history-empty">No other-time payment history found.</p>}

      <h3>Received Amount From Customer</h3>
      {receivedProducts.length ? receivedProducts.map((product, index) => (
        <article className="admin-history-card" key={`${productIdOf(product) || index}-received`}>
          <div><strong>{formatAmount(receivedAmountOf(product))}</strong><em className={`admin-status ${statusClass(product?.recivedAmountFromCustomerStatus || product?.receivedAmountFromCustomerStatus)}`}>{product?.recivedAmountFromCustomerStatus || product?.receivedAmountFromCustomerStatus || 'Pending'}</em></div>
          <p>{productTitleOf(product)}</p>
          <small>Product ID: {valueOrDash(productIdOf(product))}</small>
          <div className="admin-history-actions">
            <button type="button" onClick={() => onAction({type: 'received', label: 'accept received customer amount', payload: receivedPayload(order, product, 'Accepted')})}>Accept</button>
            <button type="button" className="reject" onClick={() => onAction({type: 'received', label: 'reject received customer amount', payload: receivedPayload(order, product, 'Rejected')})}>Reject</button>
          </div>
        </article>
      )) : <p className="admin-history-empty">No received amount from customer found.</p>}
    </div>
  );
}
