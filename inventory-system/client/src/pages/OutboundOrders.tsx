import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, message, Tag, Space, Popconfirm, Select } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SendOutlined } from '@ant-design/icons'
import { outboundService, materialService } from '../services/api'
import dayjs from 'dayjs'

interface OutboundOrdersProps {
  user: any
}

interface OrderItem {
  material_id: number
  material_name?: string
  specification?: string
  unit?: string
  quantity: number
}

const OutboundOrders = ({ user }: OutboundOrdersProps) => {
  const [orders, setOrders] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingOrder, setEditingOrder] = useState<any>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [form] = Form.useForm()
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [detailData, setDetailData] = useState<any>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      console.log('加载出库单列表')
      const [ordersRes, materialsRes] = await Promise.all([
        outboundService.list(),
        materialService.list()
      ])
      console.log('出库单数据:', ordersRes.data)
      setOrders(ordersRes.data || [])
      setMaterials(materialsRes.data || [])
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
    setItems([{ material_id: 0, quantity: 1 }])
    form.resetFields()
    setModalVisible(true)
  }

  const showEditModal = async (record: any) => {
    try {
      const res = await outboundService.getById(record.id)
      setEditingOrder(record)
      setItems(res.data.items || [])
      form.setFieldsValue({
        department: res.data.department,
        receiver: res.data.receiver,
      })
      setModalVisible(true)
    } catch (error) {
      message.error('加载出库单详情失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      console.log('提交出库单:', { department: values.department, receiver: values.receiver, items })

      const orderData = {
        department: values.department,
        receiver: values.receiver,
        items: items.map(item => ({
          material_id: item.material_id,
          quantity: item.quantity
        }))
      }

      if (editingOrder) {
        await outboundService.update(editingOrder.id, orderData)
        message.success('修改成功')
      } else {
        await outboundService.create(orderData)
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
      await outboundService.delete(id)
      message.success('删除成功')
      loadData()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmitOrder = async (id: number) => {
    try {
      await outboundService.submit(id)
      message.success('提交成功，单据已进入审批流程')
      loadData()
    } catch (error) {
      message.error('提交失败')
    }
  }

  const selectMaterial = (index: number, materialId: number | null) => {
    if (materialId) {
      const material = materials.find(m => m.id === materialId)
      if (material) {
        const newItems = [...items]
        newItems[index] = {
          ...newItems[index],
          material_id: materialId,
          material_name: material.name,
          specification: material.specification,
          unit: material.unit
        }
        setItems(newItems)
      }
    }
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, { material_id: 0, quantity: 1 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const viewDetail = async (record: any) => {
    try {
      const res = await outboundService.getById(record.id)
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
    { title: '领用部门', dataIndex: 'department', key: 'department' },
    { title: '领用人', dataIndex: 'receiver', key: 'receiver' },
    { title: '物资明细', dataIndex: 'materialNames', key: 'materialNames', ellipsis: true },
    { title: '数量', dataIndex: 'totalQty', key: 'totalQty' },
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
        <h2>出库管理</h2>
        {isMyOrder && (
          <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
            新增出库单
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
        title={editingOrder ? '编辑出库单' : '新增出库单'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={900}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item label="领用部门" name="department" rules={[{ required: true, message: '请输入领用部门' }]} style={{ flex: 1 }}>
              <Input placeholder="请输入领用部门" />
            </Form.Item>
            <Form.Item label="领用人" name="receiver" rules={[{ required: true, message: '请输入领用人' }]} style={{ flex: 1 }}>
              <Input placeholder="请输入领用人" />
            </Form.Item>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 500 }}>物资明细</span>
              <Button type="link" onClick={addItem}>+ 添加物资</Button>
            </div>

            {items.map((item, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 12, padding: 8, background: '#f9f9f9', borderRadius: 4, alignItems: 'flex-start' }}>
                <div style={{ flex: 1.5 }}>
                  <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>选择物资*</label>
                  <Select
                    placeholder="请选择物资"
                    style={{ width: '100%' }}
                    value={item.material_id || undefined}
                    onChange={(value) => selectMaterial(index, value)}
                  >
                    {materials.map(m => (
                      <Select.Option key={m.id} value={m.id}>
                        {m.name} ({m.specification}) - 库存: {m.current_stock} {m.unit}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                <div style={{ width: 120 }}>
                  <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>数量*</label>
                  <InputNumber
                    placeholder="数量"
                    style={{ width: '100%' }}
                    value={item.quantity}
                    onChange={(value) => updateItem(index, 'quantity', value)}
                    min={1}
                  />
                </div>
                {items.length > 1 && (
                  <Button type="link" danger onClick={() => removeItem(index)} style={{ marginTop: 24 }}>删除</Button>
                )}
              </div>
            ))}
          </div>
        </Form>
      </Modal>

      <Modal
        title="出库单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {detailData && (
          <div>
            <p><strong>单据编号：</strong>{detailData.order_no}</p>
            <p><strong>领用部门：</strong>{detailData.department}</p>
            <p><strong>领用人：</strong>{detailData.receiver}</p>
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
                { title: '单位', dataIndex: 'unit', key: 'unit' },
                { title: '数量', dataIndex: 'quantity', key: 'quantity' }
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default OutboundOrders
