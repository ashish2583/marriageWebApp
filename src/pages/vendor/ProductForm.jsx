import {CheckCircle2, Film, Image as ImageIcon, PackagePlus, Save, Trash2, UploadCloud} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import GoogleLocationPicker from '../../components/GoogleLocationPicker';
import {Button, Card, Field, Modal, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {API_BASE_URL, apiRequest, endpoints} from '../../lib/api';
import {extractList, userIdOf} from '../../lib/dataHelpers';
import {asset} from '../../lib/demoData';

const mediaUrl = value => {
  if (!value) return '';
  if (/^(https?:|blob:|data:)/i.test(String(value))) return value;
  return `${API_BASE_URL.replace(/\/+$/, '')}/${String(value).replace(/^\/+/, '')}`;
};

const initialForm = () => ({
  proName: '',
  price: '',
  quantity: '',
  travelPerKilometer: '',
  catId: '',
  location: '',
  locationCoordinates: null,
  shortDetails: '',
  longDetails: '',
  proImage: [],
  proVideo: [],
  isActive: true,
});

const productIdOf = product => product?._id || product?.id || product?.productID || product?.productId || product?.proId || '';

const normalizeProductForForm = product => ({
  ...initialForm([]),
  ...product,
  price: product?.price == null ? '' : String(product.price),
  quantity: product?.quantity == null ? '' : String(product.quantity),
  travelPerKilometer: product?.travelPerKilometer == null ? '' : String(product.travelPerKilometer),
  catId: product?.catId || product?.categoryId || product?.category?._id || '',
  location: product?.location || product?.address || product?.productLocation || '',
  address: product?.location || product?.address || product?.productLocation || '',
  locationCoordinates: product?.latitude && product?.longitude ? {lat: Number(product.latitude), lng: Number(product.longitude)} : null,
  proImage: Array.isArray(product?.proImage) ? product.proImage : [],
  proVideo: Array.isArray(product?.proVideo) ? product.proVideo : [],
  isActive: product?.isActive === undefined ? true : Boolean(product.isActive),
});

export function ProductForm({edit = false}) {
  const {id} = useParams();
  const {state} = useLocation();
  const navigate = useNavigate();
  const {session, localProducts, setLocalProducts, localCategories, setLocalCategories, notify} = useApp();
  const existing = useMemo(() => state?.product || localProducts.find(product => productIdOf(product) === id), [id, localProducts, state]);
  const [form, setForm] = useState(() => edit && existing ? normalizeProductForForm(existing) : initialForm());
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [activeSection, setActiveSection] = useState('details');
  const [previewImage, setPreviewImage] = useState('');
  const [previewVideo, setPreviewVideo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest(endpoints.userCategories, {token: session.token})
      .then(response => {
        const categories = extractList(response);
        if (categories.length) {
          setLocalCategories(categories);
          setForm(current => current.catId ? current : {...current, catId: categories[0].catId || categories[0]._id});
        }
      })
      .catch(error => notify(error.message, 'error'));
  }, [notify, session.token, setLocalCategories]);

  useEffect(() => {
    if (edit) {
      if (existing) setForm(normalizeProductForForm(existing));
      return;
    }
    setForm(initialForm());
    setImages([]);
    setVideos([]);
    setActiveSection('details');
  }, [edit, existing, id]);

  useEffect(() => {
    if (!edit || existing || !id) return;
    apiRequest(endpoints.vendorProducts, {method: 'POST', token: session.token, body: {userId: userIdOf(session.user)}})
      .then(response => {
        const products = extractList(response);
        if (products.length) setLocalProducts(products);
        const found = products.find(product => productIdOf(product) === id);
        if (found) setForm(normalizeProductForForm(found));
      })
      .catch(error => notify(error.message || 'Product details not found', 'error'));
  }, [edit, existing, id, notify, session.token, session.user, setLocalProducts]);

  const validateCreate = () => {
    if (!form.longDetails.trim()) { notify('Please Enter Product Details', 'error'); return false; }
    if (!String(form.price).trim()) { notify('Please Enter Product Booking Price', 'error'); return false; }
    if (!String(form.quantity).trim()) { notify('Please Enter Product Quantity', 'error'); return false; }
    if (!form.proName.trim()) { notify('Please Enter Product Name', 'error'); return false; }
    if (!form.catId) { notify('Please Select Catogry', 'error'); return false; }
    if (!form.shortDetails.trim()) { notify('Please Enter Product Short', 'error'); return false; }
    if (!String(form.travelPerKilometer).trim()) { notify('Please Enter Travel charge Per Kilometer', 'error'); return false; }
    return true;
  };

  const appendDetails = body => {
    body.append('proName', form.proName.trim());
    body.append('longDetails', form.longDetails.trim());
    body.append('shortDetails', form.shortDetails.trim());
    body.append('travelPerKilometer', String(form.travelPerKilometer).trim());
    body.append('price', form.price);
    body.append('quantity', String(form.quantity).trim());
    body.append('catId', form.catId);
    if (form.location.trim()) {
      body.append('location', form.location.trim());
      body.append('address', form.location.trim());
      body.append('latitude', form.locationCoordinates?.lat || '');
      body.append('longitude', form.locationCoordinates?.lng || '');
    }
    body.append('isActive', form.isActive ? '1' : '0');
  };

  const createProduct = async event => {
    event.preventDefault();
    if (!validateCreate()) return;

    const body = new FormData();
    appendDetails(body);
    body.append('userId', userIdOf(session.user));
    body.append('user_id', session.user._id || '');
    images.forEach(file => body.append('proImage', file));
    videos.forEach(file => body.append('proVideo', file));

    setSaving(true);
    try {
      const response = await apiRequest(endpoints.createProduct, {method: 'POST', token: session.token, body});
      const previewImages = images.map(URL.createObjectURL);
      const previewVideos = videos.map(URL.createObjectURL);
      const created = response?.data?.product || response?.data || response?.product || {
        ...form,
        _id: `local-${Date.now()}`,
        userId: userIdOf(session.user),
        proImage: previewImages,
        proVideo: previewVideos,
      };
      setLocalProducts(items => [created, ...items]);
      notify(response?.message || 'Product created.');
      navigate('/vendor/products');
    } catch (error) {
      notify(error.message || 'Product not created', 'error');
    } finally {
      setSaving(false);
    }
  };

  const changedDetails = useMemo(() => {
    if (!existing) return {};
    const changes = {};
    ['proName', 'longDetails', 'shortDetails', 'price', 'quantity', 'travelPerKilometer', 'catId', 'location', 'address'].forEach(key => {
      const nextValue = key === 'address' ? form.location : form[key];
      const previousValue = key === 'address' ? existing.location || existing.address : existing[key];
      if (String(nextValue ?? '').trim() !== String(previousValue ?? '').trim()) changes[key] = String(nextValue ?? '').trim();
    });
    if (form.locationCoordinates?.lat) changes.latitude = form.locationCoordinates.lat;
    if (form.locationCoordinates?.lng) changes.longitude = form.locationCoordinates.lng;
    if (Boolean(form.isActive) !== Boolean(existing.isActive ?? true)) changes.isActive = form.isActive ? 1 : 0;
    return changes;
  }, [existing, form]);

  const updateDetails = async event => {
    event.preventDefault();
    if (!id) return notify('Product id not found', 'error');
    if (!Object.keys(changedDetails).length) return notify('Change at least one product detail before updating', 'error');

    setSaving(true);
    try {
      const response = await apiRequest(`${endpoints.editProduct}${id}`, {method: 'PUT', token: session.token, body: changedDetails});
      setLocalProducts(items => items.map(product => (product._id === id || product.productID === id || product.productId === id) ? {...product, ...changedDetails, location: form.location, address: form.location} : product));
      notify(response?.message || 'Product details updated');
      navigate('/vendor/products');
    } catch (error) {
      notify(error.message || 'Product not updated', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateMedia = async event => {
    event.preventDefault();
    if (!id) return notify('Product id not found', 'error');
    if (!images.length && !videos.length) return notify('Select at least one new image or video', 'error');

    const body = new FormData();
    images.forEach(file => body.append('proImage', file));
    videos.forEach(file => body.append('proVideo', file));

    setSaving(true);
    try {
      const response = await apiRequest(`${endpoints.editProduct}${id}`, {method: 'PUT', token: session.token, body});
      const previewImages = images.map(URL.createObjectURL);
      const previewVideos = videos.map(URL.createObjectURL);
      setLocalProducts(items => items.map(product => (product._id === id || product.productID === id || product.productId === id) ? {...product, proImage: [...(product.proImage || []), ...previewImages], proVideo: [...(product.proVideo || []), ...previewVideos]} : product));
      setImages([]);
      setVideos([]);
      notify(response?.message || 'Product media updated');
      navigate('/vendor/products');
    } catch (error) {
      notify(error.message || 'Media not updated', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteMedia = async (url, type) => {
    try {
      await apiRequest(`${endpoints.deleteProductMedia}${id}`, {
        method: 'PUT',
        token: session.token,
        body: {[type === 'image' ? 'imageUrl' : 'videoUrl']: url},
      });
      const key = type === 'image' ? 'proImage' : 'proVideo';
      setForm(current => ({...current, [key]: (current[key] || []).filter(item => item !== url)}));
      setLocalProducts(items => items.map(product => product._id === id ? {...product, [key]: (product[key] || []).filter(item => item !== url)} : product));
      notify(`Product ${type} deleted`);
    } catch (error) {
      notify(error.message || `Product ${type} not deleted`, 'error');
    }
  };

  const renderMediaSection = (title, icon, existingMedia, newMedia, setter, accept, type) => {
    const Icon = icon;
    return (
      <div className="mobile-media-section">
        <div className="mobile-media-head">
          <div><Icon /><span><strong>{title}</strong><small>{type === 'image' ? 'Attach one or more product images.' : 'Attach product videos if available.'}</small></span></div>
          <label className="small-upload-button">Add<input multiple type="file" accept={accept} onChange={event => setter([...event.target.files])} /></label>
        </div>
        <div className="mobile-media-grid">
          {(existingMedia || []).map(url => (
            <article key={url}>
              {type === 'image'
                ? <button type="button" className="media-preview-button" onClick={() => setPreviewImage(mediaUrl(url))}><img src={mediaUrl(url)} alt="" /></button>
                : <button type="button" className="media-preview-button video-preview-card" onClick={() => setPreviewVideo(mediaUrl(url))}><Film /><span>Play Video</span></button>}
              {edit && <button type="button" onClick={() => deleteMedia(url, type)}><Trash2 size={14} />Delete</button>}
            </article>
          ))}
          {newMedia.map(file => (
            <article key={file.name}>
              {type === 'image'
                ? <button type="button" className="media-preview-button" onClick={() => setPreviewImage(URL.createObjectURL(file))}><img src={URL.createObjectURL(file)} alt="" /></button>
                : <button type="button" className="media-preview-button video-preview-card" onClick={() => setPreviewVideo(URL.createObjectURL(file))}><Film /><span>Play Video</span></button>}
              <button type="button" onClick={() => setter(current => current.filter(item => item !== file))}>Remove</button>
            </article>
          ))}
          {!existingMedia?.length && !newMedia.length && <p>No media selected yet.</p>}
        </div>
      </div>
    );
  };

  const detailsForm = (
    <>
      <Card className="mobile-product-card">
        <h2>Product details</h2>
        {edit && <p>Every field is optional. Only changed values are sent.</p>}
        <div className="form-grid">
          <Field label="Product name" required={!edit} placeholder="Enter product name" value={form.proName || ''} onChange={event => setForm({...form, proName: event.target.value})} />
          <Field label="Booking price" required={!edit} type="number" placeholder="Enter booking price" value={form.price || ''} onChange={event => setForm({...form, price: event.target.value})} />
          <Field label="Quantity" required={!edit} type="number" placeholder="Enter quantity" value={form.quantity || ''} onChange={event => setForm({...form, quantity: event.target.value})} />
          <Field label="Travel charge per kilometer" required={!edit} type="number" placeholder="Enter Travel charge per kilometer" value={form.travelPerKilometer || ''} onChange={event => setForm({...form, travelPerKilometer: event.target.value})} />
        </div>
        <label className="field">
          <span>Category</span>
          <select value={form.catId || ''} onChange={event => setForm({...form, catId: event.target.value})}>
            <option value="">Select category</option>
            {localCategories.map(category => <option key={category.catId || category._id} value={category.catId || category._id}>{category.catName}</option>)}
          </select>
        </label>
        <GoogleLocationPicker
          label="Product location"
          value={form.location || form.address || ''}
          coordinates={form.locationCoordinates}
          onSelect={selected => setForm({...form, location: selected.location || '', address: selected.location || '', locationCoordinates: selected.latitude != null ? {lat: selected.latitude, lng: selected.longitude} : null})}
          placeholder="Search product location"
        />
      </Card>
      <Card className="mobile-product-card">
        <h2>Description and status</h2>
        <Field as="textarea" label="Short details" required={!edit} maxLength="100" placeholder="Enter short details" value={form.shortDetails || ''} onChange={event => setForm({...form, shortDetails: event.target.value})} />
        <Field as="textarea" label="Product details" required={!edit} placeholder="Enter product details" value={form.longDetails || ''} onChange={event => setForm({...form, longDetails: event.target.value})} />
        <label className="status-row">
          <input type="checkbox" checked={Boolean(form.isActive)} onChange={event => setForm({...form, isActive: event.target.checked})} />
          <span><CheckCircle2 />{form.isActive ? 'Active product' : 'Inactive product'}</span>
        </label>
      </Card>
    </>
  );

  return (
    <div className="page product-form-page">
      <PageHeader
        eyebrow={edit ? 'Update listing' : 'New listing'}
        title={edit ? 'Edit Product' : 'Add Product'}
        text={edit ? 'Update product details or add new images and videos using the same mobile flow.' : 'Add a service package with price, quantity, travel charge, location, and media.'}
      />
      {edit && (
        <div className="mobile-section-tabs">
          <button className={activeSection === 'details' ? 'active' : ''} type="button" onClick={() => setActiveSection('details')}>Details</button>
          <button className={activeSection === 'media' ? 'active' : ''} type="button" onClick={() => setActiveSection('media')}>Images & Videos</button>
        </div>
      )}
      <form className="product-form mobile-product-form" onSubmit={edit ? updateDetails : createProduct}>
        {(!edit || activeSection === 'details') && detailsForm}
        {(!edit || activeSection === 'media') && (
          <Card className="mobile-product-card">
            <h2>Product media</h2>
            <p>Images and videos are optional. Add either type or both.</p>
            {renderMediaSection('Product images', ImageIcon, form.proImage, images, setImages, 'image/*', 'image')}
            {renderMediaSection('Product videos', Film, form.proVideo, videos, setVideos, 'video/*', 'video')}
          </Card>
        )}
        {edit && activeSection === 'media' ? (
          <Button type="button" onClick={updateMedia} disabled={saving}><UploadCloud size={17} />{saving ? 'Updating...' : 'Update Media'}</Button>
        ) : (
          <Button disabled={saving}><Save size={17} />{saving ? 'Saving...' : edit ? 'Update Details' : 'Submit'}</Button>
        )}
      </form>
      {!edit && !images.length && <Card className="product-form-tip"><PackagePlus /><p>Add at least one clear product photo so customers can inspect the service before booking.</p><img src={asset('image/Wedding.jpg')} alt="" /></Card>}
      {previewImage && <Modal title="Image preview" onClose={() => setPreviewImage('')} wide><div className="image-preview-modal"><img src={previewImage} alt="" /></div></Modal>}
      {previewVideo && <Modal title="Video preview" onClose={() => setPreviewVideo('')} wide><video className="video-player" src={previewVideo} controls autoPlay playsInline /></Modal>}
    </div>
  );
}
