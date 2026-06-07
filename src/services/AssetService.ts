import api from './api';
import { extractData } from './response';

function toArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  if (Array.isArray(value?.data?.recordset)) return value.data.recordset;
  if (Array.isArray(value?.data?.rows)) return value.data.rows;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  if (Array.isArray(value?.recordset)) return value.recordset;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.result)) return value.result;
  return [];
}

function rowsFromResponse(response: any): any[] {
  const extracted = extractData<any>(response);
  const extractedRows = toArray(extracted);
  if (extractedRows.length > 0) return extractedRows;
  return toArray(response);
}

export const assets = {
  getAll: async () => {
    const res = await api.get('/api/assets');
    return rowsFromResponse(res);
  },

  getByCustomer: async (customerName: string) => {
    const res = await api.get('/api/assets', {
      params: { customerName },
    });

    return rowsFromResponse(res);
  },

  search: async (keyword: string, customerName = '') => {
    try {
      const res = await api.get('/api/assets/search', {
        params: {
          search: keyword,
          q: keyword,
          keyword,
          customerName: customerName || undefined,
        },
      });

      return rowsFromResponse(res);
    } catch (error) {
      const fallback = await api.get('/api/assets', {
        params: {
          search: keyword,
          q: keyword,
          keyword,
          customerName: customerName || undefined,
        },
      });

      return rowsFromResponse(fallback);
    }
  },

  getByRelationId: async (relationId: string | number) => {
    const res = await api.get(`/api/assets/${relationId}`);
    return rowsFromResponse(res);
  },
};
