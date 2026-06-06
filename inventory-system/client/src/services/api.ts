import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 认证相关
export const authService = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  getUserInfo: () => api.get('/auth/userinfo'),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { oldPassword, newPassword })
}

// 用户管理
export const userService = {
  list: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  resetPassword: (id: number, newPassword?: string) =>
    api.post(`/users/${id}/reset-password`, { newPassword })
}

// 物资管理
export const materialService = {
  list: () => api.get('/materials'),
  create: (data: any) => api.post('/materials', data),
  update: (id: number, data: any) => api.put(`/materials/${id}`, data),
  delete: (id: number) => api.delete(`/materials/${id}`)
}

// 入库单管理
export const inboundService = {
  list: () => api.get('/inbound'),
  getById: (id: number) => api.get(`/inbound/${id}`),
  create: (data: any) => api.post('/inbound', data),
  update: (id: number, data: any) => api.put(`/inbound/${id}`, data),
  delete: (id: number) => api.delete(`/inbound/${id}`),
  submit: (id: number) => api.post(`/inbound/${id}/submit`)
}

// 出库单管理
export const outboundService = {
  list: () => api.get('/outbound'),
  getById: (id: number) => api.get(`/outbound/${id}`),
  create: (data: any) => api.post('/outbound', data),
  update: (id: number, data: any) => api.put(`/outbound/${id}`, data),
  delete: (id: number) => api.delete(`/outbound/${id}`),
  submit: (id: number) => api.post(`/outbound/${id}/submit`)
}

// 回库单管理
export const returnService = {
  list: () => api.get('/return'),
  getById: (id: number) => api.get(`/return/${id}`),
  create: (data: any) => api.post('/return', data),
  update: (id: number, data: any) => api.put(`/return/${id}`, data),
  delete: (id: number) => api.delete(`/return/${id}`),
  submit: (id: number) => api.post(`/return/${id}/submit`),
  getByOutboundId: (outboundId: number) => api.get(`/return/by-outbound/${outboundId}`)
}

// 审批管理
export const approvalService = {
  listPending: () => api.get('/approval/pending'),
  approve: (id: number, type: 'inbound' | 'outbound' | 'return', data: { comment?: string }) =>
    api.post(`/approval/${type}/${id}/approve`, data),
  reject: (id: number, type: 'inbound' | 'outbound' | 'return', data: { reason: string }) =>
    api.post(`/approval/${type}/${id}/reject`, data)
}

// 库存查询
export const inventoryService = {
  list: () => api.get('/inventory'),
  getStatistics: () => api.get('/inventory/statistics')
}

// 出入库记录
export const recordService = {
  list: (params?: { startDate?: string; endDate?: string; materialName?: string; operator?: string }) =>
    api.get('/records', { params })
}

export default api