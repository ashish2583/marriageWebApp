import {FolderTree, ImagePlus, RefreshCw, Trash2, X} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Button, Card, Empty, Field, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {asset} from '../../lib/demoData';
import {extractList, getId, getStatus} from '../../lib/dataHelpers';

const categoryName = category => category?.catName || category?.name || 'Category';
const imageOf = category => category?.catImage || category?.image || asset('image/stage.jpg');
const statusClass = status => {
  const value = String(status || '').toLowerCase();
  if (value.includes('active') && !value.includes('inactive')) return 'active';
  if (value.includes('inactive')) return 'inactive';
  return value.includes('pending') ? 'pending' : 'neutral';
};

export function AdminCategories() {
  const {session, notify} = useApp();
  const [categories, setCategories] = useState([]);
  const [catName, setCatName] = useState('');
  const [catImage, setCatImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await apiRequest(endpoints.adminCategories, {token: session.token});
      setCategories(extractList(response));
    } catch (error) {
      notify(error.message || 'Categories not found', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const resetForm = () => {
    setCatName('');
    setCatImage(null);
    setPreview('');
    setEditingCategory(null);
  };

  const editCategory = category => {
    setEditingCategory(category);
    setCatName(categoryName(category));
    setCatImage(null);
    setPreview(category?.catImage || category?.image || '');
  };

  const saveCategory = async event => {
    event.preventDefault();
    if (!catName.trim()) return notify('Please enter category name', 'error');
    const categoryId = editingCategory ? getId(editingCategory) : '';
    const body = catImage ? new FormData() : {catName: catName.trim()};
    if (catImage) {
      body.append('catName', catName.trim());
      body.append('catImage', catImage);
    }
    setLoading(true);
    try {
      const response = await apiRequest(categoryId ? `${endpoints.adminCategories}/${categoryId}` : endpoints.adminCategories, {
        method: categoryId ? 'PUT' : 'POST',
        token: session.token,
        body,
      });
      notify(response?.message || 'Category saved');
      resetForm();
      await fetchCategories();
    } catch (error) {
      notify(error.message || 'Category not saved', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async category => {
    const categoryId = getId(category);
    if (!categoryId) return notify('Category id not found', 'error');
    setLoading(true);
    try {
      const response = await apiRequest(`${endpoints.adminCategories}/${categoryId}`, {method: 'DELETE', token: session.token});
      notify(response?.message || 'Category deleted');
      await fetchCategories();
    } catch (error) {
      notify(error.message || 'Category not deleted', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCatImage(file);
    setPreview(URL.createObjectURL(file));
  };

  return (
    <div className="page admin-manage-page">
      <PageHeader eyebrow="Taxonomy" title="Categories" text="Manage event service categories." actions={<Button variant="soft" disabled={loading} onClick={fetchCategories}><RefreshCw size={17} />Refresh</Button>} />
      <Card className="admin-edit-card category-form-card">
        <h2>{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
        <form onSubmit={saveCategory}>
          <Field label="Category name" required value={catName} onChange={event => setCatName(event.target.value)} placeholder="Category name" />
          <label className="admin-image-picker">
            <span><strong>Category image</strong><small>Select an image file to upload with category.</small></span>
            <b>{preview ? 'Change Image' : 'Select Image'}</b>
            <input type="file" accept="image/*" onChange={pickImage} />
          </label>
          {preview && <div className="admin-category-preview"><img src={preview} alt="" /><button type="button" onClick={() => {setCatImage(null); setPreview('');}}><X size={15} />Remove Image</button></div>}
          <div className="admin-manage-actions"><Button disabled={loading}>{editingCategory ? 'Update Category' : 'Add Category'}</Button>{editingCategory && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}</div>
        </form>
      </Card>
      <Card className="admin-manage-section">
        <div className="admin-section-title"><div><span className="eyebrow">Category Manager</span><h2>Categories</h2></div><FolderTree /></div>
        <div className="admin-manage-list">
          {categories.map(category => (
            <article className="admin-manage-row category-row" key={getId(category) || categoryName(category)}>
              <div className="admin-manage-main"><img src={imageOf(category)} alt="" /><div><strong>{categoryName(category)}</strong><span>{category?.products || category?.productCount || 0} products listed</span><em className={`admin-vendor-status ${statusClass(getStatus(category))}`}>{getStatus(category)}</em></div></div>
              <div className="admin-manage-actions"><button type="button" className="neutral" onClick={() => editCategory(category)}><ImagePlus size={15} />Edit Category</button><button type="button" className="danger" onClick={() => deleteCategory(category)}><Trash2 size={15} />Delete Category</button></div>
            </article>
          ))}
        </div>
        {!loading && !categories.length && <Empty title="No categories found" text="Category records from the admin API will appear here." />}
      </Card>
    </div>
  );
}
