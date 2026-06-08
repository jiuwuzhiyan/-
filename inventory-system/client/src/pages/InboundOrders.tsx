import { useState, useEffect } from 'react'
import { Table, Modal, Form, Input, InputNumber, message, Space, Upload } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SendOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons'
import { inboundService } from '../services/api'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { GlassCard, GradientButton } from '../components'
import './Orders.css'

interface InboundOrdersProps {
  user: any
}

interface OrderItem {
  material_name: string
  spec?: string
  model?: string
  unit?: string
  quantity: number
  unit_price: number
  total_price: number
  supplier?: string
  remark?: string
}

const InboundOrders = ({ user }: InboundOrdersProps) => {
  const [orders, setOrders] = useState<any[]>([])
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
      const res = await inboundService.list()
      setOrders(res.data || [])
    } catch (error) {
      console.error('Failed to load orders:', error)
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
    setItems([{ material_name: '', spec: '', model: '', unit: '', quantity: 1, unit_price: 0, total_price: 0, supplier: '', remark: '' }])
    form.resetFields()
    setModalVisible(true)
  }

  const showEditModal = async (record: any) => {
    try {
      const res = await inboundService.getById(record.id)
      setEditingOrder(record)
      setItems(res.data.items || [])
      form.resetFields()
      setModalVisible(true)
    } catch (error) {
      message.error('加载入库单详情失败')
    }
  }

  const downloadTemplate = () => {
    const templateData = [
      {
        '物资名称': '示例物资',
        '规格': '示例规格',
        '到期日': '示例到期日',
        '单位': '个',
        '数量': 10,
        '单价': 100,
        '供应商': '示例供应商',
        '备注': '示例备注'
      }
    ]
    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '入库导入模板')
    XLSX.writeFile(wb, '入库导入模板.xlsx')
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
          const quantity = Number(row['数量'] || 1)
          const unitPrice = Number(row['单价'] || 0)
          return {
            material_name: String(row['物资名称'] || ''),
            spec: String(row['规格'] || ''),
            model: String(row['到期日'] || ''),
            unit: String(row['单位'] || ''),
            quantity: quantity,
            unit_price: unitPrice,
            total_price: Number((quantity * unitPrice).toFixed(2)),
            supplier: String(row['供应商'] || ''),
            remark: String(row['备注'] || '')
          }
        })

        setItems(importedItems)
        message.success('导入成功')
      }
      reader.readAsArrayBuffer(file)
    } catch (error) {
      message.error('导入失败')
    }
    return false
  }

  const handleSubmit = async () => {
    try {
      const totalAmount = items.reduce((sum, item) => sum + (item.total_price || 0), 0)

      const orderData = {
        supplier: '',
        total_amount: totalAmount,
        items: items.map(item => ({
          material_name: item.material_name,
          spec: item.spec,
          model: item.model,
          unit: item.unit,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          supplier: item.supplier || '',
          remark: item.remark || ''
        }))
      }

      if (editingOrder) {
        await inboundService.update(editingOrder.id, orderData)
        message.success('修改成功')
      } else {
        await inboundService.create(orderData)
        message.success('创建成功')
      }

      setModalVisible(false)
      loadData()
    } catch (error: any) {
      if (!error.errorFields) {
        message.error(error.response?.data?.msg || '操作失败')
      }
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await inboundService.delete(id)
      message.success('删除成功')
      loadData()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const handleSubmitOrder = async (id: number) => {
    try {
      await inboundService.submit(id)
      message.success('提交成功，单据已进入审批流程')
      loadData()
    } catch (error) {
      message.error('提交失败')
    }
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    if (field === 'quantity' || field === 'unit_price') {
      const total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0)
      newItems[index].total_price = Number(total.toFixed(2))
    }
    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, { material_name: '', spec: '', model: '', unit: '', quantity: 1, unit_price: 0, total_price: 0, supplier: '', remark: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const viewDetail = async (record: any) => {
    try {
      const res = await inboundService.getById(record.id)
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
    { title: '供应商', dataIndex: 'supplier', key: 'supplier' },
    { title: '物资明细', dataIndex: 'materialNames', key: 'materialNames', ellipsis: true },
    { title: '数量', dataIndex: 'totalQty', key: 'totalQty' },
    { 
      title: '单价', 
      dataIndex: 'avgPrice', 
      key: 'avgPrice', 
      render: (v: number) => v ? <span className="amount-text">¥{Number(v).toFixed(2)}</span> : '-' 
    },
    { 
      title: '总金额', 
      dataIndex: 'total_amount', 
      key: 'total_amount', 
      render: (v: number) => v ? <span className="amount-text">¥{Number(v).toFixed(2)}</span> : <span className="amount-text">¥0.00</span> 
    },
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
            <a onClick={() => handleSubmitOrder(record.id)} className="action-link submit">
              <SendOutlined /> 提交
            </a>
          )}
          {record.status === 'draft' && user.role === 'business' && (
            <a onClick={() => handleDelete(record.id)} className="action-link delete">
              <DeleteOutlined /> 删除
            </a>
          )}
        </Space>
      )
    }
  ]

  const isMyOrder = user.role === 'business'

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <h1 className="page-title">入库管理</h1>
        {isMyOrder && (
          <Space>
            <GradientButton icon={<DownloadOutlined />} onClick={downloadTemplate} gradient="blue">
              下载模板
            </GradientButton>
            <GradientButton icon={<PlusOutlined />} onClick={showAddModal} gradient="blue">
              新增入库单
            </GradientButton>
          </Space>
        )}
      </div>

      <GlassCard className="table-card animate-fade-in" gradient="blue">
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
        title={editingOrder ? '编辑入库单' : '新增入库单'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={1000}
        okText="保存"
        cancelText="取消"
        className="dark-modal"
      >
        <Form form={form} layout="vertical">
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
                  <label className="field-label">物资名称*</label>
                  <Input
                    placeholder="请输入物资名称"
                    value={item.material_name}
                    onChange={(e) => updateItem(index, 'material_name', e.target.value)}
                  />
                </div>
                <div className="item-field">
                  <label className="field-label">规格</label>
                  <Input
                    placeholder="规格"
                    value={item.spec}
                    onChange={(e) => updateItem(index, 'spec', e.target.value)}
                  />
                </div>
                <div className="item-field">
                  <label className="field-label">到期日</label>
                  <Input
                    placeholder="到期日"
                    value={item.model}
                    onChange={(e) => updateItem(index, 'model', e.target.value)}
                  />
                </div>
                <div className="item-field small">
                  <label className="field-label">单位</label>
                  <Input
                    placeholder="单位"
                    value={item.unit}
                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                  />
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
                <div className="item-field small">
                  <label className="field-label">单价*</label>
                  <InputNumber
                    placeholder="单价"
                    style={{ width: '100%' }}
                    value={item.unit_price}
                    onChange={(value) => updateItem(index, 'unit_price', value)}
                    min={0}
                    precision={2}
                  />
                </div>
                <div className="item-field small">
                  <label className="field-label">总价</label>
                  <InputNumber
                    placeholder="总价"
                    style={{ width: '100%' }}
                    value={item.total_price}
                    disabled
                    precision={2}
                  />
                </div>
                <div className="item-field">
                  <label className="field-label">供应商</label>
                  <Input
                    placeholder="供应商"
                    value={item.supplier || ''}
                    onChange={(e) => updateItem(index, 'supplier', e.target.value)}
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
        title="入库单详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
        className="dark-modal"
      >
        {detailData && (
          <div className="detail-content">
            <p><strong>单据编号：</strong>{detailData.order_no}</p>
            <p><strong>供应商：</strong>{detailData.supplier}</p>
            <p><strong>总金额：</strong><span className="amount-text">¥{Number(detailData.total_amount || 0).toFixed(2)}</span></p>
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
                { 
                  title: '单价', 
                  dataIndex: 'unit_price', 
                  key: 'unit_price', 
                  render: (v: number) => v ? <span className="amount-text">¥{Number(v).toFixed(2)}</span> : <span className="amount-text">¥0.00</span> 
                },
                { 
                  title: '总价', 
                  dataIndex: 'total_price', 
                  key: 'total_price', 
                  render: (v: number) => v ? <span className="amount-text">¥{Number(v).toFixed(2)}</span> : <span className="amount-text">¥0.00</span> 
                },
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

export default InboundOrders
