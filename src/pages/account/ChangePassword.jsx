/* eslint-disable no-unused-vars */
import {Camera, LockKeyhole, Mail, MapPin, Phone, ShieldCheck, UserRound} from 'lucide-react';
import {useState} from 'react';
import {Button, Card, Field, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints, unwrap} from '../../lib/api';

export default function ChangePassword() {
  const {session, notify} = useApp(); const [form, setForm] = useState({oldPassword: '', newPassword: '', confirmPassword: ''});
  const submit = async e => {e.preventDefault(); if (form.newPassword !== form.confirmPassword) return notify('New passwords do not match.', 'error'); try {await apiRequest(`${endpoints.changePassword}${session.user.userId || session.user._id}`, {method: 'PUT', token: session.token, body: JSON.stringify(form)}); setForm({oldPassword: '', newPassword: '', confirmPassword: ''}); notify('Password changed successfully.');} catch (error) {notify(error.message, 'error');}};
  return <div className="page"><PageHeader eyebrow="Account security" title="Change Password" text="Choose a strong password that you do not use elsewhere." /><Card className="narrow-form"><LockKeyhole size={34} /><form onSubmit={submit}><Field label="Current password" type="password" required value={form.oldPassword} onChange={e => setForm({...form, oldPassword: e.target.value})} /><Field label="New password" type="password" required value={form.newPassword} onChange={e => setForm({...form, newPassword: e.target.value})} /><Field label="Confirm new password" type="password" required value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} /><Button>Update Password</Button></form></Card></div>;
}
