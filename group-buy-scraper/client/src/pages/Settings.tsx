import React, { useEffect, useState } from 'react'
import { Card, Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { cronJobApi } from '../services/api'

const { Option } = Select

interface CronJob {
  id: number
  name: string
  cron_expression: string
  platform: string
  district: string
  enabled: number
  created_at: string
}

const Settings: React.FC = () => {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()

  const loadJobs = async () => {
    try {
      const res = await cronJobApi.list()
      if (res.data.success) {
        setJobs(res.data.jobs)
      }
    } catch (error) {
      message.error('加载定时任务失败')
    }
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const handleSubmit = async (values: any) => {
    try {
      const res = await cronJobApi.create(values.name, values.cronExpression, values.platform, values.district)
      if (res.data.success) {
        message.success('定时任务创建成功')
        setModalVisible(false)
        form.resetFields()
        loadJobs()
      }
    } catch (error) {
      message.error('创建定时任务失败')
    }
  }

  const handleDelete = async (jobId: number) => {
    try {
      const res = await cronJobApi.delete(jobId)
      if (res.data.success) {
        message.success('定时任务删除成功')
        loadJobs()
      }
    } catch (error) {
      message.error('删除定时任务失败')
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

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Cron表达式',
      dataIndex: 'cron_expression',
      key: 'cron_expression'
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      render: getPlatformText
    },
    {
      title: '商圈',
      dataIndex: 'district',
      key: 'district'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: CronJob) => (
        <Space>
          <Popconfirm
            title="确定要删除这个定时任务吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Card 
        title="定时任务管理" 
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
            添加定时任务
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={jobs}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="添加定时任务"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="任务名称"
            name="name"
            rules={[{ required: true, message: '请输入任务名称' }]}
          >
            <Input placeholder="例如：每日采集" />
          </Form.Item>

          <Form.Item
            label="Cron表达式"
            name="cronExpression"
            rules={[{ required: true, message: '请输入Cron表达式' }]}
            extra="例如：0 0 * * * 表示每天0点执行"
          >
            <Input placeholder="0 0 * * *" />
          </Form.Item>

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
            <Space>
              <Button type="primary" htmlType="submit">创建</Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Settings
