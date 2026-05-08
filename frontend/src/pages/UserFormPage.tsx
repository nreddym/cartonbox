import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import userService, { ALLOWED_ROLES, CreateUserPayload } from '../services/user.service';

const UserFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    roles: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleRole = (role: string) =>
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));

  const validate = (): string | null => {
    if (form.username.trim().length < 3) return 'Username must be at least 3 characters';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return 'Invalid email address';
    if (form.password.length < 8) return 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    if (form.roles.length === 0) return 'At least one role is required';
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateUserPayload = {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        roles: form.roles,
      };
      await userService.create(payload);
      navigate('/users');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>New User</h2>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Username">
          <input
            type="text"
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            disabled={submitting}
            style={input}
            autoComplete="off"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            disabled={submitting}
            style={input}
            autoComplete="off"
          />
        </Field>
        <Field label="Password (min 8 characters)">
          <input
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            disabled={submitting}
            style={input}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm Password">
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
            disabled={submitting}
            style={input}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Roles">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {ALLOWED_ROLES.map((role) => (
              <label key={role} style={{ fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={form.roles.includes(role)}
                  onChange={() => toggleRole(role)}
                  disabled={submitting}
                />{' '}
                {role}
              </label>
            ))}
          </div>
        </Field>

        {error && (
          <div
            role="alert"
            style={{
              color: '#a40000',
              background: '#fde7e7',
              padding: 8,
              borderRadius: 4,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '10px 16px',
              background: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Creating...' : 'Create User'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/users')}
            disabled={submitting}
            style={{
              padding: '10px 16px',
              background: '#fff',
              color: '#555',
              border: '1px solid #ccc',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>{label}</label>
    {children}
  </div>
);

const input: React.CSSProperties = { width: '100%', padding: 8, boxSizing: 'border-box' };

export default UserFormPage;
