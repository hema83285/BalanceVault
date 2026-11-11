import { useState, useEffect } from 'react';
import { accountsApi } from '../../api/accounts.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import Alert from '../../components/ui/Alert';

function fmt(paise) { return '₹' + (Number(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

export default function AccountManagement() {
  const [accounts, setAccounts]   = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage]           = useState(1);
  const [filter, setFilter]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [fundingId, setFundingId] = useState('');
  const [alert, setAlert]         = useState({ type: '', msg: '' });

  function load() {
    setLoading(true);
    accountsApi.adminGetAll({ page, limit: 20, status: filter || undefined })
      .then(r => { setAccounts(r.data.data.items || []); setPagination(r.data.data.pagination); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [page, filter]);

  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await accountsApi.adminUpdateStatus(id, newStatus);
      setAlert({ type: 'success', msg: `Account ${newStatus.toLowerCase()} successfully.` });
      load();
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.message || 'Status update failed.' });
    }
  }

  async function addDemoFunds(account) {
    const rupees = window.prompt('Demo credit amount in INR', '1234');
    if (rupees === null) return;

    const match = rupees.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
    if (!match) {
      setAlert({ type: 'error', msg: 'Enter a valid amount with up to 2 decimal places.' });
      return;
    }

    const amountPaise = (BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0') || '0')).toString();
    if (amountPaise === '0') {
      setAlert({ type: 'error', msg: 'Amount must be greater than zero.' });
      return;
    }

    setFundingId(account.id);
    try {
      await accountsApi.adminDemoCredit(account.id, amountPaise, crypto.randomUUID());
      setAlert({ type: 'success', msg: `Demo funds added to ${account.accountNumber}.` });
      load();
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.message || 'Demo funding failed.' });
    } finally {
      setFundingId('');
    }
  }

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Account Management</h1></div>
      <Alert type={alert.type} message={alert.msg} onClose={() => setAlert({ type: '', msg: '' })} />

      <div className="filter-bar" style={{ marginTop: alert.msg ? 12 : 0 }}>
        <select className="form-input" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      <div className="card">
        {loading ? <div className="spinner-center"><div className="spinner" /></div> : (
          <>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Account Number</th><th>Owner</th><th>Balance</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
                <tbody>
                  {accounts.map(acc => (
                    <tr key={acc.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{acc.accountNumber}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{acc.user?.fullName}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{acc.user?.email}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{fmt(acc.balancePaise)}</td>
                      <td><StatusBadge status={acc.status} /></td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{new Date(acc.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        {acc.status !== 'PENDING' && (
                          <button
                            className={`btn btn-sm ${acc.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => toggleStatus(acc.id, acc.status)}
                          >
                            {acc.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                        {import.meta.env.DEV && acc.status === 'ACTIVE' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => addDemoFunds(acc)}
                            disabled={fundingId === acc.id}
                          >
                            {fundingId === acc.id ? 'Adding…' : 'Add demo funds'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {accounts.length === 0 && <div className="empty-state"><h3>No accounts found</h3></div>}
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
