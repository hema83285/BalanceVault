import { useState, useEffect } from 'react';
import { transfersApi } from '../../api/transfers.api';
import { accountsApi } from '../../api/accounts.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';

function fmt(paise) { return '₹' + (Number(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }
function fmtDate(d) { return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

export default function TransactionHistory() {
  const [txns, setTxns]       = useState([]);
  const [account, setAccount] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountsApi.getOwn().then(r => setAccount(r.data.data.accounts?.[0]));
  }, []);

  useEffect(() => {
    setLoading(true);
    transfersApi.getOwn({ page, limit: 20 })
      .then(r => { setTxns(r.data.data.items || []); setPagination(r.data.data.pagination); })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Transaction History</h1>
          <p className="page-subtitle">All transfers involving your account</p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="spinner-center"><div className="spinner" /></div>
        ) : txns.length === 0 ? (
          <div className="empty-state"><h3>No transactions yet</h3><p>Transfers will appear here once you make them.</p></div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>Date</th><th>Transaction ID</th><th>From</th><th>To</th><th>Amount</th><th>Direction</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {txns.map(tx => {
                    const isSender = account && tx.senderAccountId === account.id;
                    return (
                      <tr key={tx.id}>
                        <td style={{ fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{fmtDate(tx.createdAt)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{tx.id.slice(0, 12)}…</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{tx.senderAccount?.accountNumber}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{tx.receiverAccount?.accountNumber}</td>
                        <td style={{ fontWeight: 600, color: isSender ? 'var(--color-red)' : 'var(--color-green)' }}>
                          {isSender ? '−' : '+'}{fmt(tx.amountPaise)}
                        </td>
                        <td><StatusBadge status={isSender ? 'DEBIT' : 'CREDIT'} /></td>
                        <td><StatusBadge status={tx.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
