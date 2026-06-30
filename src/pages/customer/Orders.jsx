import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {MessageCircle, Star, UploadCloud, X} from 'lucide-react';
import {Button, Card, Empty, Field, Modal, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {extractList, formatAmount, getId, getName, orderIdOf, orderProducts, productOf, startOf, endOf, userIdOf} from '../../lib/dataHelpers';
import {asset} from '../../lib/demoData';

const formatDate = value => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return String(value);
  return date.toLocaleDateString('en-GB').replaceAll('/', '-');
};

const amountOf = (...values) => {
  const found = values.find(value => value !== undefined && value !== null && value !== '');
  const amount = Number(found || 0);
  return Number.isFinite(amount) ? amount : 0;
};

const productPublicId = item => {
  const product = productOf(item);
  return item?.productID || item?.productId || item?.proId || item?.orderedProduct?.productID || item?.orderedProduct?.productId || product?.productID || product?.productId || product?.proId || getId(product);
};
const additionalThingsFor = item => {
  const product = productOf(item);
  return [item?.additionalThings, item?.additionalThing, item?.orderedProduct?.additionalThings, item?.orderedProduct?.additionalThing, product?.additionalThings, product?.additionalThing].find(Array.isArray) || [];
};
const additionalOrderAmount = order =>
  amountOf(order.additionalOrderAmount, order.additionalAmount, order.totalAdditionalAmount) ||
  orderProducts(order).reduce((orderSum, item) => orderSum + additionalThingsFor(item).reduce((sum, additional) => sum + amountOf(additional.additionalAmount), 0), 0);
const otherTimePayments = order => [order?.OtherTimePaidAmount, order?.otherTimePaidAmount, order?.otherTimePayments, order?.otherTimePayment].find(Array.isArray) || [];
const otherTimePaymentTotal = order => otherTimePayments(order).reduce((sum, payment) => sum + amountOf(payment.otherTimeAmount), 0);
const paidAmount = order => amountOf(order.TotalPaidAmount, order.totalPaidAmount, order.paidAmount, order.receivedAmount, order.receivedAmountFromCustomer, order.totalReceivedAmount) + otherTimePaymentTotal(order);
const payableAmount = order => amountOf(order.TotalPayableAmount, order.totalPayableAmount, order.totalAmount, order.amount) || orderProducts(order).reduce((sum, item) => sum + Number(productOf(item).price || item.price || 0) * Number(item.quantity || item.qty || 1), 0);
const vendorStatusOf = item => {
  const product = productOf(item);
  return item?.orderedProduct?.vendorAccepted || item?.vendorAccepted || item?.vendorAcceptedStatus || item?.vendorStatus || product?.vendorAccepted || product?.vendorAcceptedStatus || product?.vendorStatus || 'Pending';
};
const vendorStatusClass = status => {
  const normalized = String(status || '').trim().toLowerCase();
  if (['accepted', 'confirmed'].includes(normalized)) return 'accepted';
  if (['rejected', 'cancel', 'cancelled', 'canceled', 'cancled'].includes(normalized)) return 'rejected';
  return 'pending';
};
const isRejectedVendorStatus = status => vendorStatusClass(status) === 'rejected';
const isAcceptedVendorStatus = status => vendorStatusClass(status) === 'accepted';
const isCancelledVendorStatus = status => ['cancel', 'cancelled', 'canceled', 'cancled'].includes(String(status || '').trim().toLowerCase());
const isConfirmedOrder = status => String(status || '').trim().toLowerCase() === 'confirmed';
const categoryIdOf = item => {
  const product = productOf(item);
  const category = item?.category || item?.catId || product?.category || product?.catId || {};
  return typeof category === 'object' ? category.catId || category._id || category.id : category;
};
const categoryNameOf = item => {
  const product = productOf(item);
  const category = item?.category || item?.catId || product?.category || product?.catId || {};
  return typeof category === 'object' ? category.catName || category.name || 'Vendors' : product?.catName || 'Vendors';
};
const firstAvailable = values => values.find(value => value !== undefined && value !== null && value !== '');
const firstUserObject = (...sources) => {
  for (const source of sources) {
    const user = source?.user_id;
    if (Array.isArray(user) && user.length) return user.find(item => item && typeof item === 'object') || {};
    if (user && typeof user === 'object') return user;
  }
  return {};
};
const vendorContactOf = (item, order) => {
  const product = productOf(item);
  const user = firstUserObject(item, product, order);
  const vendor = item?.vendor || item?.vender || item?.vendorDetails || item?.venderDetails || product?.vendor || product?.vender || product?.vendorDetails || product?.venderDetails || order?.vendor || order?.vender || {};
  return {
    id: firstAvailable([user?._id, user?.id, user?.userId, vendor?._id, vendor?.id, vendor?.userId, item?.vendorId, item?.venderId, item?.vendorUserId, item?.venderUserId, product?.userId, product?.userID]),
    name: firstAvailable([user?.name, user?.businessName, vendor?.name, vendor?.businessName, item?.vendorName, item?.venderName, product?.vendorName, product?.venderName]),
    mobile: firstAvailable([user?.phone, user?.mobile, user?.number, vendor?.phone, vendor?.mobile, item?.vendorPhone, item?.vendorMobile, product?.vendorPhone, product?.vendorMobile]),
    email: firstAvailable([user?.email, vendor?.email, item?.vendorEmail, product?.vendorEmail]),
    address: firstAvailable([user?.address, user?.businessAddress, vendor?.address, item?.vendorAddress, product?.vendorAddress]),
    image: firstAvailable([user?.profileImage, vendor?.profileImage, product?.profileImage]),
  };
};

