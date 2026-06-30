import {CalendarDays, Download, Film, ImagePlus, MapPin, Music2, PartyPopper, RotateCcw} from 'lucide-react';
import {useMemo, useState} from 'react';
import {Button, Card, Field, PageHeader} from '../../components/UI';
import {asset} from '../../lib/demoData';

const templates = [
  {id: 'royal', name: 'Royal red', accent: '#C03546', dark: '#5C1739', soft: '#FFF1F5', image: asset('image/stage.jpg')},
  {id: 'classic', name: 'Green classic', accent: '#16836A', dark: '#0F5F55', soft: '#EAF7F5', image: asset('image/Wedding.jpg')},
  {id: 'gold', name: 'Gold palace', accent: '#C58B10', dark: '#6F4B00', soft: '#FFF4D8', image: asset('image/light.jpg')},
  {id: 'floral', name: 'Pink floral', accent: '#B93678', dark: '#6B1F4B', soft: '#FFF0F7', image: asset('image/flor.jpg')},
  {id: 'divine', name: 'Divine blue', accent: '#2E72B8', dark: '#143C63', soft: '#EEF6FF', image: asset('image/radhakrishna.jpg')},
];

const defaultInvitation = {
  brideName: '',
  groomName: '',
  eventTitle: 'Wedding Invitation',
  eventDate: '',
  eventTime: '',
  venue: '',
  familyName: '',
  message: 'With the blessings of our families, we invite you to celebrate our special day.',
};

