import {RefreshCw} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Button, Empty, Loading, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {API_BASE_URL, apiRequest, endpoints} from '../../lib/api';
import {asset} from '../../lib/demoData';
import {extractList, userIdOf} from '../../lib/dataHelpers';

const extractOrders = response => {
  const data = response?.data || response?.orders || response;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.orders)) return data.orders;
  if (Array.isArray(data?.cancelledOrders)) return data.cancelledOrders;
  if (Array.isArray(data?.cancledOrders)) return data.cancledOrders;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizeDate = value => {
  if (!value) return '';
  const raw = value?.$date || value;
  const text = String(raw);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return text;
  const day = `${parsed.getDate()}`.padStart(2, '0');
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  return `${day}-${month}-${parsed.getFullYear()}`;
};

const getProducts = order => {
  if (Array.isArray(order?.products) && order.products.length) return order.products;
  if (Array.isArray(order?.cancelledProducts) && order.cancelledProducts.length) return order.cancelledProducts;
  if (Array.isArray(order?.cancledProducts) && order.cancledProducts.length) return order.cancledProducts;
  if (Array.isArray(order?.cancelProducts) && order.cancelProducts.length) return order.cancelProducts;
  if (Array.isArray(order?.canceledProducts) && order.canceledProducts.length) return order.canceledProducts;
  if (order?.productID || order?.product || order?.products) return [order];
  return [];
};

const getProductObject = item => {
  if (item?.product && typeof item.product === 'object') return item.product;
  if (item?.products && typeof item.products === 'object') return item.products;
  if (item?.orderedProduct && typeof item.orderedProduct === 'object') return item.orderedProduct;
  if (item?.productDetails && typeof item.productDetails === 'object') return item.productDetails;
  if (item?.productData && typeof item.productData === 'object') return item.productData;
  if (item?.cancelledProduct && typeof item.cancelledProduct === 'object') return item.cancelledProduct;
  return item || {};
};

