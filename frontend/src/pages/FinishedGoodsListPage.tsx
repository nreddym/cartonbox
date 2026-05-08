import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import finishedGoodsService, {
  FinishedGoodsStockRow,
} from '../services/finishedGoods.service';

const FinishedGoodsListPage: React.FC = () => {
  const [items, setItems] = useState<FinishedGoodsStockRow[]>([]);
  const [boxTypeFilter, setBoxTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await finishedGoodsService.listStock();
      setItems(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load finished goods stock.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const boxTypes = useMemo(
    () => Array.from(new Set(items.map((r) => r.box_type))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((r) => {
      if (boxTypeFilter && r.box_type !== boxTypeFilter) return false;
      if (
        q &&
        !`${r.box_type} ${r.ply_type}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [items, boxTypeFilter, search]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>Finished Goods Stock</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            to="/fg-outward"
            style={{
              padding: '8px 14px',
              background: '#fff',
              color: '#1976d2',
              border: '1px solid #1976d2',
              borderRadius: 4,
              textDecoration: 'none',
            }}
          >
            Outward Requests
          </Link>
          <Link
            to="/fg-outward/new"
            style={{
              padding: '8px 14px',
              background: '#1976d2',
              color: '#fff',
              borderRadius: 4,
              textDecoration: 'none',
            }}
          >
            + New Outward
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search box / ply type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: 8, flex: 1 }}
        />
        <select
          value={boxTypeFilter}
          onChange={(e) => setBoxTypeFilter(e.target.value)}
          style={{ padding: 8 }}
        >
          <option value="">All box types</option>
          {boxTypes.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
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

      {loading ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <p>No finished goods found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
              <th style={th}>Box Type</th>
              <th style={th}>Dimensions (LxWxH)</th>
              <th style={th}>Ply</th>
              <th style={th}>Produced</th>
              <th style={th}>Dispatched</th>
              <th style={th}>Current Balance</th>
              <th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.finished_goods_id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={td}>{r.box_type}</td>
                <td style={td}>
                  {r.box_length} x {r.box_width} x {r.box_height}
                </td>
                <td style={td}>{r.ply_type}</td>
                <td style={td}>{r.quantity_produced}</td>
                <td style={td}>{r.quantity_dispatched}</td>
                <td style={td}>
                  <strong style={{ color: r.current_balance <= 0 ? '#a40000' : '#1b5e20' }}>
                    {r.current_balance} {r.unit || ''}
                  </strong>
                </td>
                <td style={td}>
                  <Link
                    to={`/fg-outward/new?finished_goods_id=${r.finished_goods_id}`}
                    style={{
                      padding: '4px 10px',
                      border: '1px solid #1976d2',
                      color: '#1976d2',
                      textDecoration: 'none',
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  >
                    Dispatch
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const th: React.CSSProperties = { padding: 8, fontWeight: 600 };
const td: React.CSSProperties = { padding: 8 };

export default FinishedGoodsListPage;
