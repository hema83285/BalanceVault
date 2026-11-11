import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/ui/Alert';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2) e.fullName = 'Full name must be at least 2 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) e.password = 'Password needs uppercase, lowercase, and a number';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await register({ fullName: form.fullName.trim(), email: form.email, password: form.password });
      navigate('/onboarding');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  const field = (name, label, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label className="form-label" htmlFor={name}>{label}</label>
      <input id={name} type={type} className={`form-input ${errors[name] ? 'error' : ''}`}
        value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
        placeholder={placeholder} />
      {errors[name] && <span className="form-error">{errors[name]}</span>}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface)', padding: '32px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, background: 'var(--color-teal)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔒</div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>BalanceVault</span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Create your account</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 24 }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--color-indigo-light)', fontWeight: 600 }}>Sign in</Link>
        </p>

        <Alert type="error" message={serverError} onClose={() => setServerError('')} />

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: serverError ? 16 : 0 }} noValidate>
          {field('fullName', 'Full name', 'text', 'Jane Doe')}
          {field('email', 'Email address', 'email', 'you@example.com')}
          {field('password', 'Password', 'password', 'At least 8 characters')}
          {field('confirm', 'Confirm password', 'password', 'Repeat your password')}

          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <><div className="spinner" style={{ borderTopColor: 'white' }} /> Creating account…</> : 'Create Account'}
          </button>
        </form>

        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 20 }}>
          Your account will be created as an Account Holder. Admin access requires separate approval.
        </p>
      </div>
    </div>
  );
}
