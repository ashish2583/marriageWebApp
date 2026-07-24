import {ChevronRight, MapPin, Star} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {Button, Empty, PageHeader} from '../../components/UI';
import {isGuestSession, useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {extractList} from '../../lib/dataHelpers';
import {asset} from '../../lib/demoData';

export function Vendors() {
  const {session} = useApp(); const [params] = useSearchParams(); const [items, setItems] = useState([]);
  const cat = params.get('cat'); const name = params.get('name') || 'Vendors';
  useEffect(() => {if (!cat) {setItems([]); return;} const guest = isGuestSession(session); apiRequest(`${endpoints.vendorsByCategory}${cat}`, {token: guest ? undefined : session.token, authRequired: !guest}).then(r => setItems(extractList(r))).catch(() => setItems([]));}, [cat, session]);
  return <div className="page"><PageHeader eyebrow="Trusted professionals" title={name} text="Compare service providers and explore their available packages." />{items.length ? <div className="vendor-grid">{items.map(v => <Link className="vendor-card" key={v.userId || v._id} to={`/products?vendor=${v.userId || v._id}&cat=${cat}&vendorName=${encodeURIComponent(v.name)}&catName=${encodeURIComponent(name)}`}><img src={v.profileImage || asset('image/Wedding.jpg')} alt="" /><div className="vendor-body"><span className="rating"><Star size={14} fill="currentColor" /> 4.8</span><h3>{v.name}</h3><p><MapPin size={15} />{v.address || 'Wedding service provider'}</p><Button variant="soft">View services <ChevronRight size={16} /></Button></div></Link>)}</div> : <Empty title="No vendors found" text="No vendors are available in this category right now." />}</div>;
}
