/* eslint-disable no-unused-vars */
import {CreditCard, Image as ImageIcon, MessageCircleMore, PackageCheck, PartyPopper, Server, ShieldAlert, Store, UploadCloud} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {Button, Card, Empty, Field, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints, unwrap} from '../../lib/api';
import {asset, products as fallbackProducts} from '../../lib/demoData';
import {endOf, extractList, formatAmount, getId, getName, getStatus, orderProducts, productOf, startOf, todayInputValue, userIdOf} from '../../lib/dataHelpers';

const getProductMongoId = item => {
  const product = productOf(item);
  return item?.orderedProduct?._id || item?.orderedProduct?.id || item?._id || item?.id || item?.productMongoId || item?.product_id || item?.mongoProductId || product?._id || product?.id || '';
};

const getProductPublicId = item => {
  const product = productOf(item);
  return product?.productID || product?.productId || product?.proId || item?.productID || item?.productId || getProductMongoId(item);
};

const getOrderSubmitId = order => order?.orderId || order?.orderID || order?.order_id || order?._id || order?.id || '';

const getAdditionalThingId = item =>
  item?._id || item?.id || item?.additionalThingId || item?.additionalThingID || item?.additionalThingsId || item?.additionalId || item?.thingId || '';

const findAdditionalThingsArray = value => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== 'object') return [];
  const candidates = [
    value.additionalThings, value.additionalThing,
    value.data?.additionalThings, value.data?.additionalThing,
    value.order?.additionalThings, value.order?.additionalThing,
    value.product?.additionalThings, value.product?.additionalThing,
    value.products?.additionalThings, value.products?.additionalThing,
    value.orderedProduct?.additionalThings, value.orderedProduct?.additionalThing,
  ];
  const direct = candidates.find(Array.isArray);
  if (direct) return direct;
  const nestedProducts = [value.products, value.data?.products, value.order?.products].find(Array.isArray);
  return nestedProducts ? nestedProducts.flatMap(findAdditionalThingsArray).filter(Boolean) : [];
};

const getCreatedAdditionalThing = response => {
  const direct = response?.additionalThing || response?.additionalThings || response?.data?.additionalThing || response?.data?.additionalThings;
  if (direct && !Array.isArray(direct) && getAdditionalThingId(direct)) return direct;
  return [...findAdditionalThingsArray(response)].reverse().find(item => getAdditionalThingId(item));
};

const getAdditionalThings = (order, product) => {
  const productObject = productOf(product);
  const rawList = [
    product?.additionalThings,
    product?.additionalThing,
    product?.orderedProduct?.additionalThings,
    product?.orderedProduct?.additionalThing,
    productObject?.additionalThings,
    productObject?.additionalThing,
    order?.additionalThings,
    order?.additionalThing,
  ].find(Array.isArray) || [];
  const mongoId = getProductMongoId(product);
  const publicId = getProductPublicId(product);
  return rawList.filter(item => {
    const itemProductId = item?.productId || item?.productID || item?.product?._id || item?.product || '';
    return !itemProductId || itemProductId === mongoId || itemProductId === publicId;
  });
};

const additionalStatusClass = status => {
  const normalized = String(status || 'Pending').toLowerCase();
  if (normalized === 'accepted') return 'accepted';
  if (normalized === 'rejected') return 'rejected';
  return 'pending';
};

