/* eslint-disable no-unused-vars */
import {ArrowRight, CalendarDays, Camera, IndianRupee, PackagePlus, Pencil, Plus, ShoppingBag, Tags, Trash2} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {Button, Card, Confirm, Empty, Field, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {bookingFormData, endOf, extractList, orderIdOf, orderProducts, productOf, productPublicId, startOf, todayInputValue, userIdOf} from '../../lib/dataHelpers';
import {asset} from '../../lib/demoData';


export function VendorProducts() {
  const {session, localProducts, setLocalProducts, notify} = useApp(); const [items, setItems] = useState(localProducts); const [deleting, setDeleting] = useState(null);
  useEffect(() => {apiRequest(endpoints.vendorProducts, {method: 'POST', token: session.token, body: JSON.stringify({userId: userIdOf(session.user)})}).then(r => {const products = extractList(r); setItems(products); setLocalProducts(products);}).catch(error => notify(error.message, 'error'));}, [session, notify, setLocalProducts]);
  const remove = async item => {try {await apiRequest(`${endpoints.deleteProduct}${item._id}`, {method: 'DELETE', token: session.token});} catch (error) {return notify(error.message, 'error');} const next = items.filter(p => p._id !== item._id); setItems(next); setLocalProducts(next); setDeleting(null); notify('Product deleted.');};
  return <div className="page"><PageHeader eyebrow="Vendor catalog" title="My Products" text="Review, edit, and manage every service package." actions={<Link to="/vendor/products/new" className="button button-primary"><Plus />Add Product</Link>} /><div className="manage-list">{items.map(p => {const productId = p._id || p.id || p.productID || p.productId || p.proId; return <article key={productId}><img src={p.proImage?.[0] || asset('image/zz.jpg')} alt="" /><div><span className="price"><IndianRupee size={14} />{p.price}</span><h3>{p.proName}</h3><p>{p.shortDetails}</p></div><div className="manage-actions"><Link to={`/vendor/products/${productId}/edit`} state={{product: p}}><Pencil />Edit</Link><button onClick={() => setDeleting(p)}><Trash2 />Delete</button></div></article>;})}</div>{!items.length && <Empty title="No products yet" text="Add your first service package to start building your catalog." />}{deleting && <Confirm title="Delete product?" text="This product will be permanently removed from your vendor catalog." onClose={() => setDeleting(null)} onConfirm={() => remove(deleting)} />}</div>;
}
