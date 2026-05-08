import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import inwardService, { InwardRecord } from '../services/inward.service';
import authService from '../services/auth.service';

const STATUSES = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];

const APPROVER_ROLES = ['ADMIN', 'STORE_MANAGER'];

const InventoryInwardListPage: React.FC = () => {
  const [records, setRecords] = useState<InwardRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const user = authService.getCurrentUser();
  const userRoles: string[] = user?.roles || [];
  const canApprove = APPROVER_ROLES.some((r) => userRoles.includes(r));

  const reload = () => {
    setLoading(true);
    setError(null);
    inwardService
      .list(statusFilter !== 'ALL' ? { status: statusFilter } : {})
      .then(setRecords)
      .catch((err) =>
        setError(err?.response?.data?.detail || 'Failed to load inward requests.'),
      )
      .finally(() => setLoading(false));
  };

  useEffect(reload, [statusFilter]);

  const handleApprove = async (id: string) => {
    setActionError(null);
    try {
      await inwardService.approve(id);
      reload();
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Approval failed.');
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Reason for rejection (optional):') || undefined;
    setActionError(null);
    try {
      await inwardService.reject(id, reason);
      reload();
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Rejection failed.');
    }
  };

  const total = useMemo(
    () => records.reduce((sum, r) => sum + Number(r.quantity_received || 0), 0),
    [records],
  );

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
        <h2 style={{ margin: 0 }}>Inventory Inward</h2>
        <Link
          to="/inventory-inward/new"
          style={{
            background: '#1976d2',
            color: '#fff',
            padding: '8px 14px',
            borderRadius: 4,
            textDecoration: 'none',
          }}
        >
          + New Request
        </Link>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: 8 }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All statuses' : s}
            </option>
          ))}
        </select>
        <span style={{ alignSelf: 'center', color: '#666' }}>
          {records.length} record(s){records.length > 0 && `, total received: ${total.toFixed(2)}`}
        </span>
      </div>

      {actionError && (
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
          {actionError}
        </div>
      )}

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: '#a40000' }}>{error}</p>}

      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                <th style={th}>Receipt date</th>
                <th style={th}>Paper roll</th>
                <th style={th}>Supplier</th>
                <th style={th}>PO ref</th>
                <th style={th}>Quantity</th>
                <th style={th}>Status</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{r.receipt_date}</td>
                  <td style={td}>
                    <code style={{ fontSize: 12 }}>{r.paper_roll_id.slice(0, 8)}...</code>
                  </td>
                  <td style={td}>{r.supplier}</td>
                  <td style={td}>{r.purchase_reference}</td>
                  <td style={td}>
                    {r.quantity_received} {r.unit}
                  </td>
                  <td style={td}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td style={td}>
                    {r.status === 'PENDING' && canApprove && (
                      <>
                        <button
                          onClick={() => handleApprove(r.id)}
                          style={btnApprove}
                          type="button"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(r.id)}
                          style={btnReject}
                          type="button"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...td, textAlign: 'center', color: '#666' }}>
                    No records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, { bg: string; fg: string }> = {
    PENDING: { bg: '#fff8e1', fg: '#a06800' },
    APPROVED: { bg: '#e8f5e9', fg: '#1b5e20' },
    REJECTED: { bg: '#fde7e7', fg: '#a40000' },
  };
  const c = colors[status] || { bg: '#eee', fg: '#333' };
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 12,
        background: c.bg,
        color: c.fg,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  );
};

const th: React.CSSProperties = { padding: 10, fontWeight: 600 };
const td: React.CSSProperties = { padding: 10 };
const btnApprove: React.CSSProperties = {
  marginRight: 8,
  padding: '4px 10px',
  background: '#2e7d32',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};
const btnReject: React.CSSProperties = {
  padding: '4px 10px',
  background: '#c62828',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};

export default InventoryInwardListPage;
