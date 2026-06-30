export const extractList = response => {
  const candidates = [
    response?.data?.categories, response?.data?.category, response?.data?.cats,
    response?.data?.vendors, response?.data?.users, response?.data?.customers,
    response?.data?.orders, response?.data?.bookings, response?.data?.cart,
    response?.data?.cancelledOrders, response?.data?.cancledOrders,
    response?.data?.cancelledProducts, response?.data?.cancledProducts,
    response?.data?.products, response?.data?.items, response?.data?.docs,
    response?.data, response?.categories, response?.category, response?.cats,
    response?.vendors, response?.users, response?.customers, response?.orders,
    response?.cancelledOrders, response?.cancledOrders,
    response?.cancelledProducts, response?.cancledProducts,
    response?.bookings, response?.cart, response?.products, response?.items,
    response?.docs, response,
  ];
  return candidates.find(Array.isArray) || [];
};

export const userIdOf = user => user?.userId || user?.userID || user?._id;
export const getId = item =>
  item?._id ||
  item?.id ||
  item?.orderId ||
  item?.orderID ||
  item?.userId ||
  item?.catId ||
  item?.productId ||
  item?.proId ||
  '';
export const getName = item =>
  item?.name ||
  item?.customerName ||
  item?.vendorName ||
  item?.businessName ||
  item?.catName ||
  item?.proName ||
  'Not available';
export const getStatus = item => {
  if (item?.status) return item.status;
  if (item?.isActive !== undefined) return item.isActive === true || item.isActive === 1 ? 'Active' : 'Inactive';
  if (item?.active !== undefined) return item.active === true || item.active === 1 ? 'Active' : 'Inactive';
  return 'Pending';
};
export const formatAmount = value => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? `Rs. ${amount.toLocaleString('en-IN')}` : String(value || 'Rs. 0');
};
export const todayInputValue = () => new Date().toISOString().slice(0, 10);
export const productMongoId = product =>
  typeof product === 'string' ? product : product?.products?._id || product?.product?._id || product?._id;
export const productPublicId = product =>
  typeof product === 'string' ? product :
  product?.productID || product?.productId || product?.proId ||
  product?.products?.productID || product?.products?.productId ||
  product?.product?.productID || product?.product?.productId || productMongoId(product);
export const cartIdOf = item => item?.cartId || item?._id;
export const productOf = item => item?.products || item?.product || item;
export const startOf = item => item?.BookingStartDate || item?.bookingStartDate || item?.start || '';
export const endOf = item => item?.BookingEndDate || item?.bookingEndDate || item?.end || '';
export const orderIdOf = item => item?.orderId || item?.bookingId || item?._id || `booking-${Date.now()}`;
export const orderProducts = order => {
  const items =
    order?.products ||
    order?.cancelledProducts ||
    order?.cancledProducts ||
    order?.cancelProducts ||
    order?.canceledProducts ||
    order?.product ||
    [];
  return Array.isArray(items) ? items : [items];
};

export const bookingFormData = ({userId, items, form, productEventLocations = {}}) => {
  const body = new FormData();
  const bookingProducts = items.map((item, index) => {
    const product = productOf(item);
    const key = `${product.productID || product.productId || product._id || cartIdOf(item) || 'product'}-${index}`;
    const location = productEventLocations[key] || {};
    const distance = location.distance === '' || location.distance === undefined || location.distance === null ? 0 : Number(location.distance || 0);
    const travelPerKilometer = Number(product.travelPerKilometer ?? item.travelPerKilometer ?? 0) || 0;
    return {
      productID: productPublicId(product),
      product: productMongoId(product),
      quantity: Number(item.quantity || 1),
      BookingStartDate: new Date(form.start || startOf(item) || todayInputValue()),
      BookingEndDate: new Date(form.end || endOf(item) || form.start || todayInputValue()),
      venderUserId: item.venderUserId || item.vendorUserId || item.userId || product.venderUserId || product.vendorUserId || product.userId || '1',
      eventLocation: location.location || form.bookingPlace || '',
      eventLatitude: location.coordinates?.lat || location.latitude || '',
      eventLongitude: location.coordinates?.lng || location.longitude || '',
      distance,
      travelPerKilometer,
      totalTravelCharge: distance * travelPerKilometer,
    };
  });
  const paymentMode = form.paymentMode === 'card' || form.paymentMode === 'credit_card' || form.paymentMode === 'debit_card' ? 'card' : form.paymentMode;
  const paidAmount = form.totalPaidAmount || form.TotalPaidAmount || '';
  const payableAmount = form.totalPayableAmount || form.TotalPayableAmount || '';
  body.append('userID', userId);
  body.append('products', JSON.stringify(bookingProducts));
  body.append('bookingDate', new Date().toISOString());
  body.append('BookingStartDate', form.start);
  body.append('BookingEndDate', form.end);
  body.append('paymentMode', paymentMode);
  body.append('paymentStatus', form.paymentStatus);
  body.append('totalPaidAmount', paidAmount);
  body.append('TotalPaidAmount', paidAmount);
  body.append('TotalPayableAmount', payableAmount);
  body.append('tranjectionId', form.tranjectionId || form.transactionId || '');
  body.append('TranjectionId', form.tranjectionId || form.transactionId || '');
  body.append('cardHolderName', form.cardHolderName || '');
  body.append('bookingDetails', form.bookingDetails || '');
  body.append('coustomerName', form.customerName);
  body.append('coustomeraddress', form.address);
  body.append('bookingPlace', form.bookingPlace);
  body.append('coustomerMobile', form.phone);
  body.append('coustomerMobile2', form.phone2 || '');
  if (form.paymentProof) body.append('paymentProofUrl', form.paymentProof);
  return body;
};
