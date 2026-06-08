import {ArrowRight, CalendarDays, ChevronRight, IndianRupee, MapPin, MessageCircleMore, Minus, Plus, Search, ShoppingCart, Sparkles, Star, Trash2, Users} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Link, useLocation, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {Button, Card, Empty, Field, Modal, PageHeader} from '../components/UI';
import {useApp} from '../lib/AppContext';
import {apiRequest, endpoints, unwrap} from '../lib/api';
import {bookingFormData, cartIdOf, endOf, extractList, isDemoSession, orderIdOf, orderProducts, productMongoId, productOf, productPublicId, startOf, userIdOf} from '../lib/dataHelpers';
import {asset, products as fallbackProducts} from '../lib/demoData';

export function CustomerHome() {
  const {session, localCategories} = useApp(); const [items, setItems] = useState(localCategories); const [query, setQuery] = useState('');
  useEffect(() => {apiRequest(endpoints.categories, {token: session.token}).then(r => setItems(unwrap(r))).catch(() => {});}, [session.token]);
  const filtered = items.filter(item => item.catName?.toLowerCase().includes(query.toLowerCase()));
  return <div className="page"><section className="customer-hero"><div className="hero-content"><span className="eyebrow light">Wedding booking platform</span><h1>Plan every beautiful moment in one place.</h1><p>Explore trusted wedding services, compare vendors, and book confidently.</p><div className="hero-search"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search wedding services" /></div></div><div className="hero-photo"><img src={asset('image/Wedding.jpg')} alt="Wedding celebration" /><div className="hero-stat"><strong>One place</strong><span>for every celebration detail</span></div></div></section>
    <section className="section"><div className="section-heading"><div><span className="eyebrow">Curated for your day</span><h2>Popular services</h2></div></div><div className="feature-strip">{[['Decor', 'image/flor.jpg'], ['Catering', 'image/catering.webp'], ['Music', 'image/dj.jpg'], ['Wedding rides', 'image/weddingcar.jpg']].map(([name, img]) => <div key={name}><img src={asset(img)} alt="" /><strong>{name}</strong></div>)}</div></section>
    <section className="section"><div className="section-heading"><div><span className="eyebrow">Browse categories</span><h2>Build your celebration team</h2></div><span>{filtered.length} services</span></div><div className="category-grid">{filtered.map(item => <Link className="category-card" key={item.catId || item._id} to={`/vendors?cat=${item.catId || item._id}&name=${encodeURIComponent(item.catName)}`}><img src={item.catImage || asset('image/Wedding.jpg')} alt="" /><div><span>Explore service</span><h3>{item.catName}</h3><ArrowRight /></div></Link>)}</div></section>
  </div>;
}

export function Vendors() {
  const {session, demoVendors} = useApp(); const [params] = useSearchParams(); const [items, setItems] = useState(demoVendors);
  const cat = params.get('cat'); const name = params.get('name') || 'Vendors';
  useEffect(() => {if (cat) apiRequest(`${endpoints.vendorsByCategory}${cat}`, {token: session.token}).then(r => setItems(unwrap(r))).catch(() => {});}, [cat, session.token]);
  return <div className="page"><PageHeader eyebrow="Trusted professionals" title={name} text="Compare service providers and explore their available packages." /><div className="vendor-grid">{items.map(v => <Link className="vendor-card" key={v.userId || v._id} to={`/products?vendor=${v.userId || v._id}&cat=${cat}&vendorName=${encodeURIComponent(v.name)}&catName=${encodeURIComponent(name)}`}><img src={v.profileImage || asset('image/Wedding.jpg')} alt="" /><div className="vendor-body"><span className="rating"><Star size={14} fill="currentColor" /> 4.8</span><h3>{v.name}</h3><p><MapPin size={15} />{v.address || 'Wedding service provider'}</p><Button variant="soft">View services <ChevronRight size={16} /></Button></div></Link>)}</div></div>;
}

