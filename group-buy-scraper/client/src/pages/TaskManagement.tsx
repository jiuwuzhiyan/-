import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Card, Table, Tag, Progress, message } from 'antd'
import { taskApi } from '../services/api'
import { setTasks, setLoading } from '../store/appSlice'
import { RootState } from '../store'

const TaskManagement: React.FC = () => {
  const dispatch = useDispatch()
  const { tasks } = useSelector((state: RootState) => state.app)

  const loadTasks = async () => {
    try {
      dispatch(setLoading(true))
      const res = await taskApi.list()
      if (res.data.success) {
        dispatch(setTasks(res.data.tasks))
      }
    } catch (error) {
      message.error('加载任务失败')
    } finally {
      dispatch(setLoading(false))
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const getPlatformText = (platform: string) => {
    const map: Record<string, string> = {
      douyin: '抖音',
      meituan: '美团',
      both: '双平台'
    }
    return map[platform] || platform
  }

  const getStatusTag = (status: string) => {
    const map: Record<string, any> = {
      pending: { color: 'default', text: '等待中' },
      running: { color: 'processing', text: '运行中' },
      completed: { color: 'success', text: '已完成' },
      failed: { color: 'error', text: '失败' }
    }
    const info = map[status] || { color: 'default', text: status }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      width: 100,
      render: getPlatformText
    },
    {
      title: '商圈',
      dataIndex: 'district',
      key: 'district'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: getStatusTag
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 200,
      render: (progress: number, record: any) => (
        <Progress 
          percent={progress} 
          status={record.status === 'completed' ? 'success' : record.status === 'failed' ? 'exception' : 'active'}
          size="small"
        />
      )
    },
    {
      title: '开始时间',
      dataIndex: 'started_at',
      key: 'started_at'
    },
    {
      title: '完成时间',
      dataIndex: 'completed_at',
      key: 'completed_at'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at'
    },
    {
      title: '错误信息',
      dataIndex: 'error_message',
      key: 'error_message'
    }
  ]

  return (
    <div>
      <Card title="任务管理">
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )
}

export default TaskManagement
