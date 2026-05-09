import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import userService, { ALLOWED_ROLES, UserRecord } from '../services/user.service';

const UserListPage: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRoles, setEditingRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.list({ limit: 200 });
      setUsers(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = (user: UserRecord) => {
    setEditingId(user.id);
    setEditingRoles([...user.roles]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingRoles([]);
  };

  const toggleRole = (role: string) => {
    setEditingRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const saveRoles = async (id: string) => {
    if (editingRoles.length === 0) {
      setError('At least one role is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await userService.updateRoles(id, editingRoles);
      await load();
      cancelEdit();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to update roles.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Users</h2>
        <Link
          to="/users/new"
          style={{
            padding: '8px 14px',
            background: '#1976d2',
            color: '#fff',
            borderRadius: 4,
            textDecoration: 'none',
          }}
        >
          + New User
        </Link>
      </div>

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

      {loading ? (
        <p>Loading...</p>
      ) : users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
              <th style={th}>Username</th>
              <th style={th}>Email</th>
              <th style={th}>Roles</th>
              <th style={th}>Active</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isEditing = editingId === u.id;
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>{u.username}</td>
                  <td style={td}>{u.email}</td>
                  <td style={td}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {ALLOWED_ROLES.map((role) => (
                          <label key={role} style={{ fontSize: 13 }}>
                            <input
                              type="checkbox"
                              checked={editingRoles.includes(role)}
                              onChange={() => toggleRole(role)}
                              disabled={saving}
                            />{' '}
                            {role}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {u.roles.map((r) => (
                          <span
                            key={r}
                            style={{
                              background: '#e3f2fd',
                              color: '#0d47a1',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        color: u.is_active ? '#1b5e20' : '#a40000',
                        fontWeight: 600,
                      }}
                    >
                      {u.is_active ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td style={td}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => saveRoles(u.id)}
                          disabled={saving}
                          style={btn('#2e7d32')}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={saving}
                          style={btn('#666')}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(u)}
                        style={btn('#1976d2')}
                      >
                        Edit Roles
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

const th: React.CSSProperties = { padding: 8, fontWeight: 600 };
const td: React.CSSProperties = { padding: 8, verticalAlign: 'middle' };
const btn = (bg: string): React.CSSProperties => ({
  padding: '4px 10px',
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
});

export default UserListPage;
