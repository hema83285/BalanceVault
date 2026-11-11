import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { accountsApi } from '../../api/accounts.api';
import StatusBadge from '../../components/ui/StatusBadge';

function fmt(paise) { return '₹' + (Number(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

export default function AccountDetails() {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    accountsApi.getById(id)
      .then(r => setAccount(r.data.data.account))
      .catch(e => setError(e.response?.data?.message || 'Failed to load account'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="spinner-center"><div className="spinner spinner-lg" /></div>;
  if (error)   return <div className="alert alert-error" style={{ margin: 32 }}>{error}</div>;
  if (!account) return null;

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Account Details</h1></div>
      </div>
      <div className="card" style={{ maxWidth: 600 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Account Number</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600 }}>{account.accountNumber}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Balance</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-indigo-light)' }}>{fmt(account.balancePaise)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Status</div>
            <StatusBadge status={account.status} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Opened</div>
            <div style={{ fontSize: 14 }}>{new Date(account.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Account ID</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{account.id}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