export default function InvitationCardCreator() {
  const [form, setForm] = useState(defaultInvitation);
  const [templateId, setTemplateId] = useState('royal');
  const [photo, setPhoto] = useState('');
  const [generating, setGenerating] = useState(false);
  const template = useMemo(() => templates.find(item => item.id === templateId) || templates[0], [templateId]);
  const coupleName = `${form.groomName || 'Groom'} & ${form.brideName || 'Bride'}`;
  const dateText = [form.eventDate, form.eventTime].filter(Boolean).join(' | ') || 'Event date and time';

  const update = (key, value) => setForm(current => ({...current, [key]: value}));
  const choosePhoto = event => {
    const file = event.target.files?.[0];
    if (file) setPhoto(URL.createObjectURL(file));
  };
  const reset = () => {
    setForm(defaultInvitation);
    setPhoto('');
    setTemplateId('royal');
  };
  const generateAnimationVideo = async () => {
    if (!form.brideName.trim() || !form.groomName.trim() || !form.eventDate.trim() || !form.venue.trim()) {
      alert('Please enter bride name, groom name, event date and venue.');
      return;
    }
    if (!window.MediaRecorder) {
      alert('Video generation is not supported in this browser.');
      return;
    }
    setGenerating(true);
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    const chunks = [];
    const recorder = new MediaRecorder(stream, {mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'});
    recorder.ondataavailable = event => event.data.size && chunks.push(event.data);
    const finished = new Promise(resolve => { recorder.onstop = resolve; });
    const scenes = [
      {title: form.eventTitle || 'Wedding Invitation', sub: 'You are invited'},
      {title: coupleName, sub: form.familyName ? `${form.familyName} family` : 'Together with their families'},
      {title: dateText, sub: 'Save the date'},
      {title: form.venue || 'Wedding venue', sub: 'Join us for the celebration'},
      {title: form.message || defaultInvitation.message, sub: 'Your presence is our blessing'},
    ];
    const duration = 9000;
    const started = performance.now();
    recorder.start();
    const draw = now => {
      const elapsed = now - started;
      const progress = Math.min(elapsed / duration, 1);
      const sceneIndex = Math.min(Math.floor(progress * scenes.length), scenes.length - 1);
      const localProgress = (progress * scenes.length) % 1;
      const scene = scenes[sceneIndex];
      const pulse = Math.sin(elapsed / 420) * 18;
      ctx.fillStyle = template.dark;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, template.accent);
      gradient.addColorStop(1, template.dark);
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,.13)';
      ctx.beginPath();
      ctx.arc(140, 220, 210 + pulse, 0, Math.PI * 2);
      ctx.arc(930, 420, 260 - pulse, 0, Math.PI * 2);
      ctx.arc(880, 1660, 300 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,250,248,.9)';
      ctx.roundRect(110, 260, 860, 1400, 46);
      ctx.fill();
      ctx.strokeStyle = template.accent;
      ctx.lineWidth = 8;
      ctx.strokeRect(154, 304, 772, 1312);
      ctx.globalAlpha = Math.min(localProgress * 2.2, 1);
      ctx.translate(0, 36 - localProgress * 36);
      ctx.textAlign = 'center';
      ctx.fillStyle = template.accent;
      ctx.font = '800 42px DM Sans, Arial';
      ctx.fillText(scene.sub.toUpperCase(), 540, 560);
      ctx.fillStyle = template.dark;
      ctx.font = scene.title.length > 42 ? '800 58px Playfair Display, serif' : '800 82px Playfair Display, serif';
      const words = String(scene.title).split(' ');
      let line = '';
      let y = 760;
      words.forEach((word, index) => {
        const test = `${line}${word} `;
        if (ctx.measureText(test).width > 720 && index > 0) {
          ctx.fillText(line.trim(), 540, y);
          line = `${word} `;
          y += 92;
        } else {
          line = test;
        }
      });
      ctx.fillText(line.trim(), 540, y);
      ctx.fillStyle = '#594650';
      ctx.font = '700 36px DM Sans, Arial';
      ctx.fillText(form.venue || 'Wedding venue', 540, 1280);
      ctx.fillText(dateText, 540, 1360);
      ctx.translate(0, -(36 - localProgress * 36));
      ctx.globalAlpha = 1;
      if (progress < 1) requestAnimationFrame(draw);
      else recorder.stop();
    };
    requestAnimationFrame(draw);
    await finished;
    const blob = new Blob(chunks, {type: 'video/webm'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wedding-invitation-${Date.now()}.webm`;
    link.click();
    URL.revokeObjectURL(url);
    setGenerating(false);
  };

  return (
    <div className="page invitation-page">
      <PageHeader eyebrow="Invitation" title="Create Invitation Card" text="Create a mobile-style wedding invitation with templates, couple details and preview." />
      <div className="split-layout invitation-layout">
        <Card className="sticky-form invitation-form-panel">
          <PartyPopper />
          <h2>Card details</h2>
          <div className="template-picker">
            {templates.map(item => <button type="button" className={templateId === item.id ? 'active' : ''} key={item.id} style={{'--template-accent': item.accent}} onClick={() => setTemplateId(item.id)}>{item.name}</button>)}
          </div>
          <div className="form-grid">
            <Field label="Groom name" value={form.groomName} onChange={e => update('groomName', e.target.value)} />
            <Field label="Bride name" value={form.brideName} onChange={e => update('brideName', e.target.value)} />
          </div>
          <Field label="Event title" value={form.eventTitle} onChange={e => update('eventTitle', e.target.value)} />
          <div className="form-grid">
            <Field label="Event date" type="date" value={form.eventDate} onChange={e => update('eventDate', e.target.value)} />
            <Field label="Event time" type="time" value={form.eventTime} onChange={e => update('eventTime', e.target.value)} />
          </div>
          <Field label="Family name" value={form.familyName} onChange={e => update('familyName', e.target.value)} />
          <Field label="Venue" value={form.venue} onChange={e => update('venue', e.target.value)} />
          <Field as="textarea" label="Invitation message" value={form.message} onChange={e => update('message', e.target.value)} />
          <label className="upload-line invitation-photo-upload">
            <input type="file" accept="image/*" onChange={choosePhoto} />
            <ImagePlus />
            <span>{photo ? 'Couple photo selected' : 'Choose couple photo'}<small>Optional image for the card preview</small></span>
          </label>
          <div className="invitation-actions">
            <Button type="button" variant="soft" onClick={reset}><RotateCcw /> Reset</Button>
            <Button type="button" onClick={() => window.print()}><Download /> Print / Save</Button>
            <Button type="button" className="invitation-video-button" onClick={generateAnimationVideo} disabled={generating}><Film /> {generating ? 'Generating...' : 'Generate Animation Video'}</Button>
          </div>
        </Card>
        <section className="invitation-preview invitation-video-preview" style={{'--invitation-accent': template.accent, '--invitation-dark': template.dark, '--invitation-soft': template.soft, backgroundImage: `linear-gradient(rgba(28, 12, 24, .42), rgba(28, 12, 24, .62)), url("${template.image}")`}}>
          <div className="invitation-scene-card">
            <img className="invitation-ganesh" src={asset('image/invitation_ganesh.png')} alt="" />
            <span>{form.eventTitle || 'Wedding Invitation'}</span>
            <h1>{coupleName}</h1>
            {form.familyName && <p className="family-name">{form.familyName} family</p>}
            {photo ? <img className="invitation-couple-photo" src={photo} alt="" /> : <img className="invitation-couple-art" src={asset('image/invitation_couple_cartoon.png')} alt="" />}
            <p>{form.message || defaultInvitation.message}</p>
            <div className="invitation-meta-grid">
              <div><CalendarDays /><strong>{dateText}</strong></div>
              <div><MapPin /><strong>{form.venue || 'Wedding venue'}</strong></div>
              <div><Music2 /><strong>Wedding tune</strong></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
