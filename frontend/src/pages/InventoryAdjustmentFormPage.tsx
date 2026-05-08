import React, { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adjustmentService, {
  CreateAdjustmentPayload,
  InventoryType,
} from '../services/adjustment.service';
import materialService, { PaperRoll } from '../services/material.service';
import finishedGoodsService, {
  FinishedGoodsStockRow,
} from '../services/finishedGoods.service';

const InventoryAdjustmentFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [rolls, setRolls] = useState<PaperRoll[]>([]);
  const [fgs, setFgs] = useState<FinishedGoodsStockRow[]>([]);
  const [form, setForm] = useState({
    inventory_type: 'RAW_MATERIAL' as InventoryType,
    item_id: '',
    adjustment_quantity: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([materialService.list(), finishedGoodsService.listStock()])
      .then(([rs, fs]) => {
        setRolls(rs);
        setFgs(fs);
        setForm((prev) => ({
          ...prev,
          item_id: rs[0]?.id ?? '',
        }));
      })
      .catch((err) =>
        setError(err?.response?.data?.detail || 'Failed to load reference data.'),
      );
  }, []);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleTypeChange = (t: InventoryType) => {
    const firstId =
      t === 'RAW_MATERIAL' ? rolls[0]?.id ?? '' : fgs[0]?.finished_goods_id ?? '';
    setForm((prev) => ({ ...prev, inventory_type: t, item_id: firstId }));
  };

  const validate = (): string | null => {
    if (!form.inventory_type) return 'Inventory type is required';
    if (!form.item_id) return 'Item is required';
    const qty = Number(form.adjustment_quantity);
    if (!form.adjustment_quantity || isNaN(qty) || qty === 0)
      return 'Adjustment quantity must be a non-zero number';
    if (form.reason.trim().length < 10)
      return 'Reason must be at least 10 characters';
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
      const payload: CreateAdjustmentPayload = {
        inventory_type: form.inventory_type,
        item_id: form.item_id,
        adjustment_quantity: Number(form.adjustment_quantity),
        reason: form.reason.trim(),
      };
      await adjustmentService.create(payload);
      navigate('/adjustments');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>New Inventory Adjustment</h2>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Inventory type">
          <select
            value={form.inventory_type}
            onChange={(e) => handleTypeChange(e.target.value as InventoryType)}
            disabled={submitting}
            style={input}
          >
            <option value="RAW_MATERIAL">Raw Material</option>
            <option value="FINISHED_GOODS">Finished Goods</option>
          </select>
        </Field>

        <Field label="Item">
          <select
            value={form.item_id}
            onChange={(e) => update('item_id', e.target.value)}
            disabled={submitting}
            style={input}
          >
            <option value="">-- Select --</option>
            {form.inventory_type === 'RAW_MATERIAL'
              ? rolls.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.material_code} - {r.paper_type} {r.gsm}gsm
                  </option>
                ))
              : fgs.map((f) => (
                  <option key={f.finished_goods_id} value={f.finished_goods_id}>
                    {f.box_type} - {f.box_length}x{f.box_width}x{f.box_height} ({f.ply_type})
                  </option>
                ))}
          </select>
        </Field>

        <Field label="Adjustment quantity">
          <input
            type="number"
            step="0.01"
            value={form.adjustment_quantity}
            onChange={(e) => update('adjustment_quantity', e.target.value)}
            disabled={submitting}
            style={input}
            placeholder="Use negative for decreases"
          />
          <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
            Enter a positive number to increase stock or a negative number to decrease.
          </div>
        </Field>

        <Field label="Reason (min 10 characters)">
          <textarea
            value={form.reason}
            onChange={(e) => update('reason', e.target.value)}
            disabled={submitting}
            style={{ ...input, minHeight: 100, resize: 'vertical' }}
            placeholder="Detailed justification for the adjustment..."
          />
          <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
            {form.reason.trim().length} characters
          </div>
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
            onClick={() => navigate('/adjustments')}
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

export default InventoryAdjustmentFormPage;
