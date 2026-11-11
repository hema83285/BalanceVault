import { useState, useEffect } from 'react';
import { accountsApi } from '../../api/accounts.api';
import { transfersApi } from '../../api/transfers.api';
import Alert from '../../components/ui/Alert';

export default function Transfer() {
  const [accounts, setAccounts]   = useState([]);
  const [form, setForm]           = useState({ receiverAccountId: '', amountRupees: '', note: '' });
  const [errors, setErrors]       = useState({});
  const [loading, setLoading]     = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');

  useEffect(() => {
    accountsApi.getOwn().then(r => setAccounts(r.data.data.accounts || [])).finally(() => setPageLoading(false));
  }, []);

  const account = accounts[0];

  function validate() {
    const e = {};
    if (!form.receiverAccountId.trim()) e.receiverAccountId = 'Receiver account ID is required';
    const amount = parseFloat(form.amountRupees);
    if (!form.amountRupees || isNaN(amount) || amount <= 0) e.amountRupees = 'Enter a valid amount';
    else if (!Number.isInteger(amount * 100)) e.amountRupees = 'Amount cannot have more than 2 decimal places';
    if (account && form.receiverAccountId === account.id) e.receiverAccountId = 'Cannot transfer to your own account';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setResult(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      const amountPaise = Math.round(parseFloat(form.amountRupees) * 100);
      const res = await transfersApi.initiate({ receiverAccountId: form.receiverAccountId, amountPaise, note: form.note || undefined });
      setResult(res.data.data);
      setForm({ receiverAccountId: '', amountRupees: '', note: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Transfer failed.');
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) return <div className="spinner-center"><div className="spinner spinner-lg" /></div>;

  if (!account) return (
    <div className="card empty-state">
      <h3>No account found</h3>
      <p>You need an active account to make transfers.</p>
    </div>
  );

  if (account.status !== 'ACTIVE') return (
    <div className="card">
      <div className="alert alert-warning">Your account is {account.status}. Contact support.</div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Transfer Money</h1>
          <p className="page-subtitle">Available balance: <strong>₹{(Number(account.balancePaise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: 24 }}>Send Money</h2>
          <Alert type="error" message={error} onClose={() => setError('')} />
          <Alert type="success" message={result ? `✅ Transfer of ₹${(Number(result.amountPaise) / 100).toFixed(2)} completed!` : ''} />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: (error || result) ? 16 : 0 }}>
            <div className="form-group">
              <label className="form-label">Receiver Account ID</label>
              <input className={`form-input ${errors.receiverAccountId ? 'error' : ''}`} value={form.receiverAccountId}
                onChange={e => setForm(f => ({ ...f, receiverAccountId: e.target.value }))}
                placeholder="Enter account ID of recipient" />
              {errors.receiverAccountId && <span className="form-error">{errors.receiverAccountId}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input type="number" step="0.01" min="0.01" className={`form-input ${errors.amountRupees ? 'error' : ''}`}
                value={form.amountRupees} onChange={e => setForm(f => ({ ...f, amountRupees: e.target.value }))}
                placeholder="0.00" />
              {errors.amountRupees && <span className="form-error">{errors.amountRupees}</span>}
              <span className="form-hint">Amount is converted to paise internally for precision</span>
            </div>

            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input className="form-input" value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="What's this for?" maxLength={200} />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Processing…' : 'Send Transfer'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="card-title" style={{ marginBottom: 16 }}>How it works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { n: '1', t: 'Enter account ID', d: 'Ask the recipient to share their account ID from their dashboard.' },
              { n: '2', t: 'Specify amount', d: 'Enter the amount in rupees. We store it as paise for exact arithmetic.' },
              { n: '3', t: 'Instant processing', d: 'Transfers are atomic — both balances update in a single DB transaction.' },
              { n: '4', t: 'Ledger entry', d: 'A DEBIT and CREDIT entry is created for full auditability.' },
            ].map(({ n, t, d }) => (
              <div key={n} style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 28, height: 28, background: 'var(--color-indigo-pale)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--color-indigo-light)', flexShrink: 0 }}>{n}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
