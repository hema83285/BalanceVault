import api from './axios';

export const onboardingApi = {
  submit:      (data) => api.post('/api/onboarding', data),
  getStatus:   ()     => api.get('/api/onboarding/status'),
  adminGetAll: (params) => api.get('/api/admin/onboarding', { params }),
  adminReview: (id, data) => api.patch(`/api/admin/onboarding/${id}`, data),
};
