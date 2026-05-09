import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import adjustmentService, {
  Adjustment,
  AdjustmentStatus,
  InventoryType,
} from '../services/adjustment.service';
import authService from '../services/auth.service';

const STATUS_OPTIONS: Array<AdjustmentStatus | 'ALL'> = [
  'ALL',
  'PENDING',
  'APPROVED',
  'REJECTED',
];

const TYPE_OPTIONS: Array<InventoryType | 'ALL'> = ['ALL', 'RAW_MATERIAL', 'FINISHED_GOODS'];

const STATUS_COLORS: Record<AdjustmentStatus, { bg: string; fg: string }> = {
  PENDING: { bg: '#fff8e1', fg: '#8d6e00' },
  APPROVED: { bg: '#e8f5e9', fg: '#1b5e20' },
  REJECTED: { bg: '#fde7e7', fg: '#a40000' },
};

const APPROVER_ROLES = ['ADMIN', 'PRODUCTION_MANAGER', 'STORE_MANAGER'];
const CREATOR_ROLES = ['ADMIN', 'STORE_MANAGER', 'PRODUCTION_MANAGER'];

const StatusBadge: React.FC<{ status: AdjustmentStatus }> = ({ status }) => {
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

const InventoryAdjustmentListPage: React.FC = () => {
  const [items, setItems] = useState<Adjustment[]>([]);
  const [statusFilter, setStatusFilter] = useState<AdjustmentStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<InventoryType | 'ALL'>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const user = authService.getCurrentUser();
  const userRoles: string[] = user?.roles || [];
  const canApprove = userRoles.some((r) => APPROVER_ROLES.includes(r));
  const canCreate = userRoles.some((r) => CREATOR_ROLES.includes(r));

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { status?: AdjustmentStatus; inventory_type?: InventoryType } = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (typeFilter !== 'ALL') params.inventory_type = typeFilter;
      const data = await adjustmentService.list(params);
      setItems(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load adjustments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionId(id);
    setError(null);
    try {
      if (action === 'approve') await adjustmentService.approve(id);
      else await adjustmentService.reject(id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Failed to ${action} adjustment.`);
    } finally {
      setActionId(null);
    }
  };

  const formatQty = (q: number) =>
    q > 0 ? <span style={{ color: '#1b5e20' }}>+{q}</span> : <span style={{ color: '#a40000' }}>{q}</span>;

  const summary = useMemo(() => {
    return {
      total: items.length,
      pending: items.filter((a) => a.status === 'PENDING').length,
    };
  }, [items]);

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
        <h2 style={{ margin: 0 }}>Inventory Adjustments</h2>
        {canCreate && (
          <Link
            to="/adjustments/new"
            style={{
              padding: '8px 14px',
              background: '#1976d2',
              color: '#fff',
              borderRadius: 4,
              textDecoration: 'none',
            }}
          >
            + New Adjustment
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AdjustmentStatus | 'ALL')}
          style={{ padding: 8 }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as InventoryType | 'ALL')}
          style={{ padding: 8 }}
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div style={{ alignSelf: 'center', color: '#555' }}>
          {summary.total} total • <strong>{summary.pending}</strong> pending
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
        <p>No adjustments found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
              <th style={th}>Inventory Type</th>
              <th style={th}>Item</th>
              <th style={th}>Adjustment</th>
              <th style={th}>Reason</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={td}>{a.inventory_type}</td>
                <td style={td} title={a.item_id}>
                  {a.item_id.slice(0, 8)}...
                </td>
                <td style={td}>{formatQty(a.adjustment_quantity)}</td>
                <td style={td} title={a.reason}>
                  {a.reason.length > 60 ? a.reason.slice(0, 60) + '...' : a.reason}
                </td>
                <td style={td}>
                  <StatusBadge status={a.status} />
                </td>
                <td style={td}>
                  {a.status === 'PENDING' && canApprove && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        disabled={actionId === a.id}
                        onClick={() => handleAction(a.id, 'approve')}
                        style={btn('#2e7d32')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={actionId === a.id}
                        onClick={() => handleAction(a.id, 'reject')}
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

export default InventoryAdjustmentListPage;
