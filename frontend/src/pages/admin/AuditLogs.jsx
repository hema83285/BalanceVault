import { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';

function fmtDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AuditLogs() {
  const [logs, setLogs]         = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage]         = useState(1);
  const [outcome, setOutcome]   = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi.getAuditLogs({ page, limit: 25, outcome: outcome || undefined })
      .then(r => { setLogs(r.data.data.items || []); setPagination(r.data.data.pagination); })
      .finally(() => setLoading(false));
  }, [page, outcome]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Append-only record of all significant actions</p>
        </div>
      </div>

      <div className="filter-bar">
        <select className="form-input" value={outcome} onChange={e => { setOutcome(e.target.value); setPage(1); }}>
          <option value="">All Outcomes</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILURE">Failure</option>
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="spinner-center"><div className="spinner" /></div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Target</th>
                    <th>Outcome</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {fmtDate(log.createdAt)}
                      </td>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>
                        {log.action.replace(/_/g, ' ')}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {log.actor ? (
                          <div>
                            <div style={{ fontWeight: 500 }}>{log.actor.fullName}</div>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{log.actor.email}</div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>System</span>
                        )}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        {log.targetType && <span>{log.targetType}</span>}
                        {log.targetId && <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{log.targetId.slice(0, 12)}…</div>}
                      </td>
                      <td>
                        <StatusBadge status={log.outcome === 'SUCCESS' ? 'COMPLETED' : 'FAILED'} />
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {log.ipAddress || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logs.length === 0 && (
              <div className="empty-state">
                <h3>No audit logs found</h3>
                <p>Logs appear here as users interact with the platform.</p>
              </div>
            )}
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
