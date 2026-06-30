import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  MapPin,
  MessageCircle,
  PackageCheck,
  Plus,
  RefreshCw,
  Route,
  UserRound,
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {Button, Card, Empty, Field, Modal, PageHeader} from '../../components/UI';
import GoogleLocationPicker, {calculateDistanceKm, geocodeLocation} from '../../components/GoogleLocationPicker';
import {useApp} from '../../lib/AppContext';
import {API_BASE_URL, apiRequest, endpoints} from '../../lib/api';
import {extractList, productMongoId, productPublicId, todayInputValue, userIdOf} from '../../lib/dataHelpers';
import {asset} from '../../lib/demoData';

const BREAK_EVENT_LOCATION = 'I am on break221207';
const UPI_ID = '7843949343@ybl';
const UPI_PAYEE_NAME = 'ASHISH KUMAR VERMA';
const UPI_MOBILE = UPI_ID.match(/^\d+/)?.[0] || '';
const paymentModes = [
  {label: 'Cash', value: 'cash'},
  {label: 'UPI', value: 'upi'},
  {label: 'Card', value: 'card'},
  {label: 'Bank', value: 'bank_transfer'},
];
const paymentStatuses = [
  {label: 'Pending', value: 'pending'},
  {label: 'Half', value: 'half'},
  {label: 'Full', value: 'full'},
];

const firstAvailable = values => values.find(value => value !== undefined && value !== null && value !== '');

const getDateString = date => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeDate = value => {
  if (!value) return '';
  const raw = value?.$date || value;
  const text = String(raw);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : getDateString(parsed);
};

const formatDate = value => {
  const normalized = normalizeDate(value);
  if (!normalized) return 'Not available';
  const [year, month, day] = normalized.split('-');
  return `${day}-${month}-${year}`;
};

const formatAmount = amount =>
  Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getProductObject = item => {
  if (item?.productDetails && typeof item.productDetails === 'object') return item.productDetails;
  if (item?.product && typeof item.product === 'object') return item.product;
  if (item?.products && typeof item.products === 'object') return item.products;
  return item || {};
};

const getProductImage = item => {
  const product = getProductObject(item);
  const image = product?.proImage || item?.proImage || product?.image || item?.image;
  const value = Array.isArray(image) ? image[0] : image;
  if (!value) return asset('image/Wedding.jpg');
  if (/^(https?:|blob:|data:)/i.test(String(value))) return value;
  return `${API_BASE_URL.replace(/\/+$/, '')}/${String(value).replace(/^\/+/, '')}`;
};

const getProductId = item => {
  const product = getProductObject(item);
  return (
    item?.orderedProduct?.productID ||
    item?.productID ||
    item?.productId ||
    item?.proId ||
    product?.productID ||
    product?.productId ||
    product?.proId ||
    ''
  );
};

const getProductMongoId = item => {
  const product = getProductObject(item);
  const candidates = [
    item?.orderedProduct?.product,
    item?.orderedProduct?.products,
    item?.orderedProduct?.productId,
    item?.product,
    item?.products,
    item?.productDetails,
    product?._id,
    product?.id,
    item?._id,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const value = typeof candidate === 'object' ? candidate?._id?.$oid || candidate?._id || candidate?.id : candidate;
    if (value && !String(value).startsWith('PROD-')) return String(value);
  }
  return '';
};

const getOrderId = booking => booking?.orderId || booking?.orderID || booking?._id?.$oid || booking?._id || '';

const getBookingStart = booking =>
  normalizeDate(
    booking?.BookingStartDate ||
      booking?.bookingStartDate ||
      booking?.startDate ||
      booking?.start ||
      booking?.orderedProduct?.BookingStartDate ||
      booking?.orderedProduct?.bookingStartDate,
  );

const getBookingEnd = booking =>
  normalizeDate(
    booking?.BookingEndDate ||
      booking?.bookingEndDate ||
      booking?.endDate ||
      booking?.end ||
      booking?.orderedProduct?.BookingEndDate ||
      booking?.orderedProduct?.bookingEndDate,
  ) || getBookingStart(booking);

const dateIsInBooking = (dateString, booking) => {
  const start = getBookingStart(booking);
  const end = getBookingEnd(booking);
  return Boolean(start && end && dateString >= start && dateString <= end);
};

const getBookingProducts = booking => {
  if (Array.isArray(booking?.products)) return booking.products;
  if (booking?.orderedProduct || booking?.productDetails) return [booking];
  return booking?.product || booking?.productID ? [booking] : [];
};

const getBookingProductName = item => {
  const product = getProductObject(item);
  return product?.proName || product?.name || item?.proName || 'Wedding service';
};

const getVendorAcceptedStatus = item =>
  item?.orderedProduct?.vendorAccepted ||
  item?.vendorAccepted ||
  item?.vendorAcceptedStatus ||
  item?.productDetails?.vendorAccepted ||
  item?.product?.vendorAccepted ||
  'Pending';

const vendorStatusClass = status => {
  const text = String(status || '').toLowerCase();
  if (text.includes('accept') || text.includes('confirm')) return 'accepted';
  if (text.includes('reject') || text.includes('cancel')) return 'rejected';
  return 'pending';
};

const isAcceptedVendorStatus = item => vendorStatusClass(getVendorAcceptedStatus(item)) === 'accepted';

const isConfirmedBooking = booking => String(booking?.status || '').trim().toLowerCase() === 'confirmed';
const isPendingBooking = booking => String(booking?.status || 'Pending').trim().toLowerCase() === 'pending';

const getProductQuantity = item => Number(item?.orderedProduct?.quantity || item?.quantity || item?.qty || 1);

const getProductPrice = item => {
  const product = getProductObject(item);
  return product?.price ?? item?.price ?? '';
};

