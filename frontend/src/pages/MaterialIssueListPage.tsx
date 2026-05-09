import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import materialIssueService, {
  MaterialIssue,
  MaterialIssueStatus,
} from '../services/materialIssue.service';
import authService from '../services/auth.service';

const STATUS_OPTIONS: Array<MaterialIssueStatus | 'ALL'> = [
  'ALL',
  'PENDING',
  'APPROVED',
  'REJECTED',
];

const STATUS_COLORS: Record<MaterialIssueStatus, { bg: string; fg: string }> = {
  PENDING: { bg: '#fff8e1', fg: '#8d6e00' },
  APPROVED: { bg: '#e8f5e9', fg: '#1b5e20' },
  REJECTED: { bg: '#fde7e7', fg: '#a40000' },
};

const APPROVER_ROLES = ['ADMIN', 'STORE_MANAGER'];

const StatusBadge: React.FC<{ status: MaterialIssueStatus }> = ({ status }) => {
  const c = STATUS_COLORS[status];
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
      {status}
    </span>
  );
};

const MaterialIssueListPage: React.FC = () => {
  const [items, setItems] = useState<MaterialIssue[]>([]);
  const [statusFilter, setStatusFilter] = useState<MaterialIssueStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const user = authService.getCurrentUser();
  const userRoles: string[] = user?.roles || [];
  const canApprove = userRoles.some((r) => APPROVER_ROLES.includes(r));

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await materialIssueService.list(
        statusFilter === 'ALL' ? {} : { status: statusFilter },
      );
      setItems(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load material issues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const totals = useMemo(() => {
    const total = items.reduce((acc, it) => acc + Number(it.issued_quantity), 0);
    return total;
  }, [items]);

  const handleAction = async (
    item: MaterialIssue,
    action: 'approve' | 'reject',
  ) => {
    setActionId(item.id);
    setError(null);
    try {
      if (action === 'approve') {
        const requested = Number(item.requested_quantity);
        const input = window.prompt(
          `Enter issued quantity (${item.unit}). Requested: ${requested}.`,
          String(requested),
        );
        if (input === null) {
          setActionId(null);
          return;
        }
        const issued = Number(input);
        if (!Number.isFinite(issued) || issued <= 0) {
          setError('Issued quantity must be a positive number.');
          setActionId(null);
          return;
        }
        if (issued > requested) {
          setError('Issued quantity cannot exceed requested quantity.');
          setActionId(null);
          return;
        }
        await materialIssueService.approve(item.id, issued);
      } else {
        await materialIssueService.reject(item.id);
      }
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Failed to ${action} request.`);
    } finally {
      setActionId(null);
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
        }}
      >
        <h2 style={{ margin: 0 }}>Material Issues</h2>
        <Link
          to="/material-issues/new"
          style={{
            padding: '8px 14px',
            background: '#1976d2',
            color: '#fff',
            borderRadius: 4,
            textDecoration: 'none',
          }}
        >
          + New Material Issue
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as MaterialIssueStatus | 'ALL')
          }
          style={{ padding: 8 }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div style={{ alignSelf: 'center', color: '#555' }}>
          Total issued (filter): <strong>{totals.toFixed(2)}</strong>
        </div>
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
      ) : items.length === 0 ? (
        <p>No material issues found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
              <th style={th}>Issue Date</th>
              <th style={th}>Job Card</th>
              <th style={th}>Paper Roll</th>
              <th style={th}>Requested</th>
              <th style={th}>Issued</th>
              <th style={th}>Unit</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={td}>{it.issue_date}</td>
                <td style={td}>
                  <Link to={`/job-cards/${it.job_card_id}`}>{shortId(it.job_card_id)}</Link>
                </td>
                <td style={td}>
                  <Link to={`/paper-rolls/${it.paper_roll_id}/edit`}>
                    {shortId(it.paper_roll_id)}
                  </Link>
                </td>
                <td style={td}>{it.requested_quantity}</td>
                <td style={td}>{it.issued_quantity}</td>
                <td style={td}>{it.unit}</td>
                <td style={td}>
                  <StatusBadge status={it.status} />
                </td>
                <td style={td}>
                  {it.status === 'PENDING' && canApprove && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        disabled={actionId === it.id}
                        onClick={() => handleAction(it, 'approve')}
                        style={btn('#2e7d32')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={actionId === it.id}
                        onClick={() => handleAction(it, 'reject')}
                        style={btn('#c62828')}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const shortId = (id: string) => id.slice(0, 8);

const th: React.CSSProperties = { padding: 8, fontWeight: 600 };
const td: React.CSSProperties = { padding: 8 };
const btn = (bg: string): React.CSSProperties => ({
  padding: '4px 10px',
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
});

export default MaterialIssueListPage;
