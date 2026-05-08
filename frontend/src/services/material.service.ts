import api from './api';

export interface PaperRoll {
  id: string;
  material_code: string;
  paper_type: string;
  gsm: number;
  roll_width: number;
  roll_length: number | null;
  roll_weight: number | null;
  supplier: string;
}

export interface CreatePaperRollPayload {
  material_code: string;
  paper_type: string;
  gsm: number;
  roll_width: number;
  roll_length?: number | null;
  roll_weight?: number | null;
  supplier: string;
  opening_stock?: number;
  unit?: string;
}

export interface UpdatePaperRollPayload {
  paper_type?: string;
  gsm?: number;
  roll_width?: number;
  roll_length?: number | null;
  roll_weight?: number | null;
  supplier?: string;
}

export interface StockInfo {
  paper_roll_id: string;
  material_code: string;
  opening_stock: number;
  current_stock: number;
  unit: string;
}

class MaterialService {
  async list(): Promise<PaperRoll[]> {
    const res = await api.get<PaperRoll[]>('/materials');
    return res.data;
  }

  async get(id: string): Promise<PaperRoll> {
    const res = await api.get<PaperRoll>(`/materials/${id}`);
    return res.data;
  }

  async create(payload: CreatePaperRollPayload): Promise<PaperRoll> {
    const res = await api.post<PaperRoll>('/materials', payload);
    return res.data;
  }

  async update(id: string, payload: UpdatePaperRollPayload): Promise<PaperRoll> {
    const res = await api.put<PaperRoll>(`/materials/${id}`, payload);
    return res.data;
  }

  async getStock(id: string): Promise<StockInfo> {
    const res = await api.get<StockInfo>(`/materials/${id}/stock`);
    return res.data;
  }
}

const materialService = new MaterialService();
export default materialService;
