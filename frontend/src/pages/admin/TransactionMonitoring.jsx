import { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';

function fmt(paise) { return '₹' + (Number(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }
function fmtDate(d) { return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

export default function TransactionMonitoring() {
  const [txns, setTxns]       = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage]       = useState(1);
  const [filter, setFilter]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi.getTransactions({ page, limit: 20, status: filter || undefined })
      .then(r => { setTxns(r.data.data.items || []); setPagination(r.data.data.pagination); })
      .finally(() => setLoading(false));
  }, [page, filter]);

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Transaction Monitoring</h1></div>

      <div className="filter-bar">
        <select className="form-input" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      <div className="card">
        {loading ? <div className="spinner-center"><div className="spinner" /></div> : (
          <>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Date</th><th>Sender</th><th>Receiver</th><th>Amount</th><th>Status</th><th>Note</th></tr></thead>
                <tbody>
                  {txns.map(tx => (
                    <tr key={tx.id}>
                      <td style={{ fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(tx.createdAt)}</td>
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{tx.senderAccount?.accountNumber}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{tx.senderAccount?.user?.fullName}</div>
                      </td>
                      <td>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{tx.receiverAccount?.accountNumber}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{tx.receiverAccount?.user?.fullName}</div>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--color-indigo-light)' }}>{fmt(tx.amountPaise)}</td>
                      <td><StatusBadge status={tx.status} /></td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{tx.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {txns.length === 0 && <div className="empty-state"><h3>No transactions found</h3></div>}
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
