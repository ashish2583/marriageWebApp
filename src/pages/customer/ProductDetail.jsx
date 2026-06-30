import {CalendarDays, IndianRupee, ShoppingCart, Sparkles, Star, Truck} from 'lucide-react';
import {useState} from 'react';
import {useLocation, useParams} from 'react-router-dom';
import {Button, Card, Modal} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {API_BASE_URL, apiRequest, endpoints} from '../../lib/api';
import {getId, getName, productMongoId, productPublicId, todayInputValue, userIdOf} from '../../lib/dataHelpers';
import {asset, products as fallbackProducts} from '../../lib/demoData';

const getRatingValue = value => {
  const rating = Number(value);
  return Number.isFinite(rating) ? Math.max(0, Math.min(rating, 5)) : 0;
};

const normalizeMediaUrl = value => {
  const raw = typeof value === 'string' ? value : value?.url || value?.uri || value?.path || value?.location || value?.secure_url || '';
  if (!raw) return '';
  if (/^(https?:|blob:|data:)/i.test(String(raw)) || String(raw).startsWith('/assets/')) return raw;
  return `${API_BASE_URL.replace(/\/+$/, '')}/${String(raw).replace(/^\/+/, '')}`;
};

const imageUrlOf = image => normalizeMediaUrl(image);

const productImages = product => {
  const raw = product?.proImage || product?.images || product?.image || product?.productImage || [];
  const images = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(imageUrlOf).filter(Boolean);
  return images.length ? images : [asset('image/Wedding.jpg')];
};

const productVideos = product => {
  const raw = product?.proVideo || product?.videos || product?.video || [];
  return (Array.isArray(raw) ? raw : raw ? [raw] : []).map(imageUrlOf).filter(Boolean);
};

const reviewList = product => {
  const candidates = [
    product?.reviewData,
    product?.reviews,
    product?.review,
    product?.ratings,
    product?.ratingReviews,
    product?.productReviews,
  ];
  const list = candidates.find(Array.isArray) || [];
  return list.map((item, index) => {
    const review = typeof item === 'string' ? {review: item} : item || {};
    const rawImages = review.reviewImages || review.images || review.reviewImage || review.image || [];
    return {
      id: review._id || review.id || `${index}`,
      name: review.userName || review.customerName || review.coustomerName || review.customer?.name || review.user?.name || 'Customer',
      image: imageUrlOf(review.customerImage || review.profileImage || review.userImage || review.avatar || review.photo || review.customer?.profileImage || review.user?.profileImage),
      rating: getRatingValue(review.rating || review.star || review.stars),
      text: review.review || review.comment || review.message || review.description || '',
      images: (Array.isArray(rawImages) ? rawImages : rawImages ? [rawImages] : []).map(imageUrlOf).filter(Boolean),
    };
  });
};

const ratingOf = (product, reviews) => {
  const productRating = getRatingValue(product?.avgRating || product?.averageRating || product?.rating || product?.ratingsAverage || product?.ratingAverage);
  if (productRating || !reviews.length) return productRating;
  const values = reviews.map(item => item.rating).filter(Boolean);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
};

function Stars({value}) {
  const rating = Math.round(getRatingValue(value));
  return <span className="stars" aria-label={`${getRatingValue(value).toFixed(1)} out of 5 rating`}>{[1, 2, 3, 4, 5].map(item => <Star key={item} size={16} fill={item <= rating ? 'currentColor' : 'none'} />)}</span>;
}

