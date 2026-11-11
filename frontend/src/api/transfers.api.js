import api from './axios';

export const transfersApi = {
  initiate: (data) =>
    api.post('/api/transfers', data, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    }),
  getOwn:   (params) => api.get('/api/transfers', { params }),
  getById:  (id)     => api.get(`/api/transfers/${id}`),
  getLedger: (params) => api.get('/api/ledger', { params }),
};
