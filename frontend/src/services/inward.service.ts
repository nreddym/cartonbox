import api from './api';

export interface InwardRecord {
  id: string;
  paper_roll_id: string;
  supplier: string;
  purchase_reference: string;
  quantity_received: number;
  unit: string;
  receipt_date: string;
  status: string;
  requested_by: string;
  approved_by: string | null;
  approval_date: string | null;
}

export interface CreateInwardPayload {
  paper_roll_id: string;
  supplier: string;
  purchase_reference: string;
  quantity_received: number;
  unit: string;
  receipt_date: string; // YYYY-MM-DD
}

export interface ListInwardParams {
  status?: string;
  paper_roll_id?: string;
}

class InwardService {
  async list(params: ListInwardParams = {}): Promise<InwardRecord[]> {
    const res = await api.get<InwardRecord[]>('/inventory/inward', { params });
    return res.data;
  }

  async get(id: string): Promise<InwardRecord> {
    const res = await api.get<InwardRecord>(`/inventory/inward/${id}`);
    return res.data;
  }

  async create(payload: CreateInwardPayload): Promise<InwardRecord> {
    const res = await api.post<InwardRecord>('/inventory/inward', payload);
    return res.data;
  }

  async approve(id: string): Promise<InwardRecord> {
    const res = await api.post<InwardRecord>(`/inventory/inward/${id}/approve`);
    return res.data;
  }

  async reject(id: string, reason?: string): Promise<InwardRecord> {
    const res = await api.post<InwardRecord>(`/inventory/inward/${id}/reject`, { reason });
    return res.data;
  }
}

const inwardService = new InwardService();
export default inwardService;
