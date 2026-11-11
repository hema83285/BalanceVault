import { useState, useEffect } from 'react';
import { onboardingApi } from '../../api/onboarding.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import Alert from '../../components/ui/Alert';

export default function OnboardingManagement() {
  const [items, setItems]       = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage]         = useState(1);
  const [filter, setFilter]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [reviewing, setReviewing] = useState(null); // { id, action }
  const [note, setNote]         = useState('');
  const [alert, setAlert]       = useState({ type: '', msg: '' });

  function load() {
    setLoading(true);
    onboardingApi.adminGetAll({ page, limit: 20, status: filter || undefined })
      .then(r => { setItems(r.data.data.items || []); setPagination(r.data.data.pagination); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [page, filter]);

  async function handleReview(id, status) {
    try {
      await onboardingApi.adminReview(id, { status, reviewNote: note || undefined });
      setAlert({ type: 'success', msg: `Application ${status.toLowerCase()} successfully.` });
      setReviewing(null); setNote('');
      load();
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.message || 'Review failed.' });
    }
  }

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Onboarding Management</h1></div>
      <Alert type={alert.type} message={alert.msg} onClose={() => setAlert({ type: '', msg: '' })} />

      <div className="filter-bar" style={{ marginTop: alert.msg ? 12 : 0 }}>
        <select className="form-input" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="card">
        {loading ? <div className="spinner-center"><div className="spinner" /></div> : (
          <>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Applicant</th><th>Email</th><th>Occupation</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {items.map(ob => (
                    <tr key={ob.id}>
                      <td style={{ fontWeight: 500 }}>{ob.user.fullName}</td>
                      <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{ob.user.email}</td>
                      <td>{ob.occupation}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{new Date(ob.createdAt).toLocaleDateString('en-IN')}</td>
                      <td><StatusBadge status={ob.status} /></td>
                      <td>
                        {ob.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-success btn-sm" onClick={() => handleReview(ob.id, 'APPROVED')}>Approve</button>
                            <button className="btn btn-danger btn-sm" onClick={() => setReviewing({ id: ob.id, action: 'REJECTED' })}>Reject</button>
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {items.length === 0 && <div className="empty-state"><h3>No applications found</h3></div>}
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Reject modal */}
      {reviewing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="card" style={{ width: 400 }}>
            <h3 style={{ marginBottom: 16 }}>Reject Application</h3>
            <div className="form-group">
              <label className="form-label">Review Note (optional)</label>
              <textarea className="form-input" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for rejection…" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-danger btn-full" onClick={() => handleReview(reviewing.id, 'REJECTED')}>Confirm Reject</button>
              <button className="btn btn-secondary" onClick={() => { setReviewing(null); setNote(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
