import {BadgePercent, ShieldCheck} from 'lucide-react';
import {Card, PageHeader} from '../../components/UI';

const policyPoints = [
  'The portal will be responsible for your payment only for work completed through portal bookings.',
  'Do not work outside the booking. If the customer requires any additional things, tell the customer to add them in the order section.',
  'If you work outside the portal, the portal will not be responsible for payment. Portal fee may be deducted from the token amount.',
  'If you receive any amount directly from the customer, please add that payment on the portal and try to inform admin.',
  'Outside-portal work may result in your account being blocked from the portal.',
];

export default function PortalChargePolicy() {
  return (
    <div className="page portal-charge-page">
      <PageHeader eyebrow="Vendor policy" title="Portal Charges" text="Work only through portal booking to keep payments protected and trackable." />
      <section className="portal-hero-card">
        <div className="percent-badge">5%</div>
        <span>Portal charge & conditions</span>
        <h2>Work only through portal booking</h2>
        <p>Follow these payment rules to keep every booking protected and trackable.</p>
      </section>
      <Card className="portal-charge-card">
        <BadgePercent />
        <div>
          <span>Portal service fee</span>
          <strong>5% of total booking amount</strong>
        </div>
      </Card>
      <Card className="portal-policy-card">
        <h2><ShieldCheck />Vendor conditions</h2>
        <div className="portal-point-list">
          {policyPoints.map((point, index) => (
            <article key={point}>
              <b>{index + 1}</b>
              <p>{point}</p>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
