import {ArrowRight, Building2, CheckCircle2, Eye, EyeOff, Heart, Users} from 'lucide-react';
import {useState} from 'react';
import {Link, Navigate, useNavigate} from 'react-router-dom';
import {useApp} from '../lib/AppContext';
import {apiRequest, endpoints} from '../lib/api';
import {Button, Field} from '../components/UI';

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

export function Login() {
  const {session, login} = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({phone: '', password: '', role: 'customer'});
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  if (session) return <Navigate to={session.user.role === 'vendor' ? '/vendor' : '/'} replace />;
  const submit = async event => {
    event.preventDefault(); setError('');
    if (!form.phone || !form.password) return setError('Enter your phone number and password.');
    setLoading(true);
    await login(form);
    setLoading(false);
    navigate(form.role === 'vendor' ? '/vendor' : '/');
  };
  return <div className="auth-layout">
    <AuthArt title="Everything your wedding needs, beautifully organized." text="Discover trusted vendors, compare services, manage bookings, and keep every celebration detail close." />
    <main className="auth-panel"><form className="auth-form" onSubmit={submit}>
      <span className="eyebrow">Welcome back</span><h2>Sign in to Merrage</h2><p>Choose your account type and continue.</p>
      <div className="role-toggle">
        <button type="button" className={form.role === 'customer' ? 'active' : ''} onClick={() => setForm({...form, role: 'customer'})}><Users />Customer</button>
        <button type="button" className={form.role === 'vendor' ? 'active' : ''} onClick={() => setForm({...form, role: 'vendor'})}><Building2 />Vendor</button>
      </div>
      <Field label="Phone number" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Enter phone number" />
      <label className="field"><span>Password</span><div className="password-field"><input type={show ? 'text' : 'password'} value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Enter password" /><button type="button" onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</button></div></label>
      {error && <p className="form-error">{error}</p>}
      <Button disabled={loading}>{loading ? 'Signing in...' : <>Sign In <ArrowRight size={18} /></>}</Button>
      <div className="auth-links"><Link to="/forgot-password">Forgot password?</Link><span>New here? <Link to="/signup">Create account</Link></span></div>
      <p className="demo-note">For a quick preview, enter any phone/password and select a role.</p>
    </form></main>
  </div>;
}

export function Signup() {
  const navigate = useNavigate();
  const {notify} = useApp();
  const [form, setForm] = useState({name: '', email: '', phone: '', role: 'customer', address: '', password: ''});
  const [photo, setPhoto] = useState(null);
  const submit = async event => {
    event.preventDefault();
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      if (photo) body.append('profileImage', photo);
      await apiRequest(endpoints.register, {method: 'POST', body});
      notify('Account created. Please sign in.');
      navigate('/login');
    } catch (error) { notify(error.message, 'error'); }
  };
  return <div className="auth-layout">
    <AuthArt title="Create your place in the celebration." text="Join as a customer planning a beautiful event or a vendor ready to grow a trusted wedding business." />
    <main className="auth-panel auth-panel-scroll"><form className="auth-form" onSubmit={submit}>
      <span className="eyebrow">Create account</span><h2>Join Merrage</h2><p>Tell us the essentials to get started.</p>
      <div className="role-toggle"><button type="button" className={form.role === 'customer' ? 'active' : ''} onClick={() => setForm({...form, role: 'customer'})}><Users />Customer</button><button type="button" className={form.role === 'vendor' ? 'active' : ''} onClick={() => setForm({...form, role: 'vendor'})}><Building2 />Vendor</button></div>
      <div className="form-grid"><Field label="Name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /><Field label="Email" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} /><Field label="Phone" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /><Field label="Password" type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
      <Field as="textarea" label="Address" required value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
      <label className="upload-line"><Heart /><span><strong>Profile photo</strong><small>{photo ? photo.name : 'Optional JPG or PNG'}</small></span><input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} /></label>
      <Button>Create Account <ArrowRight size={18} /></Button><div className="auth-links"><span>Already registered? <Link to="/login">Sign in</Link></span></div>
    </form></main>
  </div>;
}

export function ForgotPassword() {
  const {notify} = useApp(); const [email, setEmail] = useState('');
  const submit = async event => {event.preventDefault(); try {await apiRequest(endpoints.forgotPassword, {method: 'POST', body: JSON.stringify({email})}); notify('Password reset instructions sent.');} catch (error) {notify(error.message, 'error');}};
  return <div className="auth-layout"><AuthArt title="A calm way back into your account." text="Enter your registered email and we will request password reset instructions from the Merrage service." /><main className="auth-panel"><form className="auth-form" onSubmit={submit}><span className="eyebrow">Account recovery</span><h2>Forgot password</h2><p>We will send instructions to your email address.</p><Field label="Email address" type="email" required value={email} onChange={e => setEmail(e.target.value)} /><Button>Send Instructions</Button><div className="auth-links"><Link to="/login">Back to sign in</Link></div></form></main></div>;
}
