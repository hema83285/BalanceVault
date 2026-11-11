import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { accountsApi } from '../../api/accounts.api';
import { transfersApi } from '../../api/transfers.api';
import { onboardingApi } from '../../api/onboarding.api';
import StatusBadge from '../../components/ui/StatusBadge';

function fmt(paise) { return '₹' + (Number(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts]     = useState([]);
  const [txns, setTxns]             = useState([]);
  const [onboarding, setOnboarding] = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.allSettled([
      accountsApi.getOwn(),
      transfersApi.getOwn({ limit: 5 }),
      onboardingApi.getStatus(),
    ]).then(([acc, tx, ob]) => {
      if (acc.status === 'fulfilled') setAccounts(acc.value.data.data.accounts || []);
      if (tx.status === 'fulfilled')  setTxns(tx.value.data.data.items || []);
      if (ob.status === 'fulfilled')  setOnboarding(ob.value.data.data.onboarding);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner-center"><div className="spinner spinner-lg" /></div>;

  const account = accounts[0];
  const hasAccount = !!account;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hello, {user.fullName.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        {hasAccount && account.status === 'ACTIVE' && (
          <Link to="/transfer" className="btn btn-primary">Transfer Money →</Link>
        )}
      </div>

      {/* Onboarding prompt */}
      {!onboarding && (
        <div className="alert alert-info" style={{ marginBottom: 24 }}>
          <span style={{ flex: 1 }}>Complete KYC onboarding to open your account.</span>
          <Link to="/onboarding" className="btn btn-primary btn-sm">Start Onboarding →</Link>
        </div>
      )}
      {onboarding?.status === 'PENDING' && (
        <div className="alert alert-warning" style={{ marginBottom: 24 }}>
          ⏳ Your onboarding is under review. We'll update you once approved.
        </div>
      )}
      {onboarding?.status === 'APPROVED' && !hasAccount && (
        <div className="alert alert-success" style={{ marginBottom: 24 }}>
          <span style={{ flex: 1 }}>✅ Onboarding approved! You can now open your account.</span>
          <button className="btn btn-success btn-sm" onClick={async () => {
            await accountsApi.create();
            const res = await accountsApi.getOwn();
            setAccounts(res.data.data.accounts || []);
          }}>Open Account</button>
        </div>
      )}

      {/* Account card */}
      {hasAccount && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--color-navy), var(--color-indigo))',
            borderRadius: 20, padding: 28, color: 'white', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
            <div style={{ fontSize: 12, opacity: 0.6, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Account Balance</div>
            <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>{fmt(account.balancePaise)}</div>
            <div style={{ fontSize: 13, opacity: 0.7, fontFamily: 'var(--font-mono)' }}>{account.accountNumber}</div>
            <div style={{ position: 'absolute', bottom: 20, right: 20 }}>
              <StatusBadge status={account.status} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Onboarding Status</div>
            <div style={{ marginTop: 8 }}>{onboarding ? <StatusBadge status={onboarding.status} /> : <span className="badge badge-gray">Not Submitted</span>}</div>
          </div>
        </div>
      )}

      {/* Recent transactions */}
      {txns.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Transactions</h2>
            <Link to="/transactions" style={{ fontSize: 13, color: 'var(--color-indigo-light)' }}>View All →</Link>
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Date</th><th>From / To</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {txns.map(tx => {
                  const isSender = account && tx.senderAccountId === account.id;
                  return (
                    <tr key={tx.id}>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{fmtDate(tx.createdAt)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {isSender ? tx.receiverAccount?.accountNumber : tx.senderAccount?.accountNumber}
                      </td>
                      <td style={{ fontWeight: 600, color: isSender ? 'var(--color-red)' : 'var(--color-green)' }}>
                        {isSender ? '−' : '+'}{fmt(tx.amountPaise)}
                      </td>
                      <td><StatusBadge status={tx.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasAccount && txns.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <h3>No transactions yet</h3>
            <p>Your transfer history will appear here.</p>
            {account.status === 'ACTIVE' && <Link to="/transfer" className="btn btn-primary" style={{ marginTop: 16 }}>Make your first transfer</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
