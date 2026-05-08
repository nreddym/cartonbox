import React, { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import finishedGoodsService, {
  CreateOutwardPayload,
  FinishedGoodsStockRow,
} from '../services/finishedGoods.service';

const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

const FinishedGoodsOutwardFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const prefillFgId = params.get('finished_goods_id') || '';

  const [stock, setStock] = useState<FinishedGoodsStockRow[]>([]);
  const [form, setForm] = useState({
    finished_goods_id: prefillFgId,
    quantity: '',
    destination: '',
    dispatch_date: todayIso(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    finishedGoodsService
      .listStock()
      .then((data) => {
        setStock(data);
        if (!prefillFgId && data.length > 0) {
          setForm((prev) => ({ ...prev, finished_goods_id: data[0].finished_goods_id }));
        }
      })
      .catch((err) =>
        setError(err?.response?.data?.detail || 'Failed to load finished goods.'),
      );
  }, [prefillFgId]);

  const update = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const selected = stock.find((s) => s.finished_goods_id === form.finished_goods_id);
  const qty = Number(form.quantity) || 0;
  const exceedsBalance = !!selected && qty > selected.current_balance;

  const validate = (): string | null => {
    if (!form.finished_goods_id) return 'Finished goods is required';
    if (!Number.isInteger(qty) || qty <= 0)
      return 'Quantity must be a positive integer';
    if (exceedsBalance)
      return `Quantity exceeds current balance (${selected?.current_balance})`;
    if (!form.destination.trim()) return 'Destination is required';
    if (!form.dispatch_date) return 'Dispatch date is required';
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
      const payload: CreateOutwardPayload = {
        finished_goods_id: form.finished_goods_id,
        quantity: qty,
        destination: form.destination.trim(),
        dispatch_date: form.dispatch_date,
      };
      await finishedGoodsService.createOutward(payload);
      navigate('/fg-outward');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>New Finished Goods Outward</h2>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Finished goods">
          <select
            value={form.finished_goods_id}
            onChange={(e) => update('finished_goods_id', e.target.value)}
            disabled={submitting}
            style={input}
          >
            <option value="">-- Select --</option>
            {stock.map((s) => (
              <option key={s.finished_goods_id} value={s.finished_goods_id}>
                {s.box_type} - {s.box_length}x{s.box_width}x{s.box_height} ({s.ply_type}) -
                Stock: {s.current_balance} {s.unit || ''}
              </option>
            ))}
          </select>
          {selected && (
            <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
              Available balance:{' '}
              <strong>
                {selected.current_balance} {selected.unit || ''}
              </strong>
            </div>
          )}
        </Field>
        <Field label="Quantity">
          <input
            type="number"
            min={1}
            step={1}
            value={form.quantity}
            onChange={(e) => update('quantity', e.target.value)}
            disabled={submitting}
            style={input}
          />
        </Field>
        <Field label="Destination">
          <input
            type="text"
            value={form.destination}
            onChange={(e) => update('destination', e.target.value)}
            disabled={submitting}
            style={input}
            placeholder="e.g. Customer name / location"
          />
        </Field>
        <Field label="Dispatch date">
          <input
            type="date"
            value={form.dispatch_date}
            onChange={(e) => update('dispatch_date', e.target.value)}
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
            onClick={() => navigate('/fg-outward')}
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

export default FinishedGoodsOutwardFormPage;
