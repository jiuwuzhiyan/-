# 团购数据采集工具

一个支持从抖音和美团平台采集团购数据的工具，提供友好的网页界面，支持手动和定时采集，以及多种数据导出格式。

## 功能特性

- **双平台支持**：支持抖音和美团两个平台的数据采集
- **数据采集**：采集店铺信息、套餐详情、用户评价等数据
- **手动采集**：通过界面一键触发数据采集任务
- **定时任务**：支持配置定时任务自动采集数据
- **数据导出**：支持导出为 Excel、CSV、JSON 三种格式
- **实时进度**：通过 WebSocket 实时推送任务进度
- **数据管理**：支持数据筛选、分页查看

## 技术栈

### 后端
- Node.js + Express
- TypeScript
- Playwright（浏览器自动化）
- SQLite（数据库）
- node-cron（定时任务）
- exceljs（Excel导出）
- WebSocket（实时通信）

### 前端
- React 18
- TypeScript
- Ant Design
- Redux Toolkit
- React Router
- Vite

## 项目结构

```
group-buy-scraper/
├── server/                 # 后端代码
│   ├── src/
│   │   ├── database/      # 数据库相关
│   │   ├── scrapers/      # 数据采集器
│   │   ├── taskManager/   # 任务管理
│   │   ├── export/        # 数据导出
│   │   ├── routes/        # API路由
│   │   ├── types/         # 类型定义
│   │   └── index.ts       # 入口文件
│   ├── data/              # 数据库文件目录
│   ├── package.json
│   └── tsconfig.json
├── client/                # 前端代码
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── store/         # Redux状态管理
│   │   ├── services/      # API服务
│   │   └── main.tsx       # 入口文件
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── package.json           # 根目录配置
└── README.md
```

## 快速开始

### 前置要求

- Node.js 16+
- npm 或 yarn

### 安装依赖

```bash
# 在项目根目录执行
npm install

# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 安装 Playwright 浏览器

```bash
cd server
npm run playwright:install
```

### 启动项目

#### 方式一：同时启动前后端

```bash
# 在项目根目录执行
npm run dev
```

#### 方式二：分别启动

```bash
# 启动后端（端口 3001）
cd server
npm run dev

# 启动前端（端口 3000）
cd client
npm run dev
```

### 访问应用

打开浏览器访问：http://localhost:3000

## 使用说明

### 1. 数据采集

- 在"数据采集"页面选择平台（抖音/美团/双平台）
- 输入商圈名称
- 点击"开始采集"按钮
- 实时查看采集进度

### 2. 数据查看

- 在"数据查看"页面查看已采集的数据
- 支持按平台和商圈筛选
- 点击"套餐"查看店铺套餐详情
- 点击"评价"查看用户评价

### 3. 任务管理

- 在"任务管理"页面查看所有历史任务
- 查看任务状态和进度

### 4. 定时任务

- 在"定时任务"页面配置自动采集任务
- 使用 Cron 表达式设置执行时间
- 例如：`0 0 * * *` 表示每天 0 点执行

### 5. 数据导出

- 支持导出为 Excel、CSV、JSON 格式
- 可按平台和商圈筛选后导出

## 注意事项

1. 本工具仅用于学习和研究目的
2. 请合理控制采集频率，避免对目标网站造成影响
3. 遵守相关网站的使用条款和 robots.txt 规则
4. 采集的数据仅供个人使用，请勿用于商业用途

## 开发

### 后端开发

```bash
cd server
npm run dev  # 开发模式
npm run build  # 构建
npm start  # 生产模式
```

### 前端开发

```bash
cd client
npm run dev  # 开发模式
npm run build  # 构建
npm run preview  # 预览构建结果
```

## License

MIT
