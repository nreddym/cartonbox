import api from './api';

export type MaterialIssueStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MaterialIssue {
  id: string;
  job_card_id: string;
  paper_roll_id: string;
  requested_quantity: number;
  issued_quantity: number;
  unit: string;
  issue_date: string;
  status: MaterialIssueStatus;
  requested_by: string;
  approved_by?: string | null;
  approval_date?: string | null;
}

export interface CreateMaterialIssuePayload {
  job_card_id: string;
  paper_roll_id: string;
  requested_quantity: number;
  issued_quantity: number;
  unit: string;
  issue_date: string;
}

export interface ListMaterialIssueParams {
  status?: MaterialIssueStatus;
  job_card_id?: string;
}

const materialIssueService = {
  async list(params: ListMaterialIssueParams = {}): Promise<MaterialIssue[]> {
    const res = await api.get<MaterialIssue[]>('/material-issues', { params });
    return res.data;
  },
  async get(id: string): Promise<MaterialIssue> {
    const res = await api.get<MaterialIssue>(`/material-issues/${id}`);
    return res.data;
  },
  async create(payload: CreateMaterialIssuePayload): Promise<MaterialIssue> {
    const res = await api.post<MaterialIssue>('/material-issues', payload);
    return res.data;
  },
  async approve(id: string): Promise<MaterialIssue> {
    const res = await api.post<MaterialIssue>(`/material-issues/${id}/approve`);
    return res.data;
  },
  async reject(id: string): Promise<MaterialIssue> {
    const res = await api.post<MaterialIssue>(`/material-issues/${id}/reject`);
    return res.data;
  },
};

export default materialIssueService;