const getProductLocation = product => product?.location || product?.address || product?.productLocation || product?.vendorLocation || '';
const getTravelPerKilometer = product => {
  const rate = Number(product?.travelPerKilometer ?? 0);
  return Number.isFinite(rate) ? rate : 0;
};
const productKeyOf = product => productMongoId(product) || productPublicId(product);

const getProductAmount = item => {
  const price = Number(getProductPrice(item) || 0);
  return (Number.isFinite(price) ? price : 0) * getProductQuantity(item);
};

const getProductCreatedAt = (item, booking) =>
  item?.orderedProduct?.createdAt ||
  item?.createdAt ||
  item?.productDetails?.createdAt ||
  item?.product?.createdAt ||
  item?.products?.createdAt ||
  booking?.createdAt ||
  '';

const parseDateValue = value => {
  if (!value) return null;
  const parsed = new Date(value?.$date || value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getCompletedMonthDifference = (fromDate, toDate = new Date()) => {
  if (!fromDate) return 0;
  return (
    (toDate.getFullYear() - fromDate.getFullYear()) * 12 +
    (toDate.getMonth() - fromDate.getMonth()) -
    (toDate.getDate() < fromDate.getDate() ? 1 : 0)
  );
};

const getEventLocation = (item, booking) =>
  item?.orderedProduct?.eventLocation ||
  item?.orderedProduct?.bookingPlace ||
  item?.eventLocation ||
  item?.bookingPlace ||
  booking?.eventLocation ||
  booking?.bookingPlace ||
  '';

const isBreakEventLocation = location => String(location || '').trim().toLowerCase() === BREAK_EVENT_LOCATION.toLowerCase();
const isBreakBookingProduct = (item, booking) => isBreakEventLocation(getEventLocation(item, booking));

const getVisibleBookingProducts = booking => {
  const products = getBookingProducts(booking);
  return products.length ? products.filter(product => !isBreakBookingProduct(product, booking)) : products;
};

const getCalendarEntries = response => {
  const possibleList =
    response?.data?.vendorOrderProducts ||
    response?.data?.orderProducts ||
    response?.data?.products ||
    response?.vendorOrderProducts ||
    response?.orderProducts;
  const source = Array.isArray(possibleList) ? possibleList : extractList(response);

  return source
    .map(booking => ({
      ...booking,
      BookingStartDate: getBookingStart(booking),
      BookingEndDate: getBookingEnd(booking),
    }))
    .flatMap(booking => {
      const allProducts = getBookingProducts(booking);
      const products = getVisibleBookingProducts(booking);
      if ((!allProducts.length && isBreakBookingProduct(booking, booking)) || (allProducts.length && !products.length)) return [];
      if (!products.length || products.every(product => !getBookingStart(product))) return [booking];

      const groupedByDates = products.reduce((groups, product) => {
        const start = getBookingStart(product) || getBookingStart(booking);
        const end = getBookingEnd(product) || getBookingEnd(booking) || start;
        const key = `${start}|${end}`;
        groups[key] = [...(groups[key] || []), product];
        return groups;
      }, {});

      return Object.entries(groupedByDates).map(([dates, groupedProducts]) => {
        const [start, end] = dates.split('|');
        return {...booking, products: groupedProducts, BookingStartDate: start, BookingEndDate: end};
      });
    });
};

const getCustomerId = booking =>
  firstAvailable([
    booking?.userID,
    booking?.userId,
    booking?.customerId,
    booking?.customer?._id,
    booking?.customer?.id,
    booking?.customer?.userId,
    booking?.user?._id,
    booking?.user?.id,
    booking?.user?.userId,
    booking?.user_id?._id,
    booking?.user_id?.id,
    booking?.user_id?.userId,
  ]);

const getCustomerName = booking =>
  firstAvailable([
    booking?.coustomerName,
    booking?.customerName,
    booking?.customer?.name,
    booking?.user?.name,
    booking?.user_id?.name,
    booking?.name,
    'Customer',
  ]);

const getCustomerMobile = booking =>
  firstAvailable([
    booking?.coustomerMobile,
    booking?.customerMobile,
    booking?.mobile,
    booking?.phone,
    booking?.customer?.mobile,
    booking?.customer?.phone,
    booking?.user?.mobile,
    booking?.user?.phone,
  ]);

const getCustomerAlternateMobile = booking =>
  firstAvailable([booking?.coustomerMobile2, booking?.customerMobile2, booking?.alternateMobile, booking?.alternatePhone]);

const getCustomerImage = booking =>
  firstAvailable([booking?.customerImage, booking?.customer?.profileImage, booking?.user?.profileImage, booking?.user_id?.profileImage, booking?.profileImage, '']);

const getConfirmedEventLocations = booking => {
  const products = getVisibleBookingProducts(booking);
  const locationSource = products.length ? products : [booking];
  const locations = locationSource
    .filter(product => isAcceptedVendorStatus(product))
    .map(product => getEventLocation(product, booking))
    .filter(location => location && !isBreakEventLocation(location));
  return [...new Set(locations.map(location => String(location).trim()))].join(', ');
};

const getBookingProductAmount = booking => {
  const products = getVisibleBookingProducts(booking);
  return (products.length ? products : [booking]).reduce((total, item) => total + getProductAmount(item), 0);
};

const getAdditionalThingsForProduct = item => {
  const product = getProductObject(item);
  return (
    [
      item?.additionalThings,
      item?.additionalThing,
      item?.orderedProduct?.additionalThings,
      item?.orderedProduct?.additionalThing,
      product?.additionalThings,
      product?.additionalThing,
    ].find(Array.isArray) || []
  );
};

const getAdditionalOrderAmount = booking => {
  const products = getBookingProducts(booking);
  return (products.length ? products : [booking]).reduce(
    (total, product) =>
      total +
      getAdditionalThingsForProduct(product).reduce((sum, item) => {
        const amount = Number(item?.additionalAmount || 0);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    0,
  );
};

const getReceivedCustomerAmount = booking =>
  Number(
    firstAvailable([
      booking?.TotalPaidAmount,
      booking?.totalPaidAmount,
      booking?.paidAmount,
      booking?.PaidAmount,
      booking?.receivedAmount,
      booking?.receivedFromCustomer,
      0,
    ]),
  ) || 0;

const getReceivedProductId = booking => {
  const products = getVisibleBookingProducts(booking);
  return (products.length ? products : [booking]).map(getProductMongoId).find(Boolean) || '';
};

const buildMonthDays = viewDate => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const blanks = Array.from({length: first.getDay()}, (_, index) => ({key: `blank-${index}`, blank: true}));
  const days = Array.from({length: totalDays}, (_, index) => {
    const date = new Date(year, month, index + 1);
    return {key: getDateString(date), date, day: index + 1, dateString: getDateString(date)};
  });
  return [...blanks, ...days];
};

const getBookedDates = bookings => {
  const dates = new Set();
  bookings.forEach(booking => {
    const start = getBookingStart(booking);
    const end = getBookingEnd(booking);
    if (!start || !end) return;
    const current = new Date(`${start}T00:00:00`);
    const last = new Date(`${end}T00:00:00`);
    for (; current <= last; current.setDate(current.getDate() + 1)) {
      dates.add(getDateString(current));
    }
  });
  return dates;
};

export function Bookings() {
  const navigate = useNavigate();
  const {session, localProducts, notify} = useApp();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => getDateString(new Date()));
  const [receivedBooking, setReceivedBooking] = useState(null);
  const [receivedInputs, setReceivedInputs] = useState({});
  const [submittingReceivedOrderId, setSubmittingReceivedOrderId] = useState('');
  const [vendorProducts, setVendorProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productEventLocations, setProductEventLocations] = useState({});
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [upiPaymentConfirmed, setUpiPaymentConfirmed] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    phone2: '',
    address: '',
    start: '',
    end: '',
    paymentMode: 'cash',
    paymentStatus: 'pending',
    totalPaidAmount: '',
    tranjectionId: '',
    bookingDetails: '',
    paymentProof: null,
  });
  const today = todayInputValue();
  const vendorId = userIdOf(session.user);

  const fetchBookings = useCallback(async () => {
    if (!vendorId) {
      notify('Vendor id not found. Please login again.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest(`${endpoints.vendorOrderProducts}${vendorId}`, {token: session.token});
      const entries = getCalendarEntries(response).filter(booking => getBookingStart(booking));
      setBookings(entries);
      if (entries.length) {
        const nextSelected = getBookingStart(entries[0]);
        setSelectedDate(nextSelected);
        setViewDate(new Date(`${nextSelected}T00:00:00`));
      }
    } catch (error) {
      notify(error.message || 'Bookings not found', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, session.token, vendorId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    if (!vendorId) return;
    apiRequest(endpoints.vendorProducts, {method: 'POST', token: session.token, body: {userId: vendorId}})
      .then(response => {
        const products = extractList(response);
        setVendorProducts(products.length ? products : localProducts);
      })
      .catch(() => setVendorProducts(localProducts));
  }, [localProducts, session.token, vendorId]);

  const productSource = vendorProducts.length ? vendorProducts : localProducts;
  const selectedBookings = useMemo(() => bookings.filter(booking => dateIsInBooking(selectedDate, booking)), [bookings, selectedDate]);
  const bookedDates = useMemo(() => getBookedDates(bookings), [bookings]);
  const monthDays = useMemo(() => buildMonthDays(viewDate), [viewDate]);
  const monthLabel = viewDate.toLocaleString('en-IN', {month: 'long', year: 'numeric'});
  const selectedProductCount = selectedBookings.reduce((count, booking) => count + Math.max(getVisibleBookingProducts(booking).length, 1), 0);
  const productBookingTotal = selectedProducts.reduce((total, item) => total + Number(item.product?.price || 0) * item.quantity, 0);
  const travelChargeTotal = selectedProducts.reduce((total, item) => {
    const location = productEventLocations[productKeyOf(item.product)];
    return total + (Number.isFinite(location?.distance) ? location.distance * getTravelPerKilometer(item.product) : 0);
  }, 0);
  const totalPayableAmount = productBookingTotal + travelChargeTotal;
  const paidAmount = Number(form.totalPaidAmount || 0);

  useEffect(() => {
    if (!form.totalPaidAmount && totalPayableAmount > 0) {
      setForm(current => ({...current, totalPaidAmount: totalPayableAmount.toFixed(2)}));
    }
  }, [form.totalPaidAmount, totalPayableAmount]);

  const toggleProduct = product => {
    const key = productKeyOf(product);
    setSelectedProducts(current => {
      const exists = current.some(item => productKeyOf(item.product) === key);
      return exists ? current.filter(item => productKeyOf(item.product) !== key) : [...current, {product, quantity: 1}];
    });
    setProductEventLocations(current => {
      const next = {...current};
      if (next[key]) delete next[key];
      return next;
    });
  };

  const updateProductQuantity = (product, change) => {
    const key = productKeyOf(product);
    setSelectedProducts(current => current.map(item => productKeyOf(item.product) === key ? {...item, quantity: Math.max(1, item.quantity + change)} : item));
  };

  const selectProductEventLocation = async (product, selected) => {
    const key = productKeyOf(product);
    const location = selected.location || '';
    const coordinates = selected.latitude != null && selected.longitude != null ? {lat: selected.latitude, lng: selected.longitude} : null;
    setProductEventLocations(current => ({...current, [key]: {location, coordinates, distance: null, loading: Boolean(coordinates)}}));
    if (!coordinates) return;
    try {
      const productCoordinates = await geocodeLocation(getProductLocation(product));
      setProductEventLocations(current => ({
        ...current,
        [key]: {
          ...current[key],
          distance: productCoordinates ? calculateDistanceKm(productCoordinates, coordinates) : null,
          loading: false,
        },
      }));
    } catch {
      setProductEventLocations(current => ({...current, [key]: {...current[key], distance: null, loading: false}}));
    }
  };

  const validateOfflineBooking = (skipPaymentValidation = false) => {
    if (!selectedProducts.length) { notify('Please select at least one product', 'error'); return false; }
    if (selectedProducts.some(item => !productPublicId(item.product) || !productMongoId(item.product))) { notify('Selected product details are incomplete', 'error'); return false; }
    if (!form.customerName.trim() || form.customerName.trim().length < 2) { notify('Please enter valid customer name', 'error'); return false; }
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) { notify('Please enter a valid 10 digit customer mobile number', 'error'); return false; }
    if (form.phone2.trim() && !/^[6-9]\d{9}$/.test(form.phone2.trim())) { notify('Please enter a valid 10 digit alternate mobile number', 'error'); return false; }
    if (form.phone2.trim() && form.phone2.trim() === form.phone.trim()) { notify('Alternate mobile number must be different', 'error'); return false; }
    if (!form.address.trim()) { notify('Please enter customer address', 'error'); return false; }
    if (!form.start || !form.end || form.start < today || form.end < form.start) { notify('Please select a valid booking date range', 'error'); return false; }
    const missingProductLocation = selectedProducts.find(item => !getProductLocation(item.product));
    if (missingProductLocation) { notify(`${missingProductLocation.product?.proName || 'Selected product'} does not have a product location`, 'error'); return false; }
    const missingEventLocation = selectedProducts.find(item => {
      const location = productEventLocations[productKeyOf(item.product)];
      return !location?.location || !location?.coordinates;
    });
    if (missingEventLocation) { notify(`Please select event location for ${missingEventLocation.product?.proName || 'every product'}`, 'error'); return false; }
    if (selectedProducts.some(item => productEventLocations[productKeyOf(item.product)]?.loading)) { notify('Please wait for all product distances to finish calculating', 'error'); return false; }
    const missingDistance = selectedProducts.find(item => !Number.isFinite(productEventLocations[productKeyOf(item.product)]?.distance));
    if (missingDistance) { notify(`Unable to calculate distance for ${missingDistance.product?.proName || 'a selected product'}. Please select the event location again`, 'error'); return false; }
    if (selectedProducts.some(item => item.product?.travelPerKilometer === '' || item.product?.travelPerKilometer == null || !Number.isFinite(Number(item.product.travelPerKilometer)))) { notify('Selected product has invalid travel charge per kilometer', 'error'); return false; }
    if (!skipPaymentValidation) {
      if (!Number.isFinite(paidAmount) || paidAmount <= 0) { notify('Please enter a valid total paid amount', 'error'); return false; }
      if (paidAmount > totalPayableAmount) { notify('Total paid amount cannot exceed total payable amount', 'error'); return false; }
      if (form.paymentMode === 'upi' && !upiPaymentConfirmed) { notify('Please complete and confirm the UPI payment', 'error'); return false; }
      if (form.paymentMode === 'upi' && !form.tranjectionId.trim()) { notify('Please enter UPI transaction ID', 'error'); return false; }
      if (!form.paymentProof) { notify('Please upload payment proof image', 'error'); return false; }
    }
    return true;
  };

  const confirmUpiPayment = () => {
    if (!validateOfflineBooking(true)) return;
    if (UPI_MOBILE && form.phone.trim() === UPI_MOBILE) return notify('Customer mobile number matches receiving UPI account. Please pay from a different UPI account, or choose Cash/Bank payment.', 'error');
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) return notify('Please enter a valid amount to pay by UPI', 'error');
    if (paidAmount > totalPayableAmount) return notify('Total paid amount cannot exceed total payable amount', 'error');
    if (!form.tranjectionId.trim()) return notify('Please enter UPI transaction ID', 'error');
    if (!form.paymentProof) return notify('Please upload payment proof image', 'error');
    setUpiPaymentConfirmed(true);
    setForm(current => ({...current, paymentMode: 'upi', paymentStatus: paidAmount >= totalPayableAmount ? 'full' : 'half'}));
    notify('UPI payment confirmed.');
  };

  const buildOfflineBookingProducts = () =>
    selectedProducts.map(item => {
      const location = productEventLocations[productKeyOf(item.product)];
      const travelPerKilometer = getTravelPerKilometer(item.product);
      return {
        productID: productPublicId(item.product),
        product: productMongoId(item.product),
        quantity: item.quantity,
        BookingStartDate: new Date(form.start),
        BookingEndDate: new Date(form.end),
        venderUserId: vendorId,
        eventLocation: location?.location || '',
        eventLatitude: location?.coordinates?.lat || '',
        eventLongitude: location?.coordinates?.lng || '',
        distance: location?.distance ?? null,
        travelPerKilometer,
        totalTravelCharge: location?.distance != null ? location.distance * travelPerKilometer : null,
      };
    });

  const submit = async event => {
    event.preventDefault();
    if (!validateOfflineBooking()) return;
    setSaving(true);
    try {
      for (const selected of selectedProducts) {
        await apiRequest(endpoints.checkBooking, {
          method: 'POST',
          token: session.token,
          body: {productID: productPublicId(selected.product), BookingStartDate: form.start, BookingEndDate: form.end},
        });
      }
      const body = new FormData();
      body.append('userID', vendorId);
      body.append('products', JSON.stringify(buildOfflineBookingProducts()));
      body.append('bookingDate', new Date().toISOString());
      body.append('paymentMode', form.paymentMode);
      body.append('paymentStatus', form.paymentMode === 'upi' && upiPaymentConfirmed ? (paidAmount >= totalPayableAmount ? 'full' : 'half') : form.paymentStatus);
      body.append('bookingDetails', form.bookingDetails.trim());
      body.append('coustomerName', form.customerName.trim());
      body.append('coustomeraddress', form.address.trim());
      body.append('bookingPlace', productEventLocations[productKeyOf(selectedProducts[0].product)]?.location || 'Offline');
      body.append('coustomerMobile', form.phone.trim());
      body.append('coustomerMobile2', form.phone2.trim());
      body.append('TotalPayableAmount', totalPayableAmount.toFixed(2));
      body.append('TotalPaidAmount', paidAmount.toFixed(2));
      body.append('TranjectionId', form.tranjectionId.trim());
      if (form.paymentProof) body.append('paymentProofUrl', form.paymentProof);
      await apiRequest(endpoints.createBooking, {
        method: 'POST',
        token: session.token,
        body,
      });
      setForm(current => ({
        ...current,
        customerName: '',
        phone: '',
        phone2: '',
        address: '',
        start: '',
        end: '',
        totalPaidAmount: '',
        tranjectionId: '',
        bookingDetails: '',
        paymentProof: null,
      }));
      setSelectedProducts([]);
      setProductEventLocations({});
      setUpiPaymentConfirmed(false);
      notify('Offline booking added.');
      fetchBookings();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateVendorStatus = async (product, booking, vendorAccepted) => {
    const orderId = getOrderId(booking);
    const productID = getProductId(product);
    if (!orderId) {
      notify('Order id not found', 'error');
      return;
    }
    if (!productID) {
      notify('Product id not found', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest(endpoints.updateVendorStatus, {
        method: 'PUT',
        token: session.token,
        body: {orderId, productID, vendorAccepted},
      });
      notify(response?.message || `Order ${vendorAccepted}`);
      fetchBookings();
    } catch (error) {
      notify(error.message || `Unable to update order as ${vendorAccepted}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVendorCancel = (product, booking) => {
    const productStatus = vendorStatusClass(getVendorAcceptedStatus(product));
    if (isPendingBooking(booking) || productStatus === 'pending') {
      updateVendorStatus(product, booking, 'Rejected');
      return;
    }

    const createdAt = parseDateValue(getProductCreatedAt(product, booking));
    const monthsSinceCreated = getCompletedMonthDifference(createdAt);
    const isForceCancel = !createdAt || monthsSinceCreated <= 3;

    navigate('/vendor/cancellation-policy', {
      state: {
        booking,
        product,
        policy: {
          deductionPercent: isForceCancel ? 75 : 40,
          createdAt: createdAt ? createdAt.toISOString() : null,
          monthsSinceCreated,
          isForceCancel,
        },
      },
    });
  };

  const submitReceivedCustomerAmount = async () => {
    const orderId = getOrderId(receivedBooking);
    const productId = getReceivedProductId(receivedBooking);
    const amount = Number(receivedInputs[orderId] || '');
    if (!orderId) return notify('Order id not found', 'error');
    if (!productId) return notify('Product id not found', 'error');
    if (!Number.isFinite(amount) || amount <= 0) return notify('Please enter valid received amount', 'error');

    setSubmittingReceivedOrderId(orderId);
    try {
      const response = await apiRequest(endpoints.receivedAmountFromCustomer, {
        method: 'PUT',
        token: session.token,
        body: {orderId, productId, recivedAmountFromCustomer: amount},
      });
      notify(response?.message || 'Received amount submitted successfully');
      setReceivedBooking(null);
      fetchBookings();
    } catch (error) {
      notify(error.message || 'Received amount not submitted', 'error');
    } finally {
      setSubmittingReceivedOrderId('');
    }
  };

  const openDirections = location => {
    if (!location) {
      notify('Event location not available', 'error');
      return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}&travelmode=driving`, '_blank', 'noopener,noreferrer');
  };

  const renderProduct = (product, booking, index) => {
    const vendorStatus = getVendorAcceptedStatus(product);
    const statusClass = vendorStatusClass(vendorStatus);
    const eventLocation = getEventLocation(product, booking);
    const canShowLocation = isConfirmedBooking(booking) && statusClass === 'accepted' && eventLocation;
    const actions =
      statusClass === 'pending'
        ? [
            {label: 'Confirm', value: 'Accepted', className: 'accept'},
            {label: 'Cancel Order', value: 'Rejected', className: 'reject'},
          ]
        : isPendingBooking(booking) || statusClass === 'rejected'
          ? []
          : [{label: 'Cancel Order', value: 'Rejected', className: 'reject'}];

    return (
      <article className="vendor-booking-product" key={`${getProductId(product) || getBookingProductName(product)}-${index}`}>
        <img src={getProductImage(product)} alt="" />
        <div className="vendor-booking-product-copy">
          <div className="vendor-booking-product-head">
            <div>
              <h3>{getBookingProductName(product)}</h3>
              {getProductId(product) && <p>ID: {getProductId(product)}</p>}
            </div>
            <b className={`vendor-status ${statusClass}`}>{vendorStatus}</b>
          </div>
          <div className="vendor-product-meta">
            <span>Quantity: {getProductQuantity(product)}</span>
            {getProductPrice(product) !== '' && <strong>Rs. {formatAmount(getProductPrice(product))}</strong>}
          </div>
          {(product?.shortDetails || getProductObject(product)?.shortDetails) && <p className="vendor-product-details">{product.shortDetails || getProductObject(product).shortDetails}</p>}
          {canShowLocation && (
            <div className="vendor-event-location">
              <MapPin size={17} />
              <span>{eventLocation}</span>
              <button type="button" onClick={() => openDirections(eventLocation)}>
                <Route size={15} /> Directions
              </button>
            </div>
          )}
          {actions.length > 0 && (
            <div className="vendor-actions-panel">
              <span>{statusClass === 'pending' ? 'Order accept or reject' : 'Order action'}</span>
              <div>
                {actions.map(action => (
                  <button
                    type="button"
                    className={action.className}
                    key={action.value}
                    disabled={loading}
                    onClick={() => {
                      if (action.value === 'Rejected') {
                        handleVendorCancel(product, booking);
                      } else {
                        updateVendorStatus(product, booking, action.value);
                      }
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    );
  };

  const renderBooking = (booking, index) => {
    const products = getVisibleBookingProducts(booking);
    const confirmedContact = isConfirmedBooking(booking) && (products.length ? products.some(isAcceptedVendorStatus) : isAcceptedVendorStatus(booking));
    const customerId = getCustomerId(booking);
    const orderId = getOrderId(booking) || index + 1;
    const receivedValue = getReceivedCustomerAmount(booking);

    return (
      <Card className="vendor-booking-card" key={`${orderId}-${getBookingStart(booking)}-${getBookingEnd(booking)}-${index}`}>
        <div className="vendor-booking-card-head">
          <div>
            <span>Order</span>
            <h2>#{orderId}</h2>
          </div>
          <b className={`vendor-order-status ${vendorStatusClass(booking.status)}`}>{booking.status || 'Pending'}</b>
        </div>
        <div className="vendor-date-band">
          <span><small>From</small><strong>{formatDate(getBookingStart(booking))}</strong></span>
          <span><small>To</small><strong>{formatDate(getBookingEnd(booking))}</strong></span>
        </div>
        <h3 className="vendor-section-title">Booked product{products.length === 1 ? '' : 's'}</h3>
        <div className="vendor-products-list">
          {products.length ? products.map((product, productIndex) => renderProduct(product, booking, productIndex)) : renderProduct(booking, booking, 0)}
        </div>
        <h3 className="vendor-section-title">Customer and booking details</h3>
        <div className="vendor-amount-grid">
          <div><small>Total payable</small><strong>Rs. {formatAmount(getBookingProductAmount(booking))}</strong></div>
          <div><small>Additional order</small><strong className="gold">Rs. {formatAmount(getAdditionalOrderAmount(booking))}</strong></div>
          <div><small>Received amount</small><strong className="teal">Rs. {formatAmount(receivedValue)}</strong></div>
        </div>
        <div className="vendor-detail-grid">
          <span><small>Customer</small>{getCustomerName(booking)}</span>
          {confirmedContact && getCustomerMobile(booking) && <span><small>Mobile</small>{getCustomerMobile(booking)}</span>}
          {confirmedContact && getCustomerAlternateMobile(booking) && <span><small>Alternate mobile</small>{getCustomerAlternateMobile(booking)}</span>}
          {confirmedContact && getConfirmedEventLocations(booking) && <span className="wide"><small>Event location</small>{getConfirmedEventLocations(booking)}</span>}
          {confirmedContact && (booking?.coustomeraddress || booking?.customerAddress) && <span className="wide"><small>Customer address</small>{booking.coustomeraddress || booking.customerAddress}</span>}
          {booking?.bookingDetails && <span className="wide"><small>Booking details</small>{booking.bookingDetails}</span>}
        </div>
        <div className="vendor-booking-footer">
          <button type="button" className="received-button" onClick={() => {
            setReceivedBooking(booking);
            setReceivedInputs(current => ({...current, [orderId]: current[orderId] ?? (receivedValue ? String(receivedValue) : '')}));
          }}>
            <IndianRupee size={16} /> Enter received amount
          </button>
          {confirmedContact && customerId && (
            <Link
              className="chat-customer-button"
              to="/vendor/chat"
              state={{startChat: {targetId: String(customerId), targetName: getCustomerName(booking), targetRole: 'customer', targetImage: getCustomerImage(booking), type: 'vendor_customer', title: getCustomerName(booking)}}}
            >
              <MessageCircle size={16} /> Chat Customer
            </Link>
          )}
        </div>
      </Card>
    );
  };

  const receivedOrderId = receivedBooking ? getOrderId(receivedBooking) : '';

  return (
    <div className="page vendor-booking-page">
      <PageHeader
        eyebrow="Vendor schedule"
        title="Booking Calendar"
        text="Select a highlighted date to view booking products, vendor actions, customer details, and received payments."
        actions={<Button type="button" variant="soft" onClick={fetchBookings}><RefreshCw size={16} />Refresh</Button>}
      />

      <section className="vendor-schedule-summary">
        <Card>
          <CalendarDays />
          <span>Total bookings</span>
          <strong>{bookings.length}</strong>
        </Card>
        <Card>
          <PackageCheck />
          <span>Booked dates</span>
          <strong>{bookedDates.size}</strong>
        </Card>
        <Card>
          <UserRound />
          <span>{formatDate(selectedDate)}</span>
          <strong>{selectedProductCount}</strong>
        </Card>
      </section>

      <div className="vendor-booking-layout">
        <section>
          <Card className="vendor-calendar-card">
            <div className="vendor-calendar-top">
              <button type="button" onClick={() => setViewDate(date => new Date(date.getFullYear(), date.getMonth() - 1, 1))} aria-label="Previous month">
                <ChevronLeft size={20} />
              </button>
              <div>
                <span>Booked dates</span>
                <h2>{monthLabel}</h2>
              </div>
              <button type="button" onClick={() => setViewDate(date => new Date(date.getFullYear(), date.getMonth() + 1, 1))} aria-label="Next month">
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="vendor-weekdays">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
            <div className="vendor-month-grid">
              {monthDays.map(day => {
                if (day.blank) return <span className="blank" key={day.key} />;
                const dayBookings = bookings.filter(booking => dateIsInBooking(day.dateString, booking));
                const isBooked = dayBookings.length > 0;
                const isSelected = day.dateString === selectedDate;
                const isToday = day.dateString === getDateString(new Date());
                return (
                  <button
                    type="button"
                    key={day.key}
                    className={`${isBooked ? 'booked' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                    onClick={() => setSelectedDate(day.dateString)}
                  >
                    <span>{day.day}</span>
                    {isBooked && <small>{dayBookings.reduce((count, booking) => count + Math.max(getVisibleBookingProducts(booking).length, 1), 0)}</small>}
                  </button>
                );
              })}
            </div>
            <div className="vendor-calendar-legend"><i />Booked dates</div>
          </Card>

          <div className="vendor-selected-head">
            <div>
              <span className="eyebrow">Selected date</span>
              <h2>{formatDate(selectedDate)}</h2>
              <p>{selectedProductCount} booked product{selectedProductCount === 1 ? '' : 's'} on this date</p>
            </div>
          </div>

          <div className="vendor-selected-list">
            {selectedBookings.map(renderBooking)}
            {!selectedBookings.length && !loading && <Empty title="No booking on this date" text="Choose another highlighted date to view its booking details." />}
          </div>
        </section>

        <Card className="sticky-form vendor-offline-form">
          <Plus />
          <h2>Add offline booking</h2>
          <p>Create a booking received outside the app, using the same booking check and create APIs.</p>
          <form onSubmit={submit}>
            <div className="offline-section">
              <h3>Select your product</h3>
              <button type="button" className="offline-product-dropdown" onClick={() => setProductPickerOpen(true)}>
                <img src={selectedProducts[0]?.product ? getProductImage(selectedProducts[0].product) : asset('image/Wedding.jpg')} alt="" />
                <span>
                  <small>Products</small>
                  <strong>{selectedProducts.length ? `${selectedProducts.length} product${selectedProducts.length === 1 ? '' : 's'} selected` : 'Select products'}</strong>
                  {selectedProducts.length ? <em>{selectedProducts.map(item => item.product?.proName || 'Product').join(', ')}</em> : null}
                </span>
                <b>⌄</b>
              </button>
              {!productSource.length && <p className="offline-hint">Add a product before creating an offline booking.</p>}
              <div className="offline-selected-products">
                {selectedProducts.map(item => {
                  const key = productKeyOf(item.product);
                  const eventLocation = productEventLocations[key] || {};
                  const travelPerKilometer = getTravelPerKilometer(item.product);
                  const totalTravelCharge = Number.isFinite(eventLocation.distance) ? eventLocation.distance * travelPerKilometer : null;
                  return (
                    <article className="offline-selected-card" key={key}>
                      <div className="offline-product-row">
                        <img src={getProductImage(item.product)} alt="" />
                        <span>
                          <strong>{item.product?.proName || 'Product'}</strong>
                          <small>Rs. {item.product?.price || '0'}</small>
                          <em>Product location: {getProductLocation(item.product) || 'Not available'}</em>
                        </span>
                        <div className="offline-qty">
                          <button type="button" onClick={() => updateProductQuantity(item.product, -1)}>-</button>
                          <b>{item.quantity}</b>
                          <button type="button" onClick={() => updateProductQuantity(item.product, 1)}>+</button>
                        </div>
                      </div>
                      <GoogleLocationPicker
                        label="Enter event location"
                        value={eventLocation.location || ''}
                        coordinates={eventLocation.coordinates}
                        onSelect={selected => selectProductEventLocation(item.product, selected)}
                      />
                      <div className="travel-summary-line">
                        <span className={eventLocation.distance == null ? 'muted' : ''}>
                          {eventLocation.loading ? 'Calculating distance...' : eventLocation.distance != null ? `Distance: ${eventLocation.distance.toFixed(2)} km` : 'Distance unavailable'}
                        </span>
                        {totalTravelCharge != null && <strong>Total travel charge: Rs. {totalTravelCharge.toFixed(2)}</strong>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="offline-section">
              <h3>Customer details</h3>
              <Field label="Customer name" required value={form.customerName} onChange={event => setForm({...form, customerName: event.target.value})} />
              <div className="form-grid">
                <Field label="Customer mobile" required value={form.phone} maxLength="10" onChange={event => setForm({...form, phone: event.target.value.replace(/\D/g, '')})} />
                <Field label="Alternate mobile" value={form.phone2} maxLength="10" onChange={event => setForm({...form, phone2: event.target.value.replace(/\D/g, '')})} />
              </div>
              <Field as="textarea" label="Customer address" required value={form.address} onChange={event => setForm({...form, address: event.target.value})} />
            </div>

            <div className="offline-section">
              <h3>Booking details</h3>
              <div className="form-grid">
                <Field label="Start" type="date" min={today} required value={form.start} onChange={event => setForm({...form, start: event.target.value, end: form.end && form.end < event.target.value ? '' : form.end})} />
                <Field label="End" type="date" min={form.start || today} required value={form.end} onChange={event => setForm({...form, end: event.target.value})} />
              </div>
              <Field as="textarea" label="Booking details" value={form.bookingDetails} onChange={event => setForm({...form, bookingDetails: event.target.value})} />
            </div>

            <div className="offline-section">
              <h3>Payment details</h3>
              <div className="offline-payment-summary">
                <span><small>Product booking total</small><strong>Rs. {productBookingTotal.toFixed(2)}</strong></span>
                <span><small>Travel charge total</small><strong>Rs. {travelChargeTotal.toFixed(2)}</strong></span>
                <span><small>Total payable amount</small><strong>Rs. {totalPayableAmount.toFixed(2)}</strong></span>
              </div>
              <span className="offline-label">Payment mode</span>
              <div className="offline-options">
                {paymentModes.map(mode => <button type="button" className={form.paymentMode === mode.value ? 'active' : ''} key={mode.value} onClick={() => {setForm({...form, paymentMode: mode.value, paymentStatus: mode.value === 'upi' ? 'pending' : form.paymentStatus}); setUpiPaymentConfirmed(false);}}>{mode.label}</button>)}
              </div>
              {form.paymentMode === 'upi' ? (
                <div className="offline-upi-card">
                  <div className="offline-upi-head">
                    <b>UPI</b>
                    <span><strong>Pay manually by UPI</strong><small>Pay to {UPI_ID}</small></span>
                    <em className={upiPaymentConfirmed ? 'confirmed' : ''}>{upiPaymentConfirmed ? 'CONFIRMED' : 'NOT PAID'}</em>
                  </div>
                  <p>Pay using UPI ID, then enter transaction ID and upload payment screenshot before continuing.</p>
                  <div className="offline-upi-details">
                    <span><small>Name</small>{UPI_PAYEE_NAME}</span>
                    <span><small>UPI ID</small>{UPI_ID}</span>
                    <span><small>Mobile</small>{UPI_MOBILE}</span>
                    <span><small>Amount</small>Rs. {Number.isFinite(paidAmount) ? paidAmount.toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="quick-amount-row">
                    <button type="button" onClick={() => {setForm({...form, totalPaidAmount: (totalPayableAmount / 2).toFixed(2)}); setUpiPaymentConfirmed(false);}}>Pay 50%</button>
                    <button type="button" onClick={() => {setForm({...form, totalPaidAmount: totalPayableAmount.toFixed(2)}); setUpiPaymentConfirmed(false);}}>Pay full amount</button>
                  </div>
                  <Field label="Total paid amount" type="number" min="1" value={form.totalPaidAmount} onChange={event => {setForm({...form, totalPaidAmount: event.target.value}); setUpiPaymentConfirmed(false);}} />
                  <Field label="Transaction ID" value={form.tranjectionId} onChange={event => {setForm({...form, tranjectionId: event.target.value.toUpperCase()}); setUpiPaymentConfirmed(false);}} />
                  <button type="button" className={`upi-confirm-button ${upiPaymentConfirmed ? 'confirmed' : ''}`} onClick={confirmUpiPayment}>{upiPaymentConfirmed ? 'Confirm again' : `I paid Rs. ${Number.isFinite(paidAmount) ? paidAmount.toFixed(2) : '0.00'}`}</button>
                </div>
              ) : (
                <>
                  <Field label="Total paid amount" type="number" min="1" value={form.totalPaidAmount} onChange={event => setForm({...form, totalPaidAmount: event.target.value})} />
                  <span className="offline-label">Payment status</span>
                  <div className="offline-options">
                    {paymentStatuses.map(status => <button type="button" className={form.paymentStatus === status.value ? 'active' : ''} key={status.value} onClick={() => setForm({...form, paymentStatus: status.value})}>{status.label}</button>)}
                  </div>
                  {form.paymentMode === 'card' && <div className="card-details-panel"><Field label="Card holder name" value={form.cardHolderName || ''} onChange={event => setForm({...form, cardHolderName: event.target.value})} /><div className="form-grid card-mini-grid"><Field label="Last 4 digits" maxLength="4" value={form.cardLast4 || ''} onChange={event => setForm({...form, cardLast4: event.target.value.replace(/\D/g, '')})} /><Field label="Card reference" value={form.tranjectionId} onChange={event => setForm({...form, tranjectionId: event.target.value})} /></div></div>}
                </>
              )}
              <label className="upload-line">
                <span><strong>Payment proof</strong><small>{form.paymentProof?.name || 'Select receipt or screenshot image'}</small></span>
                <input type="file" accept="image/*" onChange={event => {setForm({...form, paymentProof: event.target.files[0]}); setUpiPaymentConfirmed(false);}} />
              </label>
              <p className="offline-hint">Payment proof is required before creating the booking.</p>
            </div>

            {form.paymentMode === 'upi' && !upiPaymentConfirmed ? (
              <Button type="button" onClick={confirmUpiPayment} disabled={saving}>Continue</Button>
            ) : (
              <Button disabled={saving}>{saving ? 'Creating...' : 'Create Offline Booking'}</Button>
            )}
          </form>
        </Card>
      </div>

      {productPickerOpen && (
        <Modal title="Select products" onClose={() => setProductPickerOpen(false)} wide>
          <p className="modal-copy">Tap products to select or remove them.</p>
          <div className="offline-product-picker">
            {productSource.map((product, index) => {
              const key = productKeyOf(product) || `${index}`;
              const selected = selectedProducts.some(item => productKeyOf(item.product) === key);
              return (
                <button type="button" className={selected ? 'selected' : ''} key={key} onClick={() => toggleProduct(product)}>
                  <img src={getProductImage(product)} alt="" />
                  <span><strong>{product.proName || 'Product'}</strong><small>{product.shortDetails || 'Wedding service'}</small><b>Rs. {product.price || '0'}</b></span>
                  {selected && <em>✓</em>}
                </button>
              );
            })}
          </div>
          <div className="modal-actions"><Button type="button" onClick={() => setProductPickerOpen(false)}>Done ({selectedProducts.length} selected)</Button></div>
        </Modal>
      )}

      {receivedBooking && (
        <Modal title="Receive amount from customer" onClose={() => setReceivedBooking(null)}>
          <div className="received-modal-body">
            <strong>Order #{receivedOrderId || 'Not available'}</strong>
            <label className="received-amount-field">
              <span>Enter receive amount from customer</span>
              <div><b>Rs.</b><input type="number" min="1" placeholder="0.00" value={receivedInputs[receivedOrderId] || ''} onChange={event => setReceivedInputs(current => ({...current, [receivedOrderId]: event.target.value.replace(/[^0-9.]/g, '')}))} /></div>
            </label>
            <div className="received-modal-actions">
              <Button type="button" onClick={submitReceivedCustomerAmount} disabled={submittingReceivedOrderId === receivedOrderId}>
                {submittingReceivedOrderId === receivedOrderId ? 'Submitting...' : 'Submit'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setReceivedBooking(null)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      {loading && !bookings.length && <div className="loading"><RefreshCw size={28} /><span>Loading bookings...</span></div>}
    </div>
  );
}
