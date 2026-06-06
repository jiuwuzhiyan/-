import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Space } from 'antd'
import {
  InboxOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { materialService, inboundService, outboundService, returnService, approvalService } from '../services/api'
import dayjs from 'dayjs'

interface DashboardProps {
  user: any
}

const Dashboard = ({ user }: DashboardProps) => {
  const [stats, setStats] = useState({
    totalMaterials: 0,
    pendingApproval: 0,
    lowStockItems: 0
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [materials, inbound, outbound, returns, pendingApprovals] = await Promise.all([
        materialService.list(),
        inboundService.list(),
        outboundService.list(),
        returnService.list(),
        approvalService.listPending()
      ])

      const lowStock = materials.data?.filter((m: any) => m.current_stock <= m.min_stock).length || 0
      const pendingCount = pendingApprovals.data?.length || 0

      setStats({
        totalMaterials: materials.data?.length || 0,
        pendingApproval: pendingCount,
        lowStockItems: lowStock
      })

      // 合并最近的单据
      const allOrders = [
        ...(inbound.data || []).map((o: any) => ({ ...o, type: '入库单', typeTag: 'inbound' })),
        ...(outbound.data || []).map((o: any) => ({ ...o, type: '出库单', typeTag: 'outbound' })),
        ...(returns.data || []).map((o: any) => ({ ...o, type: '回库单', typeTag: 'return' }))
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)

      setRecentOrders(allOrders)
    } catch (error) {
      console.error('加载数据失败', error)
    }
  }

  const getStatusTag = (status: string) => {
    const map: Record<string, { color: string; text: string }> = {
      pending: { color: 'orange', text: '待审批' },
      approved: { color: 'green', text: '已通过' },
      rejected: { color: 'red', text: '已驳回' }
    }
    const item = map[status] || { color: 'default', text: status }
    return <Tag color={item.color}>{item.text}</Tag>
  }

  const columns = [
    { title: '单据编号', dataIndex: 'order_no', key: 'order_no', width: 150 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 80 },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80, render: (v: string) => getStatusTag(v) },
    { title: '提交人', dataIndex: 'submitter_name', key: 'submitter_name', width: 100 },
    { title: '提交时间', dataIndex: 'created_at', key: 'created_at', width: 160, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') }
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>工作台</h2>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="物资种类"
              value={stats.totalMaterials}
              prefix={<InboxOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="待审批单据"
              value={stats.pendingApproval}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: stats.pendingApproval > 0 ? '#faad14' : undefined }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="库存预警"
              value={stats.lowStockItems}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: stats.lowStockItems > 0 ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="最近单据">
        <Table
          columns={columns}
          dataSource={recentOrders}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}

export default Dashboard