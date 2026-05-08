import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import materialService, {
  CreatePaperRollPayload,
  UpdatePaperRollPayload,
} from '../services/material.service';

interface PaperRollFormPageProps {
  mode: 'create' | 'edit';
}

interface FormState {
  material_code: string;
  paper_type: string;
  gsm: string;
  roll_width: string;
  roll_length: string;
  roll_weight: string;
  supplier: string;
  opening_stock: string;
  unit: string;
}

const EMPTY: FormState = {
  material_code: '',
  paper_type: 'Kraft',
  gsm: '',
  roll_width: '',
  roll_length: '',
  roll_weight: '',
  supplier: '',
  opening_stock: '0',
  unit: 'kg',
};

const PAPER_TYPES = ['Kraft', 'Duplex', 'Corrugated', 'Cardboard', 'Testliner'];
const UNITS = ['kg', 'meters', 'rolls'];

const PaperRollFormPage: React.FC<PaperRollFormPageProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    materialService
      .get(id)
      .then((r) => {
        setForm({
          material_code: r.material_code,
          paper_type: r.paper_type,
          gsm: String(r.gsm),
          roll_width: String(r.roll_width),
          roll_length: r.roll_length != null ? String(r.roll_length) : '',
          roll_weight: r.roll_weight != null ? String(r.roll_weight) : '',
          supplier: r.supplier,
          opening_stock: '0',
          unit: 'kg',
        });
      })
      .catch((err) =>
        setError(err?.response?.data?.detail || 'Failed to load paper roll.'),
      )
      .finally(() => setLoading(false));
  }, [mode, id]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): string | null => {
    if (mode === 'create' && !form.material_code.trim())
      return 'Material code is required';
    if (!form.paper_type) return 'Paper type is required';
    if (!form.gsm || Number(form.gsm) <= 0)
      return 'GSM must be a positive number';
    if (!form.roll_width || Number(form.roll_width) <= 0)
      return 'Roll width must be a positive number';
    if (!form.supplier.trim()) return 'Supplier is required';
    if (mode === 'create' && form.opening_stock && Number(form.opening_stock) < 0)
      return 'Opening stock cannot be negative';
    return null;
  };

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
      if (mode === 'create') {
        const payload: CreatePaperRollPayload = {
          material_code: form.material_code.trim(),
          paper_type: form.paper_type,
          gsm: Number(form.gsm),
          roll_width: Number(form.roll_width),
          roll_length: form.roll_length ? Number(form.roll_length) : null,
          roll_weight: form.roll_weight ? Number(form.roll_weight) : null,
          supplier: form.supplier.trim(),
          opening_stock: Number(form.opening_stock || 0),
          unit: form.unit,
        };
        await materialService.create(payload);
      } else if (id) {
        const payload: UpdatePaperRollPayload = {
          paper_type: form.paper_type,
          gsm: Number(form.gsm),
          roll_width: Number(form.roll_width),
          roll_length: form.roll_length ? Number(form.roll_length) : null,
          roll_weight: form.roll_weight ? Number(form.roll_weight) : null,
          supplier: form.supplier.trim(),
        };
        await materialService.update(id, payload);
      }
      navigate('/paper-rolls');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>{mode === 'create' ? 'New Paper Roll' : 'Edit Paper Roll'}</h2>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Material code">
          <input
            type="text"
            value={form.material_code}
            onChange={(e) => update('material_code', e.target.value)}
            disabled={mode === 'edit' || submitting}
            style={input}
          />
        </Field>
        <Field label="Paper type">
          <select
            value={form.paper_type}
            onChange={(e) => update('paper_type', e.target.value)}
            disabled={submitting}
            style={input}
          >
            {PAPER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="GSM">
          <input
            type="number"
            min={1}
            value={form.gsm}
            onChange={(e) => update('gsm', e.target.value)}
            disabled={submitting}
            style={input}
          />
        </Field>
        <Field label="Roll width">
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.roll_width}
            onChange={(e) => update('roll_width', e.target.value)}
            disabled={submitting}
            style={input}
          />
        </Field>
        <Field label="Roll length (optional)">
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.roll_length}
            onChange={(e) => update('roll_length', e.target.value)}
            disabled={submitting}
            style={input}
          />
        </Field>
        <Field label="Roll weight (optional)">
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.roll_weight}
            onChange={(e) => update('roll_weight', e.target.value)}
            disabled={submitting}
            style={input}
          />
        </Field>
        <Field label="Supplier">
          <input
            type="text"
            value={form.supplier}
            onChange={(e) => update('supplier', e.target.value)}
            disabled={submitting}
            style={input}
          />
        </Field>
        {mode === 'create' && (
          <>
            <Field label="Opening stock">
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.opening_stock}
                onChange={(e) => update('opening_stock', e.target.value)}
                disabled={submitting}
                style={input}
              />
            </Field>
            <Field label="Unit">
              <select
                value={form.unit}
                onChange={(e) => update('unit', e.target.value)}
                disabled={submitting}
                style={input}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
          </>
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
            {submitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/paper-rolls')}
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

export default PaperRollFormPage;
