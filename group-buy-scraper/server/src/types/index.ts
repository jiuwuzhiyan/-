export interface Shop {
  id?: number;
  platform: 'douyin' | 'meituan';
  shopName: string;
  address?: string;
  rating?: number;
  sales?: number;
  district: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Package {
  id?: number;
  shopId: number;
  packageName: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  sales?: number;
  createdAt?: string;
}

export interface Review {
  id?: number;
  shopId: number;
  userName?: string;
  rating?: number;
  content?: string;
  reviewTime?: string;
  createdAt?: string;
}

export interface Task {
  id?: number;
  platform: 'douyin' | 'meituan' | 'both';
  district: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  createdAt?: string;
}

export interface CronJob {
  id?: number;
  name: string;
  cronExpression: string;
  platform: 'douyin' | 'meituan' | 'both';
  district: string;
  enabled: boolean;
  createdAt?: string;
}
