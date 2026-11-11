import api from './axios';

export const accountsApi = {
  create:          ()         => api.post('/api/accounts'),
  getOwn:          ()         => api.get('/api/accounts'),
  getById:         (id)       => api.get(`/api/accounts/${id}`),
  adminGetAll:     (params)   => api.get('/api/admin/accounts', { params }),
  adminUpdateStatus: (id, status) => api.patch(`/api/admin/accounts/${id}/status`, { status }),
  adminDemoCredit: (id, amountPaise, idempotencyKey) =>
    api.post(`/api/admin/accounts/${id}/demo-credit`, { amountPaise }, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
};
