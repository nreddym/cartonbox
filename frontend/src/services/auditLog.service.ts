import api from './api';

export interface AuditLog {
  id: string;
  transaction_type: string;
  transaction_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before_data?: Record<string, any> | null;
  after_data: Record<string, any>;
  performed_by: string;
  performed_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface ListAuditLogParams {
  transaction_type?: string;
  entity_type?: string;
  entity_id?: string;
  performed_by?: string;
  action?: string;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
  skip: number;
  limit: number;
}

class AuditLogService {
  async list(params: ListAuditLogParams = {}): Promise<AuditLogListResponse> {
    const res = await api.get<AuditLogListResponse>('/audit-logs', { params });
    return res.data;
  }

  async getTransactionTrail(transactionId: string): Promise<AuditLog[]> {
    const res = await api.get<AuditLog[]>(`/audit-logs/transaction/${transactionId}`);
    return res.data;
  }
}

const auditLogService = new AuditLogService();
export default auditLogService;