function Stars({value, onChange}) {
  return <div className="rating-stars">{[1, 2, 3, 4, 5].map(score => <button type="button" key={score} className={score <= value ? 'active' : ''} onClick={() => onChange(score)}><Star size={24} fill="currentColor" /></button>)}</div>;
}

export function Orders() {
  const {session, orders, setOrders, notify} = useApp();
  const [paymentHistoryOrder, setPaymentHistoryOrder] = useState(null);
  const [detailsOrder, setDetailsOrder] = useState(null);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [reviewImages, setReviewImages] = useState([]);
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    apiRequest(`${endpoints.orders}${userIdOf(session.user)}`, {token: session.token})
      .then(r => setOrders(extractList(r)))
      .catch(error => notify(error.message, 'error'));
  }, [session, setOrders, notify]);

  const closeRating = () => {
    setRatingOrder(null);
    setRating(5);
    setReview('');
    setReviewImages([]);
  };

  const submitRating = async event => {
    event.preventDefault();
    if (!review.trim()) return notify('Please enter your rating detail.', 'error');
    const productIds = orderProducts(ratingOrder).map(productPublicId).filter(Boolean);
    if (!productIds.length) return notify('Product id not found for rating.', 'error');
    setSubmittingRating(true);
    try {
      for (const productID of productIds) {
        const body = new FormData();
        body.append('productID', productID);
        body.append('orderId', orderIdOf(ratingOrder));
        body.append('rating', String(rating));
        body.append('review', review.trim());
        body.append('customerName', session.user.name || '');
        body.append('customerImage', session.user.profileImage || '');
        reviewImages.forEach(file => body.append('reviewImages', file));
        await apiRequest(endpoints.submitRating, {method: 'POST', token: session.token, body});
      }
      notify('Rating submitted successfully.');
      closeRating();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSubmittingRating(false);
    }
  };

  return <div className="page myorder-page"><PageHeader eyebrow="Booking history" title="My Orders" text="Track your wedding service requests and booking details." /><div className="mobile-order-list">{orders.map((o, index) => {const products = orderProducts(o); return <Card className="mobile-order-card" key={orderIdOf(o) || index}><div className="order-accent" /><div className="mobile-order-head"><div><span>Order</span><h2>#{orderIdOf(o) || index + 1}</h2></div><b className={`order-status-${vendorStatusClass(o.status)}`}>{o.status || 'Pending'}</b></div><div className="mobile-date-panel"><small>Booking Date</small><strong>{formatDate(o.bookingDate || o.BookingDate || o.createdAt)}</strong></div><div className="mobile-product-stack">{products.length ? products.slice(0, 3).map((item, itemIndex) => {const product = productOf(item); const vendorStatus = vendorStatusOf(item); const rejected = isRejectedVendorStatus(vendorStatus); const cancelled = isCancelledVendorStatus(vendorStatus); const accepted = isConfirmedOrder(o.status) && isAcceptedVendorStatus(vendorStatus); const contact = vendorContactOf(item, o); const hasContact = accepted && (contact.name || contact.mobile || contact.email || contact.address); const catId = categoryIdOf(item); const rebookTo = catId ? `/vendors?cat=${catId}&name=${encodeURIComponent(categoryNameOf(item))}` : '/customer/dashboard'; return <div className="mobile-product-line has-action" key={getId(product) || itemIndex}><Link to={`/orders/${orderIdOf(o)}`} state={{order: o, product: item}} className="mobile-product-main"><img src={product.proImage?.[0] || product.image || asset('image/Wedding.jpg')} alt="" /><div><strong>{getName(product)}</strong><p>{productPublicId(item)} <span>|</span> Qty: {item.quantity || item.qty || 1}</p><em className={`vendor-${vendorStatusClass(vendorStatus)}`}>Vendor: {vendorStatus}</em>{cancelled && <div className="discount-voucher"><b>10% OFF</b><span>On rebooking</span></div>}{hasContact && <div className="vendor-contact-box"><b>Vendor contact</b>{contact.name && <span>Name: {contact.name}</span>}{contact.mobile && <span>Mobile: {contact.mobile}</span>}{contact.email && <span>Email: {contact.email}</span>}{contact.address && <span>Address: {contact.address}</span>}</div>}<small>From: {formatDate(startOf(item) || startOf(o))}</small><small>To: {formatDate(endOf(item) || endOf(o))}</small></div></Link><div className="product-action-stack">{hasContact && contact.id && <Link className="product-row-action chat" to="/chat" state={{startChat: {targetId: String(contact.id), targetName: contact.name || 'Vendor', targetRole: 'vendor', targetImage: contact.image || '', type: 'vendor_customer', title: contact.name || getName(product)}}}><MessageCircle size={15} />Chat Vendor</Link>}<Link className={`product-row-action ${rejected ? 'rebook' : 'cancel'}`} to={rejected ? rebookTo : '/cancellation-policy'} state={{order: o, product: item}}>{rejected ? 'Rebooking' : 'Cancel Order'}</Link></div></div>;}) : <p className="no-product-text">Product details not found</p>}{products.length > 3 && <button type="button" className="more-products-button" onClick={() => setDetailsOrder(o)}>+{products.length - 3} more services</button>}</div><p className="mobile-order-address">{o.bookingPlace || o.coustomeraddress || o.customerAddress || session.user.address || 'Address not available'}</p><div className="payment-chip-row"><span>{String(o.paymentStatus || 'Pending').toUpperCase()}</span><b>{String(o.paymentMode || 'Cash').toUpperCase()}</b></div><div className="mobile-total-panel"><div><small>Total Payable</small><strong>{formatAmount(payableAmount(o))}</strong></div><div><small>Additional Order</small><strong>{formatAmount(additionalOrderAmount(o))}</strong></div><div><small>Total Paid</small><strong className="paid">{formatAmount(paidAmount(o))}</strong></div></div><div className="mobile-order-actions"><Link to="/make-payment" state={{order: o, orderId: orderIdOf(o)}}>Make Additional Payment</Link><button type="button" onClick={() => setPaymentHistoryOrder(o)}>Payment History</button><button type="button" onClick={() => setDetailsOrder(o)}>Details</button><button type="button" onClick={() => setRatingOrder(o)}>Rate</button></div></Card>;})}</div>{!orders.length && <Empty title="No orders yet" text="Your submitted wedding bookings will appear here." />}
    {paymentHistoryOrder && <Modal title="Payment History" onClose={() => setPaymentHistoryOrder(null)} wide><div className="payment-history-modal"><div className="history-summary"><div><span>Booking Paid</span><strong>{formatAmount(amountOf(paymentHistoryOrder.TotalPaidAmount, paymentHistoryOrder.totalPaidAmount, paymentHistoryOrder.paidAmount))}</strong></div><div><span>Additional Paid</span><strong>{formatAmount(otherTimePaymentTotal(paymentHistoryOrder))}</strong></div></div>{otherTimePayments(paymentHistoryOrder).length ? otherTimePayments(paymentHistoryOrder).map((payment, index) => <article className="payment-history-item" key={payment._id || payment.otherTimeTranjectionId || index}><div><strong>{formatAmount(payment.otherTimeAmount)}</strong><span>{payment.otherTimeStatus || 'Pending'}</span></div><p>{payment.otherTimeDetails || 'No details added'}</p><small>Mode: {payment.otherTimePaymentMode || 'N/A'} | Payment: {payment.otherTimePaymentStatus || 'pending'}</small>{payment.otherTimeTranjectionId && <small>Transaction: {payment.otherTimeTranjectionId}</small>}{payment.createdAt && <small>Date: {formatDate(payment.createdAt)}</small>}{payment.otherTimePaymentProofUrl && <img src={payment.otherTimePaymentProofUrl} alt="" />}</article>) : <Empty title="No additional payment history" text="Additional payments will appear here." />}</div></Modal>}
    {detailsOrder && <Modal title="Order Details" onClose={() => setDetailsOrder(null)} wide><div className="order-details-modal"><p>{detailsOrder.bookingDetails || 'Tracking details not available'}</p><div className="mobile-product-stack">{orderProducts(detailsOrder).map((item, index) => <Link to={`/orders/${orderIdOf(detailsOrder)}`} state={{order: detailsOrder, product: item}} className="mobile-product-main detail-product-link" key={productPublicId(item) || index}><img src={productOf(item).proImage?.[0] || productOf(item).image || asset('image/Wedding.jpg')} alt="" /><div><strong>{getName(productOf(item))}</strong><p>{productPublicId(item)} | Qty: {item.quantity || item.qty || 1}</p><small>From: {formatDate(startOf(item) || startOf(detailsOrder))}</small><small>To: {formatDate(endOf(item) || endOf(detailsOrder))}</small></div></Link>)}</div></div></Modal>}
    {ratingOrder && <Modal title="Rating" onClose={closeRating}><form className="rating-modal-form" onSubmit={submitRating}><Stars value={rating} onChange={setRating} /><label className="upload-line"><span><strong>Upload review image</strong><small>{reviewImages.length ? `${reviewImages.length} selected` : 'Optional, up to 5 images'}</small></span><UploadCloud /><input multiple type="file" accept="image/*" onChange={e => setReviewImages([...e.target.files].slice(0, 5))} /></label>{reviewImages.length ? <div className="review-preview-list">{reviewImages.map((file, index) => <span key={`${file.name}-${index}`}>{file.name}<button type="button" onClick={() => setReviewImages(current => current.filter((_, itemIndex) => itemIndex !== index))}><X size={14} /></button></span>)}</div> : null}<Field as="textarea" label="Enter detail" required value={review} onChange={e => setReview(e.target.value)} /><Button disabled={submittingRating}>{submittingRating ? 'Submitting...' : 'Confirm'}</Button></form></Modal>}
  </div>;
}