export function Products() {
  const {session, localProducts} = useApp(); const [params] = useSearchParams(); const navigate = useNavigate(); const [items, setItems] = useState(localProducts);
  const vendor = params.get('vendor'), cat = params.get('cat'), vendorName = params.get('vendorName') || 'Vendor';
  useEffect(() => {apiRequest(endpoints.customerProducts, {method: 'POST', token: session.token, body: JSON.stringify({venderUserId: vendor, catId: cat})}).then(r => setItems(unwrap(r))).catch(() => setItems(localProducts.filter(p => (!vendor || p.userId === vendor) && (!cat || p.catId === cat))));}, [vendor, cat, session.token, localProducts]);
  return <div className="page"><PageHeader eyebrow="Available packages" title={vendorName} text={`Explore ${params.get('catName') || 'wedding'} services and choose the right package.`} /><div className="product-grid">{items.map(p => <article className="product-card" key={p._id} onClick={() => navigate(`/product/${p._id}`, {state: {product: p}})}><img src={p.proImage?.[0] || asset('image/zz.jpg')} alt="" /><div className="product-body"><span className="price"><IndianRupee size={15} />{p.price}</span><h3>{p.proName}</h3><p>{p.shortDetails}</p><Button variant="soft">View package <ArrowRight size={16} /></Button></div></article>)}</div>{!items.length && <Empty title="No products found" text="This vendor has not added packages in this category yet." />}</div>;
}

export function ProductDetail() {
  const {id} = useParams(); const location = useLocation(); const {session, localProducts, addToCart, notify} = useApp(); const product = location.state?.product || localProducts.find(p => p._id === id) || fallbackProducts[0]; const [image, setImage] = useState(product.proImage?.[0]); const [video, setVideo] = useState(null); const [dates, setDates] = useState({start: '', end: ''}); const [saving, setSaving] = useState(false);
  const book = async () => {
    if (!dates.start || !dates.end) return notify('Choose booking start and end dates.', 'error');
    if (dates.end < dates.start) return notify('End date must be after start date.', 'error');
    setSaving(true);
    try {
      if (!isDemoSession(session)) {
        await apiRequest(endpoints.checkBooking, {method: 'POST', token: session.token, body: JSON.stringify({productID: productPublicId(product), BookingStartDate: dates.start, BookingEndDate: dates.end})});
        await apiRequest(endpoints.addCart, {method: 'POST', token: session.token, body: JSON.stringify({userId: userIdOf(session.user), productId: productPublicId(product), products: productMongoId(product), BookingStartDate: dates.start, BookingEndDate: dates.end, quantity: 1})});
      }
      addToCart({...product, start: dates.start, end: dates.end});
    } catch (error) { notify(error.message, 'error'); } finally { setSaving(false); }
  };
  return <div className="page"><div className="detail-layout"><section className="gallery"><div className="main-media"><img src={image} alt="" /></div><div className="thumbs">{product.proImage?.map(url => <button className={image === url ? 'active' : ''} key={url} onClick={() => setImage(url)}><img src={url} alt="" /></button>)}{product.proVideo?.map(url => <button key={url} className="video-thumb" onClick={() => setVideo(url)}>Play video</button>)}</div></section><aside className="detail-card"><span className="eyebrow">Wedding package</span><h1>{product.proName}</h1><div className="detail-price"><IndianRupee />{product.price}<small>per booking</small></div><p>{product.shortDetails}</p><div className="date-grid"><label><span>Start date</span><input type="date" value={dates.start} onChange={e => setDates({...dates, start: e.target.value})} /></label><label><span>End date</span><input type="date" value={dates.end} onChange={e => setDates({...dates, end: e.target.value})} /></label></div><Button disabled={saving} onClick={book}><ShoppingCart size={18} />{saving ? 'Checking...' : 'Add to Cart'}</Button><div className="assurances"><span><Sparkles />Carefully presented service</span><span><CalendarDays />Booking dates checked before confirmation</span></div></aside></div><Card className="description-card"><span className="eyebrow">About this package</span><h2>What is included</h2><p>{product.longDetails}</p></Card>{video && <Modal title="Video preview" onClose={() => setVideo(null)} wide><video controls autoPlay src={video} className="video-player" /></Modal>}</div>;
}