export function ProductDetail() {
  const {id} = useParams(); const location = useLocation(); const {session, localProducts, addToCart, notify} = useApp(); const product = location.state?.product || localProducts.find(p => [p._id, p.productID, p.productId, p.proId].includes(id)) || fallbackProducts[0]; const images = productImages(product); const videos = productVideos(product); const reviews = reviewList(product); const rating = ratingOf(product, reviews); const ratingCount = product.ratingCount || product.totalRatings || product.reviewCount || reviews.length; const [image, setImage] = useState(images[0]); const [fullImage, setFullImage] = useState(null); const [video, setVideo] = useState(null); const [dates, setDates] = useState({start: '', end: ''}); const [saving, setSaving] = useState(false);
  const today = todayInputValue();
  const book = async () => {
    if (!dates.start || !dates.end) return notify('Choose booking start and end dates.', 'error');
    if (dates.end < dates.start) return notify('End date must be after start date.', 'error');
    setSaving(true);
    try {
      await apiRequest(endpoints.checkBooking, {method: 'POST', token: session.token, body: JSON.stringify({productID: productPublicId(product), BookingStartDate: dates.start, BookingEndDate: dates.end})});
      await apiRequest(endpoints.addCart, {method: 'POST', token: session.token, body: JSON.stringify({userId: userIdOf(session.user), productId: productPublicId(product), products: productMongoId(product), BookingStartDate: dates.start, BookingEndDate: dates.end, quantity: 1})});
      addToCart({...product, start: dates.start, end: dates.end});
    } catch (error) { notify(error.message, 'error'); } finally { setSaving(false); }
  };
  return <div className="page"><div className="detail-layout"><section className="gallery"><button type="button" className="main-media media-open-button" onClick={() => setFullImage(image || asset('image/Wedding.jpg'))} aria-label="Open image fullscreen"><img src={image || asset('image/Wedding.jpg')} alt="" /></button><div className="thumbs">{images.map(url => <button className={image === url ? 'active' : ''} key={url} onClick={() => setImage(url)}><img src={url} alt="" /></button>)}{videos.map((url, index) => <button key={url} className="video-thumb" onClick={() => setVideo(url)}>Play video {videos.length > 1 ? index + 1 : ''}</button>)}</div></section><aside className="detail-card"><span className="eyebrow">Wedding package</span><h1>{getName(product)}</h1><div className="rating-row"><Stars value={rating} /><strong>{rating.toFixed(1)}</strong><span>{ratingCount || 0} review{Number(ratingCount) === 1 ? '' : 's'}</span></div><div className="detail-price"><IndianRupee />{product.price || 0}<small>per booking</small></div><p>{product.shortDetails || 'No short details added.'}</p><div className="product-facts"><span><Sparkles />ID: {productPublicId(product) || getId(product) || 'N/A'}</span><span><Truck />Travel/km: Rs. {product.travelPerKilometer || product.travelCharge || 0}</span><span><ShoppingCart />Quantity: {product.quantity || product.availableQuantity || 'Available'}</span></div><div className="date-grid"><label><span>Start date</span><input type="date" min={today} value={dates.start} onChange={e => setDates({...dates, start: e.target.value})} /></label><label><span>End date</span><input type="date" min={dates.start || today} value={dates.end} onChange={e => setDates({...dates, end: e.target.value})} /></label></div><Button disabled={saving} onClick={book}><ShoppingCart size={18} />{saving ? 'Checking...' : 'Add to Cart'}</Button><div className="assurances"><span><Sparkles />Carefully presented service</span><span><CalendarDays />Booking dates checked before confirmation</span></div></aside></div><div className="product-detail-panels"><Card className="description-card"><span className="eyebrow">Details</span><h2>Product Details</h2><div className="detail-copy"><strong>Short Details</strong><p>{product.shortDetails || 'No short details added.'}</p><strong>Long Details</strong><p>{product.longDetails || product.description || 'No long details added.'}</p></div></Card><Card className="review-panel"><span className="eyebrow">Rating</span><div className="review-summary"><strong>{rating.toFixed(1)}</strong><div><Stars value={rating} /><p>{ratingCount || 0} customer review{Number(ratingCount) === 1 ? '' : 's'}</p></div></div><h2>Reviews</h2>{reviews.length ? <div className="review-list">{reviews.map(item => <article className="review-card" key={item.id}><div className="review-head">{item.image ? <button type="button" className="review-avatar-button" onClick={() => setFullImage(item.image)}><img src={item.image} alt="" /></button> : <span>{item.name.charAt(0).toUpperCase()}</span>}<div><strong>{item.name}</strong><Stars value={item.rating || rating} /></div></div>{item.text && <p>{item.text}</p>}{item.images.length > 0 && <div className="review-images">{item.images.map(url => <button type="button" key={url} onClick={() => setFullImage(url)}><img src={url} alt="" /></button>)}</div>}</article>)}</div> : <div className="no-review-card"><strong>No reviews yet</strong><p>Customer reviews for this product will appear here.</p></div>}</Card></div>{video && <Modal title="Video preview" onClose={() => setVideo(null)} wide><video controls autoPlay playsInline src={video} className="video-player" /></Modal>}{fullImage && <Modal title="Image preview" onClose={() => setFullImage(null)} wide><div className="image-preview-modal"><img src={fullImage} alt="" /></div></Modal>}</div>;
}
