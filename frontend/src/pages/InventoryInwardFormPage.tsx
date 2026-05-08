import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import inwardService, { CreateInwardPayload } from '../services/inward.service';
import materialService, { PaperRoll } from '../services/material.service';

const todayIso = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

interface FormState {
  paper_roll_id: string;
  supplier: string;
  purchase_reference: string;
  quantity_received: string;
  unit: string;
  receipt_date: string;
}

const InventoryInwardFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [rolls, setRolls] = useState<PaperRoll[]>([]);
  const [form, setForm] = useState<FormState>({
    paper_roll_id: '',
    supplier: '',
    purchase_reference: '',
    quantity_received: '',
    unit: 'kg',
    receipt_date: todayIso(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    materialService
      .list()
      .then((data) => {
        setRolls(data);
        if (data.length > 0) {
          setForm((prev) => ({
            ...prev,
            paper_roll_id: data[0].id,
            supplier: data[0].supplier,
          }));
        }
      })
      .catch((err) =>
        setError(err?.response?.data?.detail || 'Failed to load paper rolls.'),
      );
  }, []);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleRollChange = (id: string) => {
    update('paper_roll_id', id);
    const r = rolls.find((x) => x.id === id);
    if (r) update('supplier', r.supplier);
  };

  const validate = (): string | null => {
    if (!form.paper_roll_id) return 'Paper roll is required';
    if (!form.supplier.trim()) return 'Supplier is required';
    if (!form.purchase_reference.trim()) return 'Purchase reference is required';
    const qty = Number(form.quantity_received);
    if (!form.quantity_received || isNaN(qty) || qty <= 0)
      return 'Quantity must be a positive number';
    if (!form.unit.trim()) return 'Unit is required';
    if (!form.receipt_date) return 'Receipt date is required';
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
      const payload: CreateInwardPayload = {
        paper_roll_id: form.paper_roll_id,
        supplier: form.supplier.trim(),
        purchase_reference: form.purchase_reference.trim(),
        quantity_received: Number(form.quantity_received),
        unit: form.unit,
        receipt_date: form.receipt_date,
      };
      await inwardService.create(payload);
      navigate('/inventory-inward');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>New Inward Request</h2>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Paper roll">
          <select
            value={form.paper_roll_id}
            onChange={(e) => handleRollChange(e.target.value)}
            disabled={submitting}
            style={input}
          >
            <option value="">-- Select --</option>
            {rolls.map((r) => (
              <option key={r.id} value={r.id}>
                {r.material_code} - {r.paper_type} {r.gsm}gsm
              </option>
            ))}
          </select>
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
        <Field label="Purchase reference">
          <input
            type="text"
            value={form.purchase_reference}
            onChange={(e) => update('purchase_reference', e.target.value)}
            disabled={submitting}
            style={input}
          />
        </Field>
        <Field label="Quantity received">
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.quantity_received}
            onChange={(e) => update('quantity_received', e.target.value)}
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
            <option value="kg">kg</option>
            <option value="meters">meters</option>
            <option value="rolls">rolls</option>
          </select>
        </Field>
        <Field label="Receipt date">
          <input
            type="date"
            value={form.receipt_date}
            onChange={(e) => update('receipt_date', e.target.value)}
            disabled={submitting}
            style={input}
          />
        </Field>

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
            {submitting ? 'Saving...' : 'Submit'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/inventory-inward')}
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

export default InventoryInwardFormPage;