export function Cart() {
  const {session, cart, setCart, setOrders, notify} = useApp(); const [checkoutOpen, setCheckoutOpen] = useState(false); const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({customerName: session.user.name || '', phone: session.user.phone || '', phone2: '', address: session.user.address || '', bookingPlace: '', start: '', end: '', paymentMode: 'cash', paymentStatus: 'pending', bookingDetails: '', paymentProof: null});
  useEffect(() => {if (isDemoSession(session)) return; apiRequest(`${endpoints.cart}${userIdOf(session.user)}`, {token: session.token}).then(r => setCart(extractList(r))).catch(error => notify(error.message, 'error'));}, [session, setCart, notify]);
  const total = cart.reduce((sum, item) => sum + Number(productOf(item).price || 0) * Number(item.quantity || 1), 0);
  const quantity = async (item, change) => {
    const nextQuantity = Math.max(1, Number(item.quantity || 1) + change);
    try {
      if (!isDemoSession(session)) await apiRequest(`${endpoints.updateCart}${cartIdOf(item)}`, {method: 'PUT', token: session.token, body: JSON.stringify({BookingStartDate: startOf(item), BookingEndDate: endOf(item), quantity: nextQuantity})});
      setCart(items => items.map(current => cartIdOf(current) === cartIdOf(item) ? {...current, quantity: nextQuantity} : current));
    } catch (error) { notify(error.message, 'error'); }
  };
  const remove = async item => {
    try {
      if (!isDemoSession(session)) await apiRequest(`${endpoints.deleteCart}${cartIdOf(item)}`, {method: 'DELETE', token: session.token});
      setCart(items => items.filter(current => cartIdOf(current) !== cartIdOf(item)));
      notify('Cart item deleted.');
    } catch (error) { notify(error.message, 'error'); }
  };
  const checkout = async e => {
    e.preventDefault();
    if (!form.paymentProof && !isDemoSession(session)) return notify('Payment proof is required.', 'error');
    setSaving(true);
    try {
      if (!isDemoSession(session)) {
        await apiRequest(endpoints.createBooking, {method: 'POST', token: session.token, body: bookingFormData({userId: userIdOf(session.user), items: cart, form})});
        await apiRequest(`${endpoints.deleteUserCart}${userIdOf(session.user)}`, {method: 'DELETE', token: session.token});
      }
      setOrders(items => [{...form, products: cart, orderId: `ORD-${Date.now()}`, status: form.paymentStatus}, ...items]);
      setCart([]); setCheckoutOpen(false); notify('Booking request created successfully.');
    } catch (error) { notify(error.message, 'error'); } finally { setSaving(false); }
  };
  return <div className="page"><PageHeader eyebrow="Your selections" title="My Cart" text="Review packages and booking dates before submitting your request." /><div className="cart-layout"><section>{cart.map(item => {const product = productOf(item); return <article className="cart-item" key={cartIdOf(item)}><img src={product.proImage?.[0] || asset('image/zz.jpg')} alt="" /><div><h3>{product.proName}</h3><p>{startOf(item) ? `${startOf(item)} to ${endOf(item)}` : 'Dates selected at checkout'}</p><strong>Rs. {product.price}</strong></div><div className="quantity"><button onClick={() => quantity(item, -1)}><Minus /></button><span>{item.quantity || 1}</span><button onClick={() => quantity(item, 1)}><Plus /></button></div><button className="delete-icon" onClick={() => remove(item)}><Trash2 /></button></article>;})}{!cart.length && <Empty title="Your cart is empty" text="Wedding packages you select will appear here." />}</section><aside className="summary-card"><span className="eyebrow">Booking summary</span><h2>{cart.length} packages</h2><div><span>Subtotal</span><strong>Rs. {total}</strong></div><div><span>Service support</span><strong>Included</strong></div><div className="summary-total"><span>Total estimate</span><strong>Rs. {total}</strong></div><Button disabled={!cart.length} onClick={() => setCheckoutOpen(true)}>Request Booking <ArrowRight /></Button></aside></div>{checkoutOpen && <Modal title="Complete booking request" onClose={() => setCheckoutOpen(false)} wide><form className="checkout-form" onSubmit={checkout}><div className="form-grid"><Field label="Customer name" required value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} /><Field label="Mobile number" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /><Field label="Alternate mobile" value={form.phone2} onChange={e => setForm({...form, phone2: e.target.value})} /><Field label="Booking place" required value={form.bookingPlace} onChange={e => setForm({...form, bookingPlace: e.target.value})} /><Field label="Start date" type="date" required value={form.start} onChange={e => setForm({...form, start: e.target.value})} /><Field label="End date" type="date" required min={form.start} value={form.end} onChange={e => setForm({...form, end: e.target.value})} /></div><Field as="textarea" label="Customer address" required value={form.address} onChange={e => setForm({...form, address: e.target.value})} /><Field as="textarea" label="Booking details" value={form.bookingDetails} onChange={e => setForm({...form, bookingDetails: e.target.value})} /><div className="form-grid"><label className="field"><span>Payment mode</span><select value={form.paymentMode} onChange={e => setForm({...form, paymentMode: e.target.value})}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option></select></label><label className="field"><span>Payment status</span><select value={form.paymentStatus} onChange={e => setForm({...form, paymentStatus: e.target.value})}><option value="pending">Pending</option><option value="half">Half paid</option><option value="full">Fully paid</option></select></label></div><label className="upload-line"><span><strong>Payment proof</strong><small>{form.paymentProof?.name || 'Choose image'}</small></span><input type="file" accept="image/*" onChange={e => setForm({...form, paymentProof: e.target.files[0]})} /></label><Button disabled={saving}>{saving ? 'Submitting...' : 'Create Booking'}</Button></form></Modal>}</div>;
}

