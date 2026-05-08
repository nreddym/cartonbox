import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import finishedGoodsService, {
  FinishedGoodsStockRow,
  OutwardRecord,
  OutwardStatus,
} from '../services/finishedGoods.service';
import authService from '../services/auth.service';

const STATUS_OPTIONS: Array<OutwardStatus | 'ALL'> = [
  'ALL',
  'PENDING',
  'APPROVED',
  'REJECTED',
];

const STATUS_COLORS: Record<OutwardStatus, { bg: string; fg: string }> = {
  PENDING: { bg: '#fff8e1', fg: '#8d6e00' },
  APPROVED: { bg: '#e8f5e9', fg: '#1b5e20' },
  REJECTED: { bg: '#fde7e7', fg: '#a40000' },
};

// Backend allows DISPATCH_MANAGER or ADMIN; ADMIN is the only role in our
// allowed-roles set that can approve outwards.
const APPROVER_ROLES = ['ADMIN', 'DISPATCH_MANAGER'];

const StatusBadge: React.FC<{ status: OutwardStatus }> = ({ status }) => {
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

const FinishedGoodsOutwardListPage: React.FC = () => {
  const [items, setItems] = useState<OutwardRecord[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, FinishedGoodsStockRow>>({});
  const [statusFilter, setStatusFilter] = useState<OutwardStatus | 'ALL'>('ALL');
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
      const [outwards, stock] = await Promise.all([
        finishedGoodsService.listOutwards(
          statusFilter === 'ALL' ? {} : { status: statusFilter },
        ),
        finishedGoodsService.listStock(),
      ]);
      setItems(outwards);
      const map: Record<string, FinishedGoodsStockRow> = {};
      stock.forEach((s) => (map[s.finished_goods_id] = s));
      setStockMap(map);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load outward records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const totalApproved = useMemo(
    () =>
      items
        .filter((it) => it.status === 'APPROVED')
        .reduce((acc, it) => acc + Number(it.quantity), 0),
    [items],
  );

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionId(id);
    setError(null);
    try {
      if (action === 'approve') await finishedGoodsService.approveOutward(id);
      else await finishedGoodsService.rejectOutward(id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Failed to ${action} outward.`);
    } finally {
      setActionId(null);
    }
  };

  const describeFg = (fgId: string): string => {
    const s = stockMap[fgId];
    if (!s) return fgId.slice(0, 8);
    return `${s.box_type} (${s.box_length}x${s.box_width}x${s.box_height}, ${s.ply_type})`;
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
        <h2 style={{ margin: 0 }}>Finished Goods - Outward</h2>
        <Link
          to="/fg-outward/new"
          style={{
            padding: '8px 14px',
            background: '#1976d2',
            color: '#fff',
            borderRadius: 4,
            textDecoration: 'none',
          }}
        >
          + New Outward
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OutwardStatus | 'ALL')}
          style={{ padding: 8 }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div style={{ alignSelf: 'center', color: '#555' }}>
          Total approved (filter): <strong>{totalApproved}</strong>
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
        <p>No outward records found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
              <th style={th}>Dispatch Date</th>
              <th style={th}>Finished Goods</th>
              <th style={th}>Quantity</th>
              <th style={th}>Destination</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={td}>{it.dispatch_date}</td>
                <td style={td}>{describeFg(it.finished_goods_id)}</td>
                <td style={td}>{it.quantity}</td>
                <td style={td}>{it.destination}</td>
                <td style={td}>
                  <StatusBadge status={it.status} />
                </td>
                <td style={td}>
                  {it.status === 'PENDING' && canApprove && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        disabled={actionId === it.id}
                        onClick={() => handleAction(it.id, 'approve')}
                        style={btn('#2e7d32')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={actionId === it.id}
                        onClick={() => handleAction(it.id, 'reject')}
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

export default FinishedGoodsOutwardListPage;
