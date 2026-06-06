import api from './api';
import { extractData } from './response';

export const incidents = {
  getAll: async () => {
    const res = await api.get('/api/incidents');
    return extractData<any[]>(res) || [];
  },

  get: async (id: string) => {
    const res = await api.get(`/api/incidents/${id}`);
    return extractData(res);
  },

  create: async (data: any) => {
    const res = await api.post('/api/incidents', data);
    return extractData(res);
  },

  update: async (data: any) => {
    const res = await api.put(`/api/incidents/${data.id}`, data);
    return extractData(res);
  },

  delete: async (id: string) => {
    const res = await api.delete(`/api/incidents/${id}`);
    return extractData(res);
  },

  advancedSearch: async (filters: any) => {
    const res = await api.post('/api/incidents/search', filters);
    return extractData(res);
  },

  uploadAttachment: async (incidentId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post(`/api/incidents/${incidentId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return extractData(res);
  },

  getAttachments: async (incidentId: string) => {
    const res = await api.get(`/api/incidents/${incidentId}/attachments`);
    return extractData<any[]>(res) || [];
  },

  deleteAttachment: async (incidentId: string, filename: string) => {
    const res = await api.delete(`/api/incidents/${incidentId}/attachments/${filename}`);
    return extractData(res);
  },
};

export const incidentConfig = {
  getAll: async () => {
    const res = await api.get('/api/incident-config');
    return extractData<any[]>(res) || [];
  },

  getWorkingHours: async () => {
    const res = await api.get('/api/incident-config/working-hours');
    return extractData<any[]>(res) || [];
  },

  getVisibilityConfig: async () => {
    const res = await api.get('/api/incident-config/visibility');
    return extractData<Record<string, boolean>>(res) || {};
  },
};

export const incidentCategories = {
  getAll: async () => {
    const res = await api.get('/api/incident-categories');
    return extractData<any[]>(res) || [];
  },
};
