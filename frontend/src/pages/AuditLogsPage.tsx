import React, { useEffect, useState } from 'react';
import auditLogService, { AuditLog, ListAuditLogParams } from '../services/auditLog.service';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const toInputDate = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const defaultStartDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 10);
  return toInputDate(d);
};
const defaultEndDate = () => toInputDate(new Date());

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filters, setFilters] = useState({
    transaction_type: '',
    entity_id: '',
    action: '',
    start_date: defaultStartDate(),
    end_date: defaultEndDate(),
  });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async (overridePage?: number, overridePageSize?: number) => {
    const currentPage = overridePage ?? page;
    const currentPageSize = overridePageSize ?? pageSize;
    setLoading(true);
    setError(null);
    try {
      const params: ListAuditLogParams = {
        skip: currentPage * currentPageSize,
        limit: currentPageSize,
      };
      if (filters.transaction_type) params.transaction_type = filters.transaction_type;
      if (filters.entity_id) params.entity_id = filters.entity_id;
      if (filters.action) params.action = filters.action;
      if (filters.start_date) params.start_date = `${filters.start_date}T00:00:00`;
      if (filters.end_date) params.end_date = `${filters.end_date}T23:59:59`;
      const data = await auditLogService.list(params);
      setLogs(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(0, pageSize);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = () => {
    setPage(0);
    load(0, pageSize);
  };

  const handlePrev = () => {
    if (page === 0) return;
    const next = page - 1;
    setPage(next);
    load(next, pageSize);
  };

  const handleNext = () => {
    const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);
    if (page >= maxPage) return;
    const next = page + 1;
    setPage(next);
    load(next, pageSize);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(0);
    load(0, size);
  };

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

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: 13 }}>
          From:
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            style={{ ...input, marginLeft: 4 }}
          />
        </label>
        <label style={{ fontSize: 13 }}>
          To:
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            style={{ ...input, marginLeft: 4 }}
          />
        </label>
        <input
          placeholder="Transaction type"
          value={filters.transaction_type}
          onChange={(e) => setFilters({ ...filters, transaction_type: e.target.value })}
          style={input}
        />
        <input
          placeholder="Entity ID (UUID)"
          value={filters.entity_id}
          onChange={(e) => setFilters({ ...filters, entity_id: e.target.value })}
          style={{ ...input, width: 180 }}
        />
        <input
          placeholder="Action"
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          style={input}
        />
        <button
          type="button"
          onClick={handleApply}
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

      {!loading && total > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 12,
            fontSize: 14,
          }}
        >
          <div>
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 13 }}>
              Page size:
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                style={{ marginLeft: 4, padding: 4 }}
              >
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handlePrev}
              disabled={page === 0}
              style={pagerBtn(page === 0)}
            >
              Prev
            </button>
            <span>
              Page {page + 1} / {Math.max(1, Math.ceil(total / pageSize))}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={(page + 1) * pageSize >= total}
              style={pagerBtn((page + 1) * pageSize >= total)}
            >
              Next
            </button>
          </div>
        </div>
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
const pagerBtn = (disabled: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  background: disabled ? '#f4f4f4' : '#fff',
  color: disabled ? '#999' : '#1976d2',
  border: '1px solid ' + (disabled ? '#ddd' : '#1976d2'),
  borderRadius: 4,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

export default AuditLogsPage;
