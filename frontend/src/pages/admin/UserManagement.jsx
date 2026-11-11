import { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin.api';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';

export default function UserManagement() {
  const [users, setUsers]       = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  function load(p = page, s = search) {
    setLoading(true);
    adminApi.getUsers({ page: p, limit: 20, search: s || undefined })
      .then(r => { setUsers(r.data.data.items || []); setPagination(r.data.data.pagination); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [page]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    load(1, search);
  }

  return (
    <div>
      <div className="page-header"><h1 className="page-title">User Management</h1></div>
      <form onSubmit={handleSearch} className="filter-bar">
        <input className="form-input" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-secondary" type="submit">Search</button>
      </form>
      <div className="card">
        {loading ? <div className="spinner-center"><div className="spinner" /></div> : (
          <>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Onboarding</th><th>Accounts</th><th>Joined</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>{u.fullName}</td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{u.email}</td>
                      <td><StatusBadge status={u.role} /></td>
                      <td>{u.onboarding ? <StatusBadge status={u.onboarding.status} /> : <span className="badge badge-gray">None</span>}</td>
                      <td>{u.accounts?.length > 0 ? <StatusBadge status={u.accounts[0].status} /> : '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && <div className="empty-state"><h3>No users found</h3></div>}
            <Pagination pagination={pagination} onPageChange={p => { setPage(p); }} />
          </>
        )}
      </div>
    </div>
  );
}
