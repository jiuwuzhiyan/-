import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import { ShopOutlined, TaskOutlined, SettingOutlined } from '@ant-design/icons'
import { Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import DataView from './pages/DataView'
import TaskManagement from './pages/TaskManagement'
import Settings from './pages/Settings'

const { Header, Sider, Content } = Layout

const App: React.FC = () => {
  const location = useLocation()

  const menuItems = [
    {
      key: '/',
      icon: <ShopOutlined />,
      label: <Link to="/">数据采集</Link>,
    },
    {
      key: '/data',
      icon: <ShopOutlined />,
      label: <Link to="/data">数据查看</Link>,
    },
    {
      key: '/tasks',
      icon: <TaskOutlined />,
      label: <Link to="/tasks">任务管理</Link>,
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: <Link to="/settings">定时任务</Link>,
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ padding: 0, background: '#001529' }}>
        <h1 style={{ color: 'white', lineHeight: '64px', paddingLeft: 24, margin: 0 }}>
          团购数据采集工具
        </h1>
      </Header>
      <Layout>
        <Sider width={200} theme="dark">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Layout style={{ padding: '24px' }}>
          <Content
            style={{
              padding: 24,
              margin: 0,
              minHeight: 280,
              background: '#fff',
              borderRadius: 8,
            }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/data" element={<DataView />} />
              <Route path="/tasks" element={<TaskManagement />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default App
