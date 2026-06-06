import api from './api';
import { extractData } from './response';

type EngineerAvailabilityFilter = {
  userId?: number;
};

export const engineerAvailability = {
  getAll: async (filters?: EngineerAvailabilityFilter) => {
    const res = await api.get('/api/engineer-availability', {
      params: filters,
    });

    return extractData<any[]>(res) || [];
  },

  create: async (data: any) => {
    const res = await api.post('/api/engineer-availability', data);
    return extractData(res);
  },

  update: async (id: number, data: any) => {
    const res = await api.put(`/api/engineer-availability/${id}`, data);
    return extractData(res);
  },

  delete: async (id: number) => {
    const res = await api.delete(`/api/engineer-availability/${id}`);
    return extractData(res);
  },

  getAvailableEngineers: async (date: string) => {
    const res = await api.get('/api/engineer-availability/available-engineers', {
      params: { date },
    });

    return extractData<any[]>(res) || [];
  },

  getAllEngineers: async () => {
    const res = await api.get('/api/engineers');
    return extractData<any[]>(res) || [];
  },

  getUnavailableByDate: async (year: number, month: number) => {
    const res = await api.get('/api/engineer-availability/unavailable-by-date', {
      params: { year, month },
    });

    return extractData<Record<string, any[]>>(res) || {};
  },
};
