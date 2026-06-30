import {useLocation, useNavigate} from 'react-router-dom';
import {AlertTriangle, ShieldAlert} from 'lucide-react';
import {Button, Card, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {getName} from '../../lib/dataHelpers';
import {useState} from 'react';

const valueOrDash = value => value === undefined || value === null || value === '' ? 'Not available' : String(value);
const firstAvailable = values => values.find(value => value !== undefined && value !== null && String(value).trim() !== '');

const getProductObject = item => {
  if (item?.productDetails && typeof item.productDetails === 'object') return item.productDetails;
  if (item?.product && typeof item.product === 'object') return item.product;
  if (item?.products && typeof item.products === 'object') return item.products;
  return item || {};
};

const getOrderId = booking => booking?.orderId || booking?.orderID || booking?._id?.$oid || booking?._id || '';

const getProductId = item => {
  const product = getProductObject(item);
  return (
    item?.orderedProduct?.productID ||
    item?.orderedProduct?.productId ||
    item?.orderedProduct?.proId ||
    item?.orderedProduct?.product?._id ||
    item?.orderedProduct?.product ||
    item?.productID ||
    item?.productId ||
    item?.proId ||
    item?.productDetails?.productID ||
    item?.productDetails?.productId ||
    item?.productDetails?.proId ||
    item?.productDetails?._id ||
    product?.productID ||
    product?.productId ||
    product?.proId ||
    product?._id ||
    ''
  );
};

const getOrderProductId = item => {
  const orderedProductId = firstAvailable([
    item?.orderedProduct?._id?.$oid,
    item?.orderedProduct?._id,
    item?.orderedProduct?.orderProductId,
    item?.orderedProduct?.productOrderId,
  ]);
  if (orderedProductId) return orderedProductId;

  const candidates = [
    item?.orderProductId,
    item?.productOrderId,
    item?._id?.$oid,
    item?._id,
  ];
  return firstAvailable(candidates) || '';
};

const getProductQuantity = item => Number(item?.orderedProduct?.quantity || item?.quantity || item?.qty || 1);

const getProductPrice = item => {
  const product = getProductObject(item);
  const price = Number(product?.price || item?.price || 0);
  return Number.isFinite(price) ? price * getProductQuantity(item) : 0;
};

const formatDate = value => {
  if (!value) return 'Not available';
  const parsed = new Date(value?.$date || value);
  if (Number.isNaN(parsed.getTime())) return valueOrDash(value);
  return parsed.toLocaleDateString('en-IN', {day: '2-digit', month: '2-digit', year: 'numeric'});
};

const formatAmount = value =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function VendorCancellationPolicy() {
  const {session, notify} = useApp();
  const navigate = useNavigate();
  const {state} = useLocation();
  const booking = state?.booking || {};
  const product = state?.product || {};
  const policy = state?.policy || {};
  const [saving, setSaving] = useState(false);

  const isForceCancel = Boolean(policy.isForceCancel);
  const deductionPercent = Number(policy.deductionPercent || (isForceCancel ? 75 : 40));
  const orderId = getOrderId(booking);
  const productID = getProductId(product);
  const orderProductId = getOrderProductId(product);
  const productAmount = getProductPrice(product);
  const deductionAmount = productAmount * deductionPercent / 100;
  const createdAt = policy.createdAt || product?.createdAt || product?.orderedProduct?.createdAt || booking?.createdAt;

  const cancelOrder = async () => {
    if (!orderId || (!isForceCancel && !productID) || (isForceCancel && !orderProductId)) {
      notify(isForceCancel ? 'Order id or order product id not found' : 'Order id or product id not found', 'error');
      return;
    }
    if (!window.confirm(isForceCancel ? 'By continuing, you accept the 75% force cancellation payment policy and want to cancel this order.' : 'By continuing, you accept the 40% vendor cancellation payment policy and want to cancel this order.')) return;

    setSaving(true);
    try {
      const response = await apiRequest(isForceCancel ? endpoints.vendorForceCancel : endpoints.updateVendorStatus, {
        method: isForceCancel ? 'POST' : 'PUT',
        token: session.token,
        body: isForceCancel
          ? {orderId, orderProductId, productID, vendorAccepted: 'Canceled'}
          : {orderId, productID, vendorAccepted: 'Rejected'},
      });
      notify(response?.message || 'Order cancelled successfully');
      navigate('/vendor/bookings');
    } catch (error) {
      notify(error.message || 'Order not cancelled', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page vendor-cancel-page">
      <PageHeader
        eyebrow={isForceCancel ? 'Force cancellation' : 'Vendor cancellation'}
        title="Vendor Cancellation Policy"
        text="Accept the vendor cancellation policy before cancelling a confirmed and accepted booking product."
      />
      <section className={`vendor-cancel-hero ${isForceCancel ? 'force' : ''}`}>
        <span>{isForceCancel ? 'Force cancellation' : 'Vendor cancellation'}</span>
        <h2>{deductionPercent}% payment policy applies</h2>
        <p>{isForceCancel ? 'This order is inside the restricted cancellation period. You can continue only after accepting the force cancellation policy.' : 'This product is older than 3 months, so cancellation can continue only after accepting the vendor cancellation policy.'}</p>
      </section>
      <div className="split-layout">
        <section>
          <Card className="vendor-cancel-detail">
            <h2><ShieldAlert />Order details</h2>
            <div className="vendor-cancel-grid">
              <span><small>Order ID</small>{valueOrDash(orderId)}</span>
              <span><small>Product</small>{getName(getProductObject(product))}</span>
              <span><small>Product ID</small>{valueOrDash(productID)}</span>
              {isForceCancel && <span><small>Order Product ID</small>{valueOrDash(orderProductId)}</span>}
              <span><small>Created on</small>{formatDate(createdAt)}</span>
            </div>
          </Card>
          <Card className={`vendor-cancel-policy-card ${isForceCancel ? 'force' : ''}`}>
            <strong>{deductionPercent}%</strong>
            <h2>Cancellation payment</h2>
            <p>{isForceCancel ? 'For force cancellation, you need to pay 75% of the booking charge before this cancellation can be processed.' : 'Because the product/order age is greater than 3 months, vendor cancellation is allowed with a 40% payment cancellation charge.'}</p>
            <div className="vendor-cancel-amounts">
              <span><small>Product amount</small>Rs. {formatAmount(productAmount)}</span>
              <span><small>{deductionPercent}% charge</small>Rs. {formatAmount(deductionAmount)}</span>
            </div>
          </Card>
          <Card>
            <h2><AlertTriangle />{isForceCancel ? 'Force cancellation declaration' : 'Declaration'}</h2>
            <p className="section-copy">{isForceCancel ? 'I understand that force cancelling this confirmed order may block my vendor ID. I also understand that the customer and admin may take legal action, including an FIR/case, depending on the impact of this cancellation.' : 'I understand that cancelling this confirmed order may affect the customer booking. The 40% cancellation payment is subject to admin review, payment verification, and final settlement rules.'}</p>
          </Card>
        </section>
        <Card className="sticky-form vendor-cancel-accept">
          <h2>Accept policy</h2>
          <p>Only continue if you accept the cancellation payment policy for this booking product.</p>
          <Button type="button" variant="danger" disabled={saving} onClick={cancelOrder}>
            {saving ? 'Cancelling...' : isForceCancel ? 'Accept Force Policy & Cancel Order' : 'Accept Policy & Cancel Order'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/vendor/bookings')}>Back to Booking Calendar</Button>
        </Card>
      </div>
    </div>
  );
}
