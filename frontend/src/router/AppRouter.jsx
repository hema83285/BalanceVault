import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, AdminRoute, GuestRoute } from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';

// Public pages
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Unauthorized from '../pages/Unauthorized';
import NotFound from '../pages/NotFound';

// User pages
import UserLayout from '../components/layout/UserLayout';
import Dashboard from '../pages/user/Dashboard';
import AccountDetails from '../pages/user/AccountDetails';
import Transfer from '../pages/user/Transfer';
import TransactionHistory from '../pages/user/TransactionHistory';
import Onboarding from '../pages/Onboarding';
import Profile from '../pages/user/Profile';

// Admin pages
import AdminLayout from '../components/layout/AdminLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import UserManagement from '../pages/admin/UserManagement';
import OnboardingManagement from '../pages/admin/OnboardingManagement';
import AccountManagement from '../pages/admin/AccountManagement';
import TransactionMonitoring from '../pages/admin/TransactionMonitoring';
import AuditLogs from '../pages/admin/AuditLogs';

export default function AppRouter() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Account holder routes */}
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
        <Route path="/dashboard"    element={<Dashboard />} />
        <Route path="/account/:id"  element={<AccountDetails />} />
        <Route path="/transfer"     element={<Transfer />} />
        <Route path="/transactions" element={<TransactionHistory />} />
        <Route path="/profile"      element={<Profile />} />
      </Route>

      {/* Admin routes */}
      <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route path="/admin"                element={<AdminDashboard />} />
        <Route path="/admin/users"          element={<UserManagement />} />
        <Route path="/admin/onboarding"     element={<OnboardingManagement />} />
        <Route path="/admin/accounts"       element={<AccountManagement />} />
        <Route path="/admin/transactions"   element={<TransactionMonitoring />} />
        <Route path="/admin/audit-logs"     element={<AuditLogs />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
