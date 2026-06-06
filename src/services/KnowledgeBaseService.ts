import api from './api';
import { extractData } from './response';

export const knowledgeBase = {
  getAll: async () => {
    const res = await api.get('/api/knowledge-base');
    return extractData<any[]>(res) || [];
  },

  get: async (id: number) => {
    const res = await api.get(`/api/knowledge-base/${id}`);
    return extractData(res);
  },

  create: async (data: any) => {
    const res = await api.post('/api/knowledge-base', data);
    return extractData(res);
  },

  update: async (data: any) => {
    const res = await api.put(`/api/knowledge-base/${data.id}`, data);
    return extractData(res);
  },

  delete: async (id: number) => {
    const res = await api.delete(`/api/knowledge-base/${id}`);
    return extractData(res);
  },

  uploadAttachment: async (kbId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post(`/api/knowledge-base/${kbId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return extractData(res);
  },

  getAttachments: async (kbId: number) => {
    const res = await api.get(`/api/knowledge-base/${kbId}/attachments`);
    return extractData<any[]>(res) || [];
  },

  deleteAttachment: async (kbId: number, filename: string) => {
    const res = await api.delete(`/api/knowledge-base/${kbId}/attachments/${filename}`);
    return extractData(res);
  },
};
