# 981working - 智慧作業統整與課表管理系統

> 一套專為班級與學生打造的現代化智慧作業追蹤、課表統整與安全管理系統。支援即時課堂掌握、多維度作業檢視、全班繳交進度追蹤、分權登入、資料完整性加密防竄改與 PWA 離線應用。

---

## 🌟 核心功能特色

### 1. 🕒 智慧課堂與即時課表
- **即時課堂導航橫幅（Current Class Banner）**：根據當前時間精準顯示「正在進行的課程」與「下一節課教室地點」，並提供下課/上課即時倒數。
- **週期課表檢視（Weekly Schedule View）**：完整呈現每週一至週五各節次課表，支援彈性編輯自訂課堂資訊與教室設定。

### 2. 📋 多維度作業管理
- **看板檢視（Board View）**：以「待處理 (Todo)」、「進行中 (In Progress)」、「已完成 (Completed)」、「已提交 (Submitted)」四階段看板拖曳或分類管理。
- **行事曆檢視（Calendar View）**：視覺化月曆介面，即時掌握各日期截止作業與重要時程。
- **學科總覽檢視（Subject Overview View）**：按必修/選修學科分類篩選，掌握各科作業數量與完成比例。
- **截止倒數與警示（Deadline Alert Banner）**：作業逾期、今日截止、明日截止分級色彩警報，避免遺漏重要事項。
- **子任務進度（Subtasks Checklist）**：每項作業皆可拆解為多個小步驟，即時反映百分比完成度。

### 3. 👥 分權身分登入與使用者管理
- **角色型存取控制（RBAC）**：
  - **系統管理員（Admin）**：擁有作業編輯、課表修改、使用者管理、安全審計日誌檢視、資料庫備份與還原等完整權限。
  - **一般學生（User）**：可檢視課表、追蹤自身作業進度、勾選個人子任務、更新繳交狀態。
- **使用者管理面板**：管理員可新增、編輯、重設密碼與停用使用者帳號。
- **密碼自主變更**：所有使用者均可安全修改個人登入密碼。

### 4. 📊 全班作業繳交進度追蹤
- **全班繳交率圖表（Class Progress Overview）**：結合 Recharts 視覺化統計全班或各學科作業完成百分比。
- **各別作業統計（Assignment Progress Modal）**：清楚列出各成員完成與繳交狀況，利於學藝股長或助教掌握進度。

