export const extractList = response => {
  const candidates = [
    response?.data?.orders, response?.data?.bookings, response?.data?.cart,
    response?.data?.products, response?.data, response?.orders,
    response?.bookings, response?.cart, response?.products, response,
  ];
  return candidates.find(Array.isArray) || [];
};

export const userIdOf = user => user?.userId || user?.userID || user?._id;
export const productMongoId = product =>
  product?.products?._id || product?.product?._id || product?._id;
export const productPublicId = product =>
  product?.productID || product?.productId || product?.proId ||
  product?.products?.productID || product?.products?.productId ||
  product?.product?.productID || product?.product?.productId || productMongoId(product);
export const cartIdOf = item => item?.cartId || item?._id;
export const productOf = item => item?.products || item?.product || item;
export const startOf = item => item?.BookingStartDate || item?.bookingStartDate || item?.start || '';
export const endOf = item => item?.BookingEndDate || item?.bookingEndDate || item?.end || '';
export const orderIdOf = item => item?.orderId || item?.bookingId || item?._id || `booking-${Date.now()}`;
export const orderProducts = order => {
  const items = order?.products || order?.product || [];
  return Array.isArray(items) ? items : [items];
};

export const isDemoSession = session => session?.token === 'demo-token';

export const bookingFormData = ({userId, items, form}) => {
  const body = new FormData();
  body.append('userID', userId);
  body.append('products', JSON.stringify(items.map(item => ({
    productID: productPublicId(productOf(item)),
    product: productMongoId(productOf(item)),
    quantity: Number(item.quantity || 1),
  }))));
  body.append('BookingStartDate', form.start);
  body.append('BookingEndDate', form.end);
  body.append('paymentMode', form.paymentMode);
  body.append('paymentStatus', form.paymentStatus);
  body.append('bookingDetails', form.bookingDetails || '');
  body.append('coustomerName', form.customerName);
  body.append('coustomeraddress', form.address);
  body.append('bookingPlace', form.bookingPlace);
  body.append('coustomerMobile', form.phone);
  body.append('coustomerMobile2', form.phone2 || '');
  if (form.paymentProof) body.append('paymentProofUrl', form.paymentProof);
  return body;
};
