import { useState, useEffect } from 'react'
import { Table, Input, Button, DatePicker, Select, Space, message, Modal } from 'antd'
import { SearchOutlined, ExportOutlined, EyeOutlined, PrinterOutlined } from '@ant-design/icons'
import { recordService, inboundService, outboundService, returnService } from '../services/api'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'

interface RecordsProps {
  user: any
}

const { RangePicker } = DatePicker

// 打印样式
const printStyle = `
@media print {
  body * {
    visibility: hidden;
  }
  #print-area, #print-area * {
    visibility: visible;
  }
  #print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    background: white;
  }
  @page {
    size: A4;
    margin: 20mm 15mm;
  }
}

.print-container {
  font-family: 'Microsoft YaHei', 'SimHei', Arial, sans-serif;
  color: #333;
  padding: 30px;
  max-width: 900px;
  margin: 0 auto;
}

.print-header {
  text-align: center;
  border-bottom: 3px double #0066cc;
  padding-bottom: 20px;
  margin-bottom: 20px;
}

.print-header h1 {
  margin: 0 0 10px 0;
  color: #0066cc;
  font-size: 28px;
}

.print-header .order-no {
  font-size: 14px;
  color: #666;
}

.print-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 20px;
  margin-bottom: 25px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 5px;
}

.print-info-item {
  display: flex;
  gap: 5px;
}

.print-info-item label {
  font-weight: bold;
  color: #555;
  min-width: 80px;
}

.print-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 30px;
  table-layout: auto;
}

.print-table th {
  background: #0066cc;
  color: white;
  padding: 12px;
  text-align: left;
  border: 1px solid #004d99;
  white-space: nowrap;
}

.print-table td {
  padding: 10px 12px;
  border: 1px solid #ddd;
  white-space: nowrap;
}

.print-table tr:nth-child(even) {
  background: #f8f9fa;
}

.print-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 50px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
}

.print-footer-item {
  text-align: center;
}

.print-footer-item .label {
  display: block;
  margin-bottom: 40px;
  color: #666;
  font-size: 14px;
}

.print-status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 3px;
  font-size: 14px;
  font-weight: bold;
}

.status-pending {
  background: #fff3cd;
  color: #856404;
}

.status-approved {
  background: #d4edda;
  color: #155724;
}

.status-rejected {
  background: #f8d7da;
  color: #721c24;
}

.total-amount {
  text-align: right;
  font-size: 18px;
  font-weight: bold;
  padding: 15px 10px;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-top: none;
}
`

