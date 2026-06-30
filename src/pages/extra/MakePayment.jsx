/* eslint-disable no-unused-vars */
import {CreditCard, Image as ImageIcon, MessageCircleMore, PackageCheck, PartyPopper, Server, ShieldAlert, Store, UploadCloud} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {Button, Card, Field, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {formatAmount, orderProducts, productOf} from '../../lib/dataHelpers';

const paymentModes = ['upi', 'credit_card', 'debit_card', 'cash', 'bank_transfer'];
const paymentStatuses = ['pending', 'half', 'full'];
const onlinePaymentModes = ['upi', 'credit_card', 'debit_card'];
const gatewayModeMap = {upi: 'upi', credit_card: 'card', debit_card: 'card'};

const getIdValue = value => typeof value === 'object' ? value?.$oid || value?._id || value?.id || value?.toString?.() || '' : String(value || '');
const getOrderId = order => getIdValue(order?.orderId || order?.orderID || order?.order_id || order?.OrderId || order?.OrderID || order?._id || order?.id);
const amountOf = (order, keys, fallback = 0) => {
  const key = keys.find(item => order?.[item] !== undefined && order?.[item] !== null && order?.[item] !== '');
  const amount = key ? Number(order[key]) : Number(fallback);
  return Number.isFinite(amount) ? amount : 0;
};
const additionalThingsFor = item => {
  const product = productOf(item);
  return [item?.additionalThings, item?.additionalThing, item?.orderedProduct?.additionalThings, item?.orderedProduct?.additionalThing, product?.additionalThings, product?.additionalThing].find(Array.isArray) || [];
};
const additionalOrderAmount = order => orderProducts(order).reduce((orderSum, item) => orderSum + additionalThingsFor(item).reduce((sum, additional) => sum + Number(additional?.additionalAmount || 0), 0), 0);
const otherTimePayments = order => [order?.OtherTimePaidAmount, order?.otherTimePaidAmount, order?.otherTimePayments, order?.otherTimePayment].find(Array.isArray) || [];
const otherTimePaymentTotal = order => otherTimePayments(order).reduce((sum, payment) => sum + Number(payment?.otherTimeAmount || 0), 0);
const modeLabel = mode => mode === 'credit_card' ? 'CREDIT CARD' : mode === 'debit_card' ? 'DEBIT CARD' : String(mode).replace('_', ' ').toUpperCase();
const getCustomerName = user => user?.name || user?.fullName || user?.customerName || 'Customer';
const getCustomerMobile = user => user?.phone || user?.mobile || user?.number || user?.contactNumber || '';
const getCustomerEmail = user => user?.email || '';

const loadRazorpay = () => new Promise(resolve => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

export default function MakePayment() {
  const {session, notify} = useApp();
  const {state} = useLocation();
  const order = state?.order || {};
  const orderId = getIdValue(state?.orderId) || getOrderId(order);
  const bookingPayableAmount = amountOf(order, ['TotalPayableAmount', 'totalPayableAmount', 'totalAmount', 'amount']);
  const additionalAmount = additionalOrderAmount(order);
  const totalPayableAmount = bookingPayableAmount + additionalAmount;
  const bookingPaidAmount = amountOf(order, ['TotalPaidAmount', 'totalPaidAmount', 'paidAmount']);
  const totalPaidAmount = bookingPaidAmount + otherTimePaymentTotal(order);
  const pendingAmount = Math.max(totalPayableAmount - totalPaidAmount, 0);
  const [form, setForm] = useState({amount: pendingAmount ? pendingAmount.toFixed(2) : '', paymentMode: 'upi', paymentStatus: 'pending', transactionId: '', cardHolderName: '', note: '', proof: null});
  const [saving, setSaving] = useState(false);
  const amountNumber = useMemo(() => Number(form.amount), [form.amount]);
  const isOnline = onlinePaymentModes.includes(form.paymentMode);
  const isCard = form.paymentMode === 'credit_card' || form.paymentMode === 'debit_card';
  const resolvedPaymentStatus = () => amountNumber >= pendingAmount ? 'full' : 'half';

  const validateAmount = () => {
    if (!orderId) return notify('Order id not found.', 'error'), false;
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) return notify('Please enter valid payment amount.', 'error'), false;
    if (pendingAmount > 0 && amountNumber > pendingAmount) return notify('Payment amount cannot exceed pending amount.', 'error'), false;
    return true;
  };

  const startOnlinePayment = async () => {
    if (!validateAmount()) return;
    setSaving(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error('Razorpay checkout is not available.');
      const details = form.note.trim() || `${modeLabel(form.paymentMode)} payment for order ${orderId}`;
      const createResponse = await apiRequest(endpoints.createRazorpayPaymentOrder, {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({orderId, amount: amountNumber, currency: 'INR', notes: {paymentMode: gatewayModeMap[form.paymentMode] || form.paymentMode, requestedMode: form.paymentMode}}),
      });
      const createdOrder = createResponse?.order || createResponse?.data?.order || createResponse?.data;
      const keyId = createResponse?.keyId || createResponse?.data?.keyId;
      if (!createdOrder?.id || !keyId) throw new Error(createResponse?.message || 'Payment order not created.');
      await new Promise((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: keyId,
          amount: createdOrder.amount,
          currency: createdOrder.currency || 'INR',
          name: 'Marriage Booking',
          description: details,
          order_id: createdOrder.id,
          prefill: {name: form.cardHolderName.trim() || getCustomerName(session.user), email: getCustomerEmail(session.user), contact: getCustomerMobile(session.user)},
          method: {upi: form.paymentMode === 'upi', card: isCard, netbanking: false, wallet: false},
          theme: {color: '#7a1d59'},
          handler: resolve,
        });
        razorpay.on('payment.failed', response => reject(new Error(response?.error?.description || 'Payment failed.')));
        razorpay.open();
      }).then(result => apiRequest(endpoints.verifyRazorpayPayment, {
        method: 'POST',
        token: session.token,
        body: JSON.stringify({
          orderId,
          amount: amountNumber,
          otherTimeDetails: details,
          otherTimePaymentStatus: resolvedPaymentStatus(),
          requestedPaymentMode: form.paymentMode,
          razorpay_order_id: result.razorpay_order_id,
          razorpay_payment_id: result.razorpay_payment_id,
          razorpay_signature: result.razorpay_signature,
        }),
      }));
      notify('Payment completed successfully.');
    } catch (error) {
      notify(error.message || 'Payment cancelled.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitManualPayment = async () => {
    if (!validateAmount()) return;
    if (form.paymentMode !== 'cash' && !form.transactionId.trim()) return notify('Please enter transaction id.', 'error');
    if (!form.proof) return notify('Please upload payment proof image.', 'error');
    if (!form.note.trim()) return notify('Please enter payment details.', 'error');
    setSaving(true);
    const body = new FormData();
    const payload = {
      orderId,
      otherTimeAmount: amountNumber,
      otherTimeDetails: form.note.trim(),
      otherTimePaymentMode: form.paymentMode,
      otherTimeTranjectionId: form.transactionId.trim(),
      otherTimePaymentStatus: form.paymentMode === 'cash' ? form.paymentStatus : resolvedPaymentStatus(),
      otherTimeStatus: 'Pending',
    };
    Object.entries(payload).forEach(([key, value]) => body.append(key, String(value ?? '')));
    body.append('otherTimePaymentProofUrl', form.proof);
    try {
      await apiRequest(endpoints.otherTimePayment, {method: 'POST', token: session.token, body});
      notify('Payment details submitted.');
      setForm(current => ({...current, transactionId: '', note: '', proof: null}));
    } catch (error) {
      notify(error.message || 'Payment details not submitted.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submit = event => {
    event.preventDefault();
    return isOnline ? startOnlinePayment() : submitManualPayment();
  };

  return <div className="page make-payment-page"><PageHeader eyebrow="Payments" title="Make Payment" text="Submit additional order payment using UPI/card Razorpay checkout or manual payment proof." /><div className="split-layout"><section><Card className="mobile-order-card"><div className="mobile-order-head"><div><span>Order</span><h2>#{orderId || 'Not available'}</h2></div></div><div className="mobile-total-panel"><div><small>Total Payable</small><strong>{formatAmount(bookingPayableAmount)}</strong></div><div><small>Additional Order</small><strong>{formatAmount(additionalAmount)}</strong></div><div><small>Already Paid</small><strong className="paid">{formatAmount(totalPaidAmount)}</strong></div></div><div className="package-total"><span>Pending Amount</span><strong>{formatAmount(pendingAmount)}</strong></div></Card></section><Card className="sticky-form make-payment-form"><CreditCard /><h2>Payment details</h2><form onSubmit={submit}><Field label="Payment amount" type="number" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value.replace(/[^0-9.]/g, '')})} /><span className="choice-label">Payment mode</span><div className="segmented-options payment-mode-options">{paymentModes.map(mode => <button type="button" className={form.paymentMode === mode ? 'active' : ''} key={mode} onClick={() => setForm({...form, paymentMode: mode, paymentStatus: 'pending', transactionId: '', proof: null})}>{modeLabel(mode)}</button>)}</div>{isOnline ? <div className="upi-payment-panel"><div className="upi-header"><CreditCard /><div><strong>Pay securely online</strong><small>{modeLabel(form.paymentMode)} via Razorpay</small></div><span>RAZORPAY</span></div><p className="section-copy">Complete payment in secure checkout. After success, the portal verifies it automatically and saves it to payment history.</p><div className="payment-summary-box"><div><span>Pay amount</span><strong>{formatAmount(amountNumber || 0)}</strong></div></div>{isCard && <div className="card-input-panel"><strong>{modeLabel(form.paymentMode)}</strong><p>Card number, expiry and CVV open only inside Razorpay secure checkout.</p><Field label="Card holder name" value={form.cardHolderName} onChange={e => setForm({...form, cardHolderName: e.target.value})} /></div>}<div className="quick-amount-row"><button type="button" onClick={() => setForm({...form, amount: (pendingAmount / 2).toFixed(2)})}>Pay 50%</button><button type="button" onClick={() => setForm({...form, amount: pendingAmount.toFixed(2)})}>Pay full amount</button></div></div> : <><span className="choice-label">Payment status</span><div className="segmented-options">{paymentStatuses.map(status => <button type="button" className={form.paymentStatus === status ? 'active' : ''} key={status} onClick={() => setForm({...form, paymentStatus: status})}>{status.toUpperCase()}</button>)}</div><Field label="Transaction ID" value={form.transactionId} onChange={e => setForm({...form, transactionId: e.target.value})} /><label className="proof-box"><input type="file" accept="image/*" onChange={e => setForm({...form, proof: e.target.files[0]})} /><UploadCloud /><strong>{form.proof?.name || 'Upload payment proof'}</strong><small>Camera/gallery image is required</small></label></>}<Field as="textarea" label="Payment details" required value={form.note} onChange={e => setForm({...form, note: e.target.value})} /><Button disabled={saving}>{saving ? 'Processing...' : isOnline ? `Pay by ${modeLabel(form.paymentMode)}` : 'Submit Payment'}</Button></form></Card></div></div>;
}
