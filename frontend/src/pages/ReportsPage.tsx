import React, { useEffect, useState } from 'react';
import reportingService, {
  FinishedGoodsStockReportRow,
  LowStockAlert,
  MaterialConsumptionReport,
  RawMaterialStockRow,
} from '../services/reporting.service';

type TabKey = 'raw' | 'fg' | 'consumption' | 'low-stock';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'raw', label: 'Raw Material Stock' },
  { key: 'fg', label: 'Finished Goods Stock' },
  { key: 'consumption', label: 'Material Consumption' },
  { key: 'low-stock', label: 'Low Stock Alerts' },
];

const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const ReportsPage: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('raw');

  return (
    <div>
      <h2>Reports</h2>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ccc', marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 14px',
              background: tab === t.key ? '#1976d2' : '#fff',
              color: tab === t.key ? '#fff' : '#333',
              border: '1px solid #ccc',
              borderBottom: tab === t.key ? '1px solid #1976d2' : '1px solid #ccc',
              cursor: 'pointer',
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'raw' && <RawMaterialStockReport />}
      {tab === 'fg' && <FinishedGoodsStockReport />}
      {tab === 'consumption' && <MaterialConsumptionReportView />}
      {tab === 'low-stock' && <LowStockAlertsReport />}
    </div>
  );
};

// ---------------------------------------------------------------------------

