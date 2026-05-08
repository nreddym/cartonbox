import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import jobCardService, { JobCard } from '../services/jobCard.service';

const ProductionDashboardPage: React.FC = () => {
  const [items, setItems] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [approved, inProd, completed] = await Promise.all([
        jobCardService.list({ status: 'APPROVED' }),
        jobCardService.list({ status: 'IN_PRODUCTION' }),
        jobCardService.list({ status: 'COMPLETED' }),
      ]);
      setItems([...approved, ...inProd, ...completed]);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load production data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const buckets = useMemo(() => {
    return {
      APPROVED: items.filter((j) => j.status === 'APPROVED'),
      IN_PRODUCTION: items.filter((j) => j.status === 'IN_PRODUCTION'),
      COMPLETED: items.filter((j) => j.status === 'COMPLETED'),
    };
  }, [items]);

  return (
    <div>
      <h2>Production Dashboard</h2>

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
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          <Column
            title="Approved (Ready)"
            color="#1b5e20"
            bg="#e8f5e9"
            jobs={buckets.APPROVED}
          />
          <Column
            title="In Production"
            color="#8d6e00"
            bg="#fff8e1"
            jobs={buckets.IN_PRODUCTION}
          />
          <Column
            title="Completed"
            color="#311b92"
            bg="#ede7f6"
            jobs={buckets.COMPLETED}
          />
        </div>
      )}
    </div>
  );
};

const Column: React.FC<{
  title: string;
  color: string;
  bg: string;
  jobs: JobCard[];
}> = ({ title, color, bg, jobs }) => (
  <div style={{ background: bg, padding: 12, borderRadius: 6 }}>
    <h3 style={{ marginTop: 0, color }}>
      {title} <span style={{ fontSize: 14 }}>({jobs.length})</span>
    </h3>
    {jobs.length === 0 ? (
      <p style={{ color: '#777', fontStyle: 'italic' }}>None</p>
    ) : (
      jobs.map((j) => (
        <Link
          key={j.id}
          to={`/job-cards/${j.id}`}
          style={{
            display: 'block',
            background: '#fff',
            padding: 10,
            borderRadius: 4,
            marginBottom: 8,
            textDecoration: 'none',
            color: '#222',
            border: '1px solid #ddd',
          }}
        >
          <div style={{ fontWeight: 600 }}>{j.job_card_number}</div>
          <div style={{ fontSize: 12, color: '#555' }}>
            {j.box_type} • {j.quantity_to_produce} units
          </div>
        </Link>
      ))
    )}
  </div>
);

export default ProductionDashboardPage;
