@echo off
chcp 65001 >nul
echo ========================================
echo 唐山中骏世界城库存系统
echo 正在启动前端和后端服务...
echo ========================================
echo.
echo 后端服务将在 http://localhost:3000 启动
echo 前端服务将在 http://localhost:5173 启动
echo.
echo 按 Ctrl+C 停止所有服务
echo ========================================
echo.

cd /d "%~dp0
npm run dev
