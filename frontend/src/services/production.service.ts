import api from './api';

export interface FinishedGoodsInward {
  id: string;
  finished_goods_id: string;
  job_card_id: string;
  quantity_produced: number;
  quantity_rejected: number;
  net_quantity: number;
  confirmed_by: string;
  confirmation_date: string;
}

export interface CompleteProductionPayload {
  actual_quantity_produced: number;
  rejected_quantity: number;
  wastage_quantity?: number | null;
  actual_end_date?: string | null;
}

export interface CompleteProductionResponse {
  job_card_id: string;
  job_card_status: string;
  actual_quantity_produced: number;
  rejected_quantity: number;
  net_quantity: number;
  inward: FinishedGoodsInward;
}

const productionService = {
  async complete(
    jobCardId: string,
    payload: CompleteProductionPayload,
  ): Promise<CompleteProductionResponse> {
    const res = await api.post<CompleteProductionResponse>(
      `/production/job-cards/${jobCardId}/complete`,
      payload,
    );
    return res.data;
  },
};

export default productionService;
