import { useState, useEffect } from 'react'
import { Table, Input, Modal, Form, InputNumber, message, Space } from 'antd'
import { SearchOutlined, EditOutlined, ExportOutlined } from '@ant-design/icons'
import { materialService } from '../services/api'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { GlassCard, GradientButton } from '../components'
import './Orders.css'

interface InventoryProps {
  user: any
}

const Inventory = ({ user }: InventoryProps) => {
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<any>(null)
  const [form] = Form.useForm()

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await materialService.list()
      setMaterials(res.data || [])
    } catch (error) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSearch = (value: string) => {
    setSearchText(value)
  }

  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(searchText.toLowerCase()) ||
    (m.spec || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (m.model || '').toLowerCase().includes(searchText.toLowerCase())
  )

  const showEditModal = (record: any) => {
    setEditingMaterial(record)
    form.setFieldsValue({
      name: record.name,
      spec: record.spec,
      model: record.model,
      unit: record.unit,
      unit_price: record.unit_price,
      remark: record.remark
    })
    setEditModalVisible(true)
  }

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields()
      await materialService.update(editingMaterial.id, values)
      message.success('更新成功')
      setEditModalVisible(false)
      loadData()
    } catch (error: any) {
      if (!error.errorFields) {
        message.error(error.response?.data?.msg || '更新失败')
      }
    }
  }

  const exportToExcel = () => {
    const exportData = filteredMaterials.map(m => ({
      '物资名称': m.name,
      '规格': m.spec,
      '到期日': m.model,
      '单位': m.unit,
      '当前库存': m.current_stock,
      '单价': m.unit_price ? Number(m.unit_price).toFixed(2) : '0.00',
      '总价': m.unit_price && m.current_stock ? (Number(m.unit_price) * Number(m.current_stock)).toFixed(2) : '0.00',
      '备注': m.remark || '-'
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '库存查询')
    XLSX.writeFile(wb, `库存查询_${dayjs().format('YYYYMMDD')}.xlsx`)
    message.success('导出成功')
  }

  const columns = [
    { title: '物资名称', dataIndex: 'name', key: 'name' },
    { title: '规格', dataIndex: 'spec', key: 'spec' },
    { title: '到期日', dataIndex: 'model', key: 'model' },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: '当前库存', dataIndex: 'current_stock', key: 'current_stock', width: 100 },
    { 
      title: '单价', 
      dataIndex: 'unit_price', 
      key: 'unit_price', 
      width: 120, 
      render: (v: number) => v ? <span className="amount-text">¥{Number(v).toFixed(2)}</span> : '-' 
    },
    { 
      title: '总价', 
      dataIndex: 'total_price', 
      key: 'total_price', 
      width: 140, 
      render: (_: any, record: any) => (record.unit_price && record.current_stock) ? <span className="amount-text">¥{(Number(record.unit_price) * Number(record.current_stock)).toFixed(2)}</span> : '-' 
    },
    { title: '备注', dataIndex: 'remark', key: 'remark' },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: any) => (
        user.role === 'superadmin' && <a onClick={() => showEditModal(record)} className="action-link"><EditOutlined /> 编辑</a>
      )
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <h1 className="page-title">库存查询</h1>
        <Space>
          <Input
            placeholder="搜索物资名称或规格或到期日"
            prefix={<SearchOutlined />}
            style={{ width: 300, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb' }}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <GradientButton icon={<ExportOutlined />} onClick={exportToExcel} gradient="blue">导出Excel</GradientButton>
        </Space>
      </div>

      <GlassCard className="table-card animate-fade-in" gradient="blue">
        <Table
          columns={columns}
          dataSource={filteredMaterials}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="dark-table"
        />
      </GlassCard>

      <Modal
        title="编辑物资"
        open={editModalVisible}
        onOk={handleUpdate}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
        className="dark-modal"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="物资名称" name="name" rules={[{ required: true, message: '请输入物资名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="规格" name="spec">
            <Input />
          </Form.Item>
          <Form.Item label="到期日" name="model">
            <Input />
          </Form.Item>
          <Form.Item label="单位" name="unit" rules={[{ required: true, message: '请输入单位' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="单价" name="unit_price">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Inventory
