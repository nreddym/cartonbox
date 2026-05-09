import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import authService from '../services/auth.service';

interface MenuItem {
  to: string;
  label: string;
  roles?: string[]; // if undefined, visible to any authenticated user
}

const MENU_ITEMS: MenuItem[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/paper-rolls', label: 'Paper Rolls', roles: ['ADMIN', 'STORE_MANAGER'] },
  { to: '/inventory-inward', label: 'Inventory Inward', roles: ['ADMIN', 'STORE_MANAGER', 'SUPERVISOR'] },
  { to: '/job-cards', label: 'Job Cards', roles: ['ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR'] },
  { to: '/material-issues', label: 'Material Issues', roles: ['ADMIN', 'STORE_MANAGER', 'SUPERVISOR'] },
  { to: '/production', label: 'Production', roles: ['ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR'] },
  { to: '/finished-goods', label: 'Finished Goods', roles: ['ADMIN', 'PRODUCTION_MANAGER', 'STORE_MANAGER', 'DISPATCH_MANAGER', 'AUDITOR'] },
  { to: '/fg-outward', label: 'FG Outward', roles: ['ADMIN', 'STORE_MANAGER', 'DISPATCH_MANAGER'] },
  { to: '/adjustments', label: 'Adjustments', roles: ['ADMIN'] },
  { to: '/reports', label: 'Reports', roles: ['ADMIN', 'PRODUCTION_MANAGER', 'STORE_MANAGER', 'AUDITOR'] },
  { to: '/audit-logs', label: 'Audit Logs', roles: ['ADMIN', 'AUDITOR'] },
  { to: '/users', label: 'Users', roles: ['ADMIN'] },
];

interface MainLayoutProps {
  children: React.ReactNode;
}

const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  display: 'block',
  padding: '10px 16px',
  color: isActive ? '#1976d2' : '#333',
  background: isActive ? '#e3f2fd' : 'transparent',
  textDecoration: 'none',
  borderLeft: isActive ? '3px solid #1976d2' : '3px solid transparent',
});

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const userRoles: string[] = user?.roles || [];

  const visibleItems = MENU_ITEMS.filter(
    (item) => !item.roles || item.roles.some((r) => userRoles.includes(r)),
  );

  const handleLogout = () => {
    authService.logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          background: '#1976d2',
          color: '#fff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20 }}>Carton Box Manufacturing</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && (
            <span style={{ fontSize: 14 }}>
              {user.username}
              {userRoles.length > 0 && (
                <span style={{ marginLeft: 8, opacity: 0.85 }}>
                  ({userRoles.join(', ')})
                </span>
              )}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: '#fff',
              color: '#1976d2',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}
      >
        <nav
          aria-label="Main navigation"
          style={{
            width: 220,
            minWidth: 180,
            background: '#fafafa',
            borderRight: '1px solid #e0e0e0',
            paddingTop: 12,
          }}
        >
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to} style={navLinkStyle} end>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main style={{ flex: 1, padding: 24, minWidth: 0 }}>{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
