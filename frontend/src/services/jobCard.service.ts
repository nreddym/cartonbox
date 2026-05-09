import api from './api';

export type JobCardStatus =
  | 'CREATED'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PRODUCTION'
  | 'COMPLETED'
  | 'CANCELLED';

export interface JobCard {
  id: string;
  job_card_number: string;
  box_type: string;
  box_length: number;
  box_width: number;
  box_height: number;
  ply_type: string;
  ply_count: number;
  quantity_to_produce: number;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  status: JobCardStatus;
  calculated_paper_area?: number | null;
  required_paper_quantity?: number | null;
  created_by: string;
  approved_by?: string | null;
}

export interface CreateJobCardPayload {
  job_card_number: string;
  box_type: string;
  box_length: number;
  box_width: number;
  box_height: number;
  ply_type: string;
  ply_count: number;
  quantity_to_produce: number;
  planned_start_date: string;
  planned_end_date: string;
}

export type UpdateJobCardPayload = Partial<Omit<CreateJobCardPayload, 'job_card_number'>>;

export interface MaterialRequirement {
  job_card_id: string;
  calculated_paper_area: number;
  required_paper_quantity: number;
}

export interface ListJobCardParams {
  status?: JobCardStatus;
  box_type?: string;
}

const jobCardService = {
  async list(params: ListJobCardParams = {}): Promise<JobCard[]> {
    const res = await api.get<JobCard[]>('/jobcards', { params });
    return res.data;
  },
  async get(id: string): Promise<JobCard> {
    const res = await api.get<JobCard>(`/jobcards/${id}`);
    return res.data;
  },
  async create(payload: CreateJobCardPayload): Promise<JobCard> {
    const res = await api.post<JobCard>('/jobcards', payload);
    return res.data;
  },
  async update(id: string, payload: UpdateJobCardPayload): Promise<JobCard> {
    const res = await api.put<JobCard>(`/jobcards/${id}`, payload);
    return res.data;
  },
  async calculateMaterials(id: string): Promise<MaterialRequirement> {
    const res = await api.post<MaterialRequirement>(
      `/jobcards/${id}/calculate-materials`,
    );
    return res.data;
  },
  async approve(id: string): Promise<JobCard> {
    const res = await api.post<JobCard>(`/jobcards/${id}/approve`);
    return res.data;
  },
  async reject(id: string): Promise<JobCard> {
    const res = await api.post<JobCard>(`/jobcards/${id}/reject`);
    return res.data;
  },
  async cancel(id: string): Promise<JobCard> {
    const res = await api.post<JobCard>(`/jobcards/${id}/cancel`);
    return res.data;
  },
  async start(id: string): Promise<JobCard> {
    const res = await api.post<JobCard>(`/jobcards/${id}/start`);
    return res.data;
  },
  async complete(id: string): Promise<JobCard> {
    const res = await api.post<JobCard>(`/jobcards/${id}/complete`);
    return res.data;
  },
};

export default jobCardService;
