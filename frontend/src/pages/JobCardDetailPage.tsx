import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import jobCardService, { JobCard } from '../services/jobCard.service';
import authService from '../services/auth.service';

const APPROVER_ROLES = ['ADMIN', 'PRODUCTION_MANAGER'];
const SUPERVISOR_ROLES = ['ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR'];
const CANCEL_ROLES = ['ADMIN', 'PRODUCTION_MANAGER'];

const JobCardDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [jc, setJc] = useState<JobCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = authService.getCurrentUser();
  const userRoles: string[] = user?.roles || [];
  const canApprove = userRoles.some((r) => APPROVER_ROLES.includes(r));
  const canSupervise = userRoles.some((r) => SUPERVISOR_ROLES.includes(r));
  const canCancel = userRoles.some((r) => CANCEL_ROLES.includes(r));

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await jobCardService.get(id);
      setJc(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load job card.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAction = async (action: 'approve' | 'reject' | 'cancel' | 'start' | 'recalc') => {
    if (!id) return;
    if (action === 'reject') {
      const ok = window.confirm('Reject this job card? This cannot be undone.');
      if (!ok) return;
    }
    if (action === 'cancel') {
      const ok = window.confirm(
        'Cancel this job card? It will be marked CANCELLED and cannot be reopened. Use this only for mistakenly-created job cards before production starts.',
      );
      if (!ok) return;
    }
    setActionLoading(true);
    setError(null);
    try {
      if (action === 'approve') await jobCardService.approve(id);
      else if (action === 'reject') await jobCardService.reject(id);
      else if (action === 'cancel') await jobCardService.cancel(id);
      else if (action === 'start') await jobCardService.start(id);
      else await jobCardService.calculateMaterials(id);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Failed to ${action}.`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error && !jc)
    return (
      <div>
        <p style={{ color: '#a40000' }}>{error}</p>
        <Link to="/job-cards">← Back to job cards</Link>
      </div>
    );
  if (!jc) return <p>Not found.</p>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/job-cards">← Back to job cards</Link>
      </div>

      <h2 style={{ marginBottom: 4 }}>{jc.job_card_number}</h2>
      <p style={{ marginTop: 0, color: '#555' }}>
        {jc.box_type} — Status: <strong>{jc.status}</strong>
      </p>

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

      <section style={card}>
        <h3 style={h3}>Specifications</h3>
        <Row k="Dimensions (mm)">
          {jc.box_length} × {jc.box_width} × {jc.box_height}
        </Row>
        <Row k="Ply">
          {jc.ply_type} ({jc.ply_count})
        </Row>
        <Row k="Quantity to produce">{jc.quantity_to_produce}</Row>
        <Row k="Planned start">{jc.planned_start_date}</Row>
        <Row k="Planned end">{jc.planned_end_date}</Row>
        <Row k="Actual start">{jc.actual_start_date || '-'}</Row>
        <Row k="Actual end">{jc.actual_end_date || '-'}</Row>
      </section>

      <section style={card}>
        <h3 style={h3}>Material Requirements</h3>
        <Row k="Calculated paper area (m²)">
          {jc.calculated_paper_area != null ? jc.calculated_paper_area.toFixed(4) : '-'}
        </Row>
        <Row k="Required paper quantity (kg)">
          {jc.required_paper_quantity != null
            ? jc.required_paper_quantity.toFixed(2)
            : '-'}
        </Row>
        {(jc.status === 'CREATED' || jc.status === 'APPROVED') && (
          <button
            type="button"
            onClick={() => handleAction('recalc')}
            disabled={actionLoading}
            style={btn('#1976d2')}
          >
            Recalculate
          </button>
        )}
      </section>

      <section style={card}>
        <h3 style={h3}>Actions</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {jc.status === 'CREATED' && canApprove && (
            <button
              type="button"
              onClick={() => handleAction('approve')}
              disabled={actionLoading}
              style={btn('#2e7d32')}
            >
              Approve
            </button>
          )}
          {jc.status === 'CREATED' && canApprove && (
            <button
              type="button"
              onClick={() => handleAction('reject')}
              disabled={actionLoading}
              style={btn('#c62828')}
            >
              Reject
            </button>
          )}
          {(jc.status === 'CREATED' || jc.status === 'APPROVED') && canCancel && (
            <button
              type="button"
              onClick={() => handleAction('cancel')}
              disabled={actionLoading}
              style={btn('#616161')}
            >
              Cancel
            </button>
          )}
          {jc.status === 'APPROVED' && canSupervise && (
            <button
              type="button"
              onClick={() => handleAction('start')}
              disabled={actionLoading}
              style={btn('#1565c0')}
            >
              Start production
            </button>
          )}
          {jc.status === 'IN_PRODUCTION' && canSupervise && (
            <button
              type="button"
              onClick={() => navigate(`/job-cards/${jc.id}/complete`)}
              disabled={actionLoading}
              style={btn('#6a1b9a')}
            >
              Complete production
            </button>
          )}
          {jc.status === 'APPROVED' && (
            <Link
              to={`/material-issues/new?job_card_id=${jc.id}`}
              style={{ ...btn('#00796b'), textDecoration: 'none' }}
            >
              Request material issue
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

const Row: React.FC<{ k: string; children: React.ReactNode }> = ({ k, children }) => (
  <div style={{ display: 'flex', padding: '4px 0', gap: 12 }}>
    <div style={{ minWidth: 220, color: '#555' }}>{k}</div>
    <div>{children}</div>
  </div>
);

const card: React.CSSProperties = {
  background: '#fafafa',
  border: '1px solid #eee',
  borderRadius: 4,
  padding: 16,
  marginBottom: 16,
};
const h3: React.CSSProperties = { marginTop: 0 };
const btn = (bg: string): React.CSSProperties => ({
  padding: '8px 14px',
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
});

export default JobCardDetailPage;
