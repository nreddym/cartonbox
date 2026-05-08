import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jobCardService, { CreateJobCardPayload } from '../services/jobCard.service';

const PLY_TYPES = ['3-ply', '5-ply', '7-ply', '9-ply'];
const BOX_TYPES = ['Regular Slotted', 'Half Slotted', 'Full Overlap', 'Die-cut'];

const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

const addDaysIso = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

const JobCardFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    job_card_number: '',
    box_type: BOX_TYPES[0],
    box_length: '',
    box_width: '',
    box_height: '',
    ply_type: PLY_TYPES[0],
    ply_count: '3',
    quantity_to_produce: '',
    planned_start_date: todayIso(),
    planned_end_date: addDaysIso(7),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const validate = (): string | null => {
    if (!form.job_card_number.trim()) return 'Job card number is required';
    if (!form.box_type.trim()) return 'Box type is required';
    if (Number(form.box_length) <= 0) return 'Box length must be > 0';
    if (Number(form.box_width) <= 0) return 'Box width must be > 0';
    if (Number(form.box_height) <= 0) return 'Box height must be > 0';
    if (!form.ply_type.trim()) return 'Ply type is required';
    if (!Number.isInteger(Number(form.ply_count)) || Number(form.ply_count) <= 0)
      return 'Ply count must be a positive integer';
    if (
      !Number.isInteger(Number(form.quantity_to_produce)) ||
      Number(form.quantity_to_produce) <= 0
    )
      return 'Quantity must be a positive integer';
    if (!form.planned_start_date || !form.planned_end_date)
      return 'Planned dates are required';
    if (form.planned_end_date < form.planned_start_date)
      return 'End date must be on or after start date';
    return null;
  };

  // Live preview of paper area: 2*(L*W + W*H + L*H) * ply_count, in mm² → m²
  const previewArea = (() => {
    const L = Number(form.box_length);
    const W = Number(form.box_width);
    const H = Number(form.box_height);
    const ply = Number(form.ply_count);
    const qty = Number(form.quantity_to_produce);
    if (L <= 0 || W <= 0 || H <= 0 || ply <= 0 || qty <= 0) return null;
    const surfacePerBoxMm2 = 2 * (L * W + W * H + L * H) * ply;
    const totalM2 = (surfacePerBoxMm2 * qty) / 1_000_000;
    return totalM2;
  })();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateJobCardPayload = {
        job_card_number: form.job_card_number.trim(),
        box_type: form.box_type.trim(),
        box_length: Number(form.box_length),
        box_width: Number(form.box_width),
        box_height: Number(form.box_height),
        ply_type: form.ply_type.trim(),
        ply_count: Number(form.ply_count),
        quantity_to_produce: Number(form.quantity_to_produce),
        planned_start_date: form.planned_start_date,
        planned_end_date: form.planned_end_date,
      };
      const created = await jobCardService.create(payload);
      try {
        await jobCardService.calculateMaterials(created.id);
      } catch {
        // ignore — material calc is best-effort
      }
      navigate(`/job-cards/${created.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <h2>New Job Card</h2>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Job card number">
          <input
            type="text"
            value={form.job_card_number}
            onChange={(e) => update('job_card_number', e.target.value)}
            disabled={submitting}
            style={input}
          />
        </Field>
        <Field label="Box type">
          <select
            value={form.box_type}
            onChange={(e) => update('box_type', e.target.value)}
            disabled={submitting}
            style={input}
          >
            {BOX_TYPES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Length (mm)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.box_length}
              onChange={(e) => update('box_length', e.target.value)}
              disabled={submitting}
              style={input}
            />
          </Field>
          <Field label="Width (mm)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.box_width}
              onChange={(e) => update('box_width', e.target.value)}
              disabled={submitting}
              style={input}
            />
          </Field>
          <Field label="Height (mm)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.box_height}
              onChange={(e) => update('box_height', e.target.value)}
              disabled={submitting}
              style={input}
            />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Ply type">
            <select
              value={form.ply_type}
              onChange={(e) => update('ply_type', e.target.value)}
              disabled={submitting}
              style={input}
            >
              {PLY_TYPES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ply count">
            <input
              type="number"
              min={1}
              step={1}
              value={form.ply_count}
              onChange={(e) => update('ply_count', e.target.value)}
              disabled={submitting}
              style={input}
            />
          </Field>
        </div>
        <Field label="Quantity to produce">
          <input
            type="number"
            min={1}
            step={1}
            value={form.quantity_to_produce}
            onChange={(e) => update('quantity_to_produce', e.target.value)}
            disabled={submitting}
            style={input}
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Planned start">
            <input
              type="date"
              value={form.planned_start_date}
              onChange={(e) => update('planned_start_date', e.target.value)}
              disabled={submitting}
              style={input}
            />
          </Field>
          <Field label="Planned end">
            <input
              type="date"
              value={form.planned_end_date}
              onChange={(e) => update('planned_end_date', e.target.value)}
              disabled={submitting}
              style={input}
            />
          </Field>
        </div>

        {previewArea != null && (
          <div
            style={{
              background: '#e3f2fd',
              padding: 12,
              borderRadius: 4,
              marginBottom: 12,
            }}
          >
            <strong>Estimated paper area:</strong> {previewArea.toFixed(2)} m²
            <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
              Final required quantity (kg) is computed by the server based on GSM after
              creation.
            </div>
          </div>
        )}

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
              background: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Saving...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/job-cards')}
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

export default JobCardFormPage;