export function Orders() {
  const {session, orders, setOrders, notify} = useApp();
  useEffect(() => {if (isDemoSession(session)) return; apiRequest(`${endpoints.orders}${userIdOf(session.user)}`, {token: session.token}).then(r => setOrders(extractList(r))).catch(error => notify(error.message, 'error'));}, [session, setOrders, notify]);
  return <div className="page"><PageHeader eyebrow="Booking history" title="My Orders" text="Track your wedding service requests and booking details." /><div className="order-list">{orders.map(o => {const products = orderProducts(o); return <Card key={orderIdOf(o)}><div className="order-top"><div><span className="eyebrow">{orderIdOf(o)}</span><h3>{products.map(item => productOf(item).proName || productOf(item).productName).filter(Boolean).join(', ') || 'Wedding booking'}</h3></div><span className="status">{o.status || o.paymentStatus || 'Pending'}</span></div><p>{startOf(o) ? `${startOf(o)} to ${endOf(o)}` : 'Booking dates pending'}</p><strong>{products.length} product{products.length === 1 ? '' : 's'}</strong></Card>;})}</div>{!orders.length && <Empty title="No orders yet" text="Your submitted wedding bookings will appear here." />}</div>;
}

export function Support() {
  const {session, notify} = useApp(); const user = session.user; const [form, setForm] = useState({name: user.name || '', mobile: user.phone || '', email: user.email || '', address: user.address || '', location: '', cartId: ''});
  const submit = async e => {e.preventDefault(); try {await apiRequest(endpoints.support, {method: 'POST', token: session.token, body: JSON.stringify({userID: userIdOf(user), cartId: form.cartId || ' ', coustomerName: form.name, coustomerMobile: form.mobile, coustomerEmail: form.email, coustomerAddress: form.address, coustomerLocation: form.location})}); setForm({...form, location: '', cartId: ''}); notify('Your request was sent to support.');} catch (error) {notify(error.message, 'error');}};
  return <div className="page"><PageHeader eyebrow="We are here to help" title="Support & Chat" text="Send your question to the Merrage team. We will help with services, bookings, or account issues." /><div className="support-layout"><Card><MessageCircleMore size={30} /><h2>Connect with admin</h2><p>Share your contact and booking location details so the team can assist you.</p><form onSubmit={submit}><div className="form-grid"><Field label="Name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /><Field label="Mobile" required value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} /><Field label="Email" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} /><Field label="Cart ID (optional)" value={form.cartId} onChange={e => setForm({...form, cartId: e.target.value})} /></div><Field as="textarea" label="Address" required value={form.address} onChange={e => setForm({...form, address: e.target.value})} /><Field as="textarea" label="Location or query details" required value={form.location} onChange={e => setForm({...form, location: e.target.value})} /><Button>Send Request</Button></form></Card><Card className="support-points"><h3>Common questions</h3><p><Users />Finding the right vendor</p><p><CalendarDays />Checking booking availability</p><p><ShoppingCart />Updating cart or booking details</p></Card></div></div>;
}
