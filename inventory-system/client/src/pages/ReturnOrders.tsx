import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, message, Tag, Space, Popconfirm, Select } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SendOutlined } from '@ant-design/icons'
import { returnService, outboundService } from '../services/api'
import dayjs from 'dayjs'

interface ReturnOrdersProps {
  user: any
}

interface OrderItem {
  material_id: number
  material_name?: string
  specification?: string
  quantity: number
}

const ReturnOrders = ({ user }: ReturnOrdersProps) => {
  const [orders, setOrders] = useState<any[]>([])
  const [outboundOrders, setOutboundOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingOrder, setEditingOrder] = useState<any>(null)
  const [selectedOutbound, setSelectedOutbound] = useState<any>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [form] = Form.useForm()
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [detailData, setDetailData] = useState<any>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [ordersRes, outboundRes] = await Promise.all([
        returnService.list(),
        outboundService.list()
      ])
      const approvedOutbound = (outboundRes.data || []).filter((o: any) => o.status === 'approved')
      setOrders(ordersRes.data || [])
      setOutboundOrders(approvedOutbound)
    } catch (error) {
      console.error('加载数据失败:', error)
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const showAddModal = () => {
    setEditingOrder(null)
    setSelectedOutbound(null)
    setItems([])
    form.resetFields()
    setModalVisible(true)
  }

  const showEditModal = async (record: any) => {
    try {
      const res = await returnService.getById(record.id)
      const outboundRes = await outboundService.getById(record.outbound_order_id)
      setEditingOrder(record)
      setSelectedOutbound(outboundRes.data)
      setItems(res.data.items || [])
      form.setFieldsValue({
        outbound_order_id: record.outbound_order_id
      })
      setModalVisible(true)
    } catch (error) {
      message.error('加载回库单详情失败')
    }
  }

  const handleOutboundChange = async (outboundId: number) => {
    try {
      const res = await outboundService.getById(outboundId)
      setSelectedOutbound(res.data)
      const returnItems = (res.data.items || []).map((item: any) => ({
        material_id: item.material_id,
        material_name: item.material_name,
        specification: item.specification,
        quantity: item.quantity
      }))
      setItems(returnItems)
    } catch (error) {
      message.error('加载出库单详情失败')
    }
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      const orderData = {
        outbound_order_id: values.outbound_order_id,
        items: items.map(item => ({
          material_id: item.material_id,
          quantity: item.quantity
        }))
      }

      if (editingOrder) {
        await returnService.update(editingOrder.id, orderData)
        message.success('修改成功')
      } else {
        await returnService.create(orderData)
        message.success('创建成功')
      }

      setModalVisible(false)
      loadData()
    } catch (error: any) {
      console.error('提交失败:', error)
      if (!error.errorFields) {
        message.error(error.response?.data?.msg || '操作失败')
      }
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await returnService.delete(id)
      message.success('删除成功')
      loadData()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmitOrder = async (id: number) => {
    try {
      await returnService.submit(id)
      message.success('提交成功，单据已进入审批流程')
      loadData()
    } catch (error) {
      message.error('提交失败')
    }
  }

  const viewDetail = async (record: any) => {
    try {
      const res = await returnService.getById(record.id)
      setDetailData(res.data)
      setDetailModalVisible(true)
    } catch (error) {
      message.error('加载详情失败')
    }
  }

  const getStatusTag = (status: string) => {
    const map: Record<string, { color: string; text: string }> = {
      draft: { color: 'default', text: '草稿' },
      pending: { color: 'orange', text: '待审批' },
      approved: { color: 'green', text: '已通过' },
      rejected: { color: 'red', text: '已驳回' }
    }
    return <Tag color={map[status]?.color}>{map[status]?.text || status}</Tag>
  }

  const getPendingApprover = (record: any) => {
    if (record.status !== 'pending') return null
    const pending: string[] = []
    if (!record.finance_approver_id) pending.push('财务')
    if (!record.admin_approver_id) pending.push('行政')
    if (pending.length === 0) return null
    return (
      <div>
        <span style={{ color: '#faad14' }}>待审批：{pending.join('、')}</span>
        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
          {record.finance_approver_id ? <span style={{ color: '#52c41a' }}>✓ 财务已审批</span> : ''}
          {record.finance_approver_id && !record.admin_approver_id ? ' ' : ''}
          {record.admin_approver_id ? <span style={{ color: '#52c41a' }}>✓ 行政已审批</span> : ''}
        </div>
      </div>
    )
  }

  const columns = [
    { title: '单据编号', dataIndex: 'order_no', key: 'order_no' },
    { title: '关联出库单', dataIndex: 'outbound_order_no', key: 'outbound_order_no' },
    { title: '提交人', dataIndex: 'submitter_name', key: 'submitter_name' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string, record: any) => (
      <Space direction="vertical" size={0}>
        {getStatusTag(v)}
        {getPendingApprover(record)}
      </Space>
    ) },
    { title: '驳回原因', dataIndex: 'reject_reason', key: 'reject_reason', ellipsis: true },
    { title: '提交时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => viewDetail(record)}>详情</a>
          {(record.status === 'draft' || record.status === 'rejected') && user.role === 'business' && (
            <a onClick={() => showEditModal(record)}><EditOutlined /> 修改</a>
          )}
          {(record.status === 'draft' || record.status === 'rejected') && user.role === 'business' && (
            <Popconfirm title="确定提交此单据？" onConfirm={() => handleSubmitOrder(record.id)}>
              <a><SendOutlined /> 提交</a>
            </Popconfirm>
          )}
          {record.status === 'draft' && user.role === 'business' && (
            <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
              <a style={{ color: '#ff4d4f' }}><DeleteOutlined /> 删除</a>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  const isMyOrder = user.role === 'business'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>回库管理</h2>
        {isMyOrder && (
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
            新增回库单
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={orders}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingOrder ? '编辑回库单' : '新增回库单'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="关联出库单"
            name="outbound_order_id"
            rules={[{ required: true, message: '请选择关联的出库单' }]}
          >
            <Select
              placeholder="请选择出库单"
              onChange={handleOutboundChange}
            >
              {outboundOrders.map(o => (
                <Select.Option key={o.id} value={o.id}>
                  {o.order_no} - {o.department} - {o.receiver}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectedOutbound && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>回库物资明细</div>
              {items.map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <Input
                    value={item.material_name}
                    disabled
                    style={{ width: 200, background: '#f5f5f5' }}
                  />
                  <Input
                    value={item.specification}
                    disabled
                    style={{ width: 150, background: '#f5f5f5' }}
                  />
                  <InputNumber
                    placeholder="回库数量"
                    value={item.quantity}
                    onChange={(value) => updateItem(index, 'quantity', value)}
                    min={1}
                    style={{ width: 120 }}
                  />
                </div>
              ))}
            </div>
          )}
        </Form>
      </Modal>

      <Modal
        title="回库单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {detailData && (
          <div>
            <p><strong>单据编号：</strong>{detailData.order_no}</p>
            <p><strong>关联出库单：</strong>{detailData.outbound_order_no}</p>
            <p><strong>提交人：</strong>{detailData.submitter_name}</p>
            <p><strong>状态：</strong>{getStatusTag(detailData.status)}</p>
            {detailData.reject_reason && (
              <p><strong>驳回原因：</strong>{detailData.reject_reason}</p>
            )}
            <p><strong>提交时间：</strong>{detailData.created_at ? dayjs(detailData.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</p>

            <h4 style={{ marginTop: 16 }}>物资明细</h4>
            <Table
              dataSource={detailData.items}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: '物资名称', dataIndex: 'material_name', key: 'material_name' },
                { title: '规格', dataIndex: 'specification', key: 'specification' },
                { title: '数量', dataIndex: 'quantity', key: 'quantity' }
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ReturnOrders
