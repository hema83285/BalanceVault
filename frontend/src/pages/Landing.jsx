import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-navy)', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 48px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'var(--color-teal)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔒</div>
          <span style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>BalanceVault</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" className="btn btn-ghost" style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.15)' }}>Sign In</Link>
          <Link to="/register" className="btn btn-primary">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 48px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.3)', borderRadius: 100, padding: '6px 16px', marginBottom: 32 }}>
          <span style={{ width: 6, height: 6, background: 'var(--color-teal-light)', borderRadius: '50%', display: 'inline-block' }} />
          <span style={{ color: 'var(--color-teal-light)', fontSize: 13, fontWeight: 500 }}>Snovasys Hiring Challenge 2026</span>
        </div>

        <h1 style={{ color: 'white', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, maxWidth: 700, marginBottom: 24 }}>
          Secure financial management,{' '}
          <span style={{ background: 'linear-gradient(135deg, #14b8a6, #4f46e5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            built with trust
          </span>
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 18, maxWidth: 560, marginBottom: 48, lineHeight: 1.7 }}>
          Open an account, manage your balance, and transfer money securely — with every transaction recorded in an auditable ledger.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/register" className="btn btn-primary btn-lg">Create Account</Link>
          <Link to="/login" className="btn btn-ghost btn-lg" style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)' }}>Sign In</Link>
        </div>

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, maxWidth: 800, width: '100%', marginTop: 80 }}>
          {[
            { icon: '🔐', title: 'Secure Auth',    desc: 'JWT + bcrypt with rate limiting' },
            { icon: '👤', title: 'Role-Based',      desc: 'Strict ADMIN vs Account Holder access' },
            { icon: '📒', title: 'Auditable Ledger', desc: 'Double-entry bookkeeping for every transfer' },
            { icon: '⚡', title: 'Atomic Transfers', desc: 'Row-level locks prevent overdraft races' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 20px', textAlign: 'left' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{title}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
