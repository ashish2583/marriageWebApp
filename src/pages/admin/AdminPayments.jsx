import {PageHeader} from '../../components/UI';
import {getAdminPayments} from '../../api/adminApi';
import {formatAmount, getId, getStatus} from '../../lib/dataHelpers';
import {AdminTable, useAdminData} from './AdminCommon';

export function AdminPayments() {
  const {data, loading} = useAdminData(getAdminPayments);
  return <div className="page"><PageHeader eyebrow="Finance" title="Payments" text="Track platform payment records returned by the backend." /><AdminTable empty={loading ? 'Loading payments' : 'No payments found'} rows={data} columns={[{key: 'id', label: 'Payment', render: getId}, {key: 'mode', label: 'Mode', render: row => row.paymentMode || row.mode || 'Not available'}, {key: 'amount', label: 'Amount', render: row => formatAmount(row.amount || row.totalAmount)}, {key: 'status', label: 'Status', render: getStatus}]} /></div>;
}
