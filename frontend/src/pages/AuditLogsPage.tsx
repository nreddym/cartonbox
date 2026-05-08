import React, { useEffect, useState } from 'react';
import auditLogService, { AuditLog, ListAuditLogParams } from '../services/auditLog.service';

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filters, setFilters] = useState({
    transaction_type: '',
    entity_type: '',
    entity_id: '',
    action: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ListAuditLogParams = { limit: 200 };
      if (filters.transaction_type) params.transaction_type = filters.transaction_type;
      if (filters.entity_type) params.entity_type = filters.entity_type;
      if (filters.entity_id) params.entity_id = filters.entity_id;
      if (filters.action) params.action = filters.action;
      const data = await auditLogService.list(params);
      setLogs(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div>
      <h2>Audit Logs</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          placeholder="Transaction type"
          value={filters.transaction_type}
          onChange={(e) => setFilters({ ...filters, transaction_type: e.target.value })}
          style={input}
        />
        <input
          placeholder="Entity type"
          value={filters.entity_type}
          onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
          style={input}
        />
        <input
          placeholder="Entity ID (UUID)"
          value={filters.entity_id}
          onChange={(e) => setFilters({ ...filters, entity_id: e.target.value })}
          style={{ ...input, width: 280 }}
        />
        <input
          placeholder="Action"
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          style={input}
        />
        <button
          type="button"
          onClick={load}
          style={{
            padding: '8px 14px',
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Apply
        </button>
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
      ) : logs.length === 0 ? (
        <p>No audit logs found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
              <th style={th}>Performed At</th>
              <th style={th}>Transaction Type</th>
              <th style={th}>Entity</th>
              <th style={th}>Action</th>
              <th style={th}>Performed By</th>
              <th style={th}>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const isOpen = expandedId === log.id;
              return (
                <React.Fragment key={log.id}>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={td}>{formatDate(log.performed_at)}</td>
                    <td style={td}>{log.transaction_type}</td>
                    <td style={td} title={log.entity_id}>
                      {log.entity_type}
                      <div style={{ fontSize: 11, color: '#888' }}>{log.entity_id.slice(0, 8)}...</div>
                    </td>
                    <td style={td}>
                      <ActionBadge action={log.action} />
                    </td>
                    <td style={td} title={log.performed_by}>
                      {log.performed_by.slice(0, 8)}...
                    </td>
                    <td style={td}>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isOpen ? null : log.id)}
                        style={{
                          padding: '4px 10px',
                          background: '#fff',
                          color: '#1976d2',
                          border: '1px solid #1976d2',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        {isOpen ? 'Hide' : 'Show'}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={6} style={{ padding: 16, background: '#fafafa' }}>
                        <DiffView before={log.before_data || null} after={log.after_data || {}} />
                        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                          Transaction ID: {log.transaction_id}
                          {log.ip_address ? ` • IP: ${log.ip_address}` : ''}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
  const colors: Record<string, { bg: string; fg: string }> = {
    CREATE: { bg: '#e8f5e9', fg: '#1b5e20' },
    UPDATE: { bg: '#e3f2fd', fg: '#0d47a1' },
    APPROVE: { bg: '#e8f5e9', fg: '#1b5e20' },
    REJECT: { bg: '#fde7e7', fg: '#a40000' },
    DELETE: { bg: '#fde7e7', fg: '#a40000' },
  };
  const c = colors[action.toUpperCase()] || { bg: '#f4f4f4', fg: '#333' };
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {action}
    </span>
  );
};

const DiffView: React.FC<{ before: Record<string, any> | null; after: Record<string, any> }> = ({
  before,
  after,
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Before</div>
        <pre style={pre}>{before ? JSON.stringify(before, null, 2) : '(none)'}</pre>
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>After</div>
        <pre style={pre}>{JSON.stringify(after, null, 2)}</pre>
      </div>
    </div>
  );
};

const input: React.CSSProperties = { padding: 8 };
const th: React.CSSProperties = { padding: 8, fontWeight: 600 };
const td: React.CSSProperties = { padding: 8, verticalAlign: 'top' };
const pre: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 4,
  padding: 8,
  fontSize: 12,
  maxHeight: 300,
  overflow: 'auto',
  margin: 0,
};

export default AuditLogsPage;
