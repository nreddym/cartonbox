import api from './api';

export const ALLOWED_ROLES = [
  'ADMIN',
  'PRODUCTION_MANAGER',
  'STORE_MANAGER',
  'SUPERVISOR',
  'DISPATCH_MANAGER',
  'AUDITOR',
] as const;

export type UserRole = (typeof ALLOWED_ROLES)[number];

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  roles: string[];
  is_active: boolean;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  roles: string[];
}

class UserService {
  async list(params: { skip?: number; limit?: number } = {}): Promise<UserRecord[]> {
    const res = await api.get<UserRecord[]>('/users', { params });
    return res.data;
  }

  async get(id: string): Promise<UserRecord> {
    const res = await api.get<UserRecord>(`/users/${id}`);
    return res.data;
  }

  async create(payload: CreateUserPayload): Promise<UserRecord> {
    const res = await api.post<UserRecord>('/users', payload);
    return res.data;
  }

  async updateRoles(id: string, roles: string[]): Promise<UserRecord> {
    const res = await api.put<UserRecord>(`/users/${id}/roles`, { roles });
    return res.data;
  }
}

const userService = new UserService();
export default userService;
