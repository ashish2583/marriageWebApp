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

export default function AdminSettings() {
  const {notify} = useApp();
  const [settings, setSettings] = useState({});
  const [form, setForm] = useState({oldPassword: '', newPassword: '', confirmPassword: ''});
  useEffect(() => {
    apiRequest(endpoints.adminSettings).then(response => setSettings(unwrap(response))).catch(error => notify(error.message, 'error'));
  }, [notify]);
  const submit = async event => {
    event.preventDefault();
    try {
      await apiRequest(endpoints.adminSettingsPassword, {method: 'PUT', body: JSON.stringify(form)});
      setForm({oldPassword: '', newPassword: '', confirmPassword: ''});
      notify('Admin password changed.');
    } catch (error) {
      notify(error.message, 'error');
    }
  };
  return <div className="page"><PageHeader eyebrow="Admin account" title="Settings" text="Admin settings and password flow from the mobile app." /><div className="split-layout"><Card><Store size={34} /><h2>Current settings</h2><p className="section-copy">Notifications: {String(settings.notificationsEnabled ?? settings.notifications ?? 'On')}</p><p className="section-copy">Theme: {settings.theme || 'System'}</p></Card><Card className="sticky-form"><h2>Change password</h2><form onSubmit={submit}><Field label="Old password" type="password" value={form.oldPassword} onChange={e => setForm({...form, oldPassword: e.target.value})} /><Field label="New password" type="password" value={form.newPassword} onChange={e => setForm({...form, newPassword: e.target.value})} /><Field label="Confirm password" type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} /><Button>Change Password</Button></form></Card></div></div>;
}