const firstValue = (...values) => values.find(value => value !== undefined && value !== null && value !== '');
const firstNumber = (...values) => {
  const value = values.find(item => item !== undefined && item !== null && item !== '' && Number.isFinite(Number(item)));
  return value === undefined ? 0 : Number(value);
};
const getRawProductId = item => {
  const product = getProductObject(item);
  return firstValue(item?.productID, product?.productID, product?.productId, product?.proId, item?.productId, item?.proId, item?.productCode, product?.productCode, '');
};
const resolveProduct = (item, productLookup = {}) => {
  const product = getProductObject(item);
  const id = getRawProductId(item);
  const found = productLookup[id] || productLookup[String(id).toLowerCase()];
  if (!found) return product;
  const mobileHasUsableProduct =
    product?.proImage ||
    product?.image ||
    product?.productImage ||
    product?.price ||
    item?.price ||
    item?.amount;
  return {
    ...found,
    ...product,
    proName: mobileHasUsableProduct ? product?.proName || found.proName : found.proName || product?.proName,
    name: mobileHasUsableProduct ? product?.name || found.name : found.name || product?.name,
    price: firstNumber(product?.price, product?.productPrice, product?.bookingPrice, found.price, found.productPrice, found.bookingPrice),
    proImage: product?.proImage || found.proImage || found.images || found.image,
    image: product?.image || found.image,
    productImage: product?.productImage || found.productImage,
  };
};
const imageValue = image => {
  if (!image) return '';
  if (typeof image === 'string') return image.trim().replace(/\\/g, '/');
  return image?.url || image?.uri || image?.path || image?.location || image?.secure_url || image?.src || image?.file || image?.filename || image?.fileName || image?.name || '';
};
const normalizeImageUrl = value => {
  const raw = imageValue(value);
  if (!raw) return '';
  if (/^(https?:|blob:|data:)/i.test(raw)) return raw;
  if (raw.startsWith('/assets/')) return raw;
  const base = API_BASE_URL.replace(/\/+$/, '');
  const clean = raw.replace(/^\/+/, '');
  const url = /^(uploads|upload|images|image|public|files)\//i.test(clean)
    ? `${base}/${clean}`
    : /\.(png|jpe?g|webp|gif|avif)$/i.test(clean)
      ? `${base}/uploads/${clean}`
      : raw.startsWith('/') ? `${base}${raw}` : raw;
  return encodeURI(url);
};
const imageFallbacks = value => {
  const raw = imageValue(value);
  const primary = normalizeImageUrl(raw);
  if (!raw || /^(https?:|blob:|data:)/i.test(raw)) return primary ? [primary] : [];
  const base = API_BASE_URL.replace(/\/+$/, '');
  const clean = raw.replace(/^\/+/, '');
  return [...new Set([
    primary,
    `${base}/${clean}`,
    `${base}/uploads/${clean}`,
    `${base}/upload/${clean}`,
    `${base}/public/uploads/${clean}`,
    `${base}/public/upload/${clean}`,
    `${base}/api/product/uploads/${clean}`,
    `${base}/upload/${clean}`,
    `${base}/images/${clean}`,
  ].filter(Boolean).map(encodeURI))];
};
const getProductTitle = (item, productLookup) => {
  const product = resolveProduct(item, productLookup);
  return firstValue(product?.proName, product?.name, item?.proName, item?.productName, item?.productID, item?.productId, 'Wedding service');
};
const getProductId = item => getRawProductId(item);
const getProductImageOptions = (item, productLookup) => {
  const product = resolveProduct(item, productLookup);
  const values = [
    product?.proImage,
    product?.images,
    product?.image,
    product?.productImage,
    product?.thumbnail,
    product?.photo,
    product?.productImages,
    product?.media,
    item?.proImage,
    item?.images,
    item?.image,
    item?.productImage,
    item?.thumbnail,
    item?.photo,
    item?.cancelledProductImage,
    item?.cancelledProductImages,
    item?.orderedProduct?.proImage,
    item?.orderedProduct?.images,
    item?.orderedProduct?.image,
    item?.orderedProduct?.productImage,
    item?.productDetails?.proImage,
    item?.productDetails?.images,
    item?.productData?.proImage,
    item?.productData?.images,
    item?.cancelledProduct?.proImage,
    item?.cancelledProduct?.images,
  ].flatMap(value => Array.isArray(value) ? value : value ? [value] : []);
  return [...new Set(values.flatMap(imageFallbacks))];
};
const getQuantity = item => Number(item?.quantity || item?.qty || 1);
const getPrice = (item, productLookup) => {
  const product = resolveProduct(item, productLookup);
  const price = firstNumber(
    item?.price,
    item?.productPrice,
    item?.bookingPrice,
    item?.amount,
    item?.productAmount,
    item?.totalPrice,
    item?.totalAmount,
    item?.TotalPayableAmount,
    item?.totalPayableAmount,
    item?.payable,
    item?.payableAmount,
    product?.price,
    product?.productPrice,
    product?.bookingPrice,
    product?.amount,
    product?.TotalPayableAmount,
    product?.totalPayableAmount,
  );
  return Number.isFinite(price) ? price * getQuantity(item) : 0;
};
const getProductStartDate = item => {
  const product = getProductObject(item);
  return firstValue(item?.BookingStartDate, item?.bookingStartDate, item?.startBookingDate, item?.startDate, product?.BookingStartDate, product?.bookingStartDate, product?.startBookingDate, product?.startDate, '');
};
const getProductEndDate = item => {
  const product = getProductObject(item);
  return firstValue(item?.BookingEndDate, item?.bookingEndDate, item?.endBookingDate, item?.endDate, product?.BookingEndDate, product?.bookingEndDate, product?.endBookingDate, product?.endDate, '');
};
const getCancelledDate = item => firstValue(item?.cancelledAt, item?.cancledAt, item?.cancelDate, item?.updatedAt, item?.createdAt, '');
const getOrderDate = order => firstValue(order?.bookingDate, order?.BookingDate, order?.createdAt, '');
const getOrderNumber = (order, index) => firstValue(order?.orderId, order?.orderID, order?._id, `${index + 1}`);
const getRefundStatus = order => firstValue(order?.refundStatus, order?.paymentStatus, order?.status, 'Cancelled');
const getAddress = order => firstValue(order?.bookingPlace, order?.coustomeraddress, order?.coustomerAddress, order?.customerAddress, 'Booking place not available');
const formatAmount = amount => Number(amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});

