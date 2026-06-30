import {MapPin, MessageCircleMore} from 'lucide-react';
import {useState} from 'react';
import {Button, Card, Field, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints} from '../../lib/api';
import {userIdOf} from '../../lib/dataHelpers';

export function Support() {
  const {session, notify} = useApp(); const user = session.user; const [form, setForm] = useState({name: user.name || '', mobile: user.mobile || user.phone || user.number || '', email: user.email || '', address: user.address || '', location: 'Fetching location...'});
  const detectLocation = () => {
    if (!navigator.geolocation) return setForm(current => ({...current, location: 'Location not available'}));
    navigator.geolocation.getCurrentPosition(
      position => setForm(current => ({...current, location: `${position.coords.latitude}, ${position.coords.longitude}`})),
      error => setForm(current => ({...current, location: error.message || 'Location not available'})),
      {enableHighAccuracy: true, timeout: 15000},
    );
  };
  const submit = async e => {e.preventDefault(); try {await apiRequest(endpoints.support, {method: 'POST', token: session.token, body: JSON.stringify({userID: userIdOf(user), cartId: ' ', coustomerName: form.name, coustomerMobile: form.mobile, coustomerEmail: form.email, coustomerAddress: form.address, coustomerLocation: form.location})}); notify('Query submitted successfully.');} catch (error) {notify(error.message, 'error');}};
  return <div className="page connect-admin-page"><PageHeader eyebrow="Support" title="Connect Admin" text="Share your contact details and location so admin can connect with you." /><Card className="connect-admin-form"><MessageCircleMore /><form onSubmit={submit}><Field label="Name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /><Field label="Mobile" required value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} /><Field label="Email" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} /><Field as="textarea" label="Details with Address" required value={form.address} onChange={e => setForm({...form, address: e.target.value})} /><label className="field location-field"><span>Location</span><button type="button" onClick={detectLocation}><MapPin size={18} />{form.location}</button></label><Button>Submit Query</Button></form></Card></div>;
}
