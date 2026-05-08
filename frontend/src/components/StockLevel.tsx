import React, { useEffect, useState } from 'react';
import materialService, { StockInfo } from '../services/material.service';

interface StockLevelProps {
  paperRollId: string;
  lowStockThreshold?: number;
}

/**
 * Displays current stock for a paper roll with a low-stock indicator.
 * Validates: Requirement 1.2
 */
const StockLevel: React.FC<StockLevelProps> = ({ paperRollId, lowStockThreshold }) => {
  const [stock, setStock] = useState<StockInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    materialService
      .getStock(paperRollId)
      .then((data) => {
        if (!cancelled) setStock(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.detail || 'Failed to load stock.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paperRollId]);

  if (loading) return <span style={{ color: '#666' }}>Loading...</span>;
  if (error) return <span style={{ color: '#a40000' }}>{error}</span>;
  if (!stock) return <span>—</span>;

  const isLow =
    typeof lowStockThreshold === 'number' && stock.current_stock < lowStockThreshold;
  return (
    <span
      title={`Opening: ${stock.opening_stock} ${stock.unit}`}
      style={{
        color: isLow ? '#a40000' : '#1b5e20',
        fontWeight: isLow ? 700 : 500,
      }}
    >
      {stock.current_stock} {stock.unit}
      {isLow && <span style={{ marginLeft: 6 }}>(LOW)</span>}
    </span>
  );
};

export default StockLevel;
