import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'

// 深色科技风格主题配置
const darkTechTheme = {
  token: {
    // 主色调
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    // 圆角
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    // 字体
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    fontSize: 14,
    // 动效
    motionDurationFast: '0.2s',
    motionDurationMid: '0.3s',
    motionDurationSlow: '0.5s',
  },
  algorithm: theme.darkAlgorithm,
  components: {
    Layout: {
      headerBg: '#0a0e17',
      siderBg: '#111827',
      bodyBg: '#0a0e17',
      headerHeight: 64,
    },
    Menu: {
      darkItemBg: '#111827',
      darkItemSelectedBg: 'rgba(24, 144, 255, 0.15)',
      darkItemHoverBg: 'rgba(24, 144, 255, 0.1)',
      darkItemColor: '#8b9199',
      darkItemSelectedColor: '#ffffff',
      darkItemHoverColor: '#ffffff',
    },
    Table: {
      headerBg: '#111827',
      rowHoverBg: 'rgba(24, 144, 255, 0.08)',
      borderColor: '#2d3748',
      headerSplitColor: '#2d3748',
    },
    Card: {
      colorBgContainer: 'rgba(17, 24, 39, 0.8)',
      colorBorder: '#2d3748',
    },
    Button: {
      primaryShadow: '0 0 20px rgba(24, 144, 255, 0.4)',
    },
    Input: {
      colorBgContainer: 'rgba(17, 24, 39, 0.6)',
      colorBorder: '#2d3748',
      hoverBorderColor: '#1890ff',
      activeBorderColor: '#1890ff',
    },
    Select: {
      colorBgContainer: 'rgba(17, 24, 39, 0.6)',
      colorBorder: '#2d3748',
    },
    Modal: {
      contentBg: '#111827',
      headerBg: '#111827',
    },
    Drawer: {
      colorBgElevated: '#111827',
    },
  },
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={darkTechTheme}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
