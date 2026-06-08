import { useState, useEffect } from 'react'
import { Table, Modal, Form, Input, InputNumber, message, Space, Select, Upload, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SendOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons'
import { outboundService, materialService } from '../services/api'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { GlassCard, GradientButton } from '../components'
import './Orders.css'

interface OutboundOrdersProps {
  user: any
}

interface OrderItem {
  material_id: number
  material_name?: string
  spec?: string
  model?: string
  unit?: string
  quantity: number
  remark?: string
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
      const [ordersRes, materialsRes] = await Promise.all([
        outboundService.list(),
        materialService.list()
      ])
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
    setItems([{ material_id: 0, quantity: 1, remark: '' }])
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

  const downloadTemplate = () => {
    const templateData = [
      {
        '物资名称': '示例物资',
        '数量': 5,
        '备注': '示例备注'
      }
    ]
    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '出库导入模板')
    XLSX.writeFile(wb, '出库导入模板.xlsx')
    message.success('模板下载成功')
  }

  const handleImport = (file: any) => {
    try {
      const reader = new FileReader()
      reader.onload = (e: any) => {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        if (jsonData.length === 0) {
          message.error('模板为空')
          return
        }

        const importedItems = jsonData.map((row: any) => {
          const materialName = String(row['物资名称'] || '')
          const material = materials.find(m => m.name === materialName)
          
          if (!material) {
            message.warning(`物资 "${materialName}" 未找到，已跳过`)
            return null
          }
          
          return {
            material_id: material.id,
            material_name: material.name,
            spec: material.spec,
            model: material.model,
            unit: material.unit,
            quantity: Number(row['数量'] || 1),
            remark: String(row['备注'] || '')
          }
        }).filter(item => item !== null) as OrderItem[]

        if (importedItems.length > 0) {
          setItems(importedItems)
          message.success(`成功导入 ${importedItems.length} 条物资`)
        }
      }
      reader.readAsArrayBuffer(file)
    } catch (error) {
      message.error('导入失败')
    }
    return false
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      const orderData = {
        department: values.department,
        receiver: values.receiver,
        items: items.map(item => ({
          material_id: item.material_id,
          quantity: item.quantity,
          remark: item.remark || ''
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
          material_id: material.id,
          material_name: material.name,
          spec: material.spec,
          model: material.model,
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
    setItems([...items, { material_id: 0, quantity: 1, remark: '' }])
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
    const map: Record<string, { className: string; text: string }> = {
      draft: { className: 'status-tag draft', text: '草稿' },
      pending: { className: 'status-tag pending', text: '待审批' },
      approved: { className: 'status-tag approved', text: '已通过' },
      rejected: { className: 'status-tag rejected', text: '已驳回' }
    }
    const item = map[status] || { className: 'status-tag', text: status }
    return <span className={item.className}>{item.text}</span>
  }

  const getPendingApprover = (record: any) => {
    if (record.status !== 'pending') return null
    const pending: string[] = []
    if (!record.finance_approver_id) pending.push('财务')
    if (!record.admin_approver_id) pending.push('行政')
    if (pending.length === 0) return null
    return (
      <div className="approval-progress">
        <span className="pending-text">待审批：{pending.join('、')}</span>
        <div className="approval-status">
          {record.finance_approver_id && <span className="approval-finished">✓ 财务已审批</span>}
          {record.finance_approver_id && !record.admin_approver_id && <span className="separator"> </span>}
          {record.admin_approver_id && <span className="approval-finished">✓ 行政已审批</span>}
        </div>
      </div>
    )
  }

  const columns = [
    { 
      title: '单据编号', 
      dataIndex: 'order_no', 
      key: 'order_no',
      render: (v: string) => <span className="order-no">{v}</span>
    },
    { title: '领用部门', dataIndex: 'department', key: 'department' },
    { title: '领用人', dataIndex: 'receiver', key: 'receiver' },
    { title: '物资明细', dataIndex: 'materialNames', key: 'materialNames', ellipsis: true },
    { title: '数量', dataIndex: 'totalQty', key: 'totalQty' },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      render: (v: string, record: any) => (
        <Space direction="vertical" size={0}>
          {getStatusTag(v)}
          {getPendingApprover(record)}
        </Space>
      ) 
    },
    { title: '驳回原因', dataIndex: 'reject_reason', key: 'reject_reason', ellipsis: true },
    { 
      title: '提交时间', 
      dataIndex: 'created_at', 
      key: 'created_at', 
      render: (v: string) => <span className="time-text">{v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'}</span> 
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => viewDetail(record)} className="action-link">详情</a>
          {(record.status === 'draft' || record.status === 'rejected') && user.role === 'business' && (
            <a onClick={() => showEditModal(record)} className="action-link">
              <EditOutlined /> 修改
            </a>
          )}
          {(record.status === 'draft' || record.status === 'rejected') && user.role === 'business' && (
            <Popconfirm title="确定提交此单据？" onConfirm={() => handleSubmitOrder(record.id)}>
              <a className="action-link submit">
                <SendOutlined /> 提交
              </a>
            </Popconfirm>
          )}
          {record.status === 'draft' && user.role === 'business' && (
            <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
              <a className="action-link delete">
                <DeleteOutlined /> 删除
              </a>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  const isMyOrder = user.role === 'business'

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <h1 className="page-title">出库管理</h1>
        {isMyOrder && (
          <Space>
            <GradientButton icon={<DownloadOutlined />} onClick={downloadTemplate} gradient="purple">
              下载模板
            </GradientButton>
            <GradientButton icon={<PlusOutlined />} onClick={showAddModal} gradient="purple">
              新增出库单
            </GradientButton>
          </Space>
        )}
      </div>

      <GlassCard className="table-card animate-fade-in" gradient="purple">
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="dark-table"
        />
      </GlassCard>

      <Modal
        title={editingOrder ? '编辑出库单' : '新增出库单'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={1000}
        okText="保存"
        cancelText="取消"
        className="dark-modal"
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

          <div className="items-section">
            <div className="section-header">
              <span className="section-title">物资明细</span>
              <Space>
                <Upload beforeUpload={handleImport} showUploadList={false} accept=".xlsx,.xls">
                  <a className="upload-link"><UploadOutlined />批量导入</a>
                </Upload>
                <a className="upload-link" onClick={addItem}>+ 添加物资</a>
              </Space>
            </div>

            {items.map((item, index) => (
              <div key={index} className="item-row">
                <div className="item-field">
                  <label className="field-label">选择物资*</label>
                  <Select
                    placeholder="请选择物资"
                    style={{ width: '100%' }}
                    value={item.material_id || undefined}
                    onChange={(value) => selectMaterial(index, value)}
                  >
                    {materials.map(m => (
                      <Select.Option key={m.id} value={m.id}>
                        {m.name} ({m.spec} {m.model}) - 库存: {m.current_stock} {m.unit}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                <div className="item-field small">
                  <label className="field-label">数量*</label>
                  <InputNumber
                    placeholder="数量"
                    style={{ width: '100%' }}
                    value={item.quantity}
                    onChange={(value) => updateItem(index, 'quantity', value)}
                    min={1}
                  />
                </div>
                <div className="item-field">
                  <label className="field-label">备注</label>
                  <Input
                    placeholder="备注"
                    value={item.remark || ''}
                    onChange={(e) => updateItem(index, 'remark', e.target.value)}
                  />
                </div>
                {items.length > 1 && (
                  <a className="remove-item" onClick={() => removeItem(index)}>删除</a>
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
        width={700}
        className="dark-modal"
      >
        {detailData && (
          <div className="detail-content">
            <p><strong>单据编号：</strong>{detailData.order_no}</p>
            <p><strong>领用部门：</strong>{detailData.department}</p>
            <p><strong>领用人：</strong>{detailData.receiver}</p>
            <p><strong>状态：</strong>{getStatusTag(detailData.status)}</p>
            {detailData.reject_reason && (
              <p><strong>驳回原因：</strong>{detailData.reject_reason}</p>
            )}
            <p><strong>提交时间：</strong><span className="time-text">{detailData.created_at ? dayjs(detailData.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</span></p>

            <h4>物资明细</h4>
            <Table
              dataSource={detailData.items}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: '物资名称', dataIndex: 'material_name', key: 'material_name' },
                { title: '规格', dataIndex: 'spec', key: 'spec' },
                { title: '到期日', dataIndex: 'model', key: 'model' },
                { title: '单位', dataIndex: 'unit', key: 'unit' },
                { title: '数量', dataIndex: 'quantity', key: 'quantity' },
                { title: '备注', dataIndex: 'remark', key: 'remark' }
              ]}
              className="dark-table"
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default OutboundOrders
