#!/usr/bin/env bash
set -e

# 定位專案目錄
PROJECT_DIR="$(cd "$(dirname "$(realpath "$0")")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================="
echo "  🚀 啟動 981working 系統 (Vite Dev Server)"
echo "=========================================="

# 檢查相依套件是否安裝
if [ ! -d "node_modules" ]; then
  echo "📦 正在安裝相依套件 (npm install)..."
  npm install
fi

# 檢查是否已有其他進程佔用 port 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  echo "ℹ️  Port 3000 目前已有服務在執行中。"
  echo "🌐 瀏覽器可直接開啟: http://localhost:3000"
  echo "提示: 若欲重新啟動，可先停止現有進程後再次執行此腳本。"
  read -p "是否要終止現有 3000 埠進程並重啟？ (y/N): " -r answer
  if [[ "$answer" =~ ^[Yy]$ ]]; then
    PID=$(lsof -Pi :3000 -sTCP:LISTEN -t)
    if [ -n "$PID" ]; then
      kill -9 $PID 2>/dev/null || true
      sleep 1
    fi
  else
    exit 0
  fi
fi

echo "✨ 正在啟動開發伺服器..."
echo "🌐 本地網址: http://localhost:3000"
echo "=========================================="

npm run dev
