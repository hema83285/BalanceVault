import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface)' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 72, fontWeight: 800, color: 'var(--color-border-dark)', marginBottom: 8 }}>404</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Page Not Found</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 32 }}>The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn btn-primary">Go Home</Link>
      </div>
    </div>
  );
}
