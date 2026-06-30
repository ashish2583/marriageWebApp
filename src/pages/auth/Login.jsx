/* eslint-disable no-unused-vars */
import {ArrowRight, Building2, CheckCircle2, Eye, EyeOff, FileText, ShieldCheck, Users} from 'lucide-react';
import {useState} from 'react';
import {Link, Navigate, useNavigate} from 'react-router-dom';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {Button, Field} from '../../components/UI';

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

export default function Login() {
  const {session, login} = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({phone: '', password: '', role: 'customer'});
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  if (session) return <Navigate to={session.user.role === 'admin' ? '/admin' : session.user.role === 'vendor' ? '/vendor' : '/'} replace />;
  const submit = async event => {
    event.preventDefault(); setError('');
    if (!form.phone || !form.password) return setError('Enter your phone number and password.');
    setLoading(true);
    try {
      const nextSession = await login(form);
      navigate(nextSession.user.role === 'admin' ? '/admin' : nextSession.user.role === 'vendor' ? '/vendor' : '/');
    } catch (error) {
      setError(error.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };
  return <div className="auth-layout">
    <AuthArt title="Everything your wedding needs, beautifully organized." text="Discover trusted vendors, compare services, manage bookings, and keep every celebration detail close." />
    <main className="auth-panel"><form className="auth-form" onSubmit={submit}>
      <span className="eyebrow">Welcome back</span><h2>Sign in to Merrage</h2><p>Choose your account type and continue.</p>
      <div className="role-toggle">
        <button type="button" className={form.role === 'customer' ? 'active' : ''} onClick={() => setForm({...form, role: 'customer'})}><Users />Customer</button>
        <button type="button" className={form.role === 'vendor' ? 'active' : ''} onClick={() => setForm({...form, role: 'vendor'})}><Building2 />Vendor</button>
        <button type="button" className={form.role === 'admin' ? 'active' : ''} onClick={() => setForm({...form, role: 'admin'})}><ShieldCheck />Admin</button>
      </div>
      <Field label="Phone number" value={form.phone} maxLength="12" onChange={e => setForm({...form, phone: e.target.value.replace(/\D/g, '')})} placeholder="Enter phone number" />
      <label className="field"><span>Password</span><div className="password-field"><input type={show ? 'text' : 'password'} value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Enter password" /><button type="button" onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</button></div></label>
      {error && <p className="form-error">{error}</p>}
      <Button disabled={loading}>{loading ? 'Signing in...' : <>Sign In <ArrowRight size={18} /></>}</Button>
      <Link className="auth-policy-button" to="/payment-related-policy"><FileText size={18} /> Payment Related Policy</Link>
      <div className="auth-links"><Link to="/forgot-password">Forgot password?</Link><span>New here? <Link to="/signup">Create account</Link></span></div>
      <p className="demo-note">For admin login, select Admin and use the admin account phone/password from your backend.</p>
    </form></main>
  </div>;
}
