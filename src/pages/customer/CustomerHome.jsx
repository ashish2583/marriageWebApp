import {ArrowRight, Search} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {extractList} from '../../lib/dataHelpers';
import {asset} from '../../lib/demoData';

export function CustomerHome() {
  const {session, localCategories, notify} = useApp(); const [items, setItems] = useState(localCategories); const [query, setQuery] = useState('');
  useEffect(() => {apiRequest(endpoints.categories, {token: session.token}).then(r => {const categories = extractList(r); setItems(categories.length ? categories : localCategories);}).catch(error => notify(error.message || 'Unable to load categories.', 'error'));}, [session.token, localCategories, notify]);
  const filtered = items.filter(item => item.catName?.toLowerCase().includes(query.toLowerCase()));
  return <div className="page"><section className="customer-hero"><div className="hero-content"><span className="eyebrow light">Wedding booking platform</span><h1>Plan every beautiful moment in one place.</h1><p>Explore trusted wedding services, compare vendors, and book confidently.</p><div className="hero-search"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search wedding services" /></div></div><div className="hero-photo"><img src={asset('image/Wedding.jpg')} alt="Wedding celebration" /><div className="hero-stat"><strong>One place</strong><span>for every celebration detail</span></div></div></section>
    <section className="section"><div className="section-heading"><div><span className="eyebrow">Curated for your day</span><h2>Popular services</h2></div></div><div className="feature-strip">{[['Decor', 'image/flor.jpg'], ['Catering', 'image/catering.webp'], ['Music', 'image/dj.jpg'], ['Wedding rides', 'image/weddingcar.jpg']].map(([name, img]) => <div key={name}><img src={asset(img)} alt="" /><strong>{name}</strong></div>)}</div></section>
    <section className="section"><div className="section-heading"><div><span className="eyebrow">Browse categories</span><h2>Build your celebration team</h2></div><span>{filtered.length} services</span></div><div className="category-grid">{filtered.map(item => <Link className="category-card" key={item.catId || item._id} to={`/vendors?cat=${item.catId || item._id}&name=${encodeURIComponent(item.catName)}`}><img src={item.catImage || asset('image/Wedding.jpg')} alt="" /><div><span>Explore service</span><h3>{item.catName}</h3><ArrowRight /></div></Link>)}</div></section>
  </div>;
}
