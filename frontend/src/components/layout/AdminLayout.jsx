import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AdminLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
