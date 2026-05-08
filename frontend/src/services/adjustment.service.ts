import api from './api';

export type AdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type InventoryType = 'RAW_MATERIAL' | 'FINISHED_GOODS';

export interface Adjustment {
  id: string;
  inventory_type: InventoryType;
  item_id: string;
  adjustment_quantity: number;
  reason: string;
  status: AdjustmentStatus;
  requested_by: string;
  approved_by?: string | null;
  approval_date?: string | null;
}

export interface CreateAdjustmentPayload {
  inventory_type: InventoryType;
  item_id: string;
  adjustment_quantity: number;
  reason: string;
}

export interface ListAdjustmentParams {
  status?: AdjustmentStatus;
  inventory_type?: InventoryType;
  item_id?: string;
}

const adjustmentService = {
  async list(params: ListAdjustmentParams = {}): Promise<Adjustment[]> {
    const res = await api.get<Adjustment[]>('/inventory/adjustments', { params });
    return res.data;
  },
  async get(id: string): Promise<Adjustment> {
    const res = await api.get<Adjustment>(`/inventory/adjustments/${id}`);
    return res.data;
  },
  async create(payload: CreateAdjustmentPayload): Promise<Adjustment> {
    const res = await api.post<Adjustment>('/inventory/adjustments', payload);
    return res.data;
  },
  async approve(id: string): Promise<Adjustment> {
    const res = await api.post<Adjustment>(`/inventory/adjustments/${id}/approve`);
    return res.data;
  },
  async reject(id: string): Promise<Adjustment> {
    const res = await api.post<Adjustment>(`/inventory/adjustments/${id}/reject`);
    return res.data;
  },
};

export default adjustmentService;
