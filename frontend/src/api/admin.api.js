import api from './axios';

export const adminApi = {
  getDashboard:    ()       => api.get('/api/admin/dashboard'),
  getUsers:        (params) => api.get('/api/admin/users', { params }),
  getTransactions: (params) => api.get('/api/admin/transactions', { params }),
  getAuditLogs:    (params) => api.get('/api/admin/audit-logs', { params }),
  verifyLedger:    ()       => api.get('/api/admin/ledger/verify'),
};
