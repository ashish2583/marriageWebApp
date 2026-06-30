/* eslint-disable no-unused-vars */
import {Camera, LockKeyhole, Mail, MapPin, Phone, ShieldCheck, UserRound} from 'lucide-react';
import {useState} from 'react';
import {Button, Card, Field, PageHeader} from '../../components/UI';
import {useApp} from '../../lib/AppContext';
import {apiRequest, endpoints, unwrap} from '../../lib/api';

export default function Profile({vendor = false}) {
  const {session} = useApp(); const user = session.user;
  return <div className="page"><PageHeader eyebrow={vendor ? 'Business account' : 'Customer account'} title="Profile" text="Your Merrage account details and quick account actions." /><div className="profile-layout"><Card className="profile-card"><img src={user.profileImage || '/assets/image/zz.jpg'} alt="" /><span className="role-pill">{user.role}</span><h2>{user.name}</h2><p><Phone />{user.phone}</p><p><Mail />{user.email}</p><p><MapPin />{user.address}</p></Card><div className="profile-actions"><Card><UserRound /><div><h3>Edit profile</h3><p>Update your photo, contact details, and address.</p></div><Button variant="soft" onClick={() => location.href = vendor ? '/vendor/profile/edit' : '/profile/edit'}>Open</Button></Card><Card><LockKeyhole /><div><h3>Change password</h3><p>Keep your account protected with a new password.</p></div><Button variant="soft" onClick={() => location.href = vendor ? '/vendor/change-password' : '/change-password'}>Open</Button></Card><Card><ShieldCheck /><div><h3>Privacy policy</h3><p>Understand how Merrage handles your account data.</p></div><Button variant="soft" onClick={() => location.href = vendor ? '/vendor/privacy' : '/privacy'}>Read</Button></Card></div></div></div>;
}
