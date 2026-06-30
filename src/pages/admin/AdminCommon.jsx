import {useEffect, useState} from 'react';
import {Empty} from '../../components/UI';
import {getApiError} from '../../api/axiosInstance';
import {useApp} from '../../lib/AppContext';
import {getId} from '../../lib/dataHelpers';

export const loadAllVendors = loader => () => loader('all');

export function AdminTable({columns, rows, empty}) {
  if (!rows.length) return <Empty title={empty} text="Live records from the admin API will appear here." />;
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={getId(row) || index}>{columns.map(column => <td key={column.key}>{column.render ? column.render(row) : row[column.key] || 'Not available'}</td>)}</tr>)}</tbody></table></div>;
}

export function useAdminData(loader) {
  const {notify} = useApp();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loader()
      .then(result => mounted && setData(result || []))
      .catch(error => notify(getApiError(error), 'error'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [loader, notify]);

  return {data, loading};
}
