import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const userNav = [
  { to: '/dashboard',    label: 'Dashboard',    icon: '⊞' },
  { to: '/transactions', label: 'Transactions', icon: '↔' },
  { to: '/transfer',     label: 'Transfer',     icon: '→' },
  { to: '/profile',      label: 'Profile',      icon: '◎' },
];

const adminNav = [
  { to: '/admin',                 label: 'Dashboard',    icon: '⊞' },
  { to: '/admin/users',          label: 'Users',         icon: '◎' },
  { to: '/admin/onboarding',     label: 'Onboarding',   icon: '📋' },
  { to: '/admin/accounts',       label: 'Accounts',     icon: '🏦' },
  { to: '/admin/transactions',   label: 'Transactions', icon: '↔' },
  { to: '/admin/audit-logs',     label: 'Audit Logs',   icon: '📄' },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const nav = isAdmin ? adminNav : userNav;

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'var(--color-navy)',
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
      {/* Brand */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36,
            background: 'var(--color-teal)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>🔒</div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em' }}>BalanceVault</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {isAdmin ? 'Admin Panel' : 'Account Portal'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {nav.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin' || to === '/dashboard'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              marginBottom: '2px',
              fontSize: '14px',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
              transition: 'all 150ms',
              textDecoration: 'none',
            })}
          >
            <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{
          padding: '10px 12px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.05)',
          marginBottom: '8px',
        }}>
          <div style={{ color: 'white', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.fullName}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '8px 12px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '13px', cursor: 'pointer',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(220,38,38,0.2)'}
          onMouseLeave={e => e.target.style.background = 'transparent'}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
