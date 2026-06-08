import React, { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Card, Form, Input, Select, Button, message, Progress, List, Tag } from 'antd'
import { taskApi } from '../services/api'
import { setLoading, updateTaskProgress } from '../store/appSlice'

const { Option } = Select

const Dashboard: React.FC = () => {
  const [form] = Form.useForm()
  const dispatch = useDispatch()
  const [currentTask, setCurrentTask] = useState<any>(null)
  const [ws, setWs] = useState<WebSocket | null>(null)

  useEffect(() => {
    const websocket = new WebSocket(`ws://localhost:3001`)
    setWs(websocket)

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'taskProgress') {
        dispatch(updateTaskProgress({ 
          taskId: data.taskId, 
          progress: data.progress, 
          status: data.status 
        }))
        setCurrentTask(prev => prev && prev.id === data.taskId ? { ...prev, progress: data.progress, status: data.status } : prev)
      }
    }

    return () => websocket.close()
  }, [dispatch])

  const handleSubmit = async (values: any) => {
    try {
      dispatch(setLoading(true))
      const res = await taskApi.create(values.platform, values.district)
      if (res.data.success) {
        message.success('任务创建成功，开始采集数据...')
        setCurrentTask({ 
          id: res.data.taskId, 
          platform: values.platform, 
          district: values.district, 
          progress: 0, 
          status: 'running' 
        })
      }
    } catch (error) {
      message.error('任务创建失败')
    } finally {
      dispatch(setLoading(false))
    }
  }

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

  return (
    <div>
      <Card title="数据采集" style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ platform: 'both' }}
        >
          <Form.Item
            label="平台选择"
            name="platform"
            rules={[{ required: true, message: '请选择平台' }]}
          >
            <Select>
              <Option value="douyin">抖音</Option>
              <Option value="meituan">美团</Option>
              <Option value="both">双平台</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="商圈名称"
            name="district"
            rules={[{ required: true, message: '请输入商圈名称' }]}
          >
            <Input placeholder="例如：中关村、朝阳大悦城" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block>
              开始采集
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {currentTask && (
        <Card title="当前任务">
          <List
            dataSource={[currentTask]}
            renderItem={(item) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      <strong>{getPlatformText(item.platform)}</strong> - {item.district}
                    </span>
                    {getStatusTag(item.status)}
                  </div>
                  <Progress percent={item.progress} status={item.status === 'completed' ? 'success' : item.status === 'failed' ? 'exception' : 'active'} />
                </div>
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  )
}

export default Dashboard
