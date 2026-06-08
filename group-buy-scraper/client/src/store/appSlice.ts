import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Task {
  id: number
  platform: string
  district: string
  status: string
  progress: number
  started_at?: string
  completed_at?: string
  error_message?: string
  created_at: string
}

interface Shop {
  id: number
  platform: string
  shop_name: string
  address?: string
  rating?: number
  sales?: number
  district: string
  created_at: string
}

interface AppState {
  tasks: Task[]
  shops: Shop[]
  districts: string[]
  loading: boolean
}

const initialState: AppState = {
  tasks: [],
  shops: [],
  districts: [],
  loading: false,
}

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.tasks = action.payload
    },
    setShops: (state, action: PayloadAction<Shop[]>) => {
      state.shops = action.payload
    },
    setDistricts: (state, action: PayloadAction<string[]>) => {
      state.districts = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    updateTaskProgress: (state, action: PayloadAction<{ taskId: number; progress: number; status: string }>) => {
      const task = state.tasks.find(t => t.id === action.payload.taskId)
      if (task) {
        task.progress = action.payload.progress
        task.status = action.payload.status
      }
    },
  },
})

export const { setTasks, setShops, setDistricts, setLoading, updateTaskProgress } = appSlice.actions

export default appSlice.reducer
