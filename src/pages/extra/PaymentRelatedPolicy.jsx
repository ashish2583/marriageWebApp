import {FileText, ShieldCheck} from 'lucide-react';
import {Card, PageHeader} from '../../components/UI';

const sections = [
  {
    title: 'Privacy Policy',
    body: [
      'At SadiStore, we value the privacy of our customers and are committed to protecting their personal information. We collect customer details such as name, address, contact information, and booking details solely for the purpose of processing bookings and providing our services.',
      'Customer information is kept secure and is not shared with third parties except when required by law or for service fulfillment purposes.',
    ],
  },
  {
    title: 'Booking Policy',
    bullets: [
      'All bookings are subject to availability and confirmation.',
      'Customers are required to provide accurate information while placing an order.',
      'Once a booking is confirmed, the selected products and services are reserved for the specified event dates.',
    ],
  },
  {
    title: 'Cancellation and Refund Policy',
    bullets: [
      'Once an order is placed and confirmed, cancellation requests may be accepted at the sole discretion of SadiStore.',
      'Payments made towards confirmed bookings are non-refundable.',
      'In case of cancellation by the customer, no refund shall be provided for any amount already paid.',
      'If a product or service becomes unavailable due to unforeseen circumstances from our side, SadiStore may offer an alternative service or issue a refund at its discretion.',
      'Customers are advised to verify all booking details before making payment.',
    ],
  },
  {
    title: 'Payment Policy',
    bullets: [
      'All payments made through our platform are secure.',
      'Advance payments, partial payments, or full payments are considered acceptance of these terms and conditions.',
      'SadiStore shall not be liable for any indirect or consequential losses arising from booking cancellations or changes.',
    ],
  },
  {
    title: 'Contact Information',
    body: ['For any questions or support regarding bookings, customers may contact our support team through the contact details provided on the platform.'],
  },
];

export default function PaymentRelatedPolicy() {
  return (
    <div className="page privacy-page">
      <PageHeader
        eyebrow="Trust and transparency"
        title="SadiStore Privacy Policy"
        text="Policy details used in the sadiStore mobile app, adapted for the web portal."
      />
      <Card className="privacy-hero-card">
        <ShieldCheck />
        <div>
          <h2>SadiStore Policies</h2>
          <p>Please review these terms before placing a booking or making payment.</p>
        </div>
      </Card>
      <div className="policy mobile-policy-list">
        {sections.map(section => (
          <Card className="mobile-policy-card" key={section.title}>
            <FileText />
            <h2>{section.title}</h2>
            {section.body?.map(text => <p key={text}>{text}</p>)}
            {section.bullets?.map(text => <p className="policy-bullet" key={text}>{text}</p>)}
          </Card>
        ))}
      </div>
    </div>
  );
}
