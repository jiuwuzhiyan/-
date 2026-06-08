@echo off
echo ====================================
echo 团购数据采集工具 - 启动脚本
echo ====================================
echo.

echo [1/3] 检查 Node.js 是否安装...
node --version
if %errorlevel% neq 0 (
    echo 错误: 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)
echo.

echo [2/3] 安装依赖...
call npm install
cd server
call npm install
cd ../client
call npm install
cd ..
echo.

echo [3/3] 安装 Playwright 浏览器...
cd server
call npm run playwright:install
cd ..
echo.

echo ====================================
echo 依赖安装完成！
echo 现在您可以运行 'npm run dev' 来启动应用
echo ====================================
echo.

pause
