/* eslint-disable no-unused-vars */
import {ArrowRight, Building2, CheckCircle2, Eye, EyeOff, Heart, Users} from 'lucide-react';
import {useState} from 'react';
import {Link, Navigate, useNavigate} from 'react-router-dom';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {Button, Field} from '../../components/UI';
import GoogleLocationPicker from '../../components/GoogleLocationPicker';

function AuthArt({title, text}) {
  return <div className="auth-art">
    <img className="auth-logo" src="/assets/vslogo.png" alt="Merrage" />
    <span className="eyebrow light">Wedding services platform</span>
    <h1>{title}</h1><p>{text}</p>
    <div className="auth-points">
      <span><CheckCircle2 /> Trusted service providers</span>
      <span><CheckCircle2 /> Easy booking management</span>
      <span><CheckCircle2 /> Customer and vendor tools</span>
    </div>
  </div>;
}

export default function Signup() {
  const navigate = useNavigate();
  const {notify} = useApp();
  const [form, setForm] = useState({name: '', email: '', phone: '', role: 'customer', city: '', state: '', address: '', zip: '', location: '', latitude: '', longitude: '', password: ''});
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const validate = () => {
    if (!form.name.trim()) { notify('Please enter name', 'error'); return false; }
    if (!form.email.trim()) { notify('Please enter email', 'error'); return false; }
    if (!form.phone.trim()) { notify('Please enter number', 'error'); return false; }
    if (!form.role) { notify('Please select user type', 'error'); return false; }
    if (!form.location.trim()) { notify('Please select location', 'error'); return false; }
    if (!form.latitude || !form.longitude) { notify('Please select a valid location from search results', 'error'); return false; }
    if (!form.city.trim()) { notify('Please select user city', 'error'); return false; }
    if (!form.state.trim()) { notify('Please select user state', 'error'); return false; }
    if (!form.address.trim()) { notify('Please enter user address', 'error'); return false; }
    if (!form.zip.trim()) { notify('Please enter user pin', 'error'); return false; }
    if (!form.password.trim()) { notify('Please enter user password', 'error'); return false; }
    if (!photo) { notify('Please upload profile photo', 'error'); return false; }
    return true;
  };
  const submit = async event => {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      body.append('deviceInfo', JSON.stringify({
        devicetype: 'web',
        fcmtoken: ' ',
        devicename: window.navigator.userAgent,
        devicelatitude: form.latitude,
        devicelongitude: form.longitude,
      }));
      body.append('profileImage', photo);
      await apiRequest(endpoints.register, {method: 'POST', body});
      notify('Account created. Please sign in.');
      navigate('/login');
    } catch (error) { notify(error.message, 'error'); } finally { setLoading(false); }
  };
  return <div className="auth-layout">
    <AuthArt title="Create your place in the celebration." text="Join as a customer planning a beautiful event or a vendor ready to grow a trusted wedding business." />
    <main className="auth-panel auth-panel-scroll"><form className="auth-form" onSubmit={submit}>
      <span className="eyebrow">Create account</span><h2>Join Merrage</h2><p>Tell us the essentials to get started.</p>
      <label className="auth-avatar-upload">
        <img src={photo ? URL.createObjectURL(photo) : '/assets/image/virat.jpg'} alt="" />
        <span><Heart />Profile photo is required</span>
        <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} />
      </label>
      <div className="role-toggle"><button type="button" className={form.role === 'customer' ? 'active' : ''} onClick={() => setForm({...form, role: 'customer'})}><Users />Customer</button><button type="button" className={form.role === 'vendor' ? 'active' : ''} onClick={() => setForm({...form, role: 'vendor'})}><Building2 />Vendor</button></div>
      <div className="form-grid"><Field label="Full name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /><Field label="Email address" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} /><Field label="Phone number" required maxLength="12" value={form.phone} onChange={e => setForm({...form, phone: e.target.value.replace(/\D/g, '')})} /><Field label="Password" type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
      <GoogleLocationPicker
        label="Select location"
        value={form.location}
        coordinates={form.latitude && form.longitude ? {lat: Number(form.latitude), lng: Number(form.longitude)} : null}
        onSelect={selected => setForm({...form, location: selected.location || '', address: selected.address || selected.location || form.address, latitude: selected.latitude || '', longitude: selected.longitude || ''})}
        placeholder="Search location"
      />
      <div className="form-grid"><Field label="City" required value={form.city} onChange={e => setForm({...form, city: e.target.value})} /><Field label="State" required value={form.state} onChange={e => setForm({...form, state: e.target.value})} /></div>
      <Field as="textarea" label="Address" required value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
      <Field label="Pin code" required value={form.zip} onChange={e => setForm({...form, zip: e.target.value.replace(/\D/g, '')})} />
      <Button disabled={loading}>{loading ? 'Creating...' : <>Create Account <ArrowRight size={18} /></>}</Button><div className="auth-links"><span>Already registered? <Link to="/login">Sign in</Link></span></div>
    </form></main>
  </div>;
}