export default function CancellationPolicy() {
  const {session, setOrders, notify} = useApp();
  const navigate = useNavigate();
  const {state} = useLocation();
  const order = state?.order || {};
  const product = state?.product || {};
  const productItem = productOf(product);
  const orderId = getOrderSubmitId(order);
  const productMongoId = getProductMongoId(product);
  const productPublicId = getProductPublicId(product);
  const productAmount = Number(productItem.price || product.price || product.amount || 0) * Number(product.quantity || product.qty || 1);
  const startDate = new Date(startOf(product) || startOf(order) || '');
  const now = new Date();
  const monthDifference = Number.isNaN(startDate.valueOf()) ? 0 : (startDate.getFullYear() - now.getFullYear()) * 12 + (startDate.getMonth() - now.getMonth()) + (startDate.getDate() >= now.getDate() ? 0 : -1);
  const deductionPercent = monthDifference > 3 ? 10 : 25;
  const deductionAmount = productAmount * deductionPercent / 100;
  const estimatedRefund = Math.max(productAmount - deductionAmount, 0);
  const [form, setForm] = useState({orderId: orderId || '', productId: productPublicId || '', productMongoId: productMongoId || '', reason: ''});
  const [saving, setSaving] = useState(false);
  const submit = async event => {
    event.preventDefault();
    const mongoId = form.productMongoId || productMongoId;
    const publicId = form.productId || productPublicId;
    if (!mongoId || !publicId) return notify('Product id not found.', 'error');
    if (!window.confirm('By continuing, you accept the cancellation policy and want to cancel this order.')) return;
    setSaving(true);
    try {
      await apiRequest(endpoints.cancelOrder, {method: 'PUT', token: session.token, body: JSON.stringify({_id: mongoId, productID: publicId, reason: form.reason})});
      setOrders(current => current.map(item => getOrderSubmitId(item) === orderId ? {...item, products: orderProducts(item).map(productItem => getProductMongoId(productItem) === mongoId ? {...productItem, vendorAccepted: 'Cancelled', vendorAcceptedStatus: 'Cancelled', vendorStatus: 'Cancelled'} : productItem)} : item));
      notify('Order cancelled successfully.');
      navigate('/orders');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  return <div className="page"><PageHeader eyebrow="Legal cancellation declaration" title="Cancellation Policy" text="Please read the refund declaration carefully before cancelling this booking product." /><div className="split-layout"><section><Card className="cancellation-product-card"><ShieldAlert size={34} /><h2>Selected booking product</h2><div className="order-meta-grid"><span><small>Order ID</small>{form.orderId || 'Not available'}</span><span><small>Product</small>{getName(productItem)}</span><span><small>Product ID</small>{form.productId || 'Not available'}</span><span><small>Booking start date</small>{startOf(product) || startOf(order) || 'Not available'}</span><span><small>Product amount</small>{formatAmount(productAmount)}</span></div></Card><Card className="policy-card"><strong>{deductionPercent}%</strong><h2>Payment deduction applies</h2><p>{monthDifference > 3 ? 'Your booking start date is more than 3 months away from today, so 10% payment of this product will be deducted as cancellation charges.' : 'Your booking start date is less than or equal to 3 months away, so 25% payment of this product will be deducted as cancellation charges.'}</p><div className="mobile-total-panel"><div><small>Deduction</small><strong>{formatAmount(deductionAmount)}</strong></div><div><small>Estimated refund</small><strong className="paid">{formatAmount(estimatedRefund)}</strong></div></div></Card><Card><h2>Declaration</h2><p className="section-copy">I understand that cancellation charges are calculated per selected product according to the booking start date. Any refund is subject to payment verification, vendor status, booking condition, and admin approval.</p><p className="section-copy">In any critical case, emergency situation, payment dispute, vendor issue, duplicate booking, or other special condition, please connect to admin.</p></Card></section><Card className="sticky-form"><h2>Accept policy</h2><form onSubmit={submit}><Field label="Order ID" required value={form.orderId} onChange={e => setForm({...form, orderId: e.target.value})} /><Field label="Product ID" required value={form.productId} onChange={e => setForm({...form, productId: e.target.value})} /><Field label="Product Mongo ID" required value={form.productMongoId} onChange={e => setForm({...form, productMongoId: e.target.value})} /><Field as="textarea" label="Reason" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} /><Button variant="danger" disabled={saving}>{saving ? 'Cancelling...' : 'Accept Policy & Cancel Order'}</Button><Button type="button" variant="soft" onClick={() => navigate('/support')}>Connect to Admin</Button><Button type="button" variant="ghost" onClick={() => navigate('/orders')}>Back to Orders</Button></form></Card></div></div>;
}
