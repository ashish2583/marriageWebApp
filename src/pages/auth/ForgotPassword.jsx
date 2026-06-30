/* eslint-disable no-unused-vars */
import {ArrowRight, Building2, CheckCircle2, Eye, EyeOff, Heart, Users} from 'lucide-react';
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

export default function ForgotPassword() {
  const {notify} = useApp();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async event => {
    event.preventDefault();
    if (!email.trim()) {
      notify('Please enter email', 'error');
      return;
    }
    setLoading(true);
    try {
      const response = await apiRequest(endpoints.forgotPassword, {method: 'POST', body: {email: email.trim()}});
      notify(response?.message || 'Password reset instructions sent.');
      setEmail('');
    } catch (error) {
      notify(error.message || 'Something went wrong!', 'error');
    } finally {
      setLoading(false);
    }
  };
  return <div className="auth-layout"><AuthArt title="A calm way back into your account." text="Enter your registered email and we will request password reset instructions from the Merrage service." /><main className="auth-panel"><form className="auth-form forgot-card" onSubmit={submit}><span className="eyebrow">Account recovery</span><h2>Forgot password</h2><p>Enter your email address and we will send reset instructions.</p><Field label="Email address" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter email" /><Button disabled={loading}>{loading ? 'Sending...' : 'Send Instructions'}</Button><div className="auth-links"><Link to="/login">Back to sign in</Link><Link to="/signup">Create account</Link></div></form></main></div>;
}
