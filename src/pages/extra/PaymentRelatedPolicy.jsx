import {BadgeIndianRupee, Clock, FileCheck2, RotateCcw, ShieldCheck, Truck} from 'lucide-react';
import {Card, PageHeader} from '../../components/UI';

const policySections = [
  {
    icon: FileCheck2,
    title: 'App and Developer Details',
    points: [
      'App name: sadiStore.',
      'Developer name: VS Group.',
      'Legal entity: VS Group.',
      'This payment related policy applies to the sadiStore mobile application published on Google Play by VS Group.',
      'For payment, refund, cancellation, or privacy questions, users can contact support through the sadiStore app or website.',
    ],
  },
  {
    icon: RotateCcw,
    title: 'Refund and Cancellation Policy',
    points: [
      'Cancellation requests are considered only when raised within 2 days of placing the order.',
      'Requests may not be accepted after the order has been communicated to the seller or the service process has already started.',
      'Perishable items such as flowers and eatables are not eligible for normal cancellation, unless a quality issue is verified.',
      'Damaged, defective, or incorrect service/product issues must be reported to customer support within 2 days of receipt or delivery.',
      'Approved refunds may take up to 25 days to process.',
    ],
  },
  {
    icon: BadgeIndianRupee,
    title: 'Return and Exchange Rules',
    points: [
      'Return or exchange requests are available within the first 2 days from purchase.',
      'Returned items must be unused, in the same condition as received, and include original packaging where applicable.',
      'Sale items or selected service categories may not be eligible for return, exchange, or refund.',
      'Accepted return or exchange requests are processed only after inspection and quality verification.',
    ],
  },
  {
    icon: Truck,
    title: 'Shipping and Service Delivery',
    points: [
      'Orders may be shipped or fulfilled through registered domestic courier, speed post, seller delivery, or service delivery partners.',
      'Shipping or service delivery is normally completed within 25 days from order/payment date, or as per the agreed booking date.',
      'The platform is not responsible for courier or postal delays outside its control.',
      'Shipping costs charged by the seller or platform owner are not refundable.',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Payment Data and Security',
    points: [
      'Payment instrument information may be collected only as needed for service use and payment verification.',
      'Reasonable security practices are used to protect personal and payment data from unauthorized access or misuse.',
      'Internet transmission cannot be guaranteed as fully secure, so users must also protect login and account details.',
    ],
  },
  {
    icon: FileCheck2,
    title: 'User Responsibility',
    points: [
      'Users must provide accurate booking, payment, address, and contact details.',
      'Transactions are governed by the terms, privacy policy, refund policy, return policy, and service-specific conditions.',
      'Disputes are governed by the laws of India and applicable jurisdiction stated in the platform policy.',
    ],
  },
  {
    icon: Clock,
    title: 'Support Time',
    points: [
      'For concerns related to payment, cancellation, refund, or return, contact support through the app or website.',
      'Support timing from the policy document: Monday to Friday, 09:00 to 18:00.',
    ],
  },
];

export default function PaymentRelatedPolicy() {
  return (
    <div className="page payment-policy-page">
      <PageHeader
        eyebrow="Policy Center"
        title="sadiStore Payment Related Policy"
        text="Payment, refund, cancellation, return, and delivery rules for the sadiStore mobile app by VS Group."
      />

      <Card className="payment-policy-hero">
        <BadgeIndianRupee />
        <div>
          <span>VS Group policy summary for sadiStore</span>
          <h2>Read before making a payment, refund request, or cancellation.</h2>
          <p>This policy belongs to the sadiStore mobile application and is published by VS Group for Google Play users, customers, vendors, and admins.</p>
        </div>
      </Card>

      <section className="payment-policy-grid">
        {policySections.map(section => {
          const Icon = section.icon;
          return (
            <Card className="payment-policy-card" key={section.title}>
              <Icon />
              <h2>{section.title}</h2>
              {section.points.map(point => <p className="policy-bullet" key={point}>{point}</p>)}
            </Card>
          );
        })}
      </section>
    </div>
  );
}
