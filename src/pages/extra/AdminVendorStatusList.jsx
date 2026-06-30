import {AdminVendorDirectory} from '../admin/AdminVendorDirectory';

export default function AdminVendorStatusList({status = 'active'}) {
  return <AdminVendorDirectory mode={status === 'inactive' ? 'inactive' : 'active'} />;
}
