import React, { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import jobCardService, { JobCard } from '../services/jobCard.service';
import materialService, { PaperRoll } from '../services/material.service';
import materialIssueService, {
  CreateMaterialIssuePayload,
} from '../services/materialIssue.service';

const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

const MaterialIssueFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const prefillJobCardId = params.get('job_card_id') || '';

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [rolls, setRolls] = useState<PaperRoll[]>([]);
  const [form, setForm] = useState({
    job_card_id: prefillJobCardId,
    paper_roll_id: '',
    requested_quantity: '',
    unit: 'kg',
    issue_date: todayIso(),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([jobCardService.list(), materialService.list()])
      .then(([jcs, rs]) => {
        // Only allow APPROVED or IN_PRODUCTION job cards for issuing
        const eligible = jcs.filter(
          (j) => j.status === 'APPROVED' || j.status === 'IN_PRODUCTION',
        );
        setJobCards(eligible);
        setRolls(rs);
        setForm((prev) => ({
          ...prev,
          job_card_id: prev.job_card_id || (eligible[0]?.id ?? ''),
          paper_roll_id: prev.paper_roll_id || (rs[0]?.id ?? ''),
        }));
      })
      .catch((err) =>
        setError(err?.response?.data?.detail || 'Failed to load reference data.'),
      );
  }, []);

  const update = (k: keyof typeof form, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const selectedJobCard = jobCards.find((j) => j.id === form.job_card_id);
  const selectedRoll = rolls.find((r) => r.id === form.paper_roll_id);

  const validate = (): string | null => {
    if (!form.job_card_id) return 'Job card is required';
    if (!form.paper_roll_id) return 'Paper roll is required';
    const req = Number(form.requested_quantity);
    if (!form.requested_quantity || isNaN(req) || req <= 0)
      return 'Requested quantity must be a positive number';
    if (!form.unit.trim()) return 'Unit is required';
    if (!form.issue_date) return 'Issue date is required';
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
      const payload: CreateMaterialIssuePayload = {
        job_card_id: form.job_card_id,
        paper_roll_id: form.paper_roll_id,
        requested_quantity: Number(form.requested_quantity),
        unit: form.unit,
        issue_date: form.issue_date,
      };
      await materialIssueService.create(payload);
      navigate('/material-issues');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h2>New Material Issue</h2>
      <form onSubmit={handleSubmit} noValidate>
        <Field label="Job card">
          <select
            value={form.job_card_id}
            onChange={(e) => update('job_card_id', e.target.value)}
            disabled={submitting}
            style={input}
          >
            <option value="">-- Select --</option>
            {jobCards.map((j) => (
              <option key={j.id} value={j.id}>
                {j.job_card_number} - {j.box_type} ({j.status})
              </option>
            ))}
          </select>
          {selectedJobCard && selectedJobCard.required_paper_quantity != null && (
            <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
              Required paper for this job:{' '}
              <strong>{selectedJobCard.required_paper_quantity.toFixed(2)} kg</strong>
            </div>
          )}
        </Field>

        <Field label="Paper roll">
          <select
            value={form.paper_roll_id}
            onChange={(e) => update('paper_roll_id', e.target.value)}
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
          {selectedRoll && (
            <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
              Width: {selectedRoll.roll_width}, Supplier: {selectedRoll.supplier}
            </div>
          )}
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Requested quantity">
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.requested_quantity}
              onChange={(e) => update('requested_quantity', e.target.value)}
              disabled={submitting}
              style={input}
            />
          </Field>
          <div style={{ alignSelf: 'end', fontSize: 12, color: '#666', paddingBottom: 8 }}>
            Issued quantity will be entered by the Store Manager at approval time.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
          <Field label="Issue date">
            <input
              type="date"
              value={form.issue_date}
              onChange={(e) => update('issue_date', e.target.value)}
              disabled={submitting}
              style={input}
            />
          </Field>
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
            onClick={() => navigate('/material-issues')}
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

export default MaterialIssueFormPage;
