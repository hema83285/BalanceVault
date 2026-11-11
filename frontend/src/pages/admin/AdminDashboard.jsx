import { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin.api';
import StatusBadge from '../../components/ui/StatusBadge';

function fmt(paise) { return '₹' + (Number(paise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboard().then(r => setStats(r.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner-center"><div className="spinner spinner-lg" /></div>;

  const statCards = [
    { label: 'Total Users',       value: stats?.totalUsers,        cls: 'indigo' },
    { label: 'Active Accounts',   value: stats?.activeAccounts,    cls: 'green' },
    { label: 'Pending Onboarding',value: stats?.pendingOnboardings,cls: stats?.pendingOnboardings > 0 ? 'red' : 'teal' },
    { label: 'Total Transfers',   value: stats?.totalTransactions,  cls: 'teal' },
  ];

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Admin Dashboard</h1><p className="page-subtitle">Platform overview</p></div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 32 }}>
        {statCards.map(({ label, value, cls }) => (
          <div className="stat-card" key={label}>
            <div className="stat-label">{label}</div>
            <div className={`stat-value ${cls}`}>{value ?? '—'}</div>
          </div>
        ))}
        <div className="stat-card">
          <div className="stat-label">Total Volume</div>
          <div className="stat-value teal" style={{ fontSize: '1.4rem' }}>{fmt(stats?.totalVolumePaise || 0)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Recent transactions */}
        <div className="card">
          <div className="card-header"><h2 className="card-title">Recent Transfers</h2></div>
          {!stats?.recentTransactions?.length ? (
            <div className="empty-state"><p>No transfers yet.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.recentTransactions.map(tx => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border)', fontSize: 13 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{tx.senderAccount?.accountNumber} → {tx.receiverAccount?.accountNumber}</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-indigo-light)' }}>{fmt(tx.amountPaise)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent audit events */}
        <div className="card">
          <div className="card-header"><h2 className="card-title">Recent Audit Events</h2></div>
          {!stats?.recentAuditLogs?.length ? (
            <div className="empty-state"><p>No audit events yet.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.recentAuditLogs.map(log => (
                <div key={log.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{log.action.replace(/_/g, ' ')}</span>
                    <StatusBadge status={log.outcome === 'SUCCESS' ? 'COMPLETED' : 'FAILED'} />
                  </div>
                  <div style={{ color: 'var(--color-text-muted)' }}>{log.actor?.email || 'System'} · {new Date(log.createdAt).toLocaleTimeString('en-IN')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
