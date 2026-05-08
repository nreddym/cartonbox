import api from './api';

export interface FinishedGoodsStockRow {
  finished_goods_id: string;
  box_type: string;
  box_length: number;
  box_width: number;
  box_height: number;
  ply_type: string;
  quantity_produced: number;
  quantity_dispatched: number;
  current_balance: number;
  unit: string | null;
  source_job_cards: string[];
}

export type OutwardStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface OutwardRecord {
  id: string;
  finished_goods_id: string;
  quantity: number;
  destination: string;
  dispatch_date: string;
  status: OutwardStatus;
  requested_by: string;
  approved_by?: string | null;
  approval_date?: string | null;
}

export interface CreateOutwardPayload {
  finished_goods_id: string;
  quantity: number;
  destination: string;
  dispatch_date: string;
}

export interface ListOutwardParams {
  status?: OutwardStatus;
  finished_goods_id?: string;
}

const finishedGoodsService = {
  async listStock(params: { box_type?: string; date_from?: string; date_to?: string } = {}): Promise<
    FinishedGoodsStockRow[]
  > {
    const res = await api.get<FinishedGoodsStockRow[]>('/reports/finished-goods-stock', {
      params,
    });
    return res.data;
  },
  async listOutwards(params: ListOutwardParams = {}): Promise<OutwardRecord[]> {
    const res = await api.get<OutwardRecord[]>('/finished-goods/outward', { params });
    return res.data;
  },
  async getOutward(id: string): Promise<OutwardRecord> {
    const res = await api.get<OutwardRecord>(`/finished-goods/outward/${id}`);
    return res.data;
  },
  async createOutward(payload: CreateOutwardPayload): Promise<OutwardRecord> {
    const res = await api.post<OutwardRecord>('/finished-goods/outward', payload);
    return res.data;
  },
  async approveOutward(id: string): Promise<OutwardRecord> {
    const res = await api.post<OutwardRecord>(`/finished-goods/outward/${id}/approve`);
    return res.data;
  },
  async rejectOutward(id: string): Promise<OutwardRecord> {
    const res = await api.post<OutwardRecord>(`/finished-goods/outward/${id}/reject`);
    return res.data;
  },
};

export default finishedGoodsService;
