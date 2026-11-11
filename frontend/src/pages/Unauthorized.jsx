import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Unauthorized() {
  const { user } = useAuth();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface)' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🚫</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Access Denied</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 32 }}>
          You don't have permission to access this page. This area requires a different role.
        </p>
        <Link to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'} className="btn btn-primary">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
