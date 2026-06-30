import {PageHeader} from '../../components/UI';
import {getAdminQueries} from '../../api/adminApi';
import {getName} from '../../lib/dataHelpers';
import {AdminTable, useAdminData} from './AdminCommon';

export function AdminQueries() {
  const {data, loading} = useAdminData(getAdminQueries);
  return <div className="page"><PageHeader eyebrow="Support" title="Queries" text="Customer and vendor support requests submitted to admin." /><AdminTable empty={loading ? 'Loading queries' : 'No queries found'} rows={data} columns={[{key: 'name', label: 'Name', render: row => row.coustomerName || row.customerName || getName(row)}, {key: 'mobile', label: 'Mobile', render: row => row.coustomerMobile || row.mobile || row.phone || 'Not available'}, {key: 'email', label: 'Email', render: row => row.coustomerEmail || row.email || 'Not available'}, {key: 'query', label: 'Query', render: row => row.coustomerLocation || row.query || row.message || 'Not available'}]} /></div>;
}
