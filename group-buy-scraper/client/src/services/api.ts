import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export const taskApi = {
  create: (platform: string, district: string) => 
    api.post('/tasks', { platform, district }),
  list: () => 
    api.get('/tasks'),
}

export const shopApi = {
  list: (params?: { platform?: string; district?: string; page?: number; limit?: number }) => 
    api.get('/shops', { params }),
  getPackages: (shopId: number) => 
    api.get(`/shops/${shopId}/packages`),
  getReviews: (shopId: number) => 
    api.get(`/shops/${shopId}/reviews`),
  getDistricts: () => 
    api.get('/districts'),
}

export const cronJobApi = {
  create: (name: string, cronExpression: string, platform: string, district: string) => 
    api.post('/cron-jobs', { name, cronExpression, platform, district }),
  list: () => 
    api.get('/cron-jobs'),
  delete: (jobId: number) => 
    api.delete(`/cron-jobs/${jobId}`),
}

export const exportApi = {
  toExcel: (params?: { platform?: string; district?: string }) => {
    const query = new URLSearchParams()
    if (params?.platform) query.append('platform', params.platform)
    if (params?.district) query.append('district', params.district)
    window.open(`/api/export/excel?${query.toString()}`, '_blank')
  },
  toCSV: (params?: { platform?: string; district?: string }) => {
    const query = new URLSearchParams()
    if (params?.platform) query.append('platform', params.platform)
    if (params?.district) query.append('district', params.district)
    window.open(`/api/export/csv?${query.toString()}`, '_blank')
  },
  toJSON: (params?: { platform?: string; district?: string }) => {
    const query = new URLSearchParams()
    if (params?.platform) query.append('platform', params.platform)
    if (params?.district) query.append('district', params.district)
    window.open(`/api/export/json?${query.toString()}`, '_blank')
  },
}

export default api
