import {Edit3, Package, RefreshCw, Search, ShieldCheck, ShieldOff, Trash2, X} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Button, Card, Empty, Field, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {asset} from '../../lib/demoData';
import {extractList, formatAmount, getId, getStatus} from '../../lib/dataHelpers';

const PAGE_SIZE = 20;
const productName = product => product?.proName || product?.name || 'Product';
const imageOf = product => (Array.isArray(product?.proImage) ? product.proImage[0] : product?.proImage || product?.image) || asset('image/Wedding.jpg');
const categoryOf = product => product?.category?.catName || product?.catName || product?.category || 'Category';
const vendorOf = product => product?.vendorName || product?.vendor?.name || product?.businessName || 'Vendor';
const activeOf = product => {
  const status = String(getStatus(product) || '').toLowerCase();
  return status.includes('active') && !status.includes('inactive');
};
const statusClass = status => {
  const value = String(status || '').toLowerCase();
  if (value.includes('active') && !value.includes('inactive')) return 'active';
  if (value.includes('inactive')) return 'inactive';
  return value.includes('pending') ? 'pending' : 'neutral';
};

export function AdminProducts() {
  const {session, notify} = useApp();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({proName: '', price: '', quantity: ''});
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchProducts = async (nextPage = 1, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const query = new URLSearchParams({page: String(nextPage), limit: String(PAGE_SIZE), search, catId: '', vendorUserId: ''});
      const response = await apiRequest(`${endpoints.adminProducts}?${query.toString()}`, {token: session.token});
      const nextProducts = extractList(response);
      setProducts(current => append ? [...current, ...nextProducts] : nextProducts);
      setPage(nextPage);
      setHasMore(nextProducts.length === PAGE_SIZE);
    } catch (error) {
      notify(error.message || 'Products not found', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const editProduct = product => {
    setEditingProduct(product);
    setForm({proName: product?.proName || product?.name || '', price: String(product?.price || ''), quantity: String(product?.quantity || '')});
  };

  const resetForm = () => {
    setEditingProduct(null);
    setForm({proName: '', price: '', quantity: ''});
  };

  const updateProduct = async event => {
    event.preventDefault();
    const productId = getId(editingProduct);
    if (!productId) return notify('Product id not found', 'error');
    setLoading(true);
    try {
      const response = await apiRequest(`${endpoints.adminProducts}/${productId}`, {method: 'PUT', token: session.token, body: {...form, proName: form.proName.trim(), isActive: editingProduct?.isActive ?? 1}});
      notify(response?.message || 'Product updated');
      resetForm();
      await fetchProducts(1, false);
    } catch (error) {
      notify(error.message || 'Product not updated', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateProductStatus = async (product, isActive) => {
    const productId = getId(product);
    if (!productId) return notify('Product id not found', 'error');
    setLoading(true);
    try {
      const response = await apiRequest(`${endpoints.adminProducts}/${productId}/status`, {method: 'PATCH', token: session.token, body: {isActive}});
      notify(response?.message || 'Product status updated');
      await fetchProducts(1, false);
    } catch (error) {
      notify(error.message || 'Product status not updated', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async product => {
    const productId = getId(product);
    if (!productId) return notify('Product id not found', 'error');
    setLoading(true);
    try {
      const response = await apiRequest(`${endpoints.adminProducts}/${productId}`, {method: 'DELETE', token: session.token});
      notify(response?.message || 'Product deleted');
      await fetchProducts(1, false);
    } catch (error) {
      notify(error.message || 'Product not deleted', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page admin-manage-page">
      <PageHeader eyebrow="Catalog" title="Products" text="Product catalog and inventory review." actions={<Button variant="soft" disabled={loading} onClick={() => fetchProducts(1, false)}><RefreshCw size={17} />Refresh</Button>} />
      <Card className="admin-manage-filter single">
        <form onSubmit={event => {event.preventDefault(); fetchProducts(1, false);}}><Field label="Search products" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search products" /><Button disabled={loading}><Search size={17} />Search</Button></form>
      </Card>
      {editingProduct && <Card className="admin-edit-card"><h2>Edit Product</h2><form onSubmit={updateProduct}><Field label="Product name" required value={form.proName} onChange={event => setForm({...form, proName: event.target.value})} /><Field label="Price" type="number" value={form.price} onChange={event => setForm({...form, price: event.target.value})} /><Field label="Quantity" type="number" value={form.quantity} onChange={event => setForm({...form, quantity: event.target.value})} /><div className="admin-manage-actions"><Button disabled={loading}>Update Product</Button><Button type="button" variant="ghost" onClick={resetForm}><X size={15} />Cancel</Button></div></form></Card>}
      <Card className="admin-manage-section">
        <div className="admin-section-title"><div><span className="eyebrow">Product List</span><h2>Products</h2></div><Package /></div>
        <div className="admin-manage-list">
          {products.map(product => {
            const active = activeOf(product);
            return (
              <article className="admin-manage-row product-row" key={getId(product) || productName(product)}>
                <div className="admin-manage-main"><img src={imageOf(product)} alt="" /><div><strong>{productName(product)}</strong><span>{categoryOf(product)} | {vendorOf(product)}</span><small>{formatAmount(product?.price)} | Qty: {product?.quantity || 0}</small><small>Rating: {product?.rating || product?.avgRating || '0'}</small><em className={`admin-vendor-status ${statusClass(getStatus(product))}`}>{getStatus(product)}</em></div></div>
                <div className="admin-manage-actions">
                  <button type="button" className="neutral" onClick={() => editProduct(product)}><Edit3 size={15} />Edit Product</button>
                  {active ? <button type="button" className="danger" onClick={() => updateProductStatus(product, 0)}><ShieldOff size={15} />Deactivate</button> : <button type="button" onClick={() => updateProductStatus(product, 1)}><ShieldCheck size={15} />Activate</button>}
                  <button type="button" className="danger" onClick={() => deleteProduct(product)}><Trash2 size={15} />Delete Product</button>
                </div>
              </article>
            );
          })}
        </div>
        {loadingMore && <div className="loading"><RefreshCw size={24} /><span>Loading more products...</span></div>}
        {!loading && !products.length && <Empty title="No products found" text="Product records from the admin API will appear here." />}
      </Card>
      {hasMore && <div className="admin-load-more"><Button variant="soft" disabled={loadingMore} onClick={() => fetchProducts(page + 1, true)}>{loadingMore ? 'Loading...' : 'Load More'}</Button></div>}
    </div>
  );
}
