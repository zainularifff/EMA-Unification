import api from './api';
import { extractData } from './response';

export const assets = {
  getAll: async () => {
    const res = await api.get('/api/assets');
    return extractData<any[]>(res) || [];
  },

  getByCustomer: async (customerName: string) => {
    const res = await api.get('/api/assets', {
      params: { customerName },
    });

    return extractData<any[]>(res) || [];
  },

  search: async (keyword: string, customerName = '') => {
    const res = await api.get('/api/assets', {
      params: {
        search: keyword,
        customerName: customerName || undefined,
      },
    });

    return extractData<any[]>(res) || [];
  },

  getByRelationId: async (relationId: string | number) => {
    const res = await api.get(`/api/assets/${relationId}`);
    return extractData<any[]>(res) || [];
  },
};
