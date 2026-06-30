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

export default function PackagePlan() {
  const {session, notify, addToCart} = useApp();
  const [form, setForm] = useState({gender: 'male', level: 'medium', start: '', end: ''});
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);
  const today = todayInputValue();

  const packageProductOf = item => item?.product || item?.productDetails || item?.products || item?.packageProduct || item;
  const packageImageOf = product => {
    const raw = product?.proImage || product?.image || product?.productImage || product?.images;
    const image = Array.isArray(raw) ? raw[0] : raw;
    return typeof image === 'string' ? image : image?.url || image?.uri || asset('image/Wedding.jpg');
  };
  const packageIdOf = (item, index) => getId(packageProductOf(item)) || packageProductOf(item)?.productID || packageProductOf(item)?.productId || `${getName(packageProductOf(item))}-${index}`;

  const fetchPlan = async event => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await apiRequest(endpoints.packagePlan, {
        method: 'POST',
        body: JSON.stringify({
          BookingStartDate: form.start,
          BookingEndDate: form.end,
          gender: form.gender,
          level: form.level,
        }),
      });
      const nextItems = extractList(response);
      setItems(nextItems);
      setSelected(Object.fromEntries(nextItems.map((item, index) => [packageIdOf(item, index), true])));
      notify('Package plan loaded.');
    } catch (error) {
      setItems(fallbackProducts);
      notify(error.message || 'Using local package preview.', 'info');
    } finally {
      setLoading(false);
    }
  };

  const selectedItems = items.filter((item, index) => selected[packageIdOf(item, index)]);
  const packageTotal = selectedItems.reduce((sum, item) => sum + Number(packageProductOf(item).price || 0), 0);

  const addPackage = async () => {
    if (!selectedItems.length) return notify('Please select at least one package product.', 'error');
    try {
      for (const item of selectedItems) {
        const product = packageProductOf(item);
        await apiRequest(endpoints.addCart, {method: 'POST', token: session.token, body: JSON.stringify({userId: userIdOf(session.user), productId: product.productID || product.productId || getId(product), products: product._id || getId(product), BookingStartDate: form.start, BookingEndDate: form.end, quantity: 1})});
        addToCart({...product, start: form.start, end: form.end});
      }
      notify('Package products added to cart.');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  return <div className="page"><PageHeader eyebrow="Curated package" title="Package Plan" text="Build a marriage package from live product suggestions returned by the API." /><div className="package-plan-layout"><Card className="sticky-form package-filter"><PackageCheck /><div className="package-total"><span>Total</span><strong>{formatAmount(packageTotal)}</strong></div><h2>Find package</h2><form onSubmit={fetchPlan}><div className="form-grid"><label className="field"><span>Marriage type</span><select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}><option value="male">Male marriage</option><option value="female">Female marriage</option></select></label><label className="field"><span>Level</span><select value={form.level} onChange={e => setForm({...form, level: e.target.value})}><option value="lower">Lower level</option><option value="medium">Medium level</option><option value="upper">Upper level</option></select></label><Field label="Start date" type="date" required min={today} value={form.start} onChange={e => setForm({...form, start: e.target.value, end: form.end && form.end < e.target.value ? '' : form.end})} /><Field label="End date" type="date" required min={form.start || today} value={form.end} onChange={e => setForm({...form, end: e.target.value})} /></div><Button disabled={loading}>{loading ? 'Loading...' : 'Show Package'}</Button></form><Button type="button" variant="soft" disabled={!selectedItems.length} onClick={addPackage}>Add Selected to Cart</Button></Card><section className="package-product-list">{items.map((item, index) => {const product = packageProductOf(item); const id = packageIdOf(item, index); return <button type="button" className={`package-product-row ${selected[id] ? 'selected' : ''}`} key={id} onClick={() => setSelected(current => ({...current, [id]: !current[id]}))}><span className="package-check" /><img src={packageImageOf(product)} alt="" /><div><strong>{getName(product)}</strong><small>{item.category?.catName || product.catName || 'Package product'}</small></div><b>{formatAmount(product.price)}</b></button>;})}{!items.length && <Empty title="No package selected" text="Choose dates and level to load package suggestions." />}</section></div></div>;
}