function CancelledProductLine({item, index, productLookup}) {
  const [imageIndex, setImageIndex] = useState(0);
  const imageOptions = useMemo(() => getProductImageOptions(item, productLookup), [item, productLookup]);
  const imageKey = imageOptions.join('|');
  useEffect(() => setImageIndex(0), [imageKey]);
  const imageUrl = imageIndex < imageOptions.length ? imageOptions[imageIndex] : '';
  const cancelledAt = normalizeDate(getCancelledDate(item));
  return (
    <article className="mycancel-product-line" key={`${getProductId(item)}-${index}`}>
      <img src={imageUrl || asset('image/Wedding.jpg')} alt="" onError={() => setImageIndex(current => current + 1)} />
      <div className="mycancel-product-copy">
        <strong>{getProductTitle(item, productLookup)}</strong>
        <p>{getProductId(item) ? `${getProductId(item)}  |  ` : ''}Qty: {getQuantity(item)}</p>
        <div className="mycancel-product-dates">
          <span>From: {normalizeDate(getProductStartDate(item)) || 'N/A'}</span>
          <span>To: {normalizeDate(getProductEndDate(item)) || 'N/A'}</span>
        </div>
        {cancelledAt && <small>Cancelled: {cancelledAt}</small>}
      </div>
      <aside className="mycancel-amount-pill">
        <span>Amount</span>
        <b>Rs. {formatAmount(getPrice(item, productLookup))}</b>
      </aside>
    </article>
  );
}

export default function CancelledOrders() {
  const {session, notify} = useApp();
  const [orders, setOrders] = useState([]);
  const [productLookup, setProductLookup] = useState({});
  const [loading, setLoading] = useState(false);

  const loadProductLookup = useCallback(async () => {
    try {
      const response = await apiRequest(endpoints.customerProducts, {method: 'POST', token: session.token, body: JSON.stringify({})});
      const products = extractList(response);
      setProductLookup(Object.fromEntries(products.flatMap(product => {
        const ids = [product?.productID, product?.productId, product?.proId, product?._id, product?.id].filter(Boolean);
        return ids.flatMap(id => [[id, product], [String(id).toLowerCase(), product]]);
      })));
    } catch {
      setProductLookup({});
    }
  }, [session.token]);

  const fetchCancelledOrders = useCallback(async () => {
    const userId = userIdOf(session.user);
    if (!userId) {
      notify('User id not found', 'error');
      return;
    }
    setLoading(true);
    try {
      const response = await apiRequest(`${endpoints.cancelledOrders}${userId}`, {token: session.token});
      setOrders(extractOrders(response));
      loadProductLookup();
    } catch (error) {
      notify(error.message || 'Cancelled orders not found', 'error');
    } finally {
      setLoading(false);
    }
  }, [loadProductLookup, notify, session]);

  useEffect(() => {
    fetchCancelledOrders();
  }, [fetchCancelledOrders]);

  return (
    <div className="page mycancel-page">
      <PageHeader
        eyebrow="Booking history"
        title="My Cancelled Orders"
        text="Cancelled wedding service bookings will appear here."
        actions={<Button variant="soft" onClick={fetchCancelledOrders} disabled={loading}><RefreshCw size={17} /> Refresh</Button>}
      />

      {orders.length > 0 && (
        <section className="mycancel-summary-card">
          <h2>Cancelled bookings</h2>
          <p>{orders.length} cancelled order{orders.length > 1 ? 's' : ''} found</p>
        </section>
      )}

      {loading && !orders.length ? <Loading /> : (
        <div className="mycancel-list">
          {orders.map((order, index) => {
            const products = getProducts(order);
            return (
              <article className="mycancel-order-card" key={firstValue(order?._id, order?.orderId, order?.orderID, index)}>
                <div className="mycancel-color-bar" />
                <header className="mycancel-order-header">
                  <div>
                    <span>Cancelled Order</span>
                    <h2>#{getOrderNumber(order, index)}</h2>
                  </div>
                  <b>{String(getRefundStatus(order))}</b>
                </header>

                <section className="mycancel-date-panel">
                  <div>
                    <small>Booking Date</small>
                    <strong>{normalizeDate(getOrderDate(order)) || 'Not available'}</strong>
                  </div>
                  <i />
                  <div>
                    <small>Products</small>
                    <strong>{products.length}</strong>
                  </div>
                </section>

                <section className="mycancel-product-list">
                  {products.length ? products.map((item, itemIndex) => <CancelledProductLine item={item} index={itemIndex} productLookup={productLookup} key={`${getProductId(item)}-${itemIndex}`} />) : <p className="mycancel-no-product">Product details not found</p>}
                </section>

                <p className="mycancel-address">{getAddress(order)}</p>
              </article>
            );
          })}
        </div>
      )}

      {!loading && !orders.length && <Empty title="No cancelled orders" text="Cancelled wedding service bookings will appear here." />}
    </div>
  );
}
