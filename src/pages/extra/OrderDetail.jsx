/* eslint-disable no-unused-vars */
import {CreditCard, Image as ImageIcon, MessageCircleMore, PackageCheck, PartyPopper, Server, ShieldAlert, Store, UploadCloud} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {Button, Card, Empty, Field, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints, unwrap} from '../../lib/api';
import {asset, products as fallbackProducts} from '../../lib/demoData';
import {endOf, extractList, formatAmount, getId, getName, getStatus, orderProducts, productOf, startOf, todayInputValue, userIdOf} from '../../lib/dataHelpers';

const getProductMongoId = item => {
  const product = productOf(item);
  return product?._id || product?.id || item?.productMongoId || item?.product_id || item?.mongoProductId || item?._id || item?.id || '';
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

export default function OrderDetail() {
  const {state} = useLocation();
  const {session, notify} = useApp();
  const order = state?.order || {};
  const product = state?.product || orderProducts(order)[0] || {};
  const productItem = productOf(product);
  const [form, setForm] = useState({amount: '', details: '', paymentMode: '', paymentStatus: 'pending', transactionId: '', proof: null});
  const [additionalThings, setAdditionalThings] = useState(() => getAdditionalThings(order, product));
  const [saving, setSaving] = useState(false);
  const submit = async event => {
    event.preventDefault();
    const amount = Number(form.amount);
    const orderId = getOrderSubmitId(order);
    const productId = getProductMongoId(product);
    if (!orderId) return notify('Order id not found.', 'error');
    if (!productId) return notify('Product id not found.', 'error');
    if (!form.amount.trim() || !Number.isFinite(amount) || amount <= 0) return notify('Please enter service charge amount.', 'error');
    if (!form.details.trim()) return notify('Please enter details.', 'error');
    setSaving(true);
    const payload = {
      orderId,
      productId,
      additionalAmount: amount,
      additionalDetails: form.details.trim(),
      additionalPaymentMode: form.paymentMode,
      additionalPaymentStatus: form.paymentStatus,
      additionalTranjectionId: form.transactionId,
      status: 'Pending',
    };
    const body = form.proof ? new FormData() : payload;
    if (form.proof) {
      Object.entries(payload).forEach(([key, value]) => body.append(key, String(value)));
      body.append('additionalPaymentProofUrl', form.proof);
    }
    try {
      const response = await apiRequest(endpoints.addAdditionalThings, {method: 'POST', token: session.token, body});
      const created = getCreatedAdditionalThing(response) || {...payload, _id: `local-${Date.now()}`};
      setAdditionalThings(current => [created, ...current]);
      setForm({amount: '', details: '', paymentMode: '', paymentStatus: 'pending', transactionId: '', proof: null});
      notify(response?.message || 'Additional things submitted.');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  const updateAdditionalStatus = async (additionalThing, status) => {
    const orderId = getOrderSubmitId(order);
    const productId = getProductMongoId(product) || getProductPublicId(product);
    const additionalThingId = getAdditionalThingId(additionalThing);
    if (!orderId || !productId || !additionalThingId) return notify('Additional thing details not found.', 'error');
    try {
      await apiRequest(endpoints.updateAdditionalThingStatus, {method: 'PUT', token: session.token, body: JSON.stringify({orderId, productId, additionalThingId, status})});
      setAdditionalThings(current => current.map(item => getAdditionalThingId(item) === additionalThingId ? {...item, status} : item));
      notify(`Additional thing ${status}.`);
    } catch (error) {
      notify(error.message, 'error');
    }
  };
  return <div className="page order-detail-page"><PageHeader eyebrow="Product details" title={getName(productItem)} text={`Order #${getId(order) || 'Not available'}`} /><div className="split-layout"><section><Card className="order-product-detail-card"><img src={productItem.proImage?.[0] || productItem.image || asset('image/Wedding.jpg')} alt="" /><h2>{getName(productItem)}</h2><p>{getProductPublicId(product) || 'Product id not available'}</p><div className="info-grid"><span><small>Qty</small>{product.quantity || 1}</span><span><small>Price</small>{formatAmount(productItem.price)}</span><span><small>Vendor</small>{product.vendorAcceptedStatus || product.vendorAccepted || 'Pending'}</span></div><p>{productItem.shortDetails || productItem.longDetails || 'Booked wedding service'}</p></Card>{additionalThings.length ? <Card className="additional-list-card"><h2>Additional Things</h2>{additionalThings.map((item, index) => {const status = item.status || 'Pending'; return <article className="additional-item" key={getAdditionalThingId(item) || index}><div><strong>{formatAmount(item.additionalAmount || 0)}</strong><span className={`additional-status ${additionalStatusClass(status)}`}>{status}</span></div><p>{item.additionalDetails || 'No details added'}</p><small>Mode: {item.additionalPaymentMode || 'N/A'} | Payment: {item.additionalPaymentStatus || 'pending'}</small>{item.additionalTranjectionId && <small>Transaction: {item.additionalTranjectionId}</small>}<div className="additional-actions"><button type="button" onClick={() => updateAdditionalStatus(item, 'Accepted')}>Accept</button><button type="button" onClick={() => updateAdditionalStatus(item, 'Rejected')}>Reject</button></div></article>;})}</Card> : null}</section><Card className="sticky-form additional-form-card"><UploadCloud /><h2>Add Additional Things</h2><form onSubmit={submit}><Field label="Service charge amount" type="number" min="1" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /><Field as="textarea" label="Details" required value={form.details} onChange={e => setForm({...form, details: e.target.value})} /><label className="field"><span>Payment mode</span><select value={form.paymentMode} onChange={e => setForm({...form, paymentMode: e.target.value})}><option value="">Select mode</option><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option></select></label><label className="field"><span>Payment status</span><select value={form.paymentStatus} onChange={e => setForm({...form, paymentStatus: e.target.value})}><option value="pending">Pending</option><option value="half">Half paid</option><option value="full">Fully paid</option></select></label><Field label="Transaction ID" value={form.transactionId} onChange={e => setForm({...form, transactionId: e.target.value})} /><label className="upload-line"><span><strong>Payment proof</strong><small>{form.proof?.name || 'Optional image'}</small></span><input type="file" accept="image/*" onChange={e => setForm({...form, proof: e.target.files[0]})} /></label><Button disabled={saving}>{saving ? 'Submitting...' : 'Submit'}</Button></form></Card></div></div>;
}
