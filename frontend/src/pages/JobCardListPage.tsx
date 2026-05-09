import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import jobCardService, { JobCard, JobCardStatus } from '../services/jobCard.service';
import authService from '../services/auth.service';

const STATUS_OPTIONS: Array<JobCardStatus | 'ALL'> = [
  'ALL',
  'CREATED',
  'APPROVED',
  'REJECTED',
  'IN_PRODUCTION',
  'COMPLETED',
  'CANCELLED',
];

const STATUS_COLORS: Record<JobCardStatus, { bg: string; fg: string }> = {
  CREATED: { bg: '#e3f2fd', fg: '#0d47a1' },
  APPROVED: { bg: '#e8f5e9', fg: '#1b5e20' },
  REJECTED: { bg: '#fde7e7', fg: '#a40000' },
  IN_PRODUCTION: { bg: '#fff8e1', fg: '#8d6e00' },
  COMPLETED: { bg: '#ede7f6', fg: '#311b92' },
  CANCELLED: { bg: '#fde7e7', fg: '#a40000' },
};

const APPROVER_ROLES = ['ADMIN', 'PRODUCTION_MANAGER'];
const SUPERVISOR_ROLES = ['ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR'];

const StatusBadge: React.FC<{ status: JobCardStatus }> = ({ status }) => {
  const c = STATUS_COLORS[status] || { bg: '#eee', fg: '#333' };
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

const JobCardListPage: React.FC = () => {
  const [items, setItems] = useState<JobCard[]>([]);
  const [statusFilter, setStatusFilter] = useState<JobCardStatus | 'ALL'>('ALL');
  const [boxTypeFilter, setBoxTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const user = authService.getCurrentUser();
  const userRoles: string[] = user?.roles || [];
  const canApprove = userRoles.some((r) => APPROVER_ROLES.includes(r));
  const canSupervise = userRoles.some((r) => SUPERVISOR_ROLES.includes(r));

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await jobCardService.list(
        statusFilter === 'ALL'
          ? boxTypeFilter
            ? { box_type: boxTypeFilter }
            : {}
          : boxTypeFilter
            ? { status: statusFilter, box_type: boxTypeFilter }
            : { status: statusFilter },
      );
      setItems(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load job cards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const boxTypes = useMemo(
    () => Array.from(new Set(items.map((j) => j.box_type))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    if (!boxTypeFilter) return items;
    return items.filter((j) => j.box_type === boxTypeFilter);
  }, [items, boxTypeFilter]);

  const handleAction = async (
    id: string,
    action: 'approve' | 'start' | 'complete',
  ) => {
    setActionId(id);
    setError(null);
    try {
      if (action === 'approve') await jobCardService.approve(id);
      else if (action === 'start') await jobCardService.start(id);
      else await jobCardService.complete(id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Failed to ${action} job card.`);
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
        <h2 style={{ margin: 0 }}>Job Cards</h2>
        <Link
          to="/job-cards/new"
          style={{
            padding: '8px 14px',
            background: '#1976d2',
            color: '#fff',
            borderRadius: 4,
            textDecoration: 'none',
          }}
        >
          + New Job Card
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as JobCardStatus | 'ALL')}
          style={{ padding: 8 }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={boxTypeFilter}
          onChange={(e) => setBoxTypeFilter(e.target.value)}
          style={{ padding: 8 }}
        >
          <option value="">All box types</option>
          {boxTypes.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
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
      ) : filtered.length === 0 ? (
        <p>No job cards found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
              <th style={th}>Number</th>
              <th style={th}>Box</th>
              <th style={th}>Dimensions (LxWxH)</th>
              <th style={th}>Ply</th>
              <th style={th}>Qty</th>
              <th style={th}>Required Paper</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((j) => (
              <tr key={j.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={td}>{j.job_card_number}</td>
                <td style={td}>{j.box_type}</td>
                <td style={td}>
                  {j.box_length} x {j.box_width} x {j.box_height}
                </td>
                <td style={td}>
                  {j.ply_type} ({j.ply_count})
                </td>
                <td style={td}>{j.quantity_to_produce}</td>
                <td style={td}>
                  {j.required_paper_quantity != null
                    ? `${j.required_paper_quantity.toFixed(2)} kg`
                    : '-'}
                </td>
                <td style={td}>
                  <StatusBadge status={j.status} />
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Link to={`/job-cards/${j.id}`} style={linkBtn}>
                      View
                    </Link>
                    {j.status === 'CREATED' && canApprove && (
                      <button
                        type="button"
                        disabled={actionId === j.id}
                        onClick={() => handleAction(j.id, 'approve')}
                        style={btn('#2e7d32')}
                      >
                        Approve
                      </button>
                    )}
                    {j.status === 'APPROVED' && canSupervise && (
                      <button
                        type="button"
                        disabled={actionId === j.id}
                        onClick={() => handleAction(j.id, 'start')}
                        style={btn('#1565c0')}
                      >
                        Start
                      </button>
                    )}
                    {j.status === 'IN_PRODUCTION' && canSupervise && (
                      <Link
                        to={`/job-cards/${j.id}/complete`}
                        style={{ ...linkBtn, background: '#6a1b9a', color: '#fff' }}
                      >
                        Complete
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const th: React.CSSProperties = { padding: 8, fontWeight: 600 };
const td: React.CSSProperties = { padding: 8 };
const linkBtn: React.CSSProperties = {
  padding: '4px 10px',
  border: '1px solid #1976d2',
  color: '#1976d2',
  textDecoration: 'none',
  borderRadius: 4,
  fontSize: 13,
};
const btn = (bg: string): React.CSSProperties => ({
  padding: '4px 10px',
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
});

export default JobCardListPage;
