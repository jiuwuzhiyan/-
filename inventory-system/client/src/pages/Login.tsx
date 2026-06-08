import { useState } from 'react'
import { Form, Input, message, Checkbox } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import { ParticleBackground, GradientButton } from '../components'
import './Login.css'

interface LoginProps {
  onLogin: (user: any) => void
}

const Login = ({ onLogin }: LoginProps) => {
  const [loading, setLoading] = useState(false)
  const [remember, setRemember] = useState(false)
  const navigate = useNavigate()

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const res = await authService.login(values.username, values.password)
      if (res.code === 200) {
        if (remember) {
          localStorage.setItem('remember', 'true')
          localStorage.setItem('username', values.username)
        } else {
          localStorage.removeItem('remember')
          localStorage.removeItem('username')
        }
        message.success('登录成功')
        onLogin(res.data)
        navigate('/dashboard')
      } else {
        message.error(res.msg || '登录失败')
      }
    } catch (error: any) {
      message.error(error.response?.data?.msg || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const savedUsername = localStorage.getItem('username') || ''

  return (
    <div className="login-container">
      {/* 动态粒子背景 */}
      <ParticleBackground count={60} color="#1890ff" />
      
      {/* 登录卡片 */}
      <div className="login-card animate-fade-in">
        {/* Logo 和标题 */}
        <div className="login-header">
          <div className="login-logo">
            <div className="logo-icon">
              <UserOutlined />
            </div>
          </div>
          <h1 className="login-title">唐山中骏世界城库存系统</h1>
          <p className="login-subtitle">Inventory Management System</p>
        </div>
        
        {/* 登录表单 */}
        <Form
          name="login"
          initialValues={{ username: savedUsername }}
          onFinish={onFinish}
          layout="vertical"
          className="login-form"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
              className="login-input"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
              className="login-input"
            />
          </Form.Item>
          <Form.Item>
            <Checkbox 
              checked={remember} 
              onChange={(e) => setRemember(e.target.checked)}
              className="login-checkbox"
            >
              记住密码
            </Checkbox>
          </Form.Item>
          <Form.Item>
            <GradientButton
              gradient="blue"
              glow
              size="large"
              block
              loading={loading}
              htmlType="submit"
            >
              登 录
            </GradientButton>
          </Form.Item>
        </Form>
        
        {/* 底部信息 */}
        <div className="login-footer">
          <span>© 2026 财务管理部</span>
        </div>
      </div>
    </div>
  )
}

export default Login
