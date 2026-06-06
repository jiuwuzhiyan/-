import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { initDatabase } from './database.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import materialRoutes from './routes/materials.js'
import inboundRoutes from './routes/inbound.js'
import outboundRoutes from './routes/outbound.js'
import returnRoutes from './routes/return.js'
import approvalRoutes from './routes/approval.js'
import inventoryRoutes from './routes/inventory.js'
import recordRoutes from './routes/records.js'

const app = express()
const PORT = 3000

// 中间件
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/materials', materialRoutes)
app.use('/api/inbound', inboundRoutes)
app.use('/api/outbound', outboundRoutes)
app.use('/api/return', returnRoutes)
app.use('/api/approval', approvalRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/records', recordRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 200, msg: 'OK' })
})

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ code: 500, msg: '服务器错误' })
})

// 异步初始化数据库，然后启动服务器
async function startServer() {
  try {
    await initDatabase()
    console.log('数据库初始化完成')
    
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('数据库初始化失败:', error)
    process.exit(1)
  }
}

startServer()
