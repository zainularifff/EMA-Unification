import api from './api';
import { extractData } from './response';

export const clients = {
  getAll: async () => {
    const res = await api.get('/api/clients');
    return extractData<any[]>(res) || [];
  },

  get: async (id: string | number) => {
    const res = await api.get(`/api/clients/${id}`);
    return extractData(res);
  },

  create: async (data: any) => {
    const res = await api.post('/api/clients', data);
    return extractData(res);
  },

  update: async (id: string | number, data: any) => {
    const res = await api.put(`/api/clients/${id}`, data);
    return extractData(res);
  },

  delete: async (id: string | number) => {
    const res = await api.delete(`/api/clients/${id}`);
    return extractData(res);
  },
};
