import { useState, useEffect } from 'react'
import { Table, Modal, Form, Input, message, Space, Popconfirm } from 'antd'
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons'
import { approvalService, inboundService, outboundService, returnService } from '../services/api'
import dayjs from 'dayjs'
import { GlassCard } from '../components'
import './Orders.css'

interface ApprovalProps {
  user: any
}

const Approval = ({ user }: ApprovalProps) => {
  const [pendingList, setPendingList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<any>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [detailData, setDetailData] = useState<any>(null)
  const [rejectForm] = Form.useForm()

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await approvalService.listPending()
      setPendingList(res.data || [])
    } catch (error) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleApprove = async (record: any) => {
    try {
      await approvalService.approve(record.id, record.type, {})
      message.success('审批通过')
      loadData()
    } catch (error) {
      message.error('审批失败')
    }
  }

  const showRejectModal = (record: any) => {
    setCurrentOrder(record)
    rejectForm.resetFields()
    setRejectModalVisible(true)
  }

  const handleReject = async () => {
    try {
      const values = await rejectForm.validateFields()
      await approvalService.reject(currentOrder.id, currentOrder.type, { reason: values.reason })
      message.success('已驳回')
      setRejectModalVisible(false)
      loadData()
    } catch (error: any) {
      if (!error.errorFields) {
        message.error(error.response?.data?.msg || '操作失败')
      }
    }
  }

  const viewDetail = async (record: any) => {
    try {
      let service;
      if (record.type === 'inbound') {
        service = inboundService
      } else if (record.type === 'outbound') {
        service = outboundService
      } else {
        service = returnService
      }
      const res = await service.getById(record.id)
      setDetailData({ ...res.data, type: record.type })
      setDetailModalVisible(true)
    } catch (error) {
      message.error('加载详情失败')
    }
  }

  const getStatusTag = (status: string) => {
    const map: Record<string, { className: string; text: string }> = {
      pending: { className: 'status-tag pending', text: '待审批' },
      approved: { className: 'status-tag approved', text: '已通过' },
      rejected: { className: 'status-tag rejected', text: '已驳回' }
    }
    const item = map[status] || { className: 'status-tag', text: status }
    return <span className={item.className}>{item.text}</span>
  }

  const getTypeTag = (type: string) => {
    const map: Record<string, { className: string; text: string }> = {
      inbound: { className: 'status-tag', text: '入库单' },
      outbound: { className: 'status-tag', text: '出库单' },
      return: { className: 'status-tag', text: '回库单' }
    }
    const item = map[type] || { className: 'status-tag', text: type }
    return <span className={item.className}>{item.text}</span>
  }

  const columns = [
    { 
      title: '单据编号', 
      dataIndex: 'order_no', 
      key: 'order_no',
      render: (v: string) => <span className="order-no">{v}</span>
    },
    { 
      title: '类型', 
      dataIndex: 'type', 
      key: 'type', 
      render: (v: string) => getTypeTag(v) 
    },
    { title: '提交人', dataIndex: 'submitter_name', key: 'submitter_name' },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      render: (v: string) => getStatusTag(v) 
    },
    { 
      title: '提交时间', 
      dataIndex: 'created_at', 
      key: 'created_at', 
      render: (v: string) => <span className="time-text">{dayjs(v).format('YYYY-MM-DD HH:mm')}</span> 
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => viewDetail(record)} className="action-link"><EyeOutlined /> 详情</a>
          {user.role !== 'business' && (
            <>
              <Popconfirm title="确定通过此单据？" onConfirm={() => handleApprove(record)}>
                <a className="action-link submit"><CheckOutlined /> 通过</a>
              </Popconfirm>
              <a className="action-link delete" onClick={() => showRejectModal(record)}><CloseOutlined /> 驳回</a>
            </>
          )}
        </Space>
      )
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <h1 className="page-title">审批管理</h1>
      </div>

      <GlassCard className="table-card animate-fade-in" gradient="orange">
        <Table
          columns={columns}
          dataSource={pendingList}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="dark-table"
        />
      </GlassCard>

      <Modal
        title="驳回单据"
        open={rejectModalVisible}
        onOk={handleReject}
        onCancel={() => setRejectModalVisible(false)}
        okText="确认驳回"
        cancelText="取消"
        className="dark-modal"
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            label="驳回原因"
            name="reason"
            rules={[{ required: true, message: '请输入驳回原因' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入驳回原因" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="单据详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
        className="dark-modal"
      >
        {detailData && (
          <div className="detail-content">
            <p><strong>单据编号：</strong>{detailData.order_no}</p>
            <p><strong>类型：</strong>{getTypeTag(detailData.type)}</p>
            <p><strong>提交人：</strong>{detailData.submitter_name}</p>
            <p><strong>状态：</strong>{getStatusTag(detailData.status)}</p>
            {detailData.supplier && <p><strong>供应商：</strong>{detailData.supplier}</p>}
            {detailData.department && <p><strong>领用部门：</strong>{detailData.department}</p>}
            {detailData.receiver && <p><strong>领用人：</strong>{detailData.receiver}</p>}
            <p><strong>提交时间：</strong><span className="time-text">{dayjs(detailData.created_at).format('YYYY-MM-DD HH:mm:ss')}</span></p>

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
                ...(detailData.type === 'inbound' ? [
                  { 
                    title: '单价', 
                    dataIndex: 'unit_price', 
                    key: 'unit_price', 
                    render: (v: number) => v ? <span className="amount-text">¥{v?.toFixed(2)}</span> : '-' 
                  },
                  { 
                    title: '总价', 
                    dataIndex: 'total_price', 
                    key: 'total_price', 
                    render: (v: number) => v ? <span className="amount-text">¥{v?.toFixed(2)}</span> : '-' 
                  }
                ] : []),
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

export default Approval
