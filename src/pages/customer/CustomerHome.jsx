import {ArrowRight, Grid2X2, Layers3, Search} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {isGuestSession, useApp} from '../../lib/AppContext';
import {API_BASE_URL, apiRequest, endpoints} from '../../lib/api';
import {extractList} from '../../lib/dataHelpers';
import {asset} from '../../lib/demoData';
import './CustomerHome.css';

const categoryId = item => item.catId || item._id || item.id;
const categoryName = item => item.catName || item.name || 'Category';
const categoryGroupName = item => {
  const group = item.categoryGroup || item.category_group || item.group || item.groupName;
  if (!group) return 'More Services';
  if (typeof group === 'string') return group;
  return group.name || group.title || group.groupName || group.categoryGroupName || 'More Services';
};
const groupedCategories = categories =>
  Object.entries(categories.reduce((groups, item) => {
    const group = categoryGroupName(item);
    groups[group] = [...(groups[group] || []), item];
    return groups;
  }, {}));
const serviceLabel = count => `${count} ${count === 1 ? 'service' : 'services'}`;
const normalizeImageUrl = value => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const raw = typeof rawValue === 'string' ? rawValue : rawValue?.url || rawValue?.uri || rawValue?.path || rawValue?.location || rawValue?.secure_url || '';
  if (!raw) return '';
  if (/^(https?:|blob:|data:)/i.test(String(raw)) || String(raw).startsWith('/assets/')) return raw;
  return `${API_BASE_URL.replace(/\/+$/, '')}/${String(raw).replace(/^\/+/, '')}`;
};

function CategoryCard({item}) {
  const id = categoryId(item);
  const name = categoryName(item);
  const image = normalizeImageUrl(item.catImage || item.image || item.categoryImage || item.cat_image);
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <Link className="category-card" key={id} to={`/vendors?cat=${id}&name=${encodeURIComponent(name)}`}>
      {image && !imageFailed ? <img src={image} alt="" onError={() => setImageFailed(true)} /> : <span className="category-no-image">No image found</span>}
      <div>
        <span>Explore service</span>
        <h3>{name}</h3>
        <ArrowRight />
      </div>
    </Link>
  );
}

export function CustomerHome() {
  const {session, notify} = useApp(); const [items, setItems] = useState([]); const [query, setQuery] = useState(''); const [showAll, setShowAll] = useState(false);
  useEffect(() => {const guest = isGuestSession(session); apiRequest(endpoints.categories, {token: guest ? undefined : session.token, authRequired: !guest}).then(r => setItems(extractList(r))).catch(error => {setItems([]); if (!guest) notify(error.message || 'Unable to load categories.', 'error');});}, [session, notify]);
  const filtered = items.filter(item => `${categoryName(item)} ${categoryGroupName(item)}`.toLowerCase().includes(query.toLowerCase()));
  const groups = groupedCategories(filtered);
  const modeCopy = showAll ? 'Flat list view' : `${groups.length} service groups`;
  return (
    <div className="page">
      <section className="customer-hero"><div className="hero-content"><span className="eyebrow light">Wedding booking platform</span><h1>Plan every beautiful moment in one place.</h1><p>Explore trusted wedding services, compare vendors, and book confidently.</p><div className="hero-search"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search wedding services" /></div></div><div className="hero-photo"><img src={asset('image/Wedding.jpg')} alt="Wedding celebration" /><div className="hero-stat"><strong>One place</strong><span>for every celebration detail</span></div></div></section>
      <section className="section"><div className="section-heading"><div><span className="eyebrow">Curated for your day</span><h2>Popular services</h2></div></div><div className="feature-strip">{[['Decor', 'image/flor.jpg'], ['Catering', 'image/catering.webp'], ['Music', 'image/dj.jpg'], ['Wedding rides', 'image/weddingcar.jpg']].map(([name, img]) => <div key={name}><img src={asset(img)} alt="" /><strong>{name}</strong></div>)}</div></section>
      <section className="section category-section">
        <div className="section-heading category-heading">
          <div>
            <span className="eyebrow">Browse categories</span>
            <h2>{showAll ? 'All categories' : 'Categories by group'}</h2>
            <p>{showAll ? 'Grouping is off so every matching category appears in one list.' : 'Service categories are organized by categoryGroup for faster planning.'}</p>
          </div>
          <div className="category-heading-actions">
            <span className="category-mode-pill">{showAll ? <Grid2X2 /> : <Layers3 />}{modeCopy}</span>
            <span>{serviceLabel(filtered.length)}</span>
            <button type="button" className="button button-soft" onClick={() => setShowAll(value => !value)}>{showAll ? 'Show by Group' : 'See All Categories'}</button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="category-empty">
            <strong>No categories found</strong>
            <span>Try another service or group name.</span>
          </div>
        ) : showAll ? (
          <div className="category-grid category-flat-grid">{filtered.map(item => <CategoryCard key={categoryId(item)} item={item} />)}</div>
        ) : (
          <div className="category-groups">
            {groups.map(([group, categories], index) => (
              <section className="category-group" key={group}>
                <div className="category-group-title">
                  <div className="category-group-copy">
                    <span className="group-kicker">Service group</span>
                    <h3>{group}</h3>
                    <div className="category-preview-row">
                      {categories.slice(0, 3).map(item => <span key={categoryId(item)}>{categoryName(item)}</span>)}
                      {categories.length > 3 && <span>+{categories.length - 3} more</span>}
                    </div>
                  </div>
                  <span className={`category-count-badge accent-${index % 4}`}>{serviceLabel(categories.length)}</span>
                </div>
                <div className="category-grid">{categories.map(item => <CategoryCard key={categoryId(item)} item={item} />)}</div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
