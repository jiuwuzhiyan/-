import { useState, useEffect } from 'react'
import { Table, Modal, Form, Input, InputNumber, message, Space, Select, Upload, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SendOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons'
import { returnService, outboundService } from '../services/api'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { GlassCard, GradientButton } from '../components'
import './Orders.css'

interface ReturnOrdersProps {
  user: any
}

interface OrderItem {
  material_id: number
  material_name?: string
  spec?: string
  model?: string
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
        spec: item.spec,
        model: item.model,
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

  const downloadTemplate = () => {
    if (!selectedOutbound) {
      message.warning('请先选择关联的出库单')
      return
    }
    
    const templateData = (selectedOutbound.items || []).map((item: any) => ({
      '物资名称': item.material_name,
      '规格': item.spec,
      '到期日': item.model,
      '原出库数量': item.quantity,
      '回库数量': item.quantity
    }))
    
    if (templateData.length === 0) {
      templateData.push({
        '物资名称': '示例物资',
        '规格': '示例规格',
        '到期日': '示例到期日',
        '原出库数量': 10,
        '回库数量': 5
      })
    }
    
    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '回库导入模板')
    XLSX.writeFile(wb, '回库导入模板.xlsx')
    message.success('模板下载成功')
  }

  const handleImport = (file: any) => {
    if (!selectedOutbound) {
      message.warning('请先选择关联的出库单')
      return false
    }
    
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

        const outboundItems = selectedOutbound.items || []
        const importedItems = jsonData.map((row: any) => {
          const materialName = String(row['物资名称'] || '')
          const outboundItem = outboundItems.find((item: any) => item.material_name === materialName)
          
          if (!outboundItem) {
            message.warning(`物资 "${materialName}" 不在当前出库单中，已跳过`)
            return null
          }
          
          const returnQuantity = Number(row['回库数量'] || outboundItem.quantity)
          const maxQuantity = outboundItem.quantity
          
          if (returnQuantity > maxQuantity) {
            message.warning(`物资 "${materialName}" 回库数量(${returnQuantity})超过原出库数量(${maxQuantity})，已调整为${maxQuantity}`)
          }
          
          return {
            material_id: outboundItem.material_id,
            material_name: outboundItem.material_name,
            spec: outboundItem.spec,
            model: outboundItem.model,
            quantity: Math.min(returnQuantity, maxQuantity)
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
    { title: '关联出库单', dataIndex: 'outbound_order_no', key: 'outbound_order_no' },
    { title: '提交人', dataIndex: 'submitter_name', key: 'submitter_name' },
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
        <h1 className="page-title">回库管理</h1>
        {isMyOrder && (
          <Space>
            <GradientButton icon={<DownloadOutlined />} onClick={downloadTemplate} gradient="green">
              下载模板
            </GradientButton>
            <GradientButton icon={<PlusOutlined />} onClick={showAddModal} gradient="green">
              新增回库单
            </GradientButton>
          </Space>
        )}
      </div>

      <GlassCard className="table-card animate-fade-in" gradient="green">
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
        title={editingOrder ? '编辑回库单' : '新增回库单'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={1000}
        okText="保存"
        cancelText="取消"
        className="dark-modal"
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
            <div className="items-section">
              <div className="section-header">
                <span className="section-title">回库物资明细</span>
                <Upload beforeUpload={handleImport} showUploadList={false} accept=".xlsx,.xls">
                  <a className="upload-link"><UploadOutlined />批量导入</a>
                </Upload>
              </div>
              {items.map((item, index) => (
                <div key={index} className="item-row">
                  <div className="item-field">
                    <label className="field-label">物资名称</label>
                    <Input
                      placeholder="物资名称"
                      value={item.material_name}
                      disabled
                    />
                  </div>
                  <div className="item-field small">
                    <label className="field-label">规格</label>
                    <Input
                      placeholder="规格"
                      value={item.spec}
                      disabled
                    />
                  </div>
                  <div className="item-field small">
                    <label className="field-label">到期日</label>
                    <Input
                      placeholder="到期日"
                      value={item.model}
                      disabled
                    />
                  </div>
                  <div className="item-field small">
                    <label className="field-label">回库数量*</label>
                    <InputNumber
                      placeholder="回库数量"
                      value={item.quantity}
                      onChange={(value) => updateItem(index, 'quantity', value)}
                      min={1}
                      style={{ width: '100%' }}
                    />
                  </div>
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
        width={700}
        className="dark-modal"
      >
        {detailData && (
          <div className="detail-content">
            <p><strong>单据编号：</strong>{detailData.order_no}</p>
            <p><strong>关联出库单：</strong>{detailData.outbound_order_no}</p>
            <p><strong>提交人：</strong>{detailData.submitter_name}</p>
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
                { title: '数量', dataIndex: 'quantity', key: 'quantity' }
              ]}
              className="dark-table"
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ReturnOrders