### 5. 🛡️ 企業級資安與防竄改機制
- **HMAC / SHA-256 資料完整性保護**：本地重要儲存（使用者、作業、課表、日誌）皆附帶加密 Hash 驗證碼，防止本機開發者工具惡意篡改資料；若偵測損壞將觸發安全自癒修復並留下稽核軌跡。
- **審計日誌系統（Audit Log Modal）**：詳細記錄登入、修改密碼、資料備份、完整性警報等敏感操作，方便追溯審核。
- **安全分析報告**：內建詳細之 [SECURITY_ANALYSIS.md](file:///home/user/Documents/981working/SECURITY_ANALYSIS.md) 弱點掃描與防護加固說明。

### 6. 💾 資料備份與還原
- **一鍵 JSON 匯出/匯入**：支援包含使用者設定、作業清單、課表配置的完整封裝備份，方便移轉與災難復原。

### 7. 📱 PWA 漸進式網頁應用與離線支援
- **離線狀態偵測（Offline Indicator）**：網路中斷時自動切換離線模式並提醒使用者。
- **Service Worker（Workbox）**：靜態資源完整快取，無網路環境亦可順暢開啟系統。
- **可安裝性（PWA Install Prompt）**：支援手機（Android / iOS）及電腦（Chrome / Edge）安裝為桌面獨立 App。

---

## 🔑 預設登入帳號

| 身分 | 帳號 | 預設密碼 | 備註 |
| :--- | :--- | :--- | :--- |
| **系統管理員** | `Admin` | `Aa123456789` | 具備完整管理權限，首次登入建議立即更改密碼 |
| **學生範例** | 學號（如 `982101`） | `Aa` + 學號（如 `Aa982101`） | 依實際匯入學生清單為準 |

---

## 🚀 快速開始

### 環境需求
- **Node.js**：v18 或更新版本（建議 v20 或 v22）
- **套件管理工具**：`npm` 或 `bun`

### 一鍵快捷啟動
專案內建快捷啟動腳本，會自動檢查相依套件並啟動服務：
```bash
./start.sh
```
若您使用 Linux 圖形桌面，亦可直接雙擊桌面捷徑：
- `桌面/啟動981working.desktop` 或 `桌面/start.sh`

啟動後於瀏覽器開啟：[http://localhost:3000](http://localhost:3000)

### 手動啟動步驟
```bash
# 1. 安裝相依套件
npm install

# 2. 啟動開發伺服器
npm run dev

# 3. 建置生產版本
npm run build

# 4. 預覽生產建置結果
npm run preview
```

---

## 🔄 Git 快捷同步

專案已配備一鍵自動同步腳本 [sync.sh](file:///home/user/Documents/981working/sync.sh)：
```bash
# 自動暫存、提交並推送（預設帶有時間戳的提交訊息）
./sync.sh

# 或指定自訂 commit 訊息
./sync.sh "feat: 更新作業列表與組件樣式"
```
腳本具備以下自動化邏輯：
1. 自動驗證遠端 SSH 連線（`git@github.com:pig23866/981working.git`）。
2. 自動 `git add -A` 與 `git commit`。
3. 自動以 `git pull --rebase origin main` 拉取最新程式碼，確保分支乾淨。
4. 自動 `git push origin main` 推送至 GitHub。
5. 同步腳本亦已於桌面建立捷徑（`桌面/同步981working.desktop`）。

---

## 📁 專案目錄結構

```text
981working/
├── public/                 # 靜態資源、圖標 (PWA Icons, Favicon, SVG)
├── src/
│   ├── components/         # React UI 組件
│   │   ├── AssignmentCard.tsx            # 作業卡片
│   │   ├── AssignmentModal.tsx           # 作業新增/編輯視窗
│   │   ├── AssignmentProgressModal.tsx   # 各別作業成員進度
│   │   ├── AuditLogModal.tsx             # 安全審計日誌
│   │   ├── BackupRestoreModal.tsx        # 備份與還原
│   │   ├── BoardView.tsx                 # 看板檢視
│   │   ├── CalendarView.tsx              # 日曆檢視
│   │   ├── ClassProgressOverviewModal.tsx# 全班進度視覺化
│   │   ├── CurrentClassBanner.tsx        # 當前課堂即時橫幅
│   │   ├── DeadlineAlertBanner.tsx       # 截止期限警報
│   │   ├── LoginView.tsx                 # 登入頁面
│   │   ├── Navbar.tsx                    # 頂部導航列與深色切換
│   │   ├── SubjectFilterBar.tsx          # 學科篩選列
│   │   ├── SubjectOverviewView.tsx       # 學科總覽
│   │   ├── UserManagementModal.tsx       # 使用者管理
│   │   └── WeeklyScheduleModal.tsx       # 每週課表編輯
│   ├── lib/                # 核心商業邏輯與工具函式
│   │   ├── auditLogger.ts    # 審計日誌引擎
│   │   ├── auth.ts           # 驗證與身分權限
│   │   ├── backupService.ts  # 備份匯出與還原檢查
│   │   ├── constants.ts      # 預設學科與常數
│   │   ├── dateUtils.ts      # 日期與時間計算
│   │   ├── firebase.ts       # Firebase Firestore 雲端同步
│   │   ├── integrity.ts      # HMAC / SHA-256 資料完整性檢驗
│   │   ├── notifications.ts  # 瀏覽器推播通知
│   │   ├── pwaRegister.ts    # Service Worker 註冊
│   │   └── scheduleData.ts   # 課表時間邏輯與種子資料
│   ├── App.tsx             # 應用程式主入口與路由/狀態調度
│   ├── main.tsx            # React 渲染起點
│   ├── types.ts            # 全域 TypeScript 型別定義
│   └── index.css           # Tailwind CSS 核心樣式
├── start.sh                # 本地服務一鍵啟動腳本
├── sync.sh                 # Git 倉庫一鍵同步腳本
├── SECURITY_ANALYSIS.md    # 系統安全性分析與防禦報告
├── vite.config.ts          # Vite 與 PWA 插件配置
└── package.json            # 專案相依與 npm 指令
```

---

## 🛠️ 技術棧

- **前端核心**：[React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **建置工具**：[Vite 6](https://vitejs.dev/)
- **樣式處理**：[Tailwind CSS v4](https://tailwindcss.com/)
- **動畫效果**：[Motion](https://motion.dev/)
- **圖表視覺化**：[Recharts](https://recharts.org/)
- **圖示庫**：[Lucide React](https://lucide.dev/)
- **離線與快取**：[vite-plugin-pwa](https://vite-pwa-org.netlify.app/) + [Workbox](https://developer.chrome.com/docs/workbox/)
- **後端資料同步**：[Firebase Cloud Firestore](https://firebase.google.com/) + LocalStorage 離線優先架構
- **安全性與雜湊**：[bcryptjs](https://github.com/dcodeIO/bcrypt.js) + Web Crypto API (HMAC-SHA256)

---

## 📄 授權協議

本專案採用客製化內部授權，保留所有權利。歡迎針對班級與學生需求自由擴充與維護。
