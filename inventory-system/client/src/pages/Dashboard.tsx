import { useState, useEffect } from 'react'
import { Row, Col, Table, Tag } from 'antd'
import {
  InboxOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ExportOutlined
} from '@ant-design/icons'
import { materialService, inboundService, outboundService, returnService, approvalService } from '../services/api'
import { GlassCard } from '../components'
import dayjs from 'dayjs'
import './Dashboard.css'

interface DashboardProps {
  user: any
}

interface StatCardData {
  title: string
  value: number
  icon: React.ReactNode
  gradient: 'blue' | 'purple' | 'green' | 'orange'
  suffix?: string
}

const Dashboard = ({ user }: DashboardProps) => {
  const [stats, setStats] = useState({
    todayInbound: 0,
    todayOutbound: 0,
    pendingApproval: 0,
    totalStock: 0
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

      const today = dayjs().format('YYYY-MM-DD')
      
      // 今日入库数
      const todayInboundCount = (inbound.data || []).filter((o: any) => 
        dayjs(o.created_at).format('YYYY-MM-DD') === today
      ).length
      
      // 今日出库数
      const todayOutboundCount = (outbound.data || []).filter((o: any) => 
        dayjs(o.created_at).format('YYYY-MM-DD') === today
      ).length
      
      // 库存总量
      const totalStock = (materials.data || []).reduce((sum: number, m: any) => 
        sum + (m.current_stock || 0), 0
      )
      
      const pendingCount = pendingApprovals.data?.length || 0

      setStats({
        todayInbound: todayInboundCount,
        todayOutbound: todayOutboundCount,
        pendingApproval: pendingCount,
        totalStock: totalStock
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
    const map: Record<string, { className: string; text: string }> = {
      pending: { className: 'status-tag pending', text: '待审批' },
      approved: { className: 'status-tag approved', text: '已通过' },
      rejected: { className: 'status-tag rejected', text: '已驳回' },
      draft: { className: 'status-tag draft', text: '草稿' }
    }
    const item = map[status] || { className: 'status-tag', text: status }
    return <span className={item.className}>{item.text}</span>
  }

  const statCards: StatCardData[] = [
    {
      title: '今日入库',
      value: stats.todayInbound,
      icon: <InboxOutlined />,
      gradient: 'blue',
      suffix: '单'
    },
    {
      title: '今日出库',
      value: stats.todayOutbound,
      icon: <ExportOutlined />,
      gradient: 'purple',
      suffix: '单'
    },
    {
      title: '待审批',
      value: stats.pendingApproval,
      icon: <ClockCircleOutlined />,
      gradient: 'orange',
      suffix: '单'
    },
    {
      title: '库存总量',
      value: stats.totalStock,
      icon: <DatabaseOutlined />,
      gradient: 'green',
      suffix: '件'
    }
  ]

  const columns = [
    { 
      title: '单据编号', 
      dataIndex: 'order_no', 
      key: 'order_no', 
      width: 150,
      render: (v: string) => <span className="order-no">{v}</span>
    },
    { 
      title: '类型', 
      dataIndex: 'type', 
      key: 'type', 
      width: 80,
      render: (v: string, record: any) => {
        const colorMap: Record<string, string> = {
          inbound: '#1890ff',
          outbound: '#667eea',
          return: '#52c41a'
        }
        return <Tag color={colorMap[record.typeTag] || 'default'}>{v}</Tag>
      }
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      width: 80, 
      render: (v: string) => getStatusTag(v) 
    },
    { 
      title: '提交人', 
      dataIndex: 'submitter_name', 
      key: 'submitter_name', 
      width: 100 
    },
    { 
      title: '提交时间', 
      dataIndex: 'created_at', 
      key: 'created_at', 
      width: 160, 
      render: (v: string) => <span className="time-text">{dayjs(v).format('YYYY-MM-DD HH:mm')}</span>
    }
  ]

  return (
    <div className="dashboard-container">
      {/* 页面标题 */}
      <h1 className="page-title animate-fade-in">工作台</h1>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} className="stat-cards-row">
        {statCards.map((card, index) => (
          <Col xs={24} sm={12} lg={6} key={card.title}>
            <GlassCard 
              gradient={card.gradient}
              className={`stat-card-wrapper animate-fade-in`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="stat-card-content">
                <div className="stat-icon" style={{ 
                  background: `linear-gradient(135deg, ${card.gradient === 'blue' ? '#1890ff, #00d4ff' : 
                    card.gradient === 'purple' ? '#667eea, #764ba2' : 
                    card.gradient === 'green' ? '#52c41a, #73d13d' : '#faad14, #ff8c00'})` 
                }}>
                  {card.icon}
                </div>
                <div className="stat-info">
                  <div className="stat-value">{card.value}<span className="stat-suffix">{card.suffix}</span></div>
                  <div className="stat-label">{card.title}</div>
                </div>
              </div>
            </GlassCard>
          </Col>
        ))}
      </Row>

      {/* 最近单据 */}
      <GlassCard title="最近单据" className="recent-orders-card animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <Table
          columns={columns}
          dataSource={recentOrders}
          rowKey="id"
          pagination={false}
          size="middle"
          className="dark-table"
        />
      </GlassCard>
    </div>
  )
}

export default Dashboard
