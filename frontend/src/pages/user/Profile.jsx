import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/ui/StatusBadge';

export default function Profile() {
  const { user } = useAuth();

  const rows = [
    { label: 'Full Name',     value: user?.fullName },
    { label: 'Email',         value: user?.email },
    { label: 'Role',          value: <StatusBadge status={user?.role} /> },
    { label: 'Member Since',  value: new Date(user?.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) },
  ];

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Profile</h1></div>
      <div className="card" style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {rows.map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</span>
              <span style={{ fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 20 }}>
          To update your profile details, contact support.
        </p>
      </div>
    </div>
  );
}
