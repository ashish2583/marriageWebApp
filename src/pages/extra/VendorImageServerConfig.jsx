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

export default function VendorImageServerConfig() {
  const {session, updateSessionUser, notify} = useApp();
  const [baseUrl, setBaseUrl] = useState(session.user.imageServerBaseUrl || '');
  const [testResult, setTestResult] = useState('');
  const cleanBaseUrl = value => value.trim().replace(/\/+$/, '');
  const test = async () => {
    const clean = cleanBaseUrl(baseUrl);
    if (!clean.startsWith('https://')) return notify('Ngrok URL must start with https://', 'error');
    try {
      const health = await fetch(`${clean}/health`);
      const json = await health.json();
      setTestResult(json?.status === true ? 'Connected successfully.' : 'Server not reachable.');
    } catch {
      setTestResult('Server not reachable. Check ngrok and local server.');
    }
  };
  const save = async () => {
    const clean = cleanBaseUrl(baseUrl);
    try {
      await apiRequest(endpoints.updateVendorImageServer, {method: 'PUT', body: JSON.stringify({baseUrl: clean})});
      updateSessionUser({imageServerBaseUrl: clean});
      notify('Laptop image server URL saved.');
    } catch (error) {
      notify(error.message, 'error');
    }
  };
  return <div className="page"><PageHeader eyebrow="Vendor tools" title="Image Server Setup" text="Connect the same laptop/ngrok image server used by the mobile vendor setup screen." /><div className="split-layout"><Card><Server size={34} /><h2>Setup checklist</h2>{['Download my-images zip from the mobile bundle or project assets.', 'Install Node.js and ngrok.', 'Run npm install and npm start inside local-image-server.', 'Run ngrok http 8000.', 'Paste the HTTPS URL here and save it.'].map(step => <p className="section-copy" key={step}>{step}</p>)}</Card><Card className="sticky-form"><h2>Ngrok URL</h2><Field label="URL" placeholder="https://xxxx.ngrok-free.app" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />{testResult && <p className="section-copy">{testResult}</p>}<Button type="button" variant="soft" onClick={test}>Test URL</Button><Button type="button" onClick={save}>Save Laptop Image URL</Button></Card></div></div>;
}
