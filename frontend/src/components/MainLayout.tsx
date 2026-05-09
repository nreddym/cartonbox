import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import authService from '../services/auth.service';

interface MenuItem {
  to: string;
  label: string;
  icon: string;
  roles?: string[];
}

const MENU_ITEMS: MenuItem[] = [
  { to: '/', label: 'Dashboard', icon: '\u2630' },
  { to: '/paper-rolls', label: 'Paper Rolls', icon: '\u25CE', roles: ['ADMIN', 'STORE_MANAGER'] },
  { to: '/inventory-inward', label: 'Inventory Inward', icon: '\u2B07', roles: ['ADMIN', 'STORE_MANAGER', 'SUPERVISOR'] },
  { to: '/job-cards', label: 'Job Cards', icon: '\u25A4', roles: ['ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR'] },
  { to: '/material-issues', label: 'Material Issues', icon: '\u21C4', roles: ['ADMIN', 'STORE_MANAGER', 'SUPERVISOR', 'PRODUCTION_MANAGER'] },
  { to: '/production', label: 'Production', icon: '\u2699', roles: ['ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR'] },
  { to: '/finished-goods', label: 'Finished Goods', icon: '\u25A3', roles: ['ADMIN', 'PRODUCTION_MANAGER', 'STORE_MANAGER', 'DISPATCH_MANAGER', 'AUDITOR'] },
  { to: '/fg-outward', label: 'FG Outward', icon: '\u2B06', roles: ['ADMIN', 'STORE_MANAGER', 'DISPATCH_MANAGER'] },
  { to: '/adjustments', label: 'Adjustments', icon: '\u00B1', roles: ['ADMIN', 'STORE_MANAGER', 'PRODUCTION_MANAGER', 'AUDITOR'] },
  { to: '/reports', label: 'Reports', icon: '\u25A6', roles: ['ADMIN', 'PRODUCTION_MANAGER', 'STORE_MANAGER', 'AUDITOR'] },
  { to: '/audit-logs', label: 'Audit Logs', icon: '\u25CB', roles: ['ADMIN', 'AUDITOR'] },
  { to: '/users', label: 'Users', icon: '\u263A', roles: ['ADMIN'] },
];

interface MainLayoutProps {
  children: React.ReactNode;
}

const initialsOf = (name?: string) => {
  if (!name) return '?';
  return name
    .split(/[ ._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('') || name[0].toUpperCase();
};

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getCurrentUser();
  const userRoles: string[] = user?.roles || [];
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleItems = MENU_ITEMS.filter(
    (item) => !item.roles || item.roles.some((r) => userRoles.includes(r)),
  );

  // Auto-close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login', { replace: true });
  };

  const primaryRole = userRoles[0] || '';

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="app-header__left">
          <button
            type="button"
            className="app-header__menu-btn"
            aria-label="Toggle navigation"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            {'\u2630'}
          </button>
          <div className="app-header__brand">
            <span className="app-header__logo">CB</span>
            <span className="app-header__brand-text">Carton Box Manufacturing</span>
          </div>
        </div>
        <div className="app-header__user">
          {user && (
            <span className="user-pill" title={userRoles.join(', ')}>
              <span className="user-pill__avatar">{initialsOf(user.username)}</span>
              <span className="user-pill__name">{user.username}</span>
              {primaryRole && <span className="user-pill__role">{primaryRole}</span>}
            </span>
          )}
          <button type="button" className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="app-body">
        <nav
          aria-label="Main navigation"
          className={`app-sidebar${sidebarOpen ? ' is-open' : ''}`}
        >
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-link__icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Backdrop for mobile drawer */}
        <div
          className={`sidebar-backdrop${sidebarOpen ? ' is-open' : ''}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;

