# 全介面輕快流暢過渡效果（Transition Effects）實作計畫

根據您的確認需求，本計畫將為系統「全面套用」**輕快流暢風格（150ms～250ms、微淡入與微縮放）**的介面過渡效果，在維持極致操作效率的前提下，大幅提升視覺舒適度與操作反饋手感。

---

## 1. 架構與設計目標

- **動畫風格**：輕快流暢（Snappy & Smooth），動畫時間控制在 `150ms ~ 250ms`，搭配 `cubic-bezier(0.16, 1, 0.3, 1)` 或 `ease-out`，絕不延遲用戶點擊與操作。
- **無障礙規範**：支援 `@media (prefers-reduced-motion: reduce)`，在使用者系統設定減弱動態時自動平靜降級。
- **涵蓋範圍**：
  1. **全域與視圖切換**：各視圖（清單／看板／日曆／課表／科目）切換時的平滑淡入。
  2. **視窗與彈窗**：所有 Modal 背景遮罩與視窗容器的進出場過渡。
  3. **作業卡片與步驟清單**：卡片懸停微上浮、進度條平滑展開、打勾切換流暢變色。
  4. **導航欄與下拉選單**：功能選單、帳號選單的展開與收合動態。
  5. **操作按鈕與篩選器**：點擊回饋（Active Scale-95）與標籤切換平滑變換。

---

## 2. 實作步驟規劃

### 第一階段：全域過渡動效基礎（`src/index.css`）
- 擴充 Tailwind 動畫設定，定義優化過渡類別：
  - `.view-transition-enter`：視圖切換專用輕量滑入淡入效果（`fade-in-50 slide-in-from-bottom-1 duration-200`）。
  - `.modal-backdrop-transition` 與 `.modal-panel-transition`：彈窗進入的縮放與淡入。
  - `.card-interactive`：卡片懸停平滑陰影與微位移（`hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`）。
  - `.btn-pressable`：按鈕點擊微反饋（`active:scale-95 transition-transform duration-100`）。

### 第二階段：主頁面與視圖切換動效（`src/App.tsx`）
- 在主內容區域（`<main>`）切換 `viewMode`（`list` / `board` / `calendar` / `schedule` / `subjects`）時，透過帶 key 的容器套用流暢淡入效果，使模式切換無卡頓感。
- Banner 提醒區塊（課堂橫幅、期限橫幅）加入高度與透明度平滑過渡。

### 第三階段：作業卡片與互動清單過渡（`src/components/AssignmentCard.tsx`、`BoardView.tsx`）
- **卡片懸停效果**：滑鼠懸停時微升 `hover:-translate-y-0.5` 並增強柔和陰影。
- **打勾狀態切換**：已完成狀態線條畫過（line-through）與背景色、外框顏色套用 `transition-colors duration-200`。
- **步驟清單（Subtasks）**：步驟核取方塊切換、進度百分比條寬度變化使用 `transition-all duration-300 ease-out`。
- **快速切換按鈕**：狀態切換標籤增加平滑反饋。

### 第四階段：彈窗與選單動畫全面優化
- 針對以下 9 個彈窗與下拉面板套用統一的輕快過渡效果：
  1. `AssignmentModal.tsx`（新增/編輯作業）
  2. `AssignmentProgressModal.tsx`（學員繳交狀況名單）
  3. `ClassProgressOverviewModal.tsx`（全班作業繳交進度總表）
  4. `WeeklyScheduleModal.tsx`（全週課表）
  5. `UserManagementModal.tsx`（帳號建立與管理）
  6. `ChangePasswordModal.tsx`（修改密碼）
  7. `AuditLogModal.tsx`（系統安全稽核日誌）
  8. `BackupRestoreModal.tsx`（資料備份與復原）
  9. `ConfirmationModal.tsx`（操作確認提示）
  10. `Navbar.tsx`（功能選單與帳號選單彈出浮層）

---

## 3. 驗證與測試計畫

1. **視覺流暢度驗證**：
   - 點擊「功能選單」與「使用者選單」，選單展開迅速且平滑。
   - 依序切換「清單模式」、「看板模式」、「行事曆模式」、「課表模式」，觀察頁面切換無閃爍。
   - 滑鼠懸停至作業卡片，檢視輕微浮起與外框陰影變化。
   - 點擊作業狀態打勾或步驟完成，檢視進度條平順增長。
   - 開啟各管理彈窗，檢視遮罩與面板縮放淡入。
2. **語法與建置測試**：
   - 執行 `lint_applet` 確認無任何 TypeScript 與語法錯誤。
   - 執行 `compile_applet` 確保應用程式正式編譯成功。
