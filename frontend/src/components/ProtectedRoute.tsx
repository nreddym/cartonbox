import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../services/auth.service';

interface ProtectedRouteProps {
  children: React.ReactElement;
  roles?: string[];
}

/**
 * Wraps routes that require authentication. Optionally restricts access by role.
 * Validates: Requirement 12.2
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const location = useLocation();

  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0) {
    const user = authService.getCurrentUser();
    const userRoles: string[] = user?.roles || [];
    const allowed = roles.some((r) => userRoles.includes(r));
    if (!allowed) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
