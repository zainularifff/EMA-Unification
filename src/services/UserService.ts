import api from './api';
import { extractData } from './response';

export const userTypes = {
  getAll: async () => {
    const res = await api.get('/api/user-types');
    return extractData<any[]>(res) || [];
  },

  get: async (id: number) => {
    const res = await api.get(`/api/user-types/${id}`);
    return extractData(res);
  },

  create: async (data: any) => {
    const res = await api.post('/api/user-types', data);
    return extractData(res);
  },

  update: async (id: number, data: any) => {
    const res = await api.put(`/api/user-types/${id}`, data);
    return extractData(res);
  },

  delete: async (id: number) => {
    const res = await api.delete(`/api/user-types/${id}`);
    return extractData(res);
  },
};

export const users = {
  getAll: async () => {
    const res = await api.get('/api/users');
    return extractData<any[]>(res) || [];
  },

  get: async (id: string) => {
    const res = await api.get(`/api/users/${id}`);
    return extractData(res);
  },

  create: async (data: any) => {
    const res = await api.post('/api/users', data);
    return extractData(res);
  },

  update: async (id: string, data: any) => {
    const res = await api.put(`/api/users/${id}`, data);
    return extractData(res);
  },

  delete: async (id: string) => {
    const res = await api.delete(`/api/users/${id}`);
    return extractData(res);
  },
};

export const roles = {
  getAll: async () => {
    const res = await api.get('/api/roles');
    return extractData<any[]>(res) || [];
  },

  get: async (id: string) => {
    const res = await api.get(`/api/roles/${id}`);
    return extractData(res);
  },

  create: async (data: any) => {
    const res = await api.post('/api/roles', data);
    return extractData(res);
  },

  update: async (id: string, data: any) => {
    const res = await api.put(`/api/roles/${id}`, data);
    return extractData(res);
  },

  delete: async (id: string) => {
    const res = await api.delete(`/api/roles/${id}`);
    return extractData(res);
  },
};