const Records = ({ user }: RecordsProps) => {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    materialName: '',
    operator: '',
    status: ''
  })
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [detailData, setDetailData] = useState<any>(null)

  const loadData = async () => {
    setLoading(true)
    setRecords([])
    try {
      const res = await recordService.list(filters)
      setRecords(res.data || [])
    } catch (error) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, []) // 移除filters依赖，避免自动触发，而是通过查询按钮触发

  const handleSearch = () => {
    loadData()
  }

  const handleReset = () => {
    setFilters({
      startDate: '',
      endDate: '',
      materialName: '',
      operator: '',
      status: ''
    })
    loadData()
  }

  const viewDetail = async (record: any) => {
    try {
      let res: any
      if (record.type === 'inbound') {
        res = await inboundService.getById(record.order_id)
      } else if (record.type === 'outbound') {
        res = await outboundService.getById(record.order_id)
      } else {
        res = await returnService.getById(record.order_id)
      }
      setDetailData({ ...res.data, type: record.type })
      setDetailModalVisible(true)
    } catch (error) {
      message.error('加载详情失败')
    }
  }

  const printOrder = async (record: any) => {
    try {
      let res: any
      if (record.type === 'inbound') {
        res = await inboundService.getById(record.order_id)
      } else if (record.type === 'outbound') {
        res = await outboundService.getById(record.order_id)
      } else {
        res = await returnService.getById(record.order_id)
      }
      const fullData = { ...res.data, type: record.type }
      renderPrintContent(fullData)
    } catch (error) {
      message.error('加载打印数据失败')
    }
  }

  const renderPrintContent = (data: any) => {
    // 创建打印窗口
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      message.error('无法打开打印窗口，请检查浏览器设置')
      return
    }

    const typeText = data.type === 'inbound' ? '入库单' : data.type === 'outbound' ? '出库单' : '回库单'
    const getStatusClass = (status: string) => {
      switch (status) {
        case 'pending': return 'status-pending'
        case 'approved': return 'status-approved'
        case 'rejected': return 'status-rejected'
        default: return ''
      }
    }

    const totalAmount = data.items?.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0) || 0

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${typeText} - ${data.order_no}</title>
          <style>${printStyle}</style>
        </head>
        <body>
          <div id="print-area" class="print-container">
            <div class="print-header">
              <h1>${typeText}</h1>
              <div class="order-no">单据编号：${data.order_no}</div>
            </div>
            
            <div class="print-info">
              <div class="print-info-item">
                <label>提交人：</label>
                <span>${data.submitter_name || '-'}</span>
              </div>
              <div class="print-info-item">
                <label>单据状态：</label>
                <span class="print-status ${getStatusClass(data.status)}">${getStatusText(data.status)}</span>
              </div>
              <div class="print-info-item">
                <label>提交时间：</label>
                <span>${dayjs(data.created_at).format('YYYY年MM月DD日 HH:mm')}</span>
              </div>
              ${data.supplier ? `
              <div class="print-info-item">
                <label>供应商：</label>
                <span>${data.supplier}</span>
              </div>` : ''}
              ${data.department ? `
              <div class="print-info-item">
                <label>领用部门：</label>
                <span>${data.department}</span>
              </div>` : ''}
              ${data.receiver ? `
              <div class="print-info-item">
                <label>领用人：</label>
                <span>${data.receiver}</span>
              </div>` : ''}
              ${data.outbound_order_no ? `
              <div class="print-info-item">
                <label>关联出库单：</label>
                <span>${data.outbound_order_no}</span>
              </div>` : ''}
              ${data.reject_reason ? `
              <div class="print-info-item" style="grid-column: span 2;">
                <label>驳回原因：</label>
                <span>${data.reject_reason}</span>
              </div>` : ''}
            </div>
            
            <table class="print-table">
              <thead>
                <tr>
                  <th style="width: 50px">序号</th>
                  <th>物资名称</th>
                  <th style="width: 120px">规格</th>
                  <th style="width: 120px">到期日</th>
                  <th style="width: 80px">单位</th>
                  <th style="width: 100px">数量</th>
                  ${data.type === 'inbound' ? `
                  <th style="width: 120px">单价</th>
                  <th style="width: 120px">总价</th>
                  <th style="width: 150px">供应商</th>` : ''}
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                ${(data.items || []).map((item: any, index: number) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.material_name || item.name || '-'}</td>
                  <td>${item.spec || '-'}</td>
                  <td>${item.model || '-'}</td>
                  <td>${item.unit || '-'}</td>
                  <td style="text-align: right">${item.quantity || 0}</td>
                  ${data.type === 'inbound' ? `
                  <td style="text-align: right">${item.unit_price ? '¥' + Number(item.unit_price).toFixed(2) : '-'}</td>
                  <td style="text-align: right">${item.total_price ? '¥' + Number(item.total_price).toFixed(2) : '-'}</td>
                  <td>${item.supplier || '-'}</td>` : ''}
                  <td>${item.remark || '-'}</td>
                </tr>`).join('')}
              </tbody>
            </table>
            
            ${data.type === 'inbound' ? `
            <div class="total-amount">
              合计金额：¥${Number(totalAmount).toFixed(2)}
            </div>` : ''}
            
            <div class="print-footer">
              <div class="print-footer-item">
                <span class="label">制单人</span>
                <div style="border-bottom: 1px solid #333; width: 120px; margin: 0 auto;"></div>
              </div>
              <div class="print-footer-item">
                <span class="label">财务审批</span>
                <div style="border-bottom: 1px solid #333; width: 120px; margin: 0 auto;"></div>
              </div>
              <div class="print-footer-item">
                <span class="label">行政审批</span>
                <div style="border-bottom: 1px solid #333; width: 120px; margin: 0 auto;"></div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const getStatusText = (status: string) => {
    if (!status) return ''
    const map: Record<string, string> = {
      pending: '待审批',
      approved: '已通过',
      rejected: '已驳回'
    }
    return map[status] || status
  }

  const getPrintPermission = (type: string) => {
    if (user.role === 'superadmin') return true
    if (type === 'inbound' && user.can_print_inbound) return true
    if (type === 'outbound' && user.can_print_outbound) return true
    if (type === 'return' && user.can_print_return) return true
    return false
  }

  const exportToExcel = () => {
    const exportData = records.map(r => ({
      '单据编号': r.order_no,
      '类型': getTypeText(r.type),
      '物资名称': r.material_name,
      '规格': r.spec,
      '到期日': r.model,
      '单位': r.unit,
      '数量': r.quantity,
      '单价': r.unit_price ? Number(r.unit_price).toFixed(2) : '-',
      '总价': r.total_price ? Number(r.total_price).toFixed(2) : '-',
      '供应商': r.supplier || '-',
      '备注': r.remark || '-',
      '单据状态': getStatusText(r.status),
      '操作人': r.submitter_name,
      '操作时间': dayjs(r.created_at).format('YYYY-MM-DD HH:mm')
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '出入库记录')
    XLSX.writeFile(wb, `出入库记录_${dayjs().format('YYYYMMDD')}.xlsx`)
    message.success('导出成功')
  }

  const getTypeText = (type: string) => {
    const map: Record<string, string> = {
      inbound: '入库',
      outbound: '出库',
      return: '回库'
    }
    return map[type] || type
  }

  const getTypeTag = (type: string) => {
    const map: Record<string, { color: string; text: string }> = {
      inbound: { color: 'blue', text: '入库' },
      outbound: { color: 'purple', text: '出库' },
      return: { color: 'cyan', text: '回库' }
    }
    return <span style={{ color: map[type]?.color }}>{map[type]?.text || type}</span>
  }

  const getStatusTag = (status: string) => {
    if (!status) return null
    const map: Record<string, { color: string; text: string }> = {
      pending: { color: 'orange', text: '待审批' },
      approved: { color: 'green', text: '已通过' },
      rejected: { color: 'red', text: '已驳回' }
    }
    return <span style={{ color: map[status]?.color }}>{map[status]?.text || status}</span>
  }

  const columns = [
    { title: '单据编号', dataIndex: 'order_no', key: 'order_no' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => getTypeTag(v) },
    { title: '物资名称', dataIndex: 'material_name', key: 'material_name' },
    { title: '规格', dataIndex: 'spec', key: 'spec' },
    { title: '到期日', dataIndex: 'model', key: 'model' },
    { title: '单位', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 100 },
    { title: '单价', dataIndex: 'unit_price', key: 'unit_price', width: 120, render: (v: number) => v ? `¥${Number(v).toFixed(2)}` : '-' },
    { title: '总价', dataIndex: 'total_price', key: 'total_price', width: 120, render: (v: number) => v ? `¥${Number(v).toFixed(2)}` : '-' },
    { title: '供应商', dataIndex: 'supplier', key: 'supplier' },
    { title: '备注', dataIndex: 'remark', key: 'remark' },
    { title: '单据状态', dataIndex: 'status', key: 'status', render: (v: string) => getStatusTag(v) },
    { title: '操作人', dataIndex: 'submitter_name', key: 'submitter_name' },
    { title: '操作时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => viewDetail(record)}><EyeOutlined /> 详情</a>
          {getPrintPermission(record.type) && (
            <a onClick={() => printOrder(record)}><PrinterOutlined /> 打印</a>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>出入库记录</h2>

      <Space style={{ marginBottom: 16 }} wrap>
        <RangePicker
          onChange={(dates, dateStrings) => {
            setFilters({
              ...filters,
              startDate: dateStrings[0] || '',
              endDate: dateStrings[1] || ''
            })
          }}
        />
        <Input
          placeholder="物资名称"
          value={filters.materialName}
          onChange={(e) => setFilters({ ...filters, materialName: e.target.value })}
          style={{ width: 150 }}
        />
        <Input
          placeholder="操作人"
          value={filters.operator}
          onChange={(e) => setFilters({ ...filters, operator: e.target.value })}
          style={{ width: 150 }}
        />
        <Select
          placeholder="单据状态"
          value={filters.status || undefined}
          onChange={(value) => setFilters({ ...filters, status: value || '' })}
          allowClear
          style={{ width: 120 }}
        >
          <Select.Option value="pending">待审批</Select.Option>
          <Select.Option value="approved">已通过</Select.Option>
          <Select.Option value="rejected">已驳回</Select.Option>
        </Select>
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
        <Button onClick={handleReset}>重置</Button>
        <Button icon={<ExportOutlined />} onClick={exportToExcel}>导出Excel</Button>
      </Space>

      <Table
        columns={columns}
        dataSource={records}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title="记录详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {detailData && (
          <div>
            <p><strong>单据编号：</strong>{detailData.order_no}</p>
            <p><strong>类型：</strong>{getTypeTag(detailData.type)}</p>
            <p><strong>提交人：</strong>{detailData.submitter_name}</p>
            <p><strong>状态：</strong>{getStatusTag(detailData.status)}</p>
            {detailData.reject_reason && <p><strong>驳回原因：</strong>{detailData.reject_reason}</p>}
            <p><strong>提交时间：</strong>{dayjs(detailData.created_at).format('YYYY-MM-DD HH:mm:ss')}</p>
            {detailData.supplier && <p><strong>供应商：</strong>{detailData.supplier}</p>}
            {detailData.department && <p><strong>领用部门：</strong>{detailData.department}</p>}
            {detailData.receiver && <p><strong>领用人：</strong>{detailData.receiver}</p>}
            {detailData.outbound_order_no && <p><strong>关联出库单：</strong>{detailData.outbound_order_no}</p>}

            <h4 style={{ marginTop: 16 }}>物资明细</h4>
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
                { title: '单价', dataIndex: 'unit_price', key: 'unit_price', render: (v: number) => v ? `¥${Number(v).toFixed(2)}` : '-' },
                { title: '总价', dataIndex: 'total_price', key: 'total_price', render: (v: number) => v ? `¥${Number(v).toFixed(2)}` : '-' },
                { title: '备注', dataIndex: 'remark', key: 'remark' }
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Records
