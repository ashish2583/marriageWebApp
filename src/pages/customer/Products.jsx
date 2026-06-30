import {ArrowRight, IndianRupee} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {Button, Empty, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {extractList, getId} from '../../lib/dataHelpers';
import {asset} from '../../lib/demoData';

export function Products() {
  const {session, localProducts} = useApp(); const [params] = useSearchParams(); const navigate = useNavigate(); const [items, setItems] = useState(localProducts);
  const vendor = params.get('vendor'), cat = params.get('cat'), vendorName = params.get('vendorName') || 'Vendor';
  useEffect(() => {apiRequest(endpoints.customerProducts, {method: 'POST', token: session.token, body: JSON.stringify({venderUserId: vendor, catId: cat})}).then(r => setItems(extractList(r))).catch(() => setItems(localProducts.filter(p => (!vendor || p.userId === vendor) && (!cat || p.catId === cat))));}, [vendor, cat, session.token, localProducts]);
  return <div className="page"><PageHeader eyebrow="Available packages" title={vendorName} text={`Explore ${params.get('catName') || 'wedding'} services and choose the right package.`} /><div className="product-grid">{items.map(p => {const id = p._id || p.productID || p.productId || p.proId || getId(p); return <article className="product-card" key={id} onClick={() => navigate(`/product/${id}`, {state: {product: p}})}><img src={p.proImage?.[0] || p.image || asset('image/zz.jpg')} alt="" /><div className="product-body"><span className="price"><IndianRupee size={15} />{p.price}</span><h3>{p.proName}</h3><p>{p.shortDetails}</p><Button variant="soft">View package <ArrowRight size={16} /></Button></div></article>;})}</div>{!items.length && <Empty title="No products found" text="This vendor has not added packages in this category yet." />}</div>;
}