const RawMaterialStockReport: React.FC = () => {
  const [rows, setRows] = useState<RawMaterialStockRow[]>([]);
  const [filters, setFilters] = useState({ paper_type: '', supplier: '', low_stock_threshold: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (filters.paper_type) params.paper_type = filters.paper_type;
      if (filters.supplier) params.supplier = filters.supplier;
      if (filters.low_stock_threshold) params.low_stock_threshold = Number(filters.low_stock_threshold);
      const data = await reportingService.rawMaterialStock(params);
      setRows(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = () => {
    downloadCsv(
      'raw-material-stock.csv',
      ['Material Code', 'Paper Type', 'GSM', 'Roll Width', 'Supplier', 'Current Stock', 'Unit', 'Low Stock'],
      rows.map((r) => [
        r.material_code,
        r.paper_type,
        r.gsm,
        r.roll_width,
        r.supplier ?? '',
        r.current_stock,
        r.unit ?? '',
        r.is_low_stock ? 'YES' : '',
      ]),
    );
  };

  return (
    <div>
      <div style={filterRow}>
        <input
          placeholder="Paper type"
          value={filters.paper_type}
          onChange={(e) => setFilters({ ...filters, paper_type: e.target.value })}
          style={input}
        />
        <input
          placeholder="Supplier"
          value={filters.supplier}
          onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
          style={input}
        />
        <input
          placeholder="Low stock threshold"
          type="number"
          value={filters.low_stock_threshold}
          onChange={(e) => setFilters({ ...filters, low_stock_threshold: e.target.value })}
          style={input}
        />
        <button type="button" onClick={load} style={primaryBtn}>Apply</button>
        <button type="button" onClick={handleExport} disabled={!rows.length} style={secondaryBtn}>
          Export CSV
        </button>
      </div>
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p>Loading...</p>
      ) : rows.length === 0 ? (
        <p>No data.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr style={trHead}>
              <th style={th}>Material Code</th>
              <th style={th}>Paper Type</th>
              <th style={th}>GSM</th>
              <th style={th}>Roll Width</th>
              <th style={th}>Supplier</th>
              <th style={th}>Current Stock</th>
              <th style={th}>Unit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.paper_roll_id}
                style={{
                  borderBottom: '1px solid #eee',
                  background: r.is_low_stock ? '#fde7e7' : 'transparent',
                }}
              >
                <td style={td}>{r.material_code}</td>
                <td style={td}>{r.paper_type}</td>
                <td style={td}>{r.gsm}</td>
                <td style={td}>{r.roll_width}</td>
                <td style={td}>{r.supplier ?? '-'}</td>
                <td style={td}>
                  {r.current_stock} {r.is_low_stock && <span style={{ color: '#a40000', fontWeight: 600 }}>LOW</span>}
                </td>
                <td style={td}>{r.unit ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const FinishedGoodsStockReport: React.FC = () => {
  const [rows, setRows] = useState<FinishedGoodsStockReportRow[]>([]);
  const [filters, setFilters] = useState({ box_type: '', date_from: '', date_to: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (filters.box_type) params.box_type = filters.box_type;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const data = await reportingService.finishedGoodsStock(params);
      setRows(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = () => {
    downloadCsv(
      'finished-goods-stock.csv',
      ['Box Type', 'L', 'W', 'H', 'Ply', 'Produced', 'Dispatched', 'Balance', 'Unit'],
      rows.map((r) => [
        r.box_type,
        r.box_length,
        r.box_width,
        r.box_height,
        r.ply_type,
        r.quantity_produced,
        r.quantity_dispatched,
        r.current_balance,
        r.unit ?? '',
      ]),
    );
  };

  return (
    <div>
      <div style={filterRow}>
        <input
          placeholder="Box type"
          value={filters.box_type}
          onChange={(e) => setFilters({ ...filters, box_type: e.target.value })}
          style={input}
        />
        <input
          type="date"
          value={filters.date_from}
          onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
          style={input}
        />
        <input
          type="date"
          value={filters.date_to}
          onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
          style={input}
        />
        <button type="button" onClick={load} style={primaryBtn}>Apply</button>
        <button type="button" onClick={handleExport} disabled={!rows.length} style={secondaryBtn}>
          Export CSV
        </button>
      </div>
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p>Loading...</p>
      ) : rows.length === 0 ? (
        <p>No data.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr style={trHead}>
              <th style={th}>Box Type</th>
              <th style={th}>Dimensions</th>
              <th style={th}>Ply</th>
              <th style={th}>Produced</th>
              <th style={th}>Dispatched</th>
              <th style={th}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.finished_goods_id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={td}>{r.box_type}</td>
                <td style={td}>{r.box_length}x{r.box_width}x{r.box_height}</td>
                <td style={td}>{r.ply_type}</td>
                <td style={td}>{r.quantity_produced}</td>
                <td style={td}>{r.quantity_dispatched}</td>
                <td style={{ ...td, color: r.current_balance <= 0 ? '#a40000' : '#1b5e20', fontWeight: 600 }}>
                  {r.current_balance} {r.unit ?? ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const MaterialConsumptionReportView: React.FC = () => {
  const [data, setData] = useState<MaterialConsumptionReport | null>(null);
  const [filters, setFilters] = useState({ box_type: '', date_from: '', date_to: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (filters.box_type) params.box_type = filters.box_type;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const result = await reportingService.materialConsumption(params);
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = () => {
    if (!data) return;
    downloadCsv(
      'material-consumption.csv',
      ['Job Card', 'Box Type', 'Planned', 'Actual Issued', 'Wastage Qty', 'Wastage %', 'Status'],
      data.per_job_card.map((r) => [
        r.job_card_number,
        r.box_type,
        r.planned_quantity,
        r.actual_issued,
        r.wastage_quantity,
        r.wastage_percentage.toFixed(2),
        r.status ?? '',
      ]),
    );
  };

  return (
    <div>
      <div style={filterRow}>
        <input
          placeholder="Box type"
          value={filters.box_type}
          onChange={(e) => setFilters({ ...filters, box_type: e.target.value })}
          style={input}
        />
        <input
          type="date"
          value={filters.date_from}
          onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
          style={input}
        />
        <input
          type="date"
          value={filters.date_to}
          onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
          style={input}
        />
        <button type="button" onClick={load} style={primaryBtn}>Apply</button>
        <button type="button" onClick={handleExport} disabled={!data?.per_job_card?.length} style={secondaryBtn}>
          Export CSV
        </button>
      </div>
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p>Loading...</p>
      ) : !data || data.per_job_card.length === 0 ? (
        <p>No data.</p>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <SummaryCard label="Planned" value={data.totals.planned_quantity.toFixed(2)} />
            <SummaryCard label="Actual Issued" value={data.totals.actual_issued.toFixed(2)} />
            <SummaryCard
              label="Total Wastage"
              value={data.totals.wastage_quantity.toFixed(2)}
              accent={data.totals.wastage_quantity > 0 ? '#a40000' : '#1b5e20'}
            />
            <SummaryCard
              label="Wastage %"
              value={`${data.totals.wastage_percentage.toFixed(2)}%`}
              accent={data.totals.wastage_percentage > 0 ? '#a40000' : '#1b5e20'}
            />
          </div>
          <table style={tableStyle}>
            <thead>
              <tr style={trHead}>
                <th style={th}>Job Card</th>
                <th style={th}>Box Type</th>
                <th style={th}>Planned</th>
                <th style={th}>Actual</th>
                <th style={th}>Wastage</th>
                <th style={th}>Wastage %</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.per_job_card.map((r) => (
                <tr key={r.job_card_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={td}>{r.job_card_number}</td>
                  <td style={td}>{r.box_type}</td>
                  <td style={td}>{r.planned_quantity}</td>
                  <td style={td}>{r.actual_issued}</td>
                  <td
                    style={{
                      ...td,
                      color: r.wastage_quantity > 0 ? '#a40000' : '#1b5e20',
                      fontWeight: 600,
                    }}
                  >
                    {r.wastage_quantity.toFixed(2)}
                  </td>
                  <td style={td}>{r.wastage_percentage.toFixed(2)}%</td>
                  <td style={td}>{r.status ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const LowStockAlertsReport: React.FC = () => {
  const [rows, setRows] = useState<LowStockAlert[]>([]);
  const [threshold, setThreshold] = useState('100');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const t = Number(threshold);
      if (isNaN(t) || t < 0) {
        setError('Threshold must be a non-negative number');
        return;
      }
      const data = await reportingService.lowStockAlerts(t);
      setRows(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load alerts.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    downloadCsv(
      'low-stock-alerts.csv',
      ['Material Code', 'Paper Type', 'GSM', 'Supplier', 'Current Stock', 'Unit', 'Threshold', 'Shortfall'],
      rows.map((r) => [
        r.material_code,
        r.paper_type,
        r.gsm,
        r.supplier ?? '',
        r.current_stock,
        r.unit ?? '',
        r.threshold,
        r.shortfall,
      ]),
    );
  };

  return (
    <div>
      <div style={filterRow}>
        <input
          placeholder="Threshold"
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          style={input}
        />
        <button type="button" onClick={load} style={primaryBtn}>Check</button>
        <button type="button" onClick={handleExport} disabled={!rows.length} style={secondaryBtn}>
          Export CSV
        </button>
      </div>
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p>Loading...</p>
      ) : rows.length === 0 ? (
        <p>No materials below threshold.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr style={trHead}>
              <th style={th}>Material Code</th>
              <th style={th}>Paper Type</th>
              <th style={th}>GSM</th>
              <th style={th}>Supplier</th>
              <th style={th}>Current</th>
              <th style={th}>Threshold</th>
              <th style={th}>Shortfall</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.paper_roll_id} style={{ borderBottom: '1px solid #eee', background: '#fde7e7' }}>
                <td style={td}>{r.material_code}</td>
                <td style={td}>{r.paper_type}</td>
                <td style={td}>{r.gsm}</td>
                <td style={td}>{r.supplier ?? '-'}</td>
                <td style={{ ...td, color: '#a40000', fontWeight: 600 }}>
                  {r.current_stock} {r.unit ?? ''}
                </td>
                <td style={td}>{r.threshold}</td>
                <td style={{ ...td, color: '#a40000', fontWeight: 600 }}>{r.shortfall.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const SummaryCard: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
  <div style={{ background: '#f4f4f4', padding: 12, borderRadius: 4 }}>
    <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: accent || '#222' }}>{value}</div>
  </div>
);

const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
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
    {message}
  </div>
);

const filterRow: React.CSSProperties = { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' };
const input: React.CSSProperties = { padding: 8 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const trHead: React.CSSProperties = { background: '#f4f4f4', textAlign: 'left' };
const th: React.CSSProperties = { padding: 8, fontWeight: 600 };
const td: React.CSSProperties = { padding: 8 };
const primaryBtn: React.CSSProperties = {
  padding: '8px 14px',
  background: '#1976d2',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};
const secondaryBtn: React.CSSProperties = {
  padding: '8px 14px',
  background: '#fff',
  color: '#555',
  border: '1px solid #ccc',
  borderRadius: 4,
  cursor: 'pointer',
};

export default ReportsPage;
