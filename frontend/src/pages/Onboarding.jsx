import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingApi } from '../api/onboarding.api';
import Alert from '../components/ui/Alert';
import StatusBadge from '../components/ui/StatusBadge';

export default function Onboarding() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({ phone: '', address: '', dateOfBirth: '', occupation: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    onboardingApi.getStatus().then(res => setStatus(res.data.data.onboarding)).finally(() => setLoading(false));
  }, []);

  function validate() {
    const e = {};
    if (form.phone.trim().length < 10) e.phone = 'Enter a valid phone number (min 10 digits)';
    if (form.address.trim().length < 10) e.address = 'Address must be at least 10 characters';
    if (!form.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
    else {
      const age = new Date().getFullYear() - new Date(form.dateOfBirth).getFullYear();
      if (age < 18) e.dateOfBirth = 'You must be at least 18 years old';
    }
    if (form.occupation.trim().length < 2) e.occupation = 'Occupation is required';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    try {
      const res = await onboardingApi.submit(form);
      setStatus(res.data.data.onboarding);
      setSuccess('Application submitted! An admin will review it shortly.');
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="spinner-center"><div className="spinner spinner-lg" /></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Account Onboarding</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 4 }}>
            Complete KYC verification to open your account.
          </p>
        </div>

        {/* Show current status if exists */}
        {status && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Application Status</span>
              <StatusBadge status={status.status} />
            </div>
            {status.status === 'APPROVED' && (
              <>
                <p style={{ color: 'var(--color-green)', fontSize: 14, marginTop: 12 }}>✅ Your application is approved. You can now open your account.</p>
                <button className="btn btn-success btn-full" style={{ marginTop: 12 }} onClick={() => navigate('/dashboard')}>
                  Go to Dashboard →
                </button>
              </>
            )}
            {status.status === 'PENDING' && <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 8 }}>⏳ Under review. We'll notify you once approved.</p>}
            {status.status === 'REJECTED' && <p style={{ color: 'var(--color-red)', fontSize: 14, marginTop: 8 }}>❌ Rejected. You can resubmit with corrections below.</p>}
          </div>
        )}

        {(!status || status.status === 'REJECTED') && (
          <div className="card">
            <Alert type="error" message={error} onClose={() => setError('')} />
            <Alert type="success" message={success} />

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: (error || success) ? 16 : 0 }}>
              {[
                { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+91 98765 43210' },
                { name: 'address', label: 'Full Address', type: 'text', placeholder: '123 Main St, City, State 400001' },
                { name: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
                { name: 'occupation', label: 'Occupation', type: 'text', placeholder: 'Software Engineer' },
              ].map(({ name, label, type, placeholder }) => (
                <div className="form-group" key={name}>
                  <label className="form-label" htmlFor={name}>{label}</label>
                  <input id={name} type={type} className={`form-input ${errors[name] ? 'error' : ''}`}
                    value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
                    placeholder={placeholder} />
                  {errors[name] && <span className="form-error">{errors[name]}</span>}
                </div>
              ))}
              <button type="submit" className="btn btn-primary btn-full" disabled={submitting} style={{ marginTop: 8 }}>
                {submitting ? 'Submitting…' : (status?.status === 'REJECTED' ? 'Resubmit Application' : 'Submit Application')}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
