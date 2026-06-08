import express from 'express';
import cors from 'cors';
import http from 'http';
import WebSocket from 'ws';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './database';
import { loadCronJobs, setWebSocketServer } from './taskManager';
import routes from './routes';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3001;

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json());

app.use('/api', routes);

setWebSocketServer(wss);

wss.on('connection', (ws) => {
  console.log('WebSocket 客户端已连接');
  
  ws.on('close', () => {
    console.log('WebSocket 客户端已断开连接');
  });
});

function startServer() {
  try {
    initDatabase();
    console.log('数据库初始化成功');
    
    loadCronJobs();
    console.log('定时任务加载成功');
    
    server.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();
