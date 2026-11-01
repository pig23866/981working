#!/usr/bin/env bash
set -e

# 定位專案目錄
PROJECT_DIR="$(cd "$(dirname "$(realpath "$0")")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================="
echo "  🔄 981working Git 同步作業"
echo "=========================================="

# 確保遠端 URL 使用 SSH
REMOTE_URL=$(git remote get-url origin 2>/dev/null || true)
if [[ "$REMOTE_URL" == *"https://github.com/pig23866/981working"* ]]; then
  echo "🔧 設定遠端倉庫為 SSH 連線..."
  git remote set-url origin git@github.com:pig23866/981working.git
fi

# 檢查是否有本地變更需要提交
if [ -n "$(git status --porcelain)" ]; then
  echo "📋 偵測到以下變更檔案："
  git status --short

  COMMIT_MSG="$1"
  if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="chore: 同步更新 $(date '+%Y-%m-%d %H:%M:%S')"
  fi

  echo "➕ 加入所有變更並提交 (commit: $COMMIT_MSG)..."
  git add -A
  git commit -m "$COMMIT_MSG"
else
  echo "ℹ️  工作區無未提交變更。"
fi

echo "⬇️  正在自 GitHub 拉取最新進度 (git pull --rebase)..."
git pull --rebase origin main || {
  echo "⚠️  git pull 失敗，請手動檢查衝突。"
  exit 1
}

echo "⬆️  正在推送到 GitHub (git push origin main)..."
git push origin main

echo "=========================================="
echo "🎉 Git 同步完成！已成功與 GitHub 遠端保持一致。"
echo "=========================================="
