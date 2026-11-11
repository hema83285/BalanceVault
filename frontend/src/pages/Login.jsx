import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/ui/Alert';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      const dest = from || (user.role === 'ADMIN' ? '/admin' : '/dashboard');
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-surface)' }}>
      {/* Left panel */}
      <div style={{ flex: '0 0 420px', background: 'var(--color-navy)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px', '@media(maxWidth:768px)': { display: 'none' } }} className="auth-panel-left">
        <div style={{ marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: 'var(--color-teal)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 24 }}>🔒</div>
          <h2 style={{ color: 'white', fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Welcome back</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.7 }}>Sign in to access your BalanceVault account and manage your finances securely.</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '20px' }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.8 }}>
            🔐 &nbsp;JWT authentication<br />
            🛡️ &nbsp;Rate limiting enabled<br />
            📋 &nbsp;All logins are audited
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <Link to="/" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 32 }}>← Back to home</Link>

          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Sign In</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 32 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--color-indigo-light)', fontWeight: 600 }}>Register</Link>
          </p>

          <Alert type="error" message={error} onClose={() => setError('')} />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: error ? 16 : 0 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input id="email" type="email" className="form-input" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com" required autoComplete="email" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input id="password" type="password" className="form-input" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••" required autoComplete="current-password" />
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <><div className="spinner" style={{ borderTopColor: 'white' }} /> Signing in…</> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
