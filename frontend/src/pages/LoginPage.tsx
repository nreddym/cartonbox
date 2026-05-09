import React, { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/auth.service';

interface LocationState {
  from?: { pathname: string };
}

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from?.pathname || '/';

  const validate = (): string | null => {
    if (!username.trim()) return 'Username is required';
    if (username.trim().length < 3) return 'Username must be at least 3 characters';
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      await authService.login({ username: username.trim(), password });
      navigate(from, { replace: true });
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        'Login failed. Please try again.';
      setError(typeof message === 'string' ? message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-card__brand">
          <span className="login-card__brand-logo">CB</span>
          <span>Carton Box Manufacturing</span>
        </div>
        <p className="login-card__title">Sign in to your account</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={submitting}
            />
          </div>
          <div className="form-row">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={submitting}
            />
          </div>
          {error && (
            <div role="alert" className="alert alert-error">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary btn-block"
            style={{ marginTop: 4 }}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
