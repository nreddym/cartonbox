import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import jobCardService, { JobCard } from '../services/jobCard.service';
import productionService, {
  CompleteProductionPayload,
} from '../services/production.service';

const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

const ProductionCompletePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [jc, setJc] = useState<JobCard | null>(null);
  const [form, setForm] = useState({
    actual_quantity_produced: '',
    rejected_quantity: '0',
    wastage_quantity: '',
    actual_end_date: todayIso(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    jobCardService
      .get(id)
      .then(setJc)
      .catch((err) =>
        setError(err?.response?.data?.detail || 'Failed to load job card.'),
      );
  }, [id]);

  const update = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const produced = Number(form.actual_quantity_produced) || 0;
  const rejected = Number(form.rejected_quantity) || 0;
  const net = Math.max(0, produced - rejected);

  const validate = (): string | null => {
    if (
      !Number.isInteger(produced) ||
      produced < 0 ||
      !form.actual_quantity_produced
    )
      return 'Actual quantity must be a non-negative integer';
    if (!Number.isInteger(rejected) || rejected < 0)
      return 'Rejected quantity must be a non-negative integer';
    if (rejected > produced) return 'Rejected cannot exceed produced';
    if (form.wastage_quantity !== '' && Number(form.wastage_quantity) < 0)
      return 'Wastage quantity must be ≥ 0';
    if (!form.actual_end_date) return 'Actual end date is required';
    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;
    setError(null);
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    try {
      const payload: CompleteProductionPayload = {
        actual_quantity_produced: produced,
        rejected_quantity: rejected,
        wastage_quantity:
          form.wastage_quantity === '' ? null : Number(form.wastage_quantity),
        actual_end_date: form.actual_end_date,
      };
      await productionService.complete(id, payload);
      navigate(`/job-cards/${id}`);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>Complete Production</h2>
      {jc && (
        <div
          style={{
            background: '#f4f4f4',
            padding: 12,
            borderRadius: 4,
            marginBottom: 16,
          }}
        >
          <div>
            <strong>Job card:</strong> {jc.job_card_number}
          </div>
          <div>
            <strong>Box:</strong> {jc.box_type} ({jc.box_length}×{jc.box_width}×
            {jc.box_height})
          </div>
          <div>
            <strong>Planned quantity:</strong> {jc.quantity_to_produce}
          </div>
          <div>
            <strong>Status:</strong> {jc.status}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Field label="Actual quantity produced">
          <input
            type="number"
            min={0}
            step={1}
            value={form.actual_quantity_produced}
            onChange={(e) => update('actual_quantity_produced', e.target.value)}
            disabled={submitting}
            style={input}
          />
        </Field>
        <Field label="Rejected quantity">
          <input
            type="number"
            min={0}
            step={1}
            value={form.rejected_quantity}
            onChange={(e) => update('rejected_quantity', e.target.value)}
            disabled={submitting}
            style={input}
          />
        </Field>
        <Field label="Wastage quantity (kg, optional)">
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.wastage_quantity}
            onChange={(e) => update('wastage_quantity', e.target.value)}
            disabled={submitting}
            style={input}
          />
        </Field>
        <Field label="Actual end date">
          <input
            type="date"
            value={form.actual_end_date}
            onChange={(e) => update('actual_end_date', e.target.value)}
            disabled={submitting}
            style={input}
          />
        </Field>

        <div
          style={{
            background: '#e8f5e9',
            padding: 12,
            borderRadius: 4,
            marginBottom: 12,
          }}
        >
          <strong>Net finished goods:</strong> {net}{' '}
          <span style={{ color: '#555' }}>(produced - rejected)</span>
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

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '10px 16px',
              background: '#6a1b9a',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Saving...' : 'Confirm completion'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/job-cards/${id}`)}
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

export default ProductionCompletePage;
