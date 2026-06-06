import { useState } from 'react'
import { Form, Input, Button, Card, message, Checkbox } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'

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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 400, boxShadow: '0 14px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, color: '#333', marginBottom: 8 }}>唐山中骏世界城库存系统</h1>
          <p style={{ color: '#666' }}>请登录您的账号</p>
        </div>
        <Form
          name="login"
          initialValues={{ username: savedUsername }}
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#999' }} />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#999' }} />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>
          <Form.Item>
            <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)}>
              记住密码
            </Checkbox>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default Login
