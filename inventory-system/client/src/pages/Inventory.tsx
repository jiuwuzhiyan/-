import { useState, useEffect } from 'react'
import { Table, Input, Tag, Button, Modal, Form, InputNumber, message, Select, Space } from 'antd'
import { SearchOutlined, EditOutlined, WarningOutlined, ExportOutlined } from '@ant-design/icons'
import { materialService } from '../services/api'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'

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
    (m.specification || '').toLowerCase().includes(searchText.toLowerCase())
  )

  const showEditModal = (record: any) => {
    setEditingMaterial(record)
    form.setFieldsValue({
      name: record.name,
      specification: record.specification,
      unit: record.unit,
      unit_price: record.unit_price
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

  const isLowStock = (record: any) => {
    return record.current_stock <= record.min_stock
  }

  const exportToExcel = () => {
    const exportData = filteredMaterials.map(m => ({
      '物资名称': m.name,
      '规格型号': m.specification,
      '单位': m.unit,
      '当前库存': m.current_stock,
      '最低库存': m.min_stock,
      '单价': m.unit_price ? Number(m.unit_price).toFixed(2) : '0.00',
      '总价': m.unit_price && m.current_stock ? (Number(m.unit_price) * Number(m.current_stock)).toFixed(2) : '0.00',
      '备注': m.remark || '-',
      '状态': isLowStock(m) ? '库存不足' : '正常'
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '库存查询')
    XLSX.writeFile(wb, `库存查询_${dayjs().format('YYYYMMDD')}.xlsx`)
    message.success('导出成功')
  }

  const columns = [
    { title: '物资名称', dataIndex: 'name', key: 'name' },
    { title: '规格型号', dataIndex: 'specification', key: 'specification' },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: '当前库存', dataIndex: 'current_stock', key: 'current_stock', width: 100,
      render: (v: number, record: any) => (
        <span style={{ color: isLowStock(record) ? '#ff4d4f' : undefined, fontWeight: isLowStock(record) ? 'bold' : undefined }}>
          {v} {isLowStock(record) && <WarningOutlined style={{ color: '#ff4d4f' }} />}
        </span>
      )
    },
    { title: '单价', dataIndex: 'unit_price', key: 'unit_price', width: 120, render: (v: number) => v ? `¥${Number(v).toFixed(2)}` : '-' },
    { title: '总价', dataIndex: 'total_price', key: 'total_price', width: 140, render: (_: any, record: any) => (record.unit_price && record.current_stock) ? `¥${(Number(record.unit_price) * Number(record.current_stock)).toFixed(2)}` : '-' },
    { title: '备注', dataIndex: 'remark', key: 'remark' },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: any) => (
        isLowStock(record) ? <Tag color="red">库存不足</Tag> : <Tag color="green">正常</Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: any) => (
        user.role === 'superadmin' && <a onClick={() => showEditModal(record)}><EditOutlined /> 编辑</a>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>库存查询</h2>
        <Space>
          <Input
            placeholder="搜索物资名称或规格型号"
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <Button icon={<ExportOutlined />} onClick={exportToExcel}>导出Excel</Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredMaterials}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="编辑物资"
        open={editModalVisible}
        onOk={handleUpdate}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="物资名称" name="name" rules={[{ required: true, message: '请输入物资名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="规格型号" name="specification">
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