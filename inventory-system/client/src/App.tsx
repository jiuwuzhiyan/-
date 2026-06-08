import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Layout, Menu, message, Modal, Form, Input } from 'antd'
import { UserOutlined, LogoutOutlined, KeyOutlined, LockOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import type { ItemType } from 'antd/es/menu/interface'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import InboundOrders from './pages/InboundOrders'
import OutboundOrders from './pages/OutboundOrders'
import ReturnOrders from './pages/ReturnOrders'
import Approval from './pages/Approval'
import Inventory from './pages/Inventory'
import Records from './pages/Records'
import UserManagement from './pages/UserManagement'
import { authService } from './services/api'
import './App.css'

const { Header, Sider, Content } = Layout

function MainLayout({ user, setUser }: { user: any; setUser: (user: any) => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedKeys, setSelectedKeys] = useState<string[]>([location.pathname.slice(1) || 'dashboard'])
  const [changePasswordVisible, setChangePasswordVisible] = useState(false)
  const [changePasswordLoading, setChangePasswordLoading] = useState(false)
  const [changePasswordForm] = Form.useForm()

  useEffect(() => {
    const path = location.pathname.slice(1)
    if (path) {
      setSelectedKeys([path])
    }
  }, [location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setUser(null)
    message.success('已退出登录')
    navigate('/login')
  }

  const handleChangePassword = async () => {
    try {
      const values = await changePasswordForm.validateFields()
      setChangePasswordLoading(true)
      const res = await authService.changePassword(values.oldPassword, values.newPassword)
      if (res.code === 200) {
        message.success('密码修改成功')
        setChangePasswordVisible(false)
        changePasswordForm.resetFields()
      } else {
        message.error(res.msg || '修改失败')
      }
    } catch (error: any) {
      if (!error.errorFields) {
        message.error(error.response?.data?.msg || '修改失败')
      }
    } finally {
      setChangePasswordLoading(false)
    }
  }

  // 根据角色获取菜单项
  const getMenuItems = (): ItemType[] => {
    const items: ItemType[] = [
      { key: 'dashboard', label: '工作台', icon: <UserOutlined /> }
    ]

    // 业务人员 - 更新权限：查看所有单据、审批管理
    if (user.role === 'business') {
      items.push(
        { key: 'inbound', label: '入库管理' },
        { key: 'outbound', label: '出库管理' },
        { key: 'return', label: '回库管理' },
        { key: 'approval', label: '审批管理' },
        { key: 'inventory', label: '库存查询' },
        { key: 'records', label: '出入库记录' }
      )
    }

    // 财务和行政
    if (user.role === 'finance' || user.role === 'admin') {
      items.push(
        { key: 'approval', label: '审批管理' },
        { key: 'inventory', label: '库存查询' },
        { key: 'records', label: '出入库记录' }
      )
    }

    // 超级管理员
    if (user.role === 'superadmin') {
      items.push(
        { key: 'approval', label: '审批管理' },
        { key: 'inventory', label: '库存查询' },
        { key: 'records', label: '出入库记录' },
        { key: 'users', label: '用户管理' }
      )
    }

    return items
  }

  const renderContent = () => {
    switch (selectedKeys[0]) {
      case 'dashboard':
        return <Dashboard user={user} />
      case 'inbound':
        return <InboundOrders user={user} />
      case 'outbound':
        return <OutboundOrders user={user} />
      case 'return':
        return <ReturnOrders user={user} />
      case 'approval':
        return <Approval user={user} />
      case 'inventory':
        return <Inventory user={user} />
      case 'records':
        return <Records user={user} />
      case 'users':
        return <UserManagement user={user} />
      default:
        return <Dashboard user={user} />
    }
  }

  const menuItems: MenuProps['items'] = getMenuItems() as MenuProps['items']

  return (
    <Layout className="main-layout">
      <Header className="layout-header">
        <div className="logo">唐山中骏世界城库存系统</div>
        <div className="user-info">
          <span className="user-name"><UserOutlined /> {user.name} ({user.roleName})</span>
          <a onClick={() => setChangePasswordVisible(true)} className="header-link"><KeyOutlined /> 修改密码</a>
          <a onClick={handleLogout} className="header-link"><LogoutOutlined /> 退出</a>
        </div>
      </Header>
      <Layout className="layout-body">
        <Sider width={200} className="layout-sider">
          <Menu
            mode="inline"
            theme="dark"
            selectedKeys={selectedKeys}
            onSelect={({ key }) => {
              setSelectedKeys([key])
              navigate(`/${key}`)
            }}
            items={menuItems}
            className="side-menu"
          />
        </Sider>
        <Layout className="layout-content-wrapper">
          <Content className="layout-content">
            {renderContent()}
          </Content>
        </Layout>
      </Layout>

      <Modal
        title="修改密码"
        open={changePasswordVisible}
        onOk={handleChangePassword}
        onCancel={() => {
          setChangePasswordVisible(false)
          changePasswordForm.resetFields()
        }}
        confirmLoading={changePasswordLoading}
        okText="确认修改"
        cancelText="取消"
        className="dark-modal"
      >
        <Form form={changePasswordForm} layout="vertical">
          <Form.Item
            label="旧密码"
            name="oldPassword"
            rules={[{ required: true, message: '请输入旧密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入旧密码" />
          </Form.Item>
          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码（至少6位）" />
          </Form.Item>
          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                }
              })
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  )
}

function App() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const handleLogin = (userData: any) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', userData.token)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to="/dashboard" replace /> : 
          <Login onLogin={handleLogin} />
        } />
        <Route path="/*" element={
          user ? (
            <MainLayout user={user} setUser={setUser} />
          ) : (
            <Navigate to="/login" replace />
          )
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
