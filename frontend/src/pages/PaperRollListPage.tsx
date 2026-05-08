import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import materialService, { PaperRoll } from '../services/material.service';
import StockLevel from '../components/StockLevel';

const PaperRollListPage: React.FC = () => {
  const [rolls, setRolls] = useState<PaperRoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [paperTypeFilter, setPaperTypeFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  useEffect(() => {
    materialService
      .list()
      .then(setRolls)
      .catch((err) =>
        setError(err?.response?.data?.detail || 'Failed to load paper rolls.'),
      )
      .finally(() => setLoading(false));
  }, []);

  const paperTypes = useMemo(
    () => Array.from(new Set(rolls.map((r) => r.paper_type))).sort(),
    [rolls],
  );
  const suppliers = useMemo(
    () => Array.from(new Set(rolls.map((r) => r.supplier))).sort(),
    [rolls],
  );

  const filtered = rolls.filter((r) => {
    if (paperTypeFilter && r.paper_type !== paperTypeFilter) return false;
    if (supplierFilter && r.supplier !== supplierFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !r.material_code.toLowerCase().includes(s) &&
        !r.supplier.toLowerCase().includes(s) &&
        !r.paper_type.toLowerCase().includes(s)
      ) {
        return false;
      }
    }
    return true;
  });

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
        <h2 style={{ margin: 0 }}>Paper Rolls</h2>
        <Link
          to="/paper-rolls/new"
          style={{
            background: '#1976d2',
            color: '#fff',
            padding: '8px 14px',
            borderRadius: 4,
            textDecoration: 'none',
          }}
        >
          + New Paper Roll
        </Link>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Search by code, type, supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 240px', padding: 8 }}
        />
        <select
          value={paperTypeFilter}
          onChange={(e) => setPaperTypeFilter(e.target.value)}
          style={{ padding: 8 }}
        >
          <option value="">All paper types</option>
          {paperTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          style={{ padding: 8 }}
        >
          <option value="">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: '#a40000' }}>{error}</p>}

      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                <th style={th}>Code</th>
                <th style={th}>Type</th>
                <th style={th}>GSM</th>
                <th style={th}>Width</th>
                <th style={th}>Supplier</th>
                <th style={th}>Stock</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{r.material_code}</td>
                  <td style={td}>{r.paper_type}</td>
                  <td style={td}>{r.gsm}</td>
                  <td style={td}>{r.roll_width}</td>
                  <td style={td}>{r.supplier}</td>
                  <td style={td}>
                    <StockLevel paperRollId={r.id} />
                  </td>
                  <td style={td}>
                    <Link to={`/paper-rolls/${r.id}/edit`}>Edit</Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...td, textAlign: 'center', color: '#666' }}>
                    No paper rolls match the current filters.
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

const th: React.CSSProperties = { padding: 10, fontWeight: 600 };
const td: React.CSSProperties = { padding: 10 };

export default PaperRollListPage;
