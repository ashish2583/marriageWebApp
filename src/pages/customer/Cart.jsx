import {ArrowRight, CreditCard, MapPin, MessageCircleMore, Minus, Plus, Trash2, UploadCloud} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import GoogleLocationPicker, {calculateDistanceKm, geocodeLocation} from '../../components/GoogleLocationPicker';
import {Button, Card, Empty, Field, Modal, PageHeader} from '../../components/UI';
import {isGuestSession, useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {bookingFormData, cartIdOf, endOf, extractList, productOf, startOf, todayInputValue, userIdOf} from '../../lib/dataHelpers';
import {asset} from '../../lib/demoData';

const paymentModes = ['upi', 'credit_card', 'debit_card', 'cash', 'bank_transfer'];
const onlinePaymentModes = ['upi', 'credit_card', 'debit_card'];
const gatewayModeMap = {upi: 'upi', credit_card: 'card', debit_card: 'card'};
const modeLabel = mode => mode === 'credit_card' ? 'CREDIT CARD' : mode === 'debit_card' ? 'DEBIT CARD' : String(mode).replace('_', ' ').toUpperCase();
const getCustomerEmail = user => user?.email || '';
const getCustomerMobile = user => user?.phone || user?.mobile || user?.number || user?.contactNumber || '';
const formatCardNumber = value => value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const formatCardExpiry = value => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};
const loadRazorpay = () => new Promise(resolve => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

export function Cart() {
  const {session, cart, setCart, setOrders, notify} = useApp(); const [checkoutOpen, setCheckoutOpen] = useState(false); const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({customerName: session.user.name || '', phone: session.user.phone || '', phone2: '', address: session.user.address || '', bookingPlace: '', start: '', end: '', paymentMode: 'upi', paymentStatus: 'pending', bookingDetails: '', paymentProof: null, totalPaidAmount: '', tranjectionId: '', cardHolderName: '', cardNumber: '', cardExpiry: '', cardCvv: ''});
  const [eventLocations, setEventLocations] = useState({});
  const today = todayInputValue();
  const guest = isGuestSession(session);
  useEffect(() => {if (guest) return; apiRequest(`${endpoints.cart}${userIdOf(session.user)}`, {token: session.token}).then(r => setCart(extractList(r))).catch(error => notify(error.message, 'error'));}, [guest, session, setCart, notify]);
  const productKey = (item, index) => `${productOf(item).productID || productOf(item).productId || productOf(item)._id || cartIdOf(item) || 'product'}-${index}`;
  const travelRate = item => Number(productOf(item).travelPerKilometer ?? item.travelPerKilometer ?? 0) || 0;
  const productLocation = item => productOf(item).location || item.location || productOf(item).address || item.vendorLocation || item.venderLocation || '';
  const total = cart.reduce((sum, item) => sum + Number(productOf(item).price || 0) * Number(item.quantity || 1), 0);
  const travelTotal = cart.reduce((sum, item, index) => sum + (Number(eventLocations[productKey(item, index)]?.distance || 0) * travelRate(item)), 0);
  const payableTotal = total + travelTotal;
  const paidAmount = Number(form.totalPaidAmount || 0);
  const isOnlinePayment = onlinePaymentModes.includes(form.paymentMode);
  const isCardPayment = form.paymentMode === 'credit_card' || form.paymentMode === 'debit_card';
  const resolvedPaymentStatus = amount => amount >= payableTotal ? 'full' : 'half';
  const quantity = async (item, change) => {
    const nextQuantity = Math.max(1, Number(item.quantity || 1) + change);
    if (guest) {
      setCart(items => items.map(current => cartIdOf(current) === cartIdOf(item) ? {...current, quantity: nextQuantity} : current));
      return;
    }
    try {
      await apiRequest(`${endpoints.updateCart}${cartIdOf(item)}`, {method: 'PUT', token: session.token, body: JSON.stringify({BookingStartDate: startOf(item), BookingEndDate: endOf(item), quantity: nextQuantity})});
      setCart(items => items.map(current => cartIdOf(current) === cartIdOf(item) ? {...current, quantity: nextQuantity} : current));
    } catch (error) { notify(error.message, 'error'); }
  };
  const remove = async item => {
    if (guest) {
      setCart(items => items.filter(current => cartIdOf(current) !== cartIdOf(item)));
      notify('Cart item deleted.');
      return;
    }
    try {
      await apiRequest(`${endpoints.deleteCart}${cartIdOf(item)}`, {method: 'DELETE', token: session.token});
      setCart(items => items.filter(current => cartIdOf(current) !== cartIdOf(item)));
      notify('Cart item deleted.');
    } catch (error) { notify(error.message, 'error'); }
  };
  const createBookingOrder = async nextForm => {
    const body = bookingFormData({userId: userIdOf(session.user), items: cart, form: nextForm, productEventLocations: eventLocations});
    await apiRequest(endpoints.createBooking, {method: 'POST', token: session.token, body});
    apiRequest(`${endpoints.deleteUserCart}${userIdOf(session.user)}`, {method: 'DELETE', token: session.token})
      .catch(() => {});
    setOrders(items => [{...nextForm, products: cart, orderId: `ORD-${Date.now()}`, status: nextForm.paymentStatus}, ...items]);
    setCart([]);
    setCheckoutOpen(false);
    notify('Booking request created successfully.');
  };
  const takeOnlineBookingPayment = async () => {
    const loaded = await loadRazorpay();
    if (!loaded) throw new Error('Razorpay checkout is not available.');
    const gatewayBookingId = `BOOK-${Date.now()}`;
    const createResponse = await apiRequest(endpoints.createRazorpayPaymentOrder, {
      method: 'POST',
      token: session.token,
      body: JSON.stringify({
        orderId: gatewayBookingId,
        amount: paidAmount,
        currency: 'INR',
        notes: {paymentMode: gatewayModeMap[form.paymentMode] || form.paymentMode, requestedMode: form.paymentMode, source: 'booking'},
      }),
    });
    const createdOrder = createResponse?.order || createResponse?.data?.order || createResponse?.data;
    const keyId = createResponse?.keyId || createResponse?.data?.keyId;
    if (!createdOrder?.id || !keyId) throw new Error(createResponse?.message || 'Payment order not created.');
    return new Promise((resolve, reject) => {
      const razorpay = new window.Razorpay({
        key: keyId,
        amount: createdOrder.amount,
        currency: createdOrder.currency || 'INR',
        name: 'Marriage Booking',
        description: `${modeLabel(form.paymentMode)} payment for booking`,
        order_id: createdOrder.id,
        prefill: {name: form.customerName.trim() || session.user.name || 'Customer', email: getCustomerEmail(session.user), contact: form.phone.trim() || getCustomerMobile(session.user)},
        method: {upi: form.paymentMode === 'upi', card: isCardPayment, netbanking: false, wallet: false},
        theme: {color: '#7a1d59'},
        handler: result => resolve({...result, gatewayBookingId}),
      });
      razorpay.on('payment.failed', response => reject(new Error(response?.error?.description || 'Payment failed.')));
      razorpay.open();
    });
  };
  const checkout = async e => {
    e.preventDefault();
    if (guest) return notify('Please create an account or sign in to complete booking.', 'error');
    if (!form.start || !form.end) return notify('Please select booking start and end date.', 'error');
    if (!form.customerName.trim() || !form.phone.trim() || !form.address.trim()) return notify('Please complete customer details.', 'error');
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) return notify('Please enter a valid total paid amount.', 'error');
    if (paidAmount > payableTotal) return notify('Total paid amount cannot exceed total payable amount.', 'error');
    if (isCardPayment && (!form.cardHolderName.trim() || form.cardNumber.replace(/\D/g, '').length < 12 || form.cardExpiry.length < 5 || form.cardCvv.length < 3)) return notify('Please enter complete card details.', 'error');
    if (!isOnlinePayment && form.paymentMode !== 'cash' && !form.tranjectionId.trim()) return notify('Please enter transaction ID.', 'error');
    if (!isOnlinePayment && !form.paymentProof) return notify('Please upload payment proof image.', 'error');
    setSaving(true);
    try {
      if (isOnlinePayment) {
        const paymentResult = await takeOnlineBookingPayment();
        await apiRequest(endpoints.verifyRazorpayPayment, {
          method: 'POST',
          token: session.token,
          body: JSON.stringify({
            orderId: paymentResult?.gatewayBookingId || paymentResult?.razorpay_order_id,
            amount: paidAmount,
            requestedPaymentMode: form.paymentMode,
            source: 'booking',
            razorpay_order_id: paymentResult?.razorpay_order_id,
            razorpay_payment_id: paymentResult?.razorpay_payment_id,
            razorpay_signature: paymentResult?.razorpay_signature,
          }),
        });
        await createBookingOrder({
          ...form,
          totalPayableAmount: payableTotal,
          paymentStatus: resolvedPaymentStatus(paidAmount),
          tranjectionId: paymentResult?.razorpay_payment_id || paymentResult?.razorpay_order_id || form.tranjectionId,
        });
      } else {
        await createBookingOrder({
          ...form,
          totalPayableAmount: payableTotal,
          paymentStatus: form.paymentMode === 'cash' ? form.paymentStatus : resolvedPaymentStatus(paidAmount),
        });
      }
    } catch (error) { notify(error.message, 'error'); } finally { setSaving(false); }
  };
  const openBooking = () => {
    const initialPaid = payableTotal > 0 ? payableTotal.toFixed(2) : '';
    setForm(current => ({...current, totalPaidAmount: current.totalPaidAmount || initialPaid}));
    setCheckoutOpen(true);
  };
  const setAllLocations = location => {
    setForm(current => ({...current, bookingPlace: location}));
    setEventLocations(Object.fromEntries(cart.map((item, index) => [productKey(item, index), {location, distance: 0}])));
  };
  const selectProductLocation = async (item, index, selected) => {
    const key = productKey(item, index);
    const location = selected.location || '';
    const coordinates = selected.latitude != null && selected.longitude != null ? {lat: selected.latitude, lng: selected.longitude} : null;
    setEventLocations(current => ({...current, [key]: {...current[key], location, coordinates, distance: coordinates ? current[key]?.distance || '' : ''}}));
    if (!coordinates) return;
    try {
      const vendorCoordinates = await geocodeLocation(productLocation(item));
      const distance = vendorCoordinates ? calculateDistanceKm(vendorCoordinates, coordinates) : null;
      setEventLocations(current => ({...current, [key]: {...current[key], distance: distance == null ? '' : distance.toFixed(2)}}));
    } catch {
      setEventLocations(current => ({...current, [key]: {...current[key], distance: ''}}));
    }
  };
  const selectAllLocations = async selected => {
    const location = selected.location || '';
    const coordinates = selected.latitude != null && selected.longitude != null ? {lat: selected.latitude, lng: selected.longitude} : null;
    setForm(current => ({...current, bookingPlace: location}));
    setEventLocations(Object.fromEntries(cart.map((item, index) => [productKey(item, index), {location, coordinates, distance: coordinates ? '' : 0}])));
    if (!coordinates) return;
    const distances = await Promise.all(cart.map(async (item, index) => {
      try {
        const vendorCoordinates = await geocodeLocation(productLocation(item));
        const distance = vendorCoordinates ? calculateDistanceKm(vendorCoordinates, coordinates) : null;
        return [productKey(item, index), distance == null ? '' : distance.toFixed(2)];
      } catch {
        return [productKey(item, index), ''];
      }
    }));
    setEventLocations(current => {
      const next = {...current};
      distances.forEach(([key, distance]) => { next[key] = {...next[key], distance}; });
      return next;
    });
  };
  return (
    <div className="page">
      <PageHeader eyebrow="Your selections" title="My Cart" text="Review packages and booking dates before submitting your request." />
      <div className="cart-layout">
        <section>
          {cart.map(item => {
            const product = productOf(item);
            return (
              <article className="cart-item" key={cartIdOf(item)}>
                <img src={product.proImage?.[0] || asset('image/zz.jpg')} alt="" />
                <div>
                  <h3>{product.proName}</h3>
                  <p>{startOf(item) ? `${startOf(item)} to ${endOf(item)}` : 'Dates selected at checkout'}</p>
                  <strong>Rs. {product.price}</strong>
                </div>
                <div className="quantity">
                  <button type="button" onClick={() => quantity(item, -1)}><Minus /></button>
                  <span>{item.quantity || 1}</span>
                  <button type="button" onClick={() => quantity(item, 1)}><Plus /></button>
                </div>
                <button type="button" className="delete-icon" onClick={() => remove(item)}><Trash2 /></button>
              </article>
            );
          })}
          {!cart.length && <Empty title="Your cart is empty" text="Wedding packages you select will appear here." />}
        </section>
        <aside className="summary-card">
          <span className="eyebrow">Booking summary</span>
          <h2>{cart.length} packages</h2>
          <div><span>Subtotal</span><strong>Rs. {total}</strong></div>
          <div><span>Travel charge</span><strong>Rs. {travelTotal.toFixed(2)}</strong></div>
          <div className="summary-total"><span>Total estimate</span><strong>Rs. {payableTotal.toFixed(2)}</strong></div>
          <Button disabled={!cart.length} onClick={openBooking}>Book <ArrowRight /></Button>
          <div className="admin-connect-card">
            <MessageCircleMore />
            <h3>Connect Admin</h3>
            <p>Share your contact details and location so admin can connect with you.</p>
            <Link className="button button-soft" to="/support">Connect Admin</Link>
          </div>
        </aside>
      </div>
      {checkoutOpen && (
        <Modal title="Booking Form" onClose={() => setCheckoutOpen(false)} wide>
          <form className="checkout-form booking-form-mobile" onSubmit={checkout}>
            <Card className="booking-section-card">
              <h2>Cart products and distance</h2>
              <GoogleLocationPicker label="Enter event location for all products" value={form.bookingPlace} onSelect={selectAllLocations} />
              <button type="button" className="manual-location-link" onClick={() => setAllLocations(form.bookingPlace)}>Use typed location without map</button>
              <div className="booking-product-list">
                {cart.map((item, index) => {
                  const product = productOf(item);
                  const key = productKey(item, index);
                  const eventLocation = eventLocations[key] || {};
                  const itemTravel = Number(eventLocation.distance || 0) * travelRate(item);
                  return (
                    <article className="booking-product-card" key={key}>
                      <img src={product.proImage?.[0] || asset('image/zz.jpg')} alt="" />
                      <div>
                        <h3>{product.proName}</h3>
                        <p>Quantity: {item.quantity || 1} · Rs. {product.price || 0}</p>
                        <p>Product location: {productLocation(item) || 'Not available'}</p>
                      </div>
                      <GoogleLocationPicker label="Event location" value={eventLocation.location || ''} coordinates={eventLocation.coordinates} onSelect={selected => selectProductLocation(item, index, selected)} />
                      <label>
                        <span>Distance (km)</span>
                        <input type="number" min="0" value={eventLocation.distance ?? ''} onChange={e => setEventLocations(current => ({...current, [key]: {...current[key], distance: e.target.value}}))} placeholder="0" />
                      </label>
                      <small>Total travel charge: Rs. {itemTravel.toFixed(2)}</small>
                    </article>
                  );
                })}
              </div>
            </Card>
            <Card className="booking-section-card">
              <h2>Customer details</h2>
              <div className="form-grid">
                <Field label="Customer name" required value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} />
                <Field label="Customer mobile" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                <Field label="Alternate mobile" value={form.phone2} onChange={e => setForm({...form, phone2: e.target.value})} />
              </div>
              <Field as="textarea" label="Customer address" required value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </Card>
            <Card className="booking-section-card">
              <h2>Booking details</h2>
              <div className="booking-date-card"><MapPin /><div><span>Booking date</span><strong>{form.start && form.end ? `${form.start} to ${form.end}` : 'Select booking start and end date'}</strong></div></div>
              <div className="form-grid">
                <Field label="Start Booking Date" type="date" required min={today} value={form.start} onChange={e => setForm({...form, start: e.target.value, end: form.end && form.end < e.target.value ? '' : form.end})} />
                <Field label="End Booking Date" type="date" required min={form.start || today} value={form.end} onChange={e => setForm({...form, end: e.target.value})} />
              </div>
              <Field as="textarea" label="Booking details" value={form.bookingDetails} onChange={e => setForm({...form, bookingDetails: e.target.value})} />
            </Card>
            <Card className="booking-section-card">
              <h2>Payment</h2>
              <div className="payment-summary-box">
                <div><span>Product booking total</span><strong>Rs. {total.toFixed(2)}</strong></div>
                <div><span>Travel charge total</span><strong>Rs. {travelTotal.toFixed(2)}</strong></div>
                <div><span>Total payable amount</span><strong>Rs. {payableTotal.toFixed(2)}</strong></div>
              </div>
              <span className="choice-label">Payment mode</span>
              <div className="segmented-options payment-mode-options">
                {paymentModes.map(value => (
                  <button type="button" className={form.paymentMode === value ? 'active' : ''} key={value} onClick={() => setForm({...form, paymentMode: value, paymentStatus: 'pending', tranjectionId: '', paymentProof: null, cardNumber: value === 'credit_card' || value === 'debit_card' ? form.cardNumber : '', cardExpiry: value === 'credit_card' || value === 'debit_card' ? form.cardExpiry : '', cardCvv: value === 'credit_card' || value === 'debit_card' ? form.cardCvv : ''})}>{modeLabel(value)}</button>
                ))}
              </div>
              {isOnlinePayment ? (
                <div className="upi-payment-panel">
                  <div className="upi-header">
                    <CreditCard />
                    <div><strong>Pay securely online</strong><small>{modeLabel(form.paymentMode)} via Razorpay. Booking is created after successful payment.</small></div>
                    <span>RAZORPAY</span>
                  </div>
                  <div className="quick-amount-row">
                    <button type="button" onClick={() => setForm({...form, totalPaidAmount: (payableTotal / 2).toFixed(2)})}>Pay 50%</button>
                    <button type="button" onClick={() => setForm({...form, totalPaidAmount: payableTotal.toFixed(2)})}>Pay full amount</button>
                  </div>
                  {isCardPayment && (
                    <div className="card-input-panel card-details-panel">
                      <strong>{modeLabel(form.paymentMode)} details</strong>
                      <p>These details are used only for customer confirmation. Final card payment opens in Razorpay secure checkout.</p>
                      <Field label="Card holder name" value={form.cardHolderName || ''} onChange={e => setForm({...form, cardHolderName: e.target.value})} />
                      <Field label="Card number" inputMode="numeric" maxLength="19" placeholder="1234 5678 9012 3456" value={form.cardNumber || ''} onChange={e => setForm({...form, cardNumber: formatCardNumber(e.target.value)})} />
                      <div className="form-grid card-mini-grid">
                        <Field label="Expiry" inputMode="numeric" maxLength="5" placeholder="MM/YY" value={form.cardExpiry || ''} onChange={e => setForm({...form, cardExpiry: formatCardExpiry(e.target.value)})} />
                        <Field label="CVV" inputMode="numeric" maxLength="4" placeholder="***" value={form.cardCvv || ''} onChange={e => setForm({...form, cardCvv: e.target.value.replace(/\D/g, '').slice(0, 4)})} />
                      </div>
                      <small className="razorpay-protected">Protected by Razorpay checkout</small>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <span className="choice-label">Payment status</span>
                  <div className="segmented-options">
                    {[['pending', 'Pending'], ['half', 'Half'], ['full', 'Full']].map(([value, label]) => <button type="button" className={form.paymentStatus === value ? 'active' : ''} key={value} onClick={() => setForm({...form, paymentStatus: value})}>{label}</button>)}
                  </div>
                </>
              )}
              <div className="form-grid">
                <Field label="Total paid amount" type="number" value={form.totalPaidAmount || ''} onChange={e => setForm({...form, totalPaidAmount: e.target.value})} />
                {!isOnlinePayment && <Field label="Transaction ID" value={form.tranjectionId || ''} onChange={e => setForm({...form, tranjectionId: e.target.value})} />}
              </div>
              {!isOnlinePayment && <label className="proof-box"><input type="file" accept="image/*" onChange={e => setForm({...form, paymentProof: e.target.files[0]})} /><UploadCloud /><strong>{form.paymentProof?.name || 'Upload payment proof'}</strong><small>Select receipt or screenshot image</small></label>}
            </Card>
            <Button disabled={saving}>{saving ? 'Submitting...' : isOnlinePayment ? `Pay & Create Order` : 'Proceed to Create Order'}</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
