import api from './api';

export interface RawMaterialStockRow {
  paper_roll_id: string;
  material_code: string;
  paper_type: string;
  gsm: number;
  roll_width: number;
  supplier?: string | null;
  current_stock: number;
  opening_stock: number;
  unit?: string | null;
  is_low_stock: boolean;
  inward_history?: any[];
  issue_history?: any[];
}

export interface FinishedGoodsStockReportRow {
  finished_goods_id: string;
  box_type: string;
  box_length: number;
  box_width: number;
  box_height: number;
  ply_type: string;
  quantity_produced: number;
  quantity_dispatched: number;
  current_balance: number;
  unit?: string | null;
  source_job_cards: string[];
}

export interface MaterialConsumptionRow {
  job_card_id: string;
  job_card_number: string;
  box_type: string;
  planned_quantity: number;
  actual_issued: number;
  wastage_quantity: number;
  wastage_percentage: number;
  status?: string;
}

export interface MaterialConsumptionReport {
  per_job_card: MaterialConsumptionRow[];
  totals: {
    planned_quantity: number;
    actual_issued: number;
    wastage_quantity: number;
    wastage_percentage: number;
  };
}

export interface LowStockAlert {
  paper_roll_id: string;
  material_code: string;
  paper_type: string;
  gsm: number;
  supplier?: string | null;
  current_stock: number;
  unit?: string | null;
  threshold: number;
  shortfall: number;
}

class ReportingService {
  async rawMaterialStock(params: {
    paper_type?: string;
    gsm?: number;
    supplier?: string;
    low_stock_threshold?: number;
    include_history?: boolean;
  } = {}): Promise<RawMaterialStockRow[]> {
    const res = await api.get<RawMaterialStockRow[]>('/reports/raw-material-stock', {
      params,
    });
    return res.data;
  }

  async finishedGoodsStock(params: {
    box_type?: string;
    date_from?: string;
    date_to?: string;
  } = {}): Promise<FinishedGoodsStockReportRow[]> {
    const res = await api.get<FinishedGoodsStockReportRow[]>(
      '/reports/finished-goods-stock',
      { params },
    );
    return res.data;
  }

  async materialConsumption(params: {
    date_from?: string;
    date_to?: string;
    job_card_id?: string;
    box_type?: string;
  } = {}): Promise<MaterialConsumptionReport> {
    const res = await api.get<MaterialConsumptionReport>(
      '/reports/material-consumption',
      { params },
    );
    return res.data;
  }

  async lowStockAlerts(threshold: number): Promise<LowStockAlert[]> {
    const res = await api.get<LowStockAlert[]>('/reports/low-stock-alerts', {
      params: { threshold },
    });
    return res.data;
  }
}

const reportingService = new ReportingService();
export default reportingService;
