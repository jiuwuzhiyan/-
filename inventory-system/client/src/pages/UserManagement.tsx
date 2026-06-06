import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm, Tag, Space, Checkbox, InputNumber } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined, RedoOutlined } from '@ant-design/icons'
import { userService } from '../services/api'
import dayjs from 'dayjs'

interface UserManagementProps {
  user: any
}

const UserManagement = ({ user }: UserManagementProps) => {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [form] = Form.useForm()
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false)
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false)
  const [resetPasswordUser, setResetPasswordUser] = useState<any>(null)
  const [resetPasswordForm] = Form.useForm()

  const roleOptions = [
    { value: 'business', label: '业务人员' },
    { value: 'finance', label: '财务人员' },
    { value: 'admin', label: '行政人员' },
    { value: 'superadmin', label: '系统管理员' }
  ]

  const getRoleTag = (role: string) => {
    const map: Record<string, { color: string; text: string }> = {
      business: { color: 'blue', text: '业务人员' },
      finance: { color: 'green', text: '财务人员' },
      admin: { color: 'orange', text: '行政人员' },
      superadmin: { color: 'red', text: '系统管理员' }
    }
    return <Tag color={map[role]?.color}>{map[role]?.text || role}</Tag>
  }

  const getPrintPermissionText = (value: number) => {
    return value ? <Tag color="green">是</Tag> : <Tag color="gray">否</Tag>
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await userService.list()
      setUsers(res.data || [])
    } catch (error) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const showAddModal = () => {
    setEditingUser(null)
    form.resetFields()
    setModalVisible(true)
  }

  const showEditModal = (record: any) => {
    setEditingUser(record)
    form.setFieldsValue({
      username: record.username,
      name: record.name,
      role: record.role,
      can_print_inbound: !!record.can_print_inbound,
      can_print_outbound: !!record.can_print_outbound,
      can_print_return: !!record.can_print_return
    })
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      // 转换为数字
      values.can_print_inbound = values.can_print_inbound ? 1 : 0
      values.can_print_outbound = values.can_print_outbound ? 1 : 0
      values.can_print_return = values.can_print_return ? 1 : 0

      if (editingUser) {
        await userService.update(editingUser.id, values)
        message.success('修改成功')
      } else {
        await userService.create(values)
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
      await userService.delete(id)
      message.success('删除成功')
      loadData()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const showResetPasswordModal = (record: any) => {
    setResetPasswordUser(record)
    resetPasswordForm.setFieldsValue({ newPassword: '' })
    setResetPasswordVisible(true)
  }

  const handleResetPassword = async () => {
    try {
      const values = await resetPasswordForm.validateFields()
      setResetPasswordLoading(true)
      const res = await userService.resetPassword(resetPasswordUser.id, values.newPassword || undefined)
      if (res.code === 200) {
        message.success(res.msg || '密码重置成功')
        setResetPasswordVisible(false)
        // 显示新密码
        if (res.data?.password) {
          Modal.info({
            title: '密码已重置',
            content: (
              <div>
                <p>用户名：{resetPasswordUser.username}</p>
                <p>新密码：<strong style={{ color: '#1890ff', fontSize: 16 }}>{res.data.password}</strong></p>
                <p style={{ color: '#ff4d4f' }}>请将此密码告知用户！</p>
              </div>
            )
          })
        }
      } else {
        message.error(res.msg || '重置失败')
      }
    } catch (error: any) {
      if (!error.errorFields) {
        message.error(error.response?.data?.msg || '重置失败')
      }
    } finally {
      setResetPasswordLoading(false)
    }
  }

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '角色', dataIndex: 'role', key: 'role', render: (v: string) => getRoleTag(v) },
    { title: '打印入库单', dataIndex: 'can_print_inbound', key: 'can_print_inbound', render: (v: number) => getPrintPermissionText(v) },
    { title: '打印出库单', dataIndex: 'can_print_outbound', key: 'can_print_outbound', render: (v: number) => getPrintPermissionText(v) },
    { title: '打印回库单', dataIndex: 'can_print_return', key: 'can_print_return', render: (v: number) => getPrintPermissionText(v) },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <a onClick={() => showEditModal(record)}><EditOutlined /> 编辑</a>
          <Popconfirm
            title="重置密码"
            description={<>确定重置用户 <strong>{record.username}</strong> 的密码吗？<br/>默认密码将重置为 123456</>}
            onConfirm={() => showResetPasswordModal(record)}
            okText="重置"
            cancelText="取消"
          >
            <a style={{ color: '#faad14' }}><KeyOutlined /> 重置密码</a>
          </Popconfirm>
          {record.id !== user.id && (
            <Popconfirm title="确定删除此用户？" onConfirm={() => handleDelete(record.id)}>
              <a style={{ color: '#ff4d4f' }}><DeleteOutlined /> 删除</a>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>用户管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>
          新增用户
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" disabled={!!editingUser} />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]}
            >
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
          )}
          <Form.Item
            label="姓名"
            name="name"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色" options={roleOptions} />
          </Form.Item>
          <Form.Item
            label="打印权限"
          >
            <Space direction="vertical">
              <Form.Item name="can_print_inbound" valuePropName="checked" noStyle>
                <Checkbox>允许打印入库单</Checkbox>
              </Form.Item>
              <Form.Item name="can_print_outbound" valuePropName="checked" noStyle>
                <Checkbox>允许打印出库单</Checkbox>
              </Form.Item>
              <Form.Item name="can_print_return" valuePropName="checked" noStyle>
                <Checkbox>允许打印回库单</Checkbox>
              </Form.Item>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="重置密码"
        open={resetPasswordVisible}
        onOk={handleResetPassword}
        onCancel={() => {
          setResetPasswordVisible(false)
          resetPasswordForm.resetFields()
        }}
        confirmLoading={resetPasswordLoading}
        okText="确认重置"
        cancelText="取消"
      >
        <p style={{ marginBottom: 16 }}>
          将重置用户 <strong>{resetPasswordUser?.username}</strong> 的密码
        </p>
        <Form form={resetPasswordForm} layout="vertical">
          <Form.Item
            label="新密码（留空则重置为默认密码 123456）"
            name="newPassword"
            rules={[{ min: 6, message: '密码至少6位' }]}
          >
            <Input.Password placeholder="请输入新密码（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UserManagement