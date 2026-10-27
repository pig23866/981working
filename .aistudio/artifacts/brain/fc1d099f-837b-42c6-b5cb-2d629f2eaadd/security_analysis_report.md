# 智慧課表與作業統整管理系統：全方位資安與存取控管能力分析報告

本報告針對本專案（**智慧課表與作業統整管理系統**）建構於 React + TypeScript 前端單頁應用（SPA）與 Google Cloud Firestore 即時雲端架構下之 **20 項資安與存取控制核心能力** 進行深度技術架構剖析。

---

## 報告目錄
1. [架構綜述](#架構綜述)
2. [20 項資安能力評估詳解](#20-項資安能力評估詳解)
   - 01. 身分驗證 (Authentication)
   - 02. 授權 (Authorization)
   - 03. 存取控制 (Access Control)
   - 04. 最小權限原則 (Principle of Least Privilege)
   - 05. 權限生命週期 (Privilege Lifecycle)
   - 06. 加密 (Encryption)
   - 07. 金鑰管理 (Key Management)
   - 08. 資料完整性 (Data Integrity)
   - 09. 稽核與日誌 (Audit & Logging)
   - 10. 不可否認性 (Non-repudiation)
   - 11. Session 與 Token 安全
   - 12. 密碼安全 (Password Security)
   - 13. 輸入驗證 (Input Validation)
   - 14. API 安全 (API Security)
   - 15. 資料隱私 (Data Privacy)
   - 16. 備份與復原 (Backup & Recovery)
   - 17. 事件偵測與異常行為 (Anomaly Detection)
   - 18. 資安事件應變 (Incident Response)
   - 19. 零信任架構 (Zero Trust)
   - 20. 安全開發生命週期 (Secure SDLC)
3. [資安評估總結矩陣](#資安評估總結矩陣)
4. [後續強化技術路線圖 (Roadmap)](#後續強化技術路線圖-roadmap)

---

## 架構綜述

本系統採用 **雙層混合架構 (Hybrid Local-Cloud Resilience Pattern)**：
* **前端執行環境**：React 18 + TypeScript + Vite，提供極速離線優先（Offline-First）與無障礙操作體驗。
* **資料同步層**：Google Cloud Firestore（多租戶集合：`assignments`, `schedule`, `audit_logs`, `users`, `assignment_progress`）。
* **安全防護核心**：
  * 密碼防護：`bcryptjs` 單向加鹽雜湊。
  * 本地儲存保護：自建純 TypeScript SHA-256 完整性雜湊簽章，遭竄改時自動觸發靜默修復。
  * 稽核追蹤：採用密碼學雜湊鏈（Hash Chaining）防竄改日誌機制，同步推送至雲端。
  * 主動防禦：帳號連續錯誤 5 次自動鎖定 15 分鐘之防暴力破解引擎。

---

## 20 項資安能力評估詳解

### 01. 身分驗證 (Authentication)
* **核心問題**：你是誰？如何確認存取者真實身分？
* **現行實作**：
  * 於 `src/lib/auth.ts` 中實作 `loginUser()`，支援帳號比對與密碼驗證。
  * 內建 14 位官方學員種子帳號（學號 `98005`～`98402`）及系統管理員帳號（`Admin`）。
  * 具備雙軌驗證：優先比對本地完整性安全快取，並具備即時雲端 Firestore 比對備援。
* **成熟度等級**：🟡 **基礎 (Baseline)**
* **潛在風險與缺口**：
  * 尚未支援多因子驗證（MFA, Multi-Factor Authentication）。
  * 缺少 TOTP 動態驗證碼（如 Google Authenticator）或 FIDO2 / WebAuthn 生物辨識與硬體安全金鑰。
* **強化建議**：
  * 整合 Firebase Authentication 或 TOTP 模組，對具有管理員（Admin）權限之帳號強制要求二次動態驗證。

---

### 02. 授權 (Authorization)
* **核心問題**：你能做什麼？如何劃分各項角色特權？
* **現行實作**：
  * 採用角色型存取控制（RBAC, Role-Based Access Control），型別定義於 `src/types.ts` 之 `UserRole = 'admin' | 'user'`。
  * **系統管理員 (Admin)**：具備建立帳號、指派權限、強制重設密碼、刪除使用者、清空/覆蓋作業、查閱全班繳交進度矩陣、查閱系統安全稽核日誌。
  * **一般學員 (User)**：僅能維護個人作業完成進度、自主變更個人登入密碼、查閱個人作業看板與授課課表。
* **成熟度等級**：🟢 **良好 (Solid Client-side RBAC)**
* **潛在風險與缺口**：
  * 目前權限判定主要在客戶端元件（如 `AuditLogModal`, `UserManagementModal`）進行條件渲染。
* **強化建議**：
  * 推進至屬性型存取控制（ABAC），分離「作業股長（僅能新增與編輯作業）」與「資安管理員（管理帳號與稽核日誌）」。

---

### 03. 存取控制 (Access Control)
* **核心問題**：誰可以在什麼條件下存取哪些雲端資源？
* **現行實作**：
  * 部署標準 `firestore.rules` 安全規則檔，對各集合（Collection）嚴格約束：
    * `assignments`：強制檢驗標題長度（<= 200）、截止期限格式、優先級及狀態枚舉值。
    * `audit_logs`：設定 `allow update: if false;`，嚴格禁止日誌被竄改。
    * `users`：限制欄位格式、角色範圍（`user` / `admin`）及雜湊長度。
* **成熟度等級**：🟡 **部分實現 (Partial)**
* **潛在風險與缺口**：
  * 目前 Firestore 規則採用型態與長度校驗（Schema Validation），因前端未綁定 Firebase Auth 的 Session UID，尚無法在雲端規則層強制驗證 `request.auth.uid == resource.data.userId`。
* **強化建議**：
  * 將本機帳號與 Firebase Auth Custom Claims 連動，在規則層達成「學員僅能寫入自身進度記錄」之強制隔離。

---

### 04. 最小權限原則 (Principle of Least Privilege)
* **核心問題**：是否只賦予完成工作所需的最低必要權限？
* **現行實作**：
  * 一般學員作業卡片與看板僅顯示個人進度，對學員端不揭露全班學員清單與同儕完成統計。
  * 管理員預設具備自我保護（無法自刪現有登入管理員帳號、無法刪除預設 `Admin` 超級帳號）。
* **成熟度等級**：🟢 **良好 (Good Practice)**
* **強化建議**：
  * 將課表「編輯/重設課表」權限進一步獨立，避免所有管理員皆能非預期修改全班授課時程。

---

### 05. 權限生命週期 (Privilege Lifecycle)
* **核心問題**：帳號從建立、授權、異動、停權到刪除的完整流程。
* **現行實作**：
  * `UserManagementModal.tsx` 與 `src/lib/auth.ts`：
    * **帳號建立**：Admin 輸入學號與姓名，支援自動產生強固隨機密碼。
    * **身分指派**：建立或維護時可隨時調整 Role。
    * **密碼重設**：Admin 擁有管理特權，可無需舊密碼直接重設指定學員密碼。
    * **停權註銷**：支援即時刪除帳號，立即清除本地快取並非同步自雲端移除。
* **成熟度等級**：🟢 **良好 (Lifecycle Handled)**
* **強化建議**：
  * 引入「帳號有效期 (Account Expiration Date)」與「暫時停權 (Disable Account)」開關，便於學期交接或畢業封存。

---

### 06. 加密 (Encryption)
* **核心問題**：傳輸中與靜態儲存中的資料是否皆受到保護？
* **現行實作**：
  * **傳輸中加密 (In-Transit)**：全站強制採用 HTTPS/TLS 1.3 協定；與 Google Firestore 通訊完全經由 Google TLS 管道。
  * **靜態儲存加密 (At-Rest)**：
    * 雲端 Firestore 原生享有 Google Cloud 伺服器端 AES-256 全磁區透明加密。
    * 本地端 `localStorage` 嚴格禁止存放明文密碼，全數存放為 bcrypt 雜湊字串。
* **成熟度等級**：🟢 **良好 (Standards-Compliant)**
* **強化建議**：
  * 對於瀏覽器端的本地快取（Local Cache），可導入 Web Crypto API（AES-GCM-256）進行第二層客戶端對稱加密。

---

### 07. 金鑰管理 (Key Management)
* **核心問題**：金鑰的產生、保存、輪替與撤銷機制。
* **現行實作**：
  * 原始碼內無硬編碼資料庫 Root 密碼或私有金鑰。
  * 完整性雜湊使用內部常數 Salt（`INTEGRITY_SALT`）。
* **成熟度等級**：🟡 **基礎 (Baseline)**
* **潛在風險與缺口**：
  * 前端單頁應用（SPA）中編譯輸出的 JS 程式碼，任何常數均可透過瀏覽器 DevTools 逆向提取。
* **強化建議**：
  * 在 Google Cloud Console 針對 Firebase API Key 設置嚴格的 HTTP Referrer 來源網址限制（Domain Whitelisting），防範未授權網域濫用。

---

### 08. 資料完整性 (Data Integrity)
* **核心問題**：如何確保資料未在傳輸或儲存中被偷偷篡改？
* **現行實作**：
  * `src/lib/integrity.ts` 內嵌 **純 TypeScript 實作的標準 SHA-256 雜湊演算法**。
  * **雜湊密封儲存 (Envelope Pattern)**：寫入本地儲存時包裝 `{ payload, hash, timestamp }`。
  * **自動靜默修復**：讀取時即時重新計算雜湊，若雜湊不符（代表遭本機外部手動竄改），系統自動回復出廠安全預設值，並主動於稽核日誌登記「完整性自動修復」警報。
  * **備份檔驗證**：匯出的備份檔自帶專屬 `checksum`，匯入時必須通過格式與雜湊校驗。
* **成熟度等級**：🟢 **極佳 (High Implementation Quality)**

---

### 09. 稽核與日誌 (Audit & Logging)
* **核心問題**：誰在什麼時間做了什麼事情？是否具備追查依據？
* **現行實作**：
  * `src/lib/auditLogger.ts` 提供全系統結構化事件稽核追蹤：
    * 記錄欄位：`id`、`timestamp`、`category`（`auth`/`assignment`/`schedule`/`backup`/`user`/`security`）、`action`、`level`（`info`/`warn`/`security`）、`actor`（操作者姓名、學號、身分）、`target`、`details`。
    * **雜湊鏈結構 (Hash Chaining)**：每筆日誌包含前筆記錄之 `prevHash`，並計算當前 SHA-256，形成防竄改鏈條。
    * **雙軌持久化**：本地快取（上限 500 筆防止空間耗盡）＋ 即時非同步上傳 Cloud Firestore `audit_logs` 集合。
    * **匯出與查詢**：提供管理員日誌搜尋、分類過濾與一鍵 JSON 匯出備查。
* **成熟度等級**：🟢 **極佳 (Enterprise-Grade Structure)**

---

### 10. 不可否認性 (Non-repudiation)
* **核心問題**：操作者事後能否否認其操作行為？
* **現行實作**：
  * 所有關鍵異動（作業打勾、新增作業、帳號建立、課表變更）皆綁定當前 SessionUser 並簽注於日誌。
  * `firestore.rules` 嚴格禁止雲端日誌被 Update（`allow update: if false;`）。
* **成熟度等級**：🟡 **中等 (Partial)**
* **潛在風險與缺口**：
  * 目前操作者簽注依賴應用層 Session 標記，尚未導入公私鑰非對稱數位簽章（PKI Digital Signature）。
* **強化建議**：
  * 對於機敏審核操作，可整合使用者憑證或 WebCrypto 私鑰進行數位簽名。

---

### 11. Session 與 Token 安全
* **核心問題**：Cookie / Token 是否具備過期、防偷窺與撤銷機制？
* **現行實作**：
  * `src/lib/auth.ts` 中透過 `hw_auth_session_v2` 維護當前登入者身分狀態，登出時呼叫 `logoutSession()` 即刻抹除。
* **成熟度等級**：🟡 **基礎 (Baseline)**
* **潛在風險與缺口**：
  * Session 存於 `localStorage`，無防範 XSS 之 `HttpOnly` 保護。
  * 目前無內建閒置逾時登出（Idle Timeout）與 Token TTL 機制。
* **強化建議**：
  * 在 Session 物件中增加過期時間戳記（如 30 分鐘無操作自動失效），並在伺服器端模式下採用 `HttpOnly; Secure; SameSite=Strict` Cookie。

---

### 12. 密碼安全 (Password Security)
* **核心問題**：密碼保存是否避免明文？抗彩虹表與抗爆破強度？
* **現行實作**：
  * 全面採用工業級標準 **`bcryptjs`**，設定 `SALT_ROUNDS = 10`。
  * 所有官方種子密碼與自建帳號密碼，均於儲存前完成單向雜湊。
  * 支援舊密碼校驗比對與管理員特權覆寫。
* **成熟度等級**：🟢 **良好 (Modern Cryptographic Hashing)**
* **強化建議**：
  * 導入密碼複雜度驗證（例如禁止弱密碼、要求包含大小寫與特殊符號）。

---

### 13. 輸入驗證 (Input Validation)
* **核心問題**：是否有效防範 SQL Injection、XSS、指令注入等威脅？
* **現行實作**：
  * **前端**：表單全面執行 `trim()`、空白防呆、非空檢查與長度邊界控制。
  * **NoSQL 防護**：使用 Firestore NoSQL 架構，本質免疫傳統關聯式 SQL Injection。
  * **XSS 防護**：React Virtual DOM 預設對所有變數輸出執行 HTML Entity 編碼轉義，專案無使用 `dangerouslySetInnerHTML`。
  * **雲端規則驗證**：`firestore.rules` 針對欄位型別、字串長度與枚舉值進行強制驗證。
* **成熟度等級**：🟢 **良好 (Safe Architecture)**

---

### 14. API 安全 (API Security)
* **核心問題**：API 存取授權、速率限制與呼叫安全。
* **現行實作**：
  * 前端藉由官方 Firebase SDK 透過 WebSocket / gRPC 安全通道通訊。
  * 雲端規則檢驗請求封包的結構完整性。
* **成熟度等級**：🟡 **中等 (Partial)**
* **潛在風險與缺口**：
  * 缺少客戶端請求頻率限制（Rate Limiting）。
* **強化建議**：
  * 於 Google Cloud Firebase 啟用 **Firebase App Check**（結合 reCAPTCHA Enterprise），杜絕外部非授權腳本直接呼叫資料庫。

---

### 15. 資料隱私 (Data Privacy)
* **核心問題**：個人資訊與完成狀態誰可以看到？是否達到隱私隔離？
* **現行實作**：
  * **個人進度隔離**：一般學員在作業卡片僅看見個人的打勾狀態與進度條，卡片不顯示全班統計，保護同儕隱私。
  * **管理員矩陣專用**：僅具備 `admin` 角色之人員可開啟「全班繳交進度總表」查閱每位學員之個別進度。
* **成熟度等級**：🟢 **良好 (Privacy by Design in UI)**
* **強化建議**：
  * 在 Firestore 規則層嚴格限縮 `assignment_progress` 的讀取權限，落實資料庫層的個人隱私保護。

---

### 16. 備份與復原 (Backup & Recovery)
* **核心問題**：資料遺失、損毀或故障時如何安全還原？
* **現行實作**：
  * `src/lib/backupService.ts` 與 `src/components/BackupRestoreModal.tsx`：
    * 支援 **作業資料** 與 **課表資料** 各自獨立匯出為 JSON 格式。
    * 備份檔內嵌版本、匯出者、時間戳記與 **SHA-256 Checksum** 驗證碼。
    * 復原支援 **完全覆蓋 (Replace)** 與 **合併追加 (Merge)** 兩種模式。
    * 提供「一鍵還原預設課表」原廠重設防呆按鈕。
* **成熟度等級**：🟢 **極佳 (Resilient & User-Friendly)**

---

### 17. 事件偵測與異常行為 (Anomaly Detection)
* **核心問題**：系統能否即時識別並阻絕可疑行為？
* **現行實作**：
  * `src/lib/auth.ts` 內建 **主動防暴力破解鎖定引擎 (Brute-Force Lockout Engine)**：
    * 密碼連續輸入錯誤達 **5 次** 即刻鎖定帳號 **15 分鐘**。
    * 鎖定期間自動阻擋後續登入嘗試，並於日誌標註 `security` 等級警報。
    * 登入成功時自動重設錯誤計數器。
  * 本地儲存被非法竄改時，主動記錄「完整性自動修復」警報。
* **成熟度等級**：🟢 **良好 (Built-in Active Defense)**
* **強化建議**：
  * 增加「異常頻繁登入」或「短時間內大量刪除作業」之異常行為警報模式。

---

### 18. 資安事件應變 (Incident Response)
* **核心問題**：發現帳號被盜或資料異常時的處置流程與工具。
* **現行實作**：
  * 管理員專屬「安全稽核日誌視窗」具備即時分類過濾與搜尋功能，可快速定位問題來源（Actor / Action / IP）。
  * 管理員具備快速應變處置工具箱：
    1. 立即強制覆寫遭盜用帳號密碼。
    2. 立即刪除問題帳號。
    3. 匯入歷史乾淨備份檔即刻復原。
* **成熟度等級**：🟡 **中等 (Manual Toolkit Ready)**
* **強化建議**：
  * 加入自動化 Webhook 通報（如觸發帳號鎖定或資料異常時即時推播至管理者信箱或通訊群組）。

---

### 19. 零信任架構 (Zero Trust)
* **核心問題**：是否落實「持續驗證、永不信任」？
* **現行實作**：
  * 實踐「不信任本地儲存」：每次讀取皆計算 Hash 驗證是否遭偽造。
  * 實踐「不信任單一離線端點」：維持與雲端 Firestore 即時雙向長連接對帳。
* **成熟度等級**：🟡 **基礎~中等 (Developing)**
* **潛在風險與缺口**：
  * 尚未具備設備健康度檢查與動態連線評估。
* **強化建議**：
  * 逐步將前端核心業務移轉至伺服器端（Cloud Functions），對每個 API 呼叫執行不可繞過的零信任權限二次校驗。

---

### 20. 安全開發生命週期 (Secure SDLC)
* **核心問題**：開發過程中如何保障軟體品質與資安規範？
* **現行實作**：
  * **TypeScript 靜態型別安全**：全專案嚴格無 `any` 弱點，編譯時透過 `tsc --noEmit` 自動阻斷潛在型態注入。
  * **自動化建置校驗**：每次更動均執行 `lint_applet` 與 `compile_applet`，杜絕未定義變數或破壞性模組引入。
  * **模組化分層架構**：資安邏輯嚴格切分於 `auth.ts`, `integrity.ts`, `auditLogger.ts`, `backupService.ts`，易於稽核與單元測試。
* **成熟度等級**：🟢 **良好 (Strong Engineering Hygiene)**

---

## 資安評估總結矩陣

| 項次 | 資安能力維度 | 目前成熟度 | 核心實作亮點 | 下階段強化重點 |
| :---: | :--- | :---: | :--- | :--- |
| **01** | **身分驗證 Authentication** | 🟡 基礎 | bcrypt 密碼雜湊驗證、官方種子帳號 | 導入 MFA / TOTP 雙因子驗證 |
| **02** | **授權 Authorization** | 🟢 良好 | 角色型權限管理（Admin vs User） | 擴充 ABAC 細部權限分離 |
| **03** | **存取控制 Access Control** | 🟡 混合 | `firestore.rules` 型別與長度驗證 | 綁定 Firebase Auth UID 強制授權 |
| **04** | **最小權限 Least Privilege** | 🟢 良好 | 學員進度隱私隔離、管理帳號保護 | 分離作業管理員與資安管理員 |
| **05** | **權限生命週期 Lifecycle** | 🟢 良好 | 帳號建立、隨機密碼、重設、註銷 | 增加帳號過期日期與暫時凍結開關 |
| **06** | **加密 Encryption** | 🟢 良好 | HTTPS/TLS 1.3、Firestore AES-256 | 本地端快取加入 AES-GCM 對稱加密 |
| **07** | **金鑰管理 Key Management** | 🟡 基礎 | 無硬編碼敏感金鑰、環境變數隔離 | GCP API Key 設定網域名稱來源限制 |
| **08** | **資料完整性 Integrity** | 🟢 極佳 | 內建純 TS SHA-256 雜湊與自動修復 | 升級為伺服器端 HMAC 簽章 |
| **09** | **稽核日誌 Audit & Logging** | 🟢 極佳 | 密碼學雜湊鏈 (Hash Chain)、雙軌儲存 | 支援日誌轉發至外部 SIEM / Syslog |
| **10** | **不可否認性 Non-repudiation**| 🟡 中等 | 操作簽注 Actor、日誌禁止 Update | 關鍵異動整合 PKI 數位簽章 |
| **11** | **Session 安全 Session Security** | 🟡 基礎 | LocalStorage Session 隔離管理 | 增加 Session 過期時效與閒置登出 |
| **12** | **密碼安全 Password Security**| 🟢 良好 | 工業標準 `bcryptjs` 加鹽雜湊 | 強化密碼複雜度規則檢核 |
| **13** | **輸入驗證 Input Validation** | 🟢 良好 | TypeScript 型別安全、無 SQLi/XSS | 表單增加 HTML Sanitizer 過濾 |
| **14** | **API 安全 API Security** | 🟡 中等 | 雲端規則架構防護、文件 ID 長度校驗 | 啟用 App Check / 速率限制 |
| **15** | **資料隱私 Data Privacy** | 🟢 良好 | 學員作業獨立打勾、不對外公開他人進度 | 資料庫層強制限定僅本人可讀取進度 |
| **16** | **備份復原 Backup & Recovery** | 🟢 極佳 | 獨立 JSON 備份、SHA-256 Checksum 校驗 | 排程自動定時備份至遠端 |
| **17** | **異常偵測 Anomaly Detection**| 🟢 良好 | 密碼連續錯誤 5 次自動鎖定 15 分鐘 | 增加異常頻繁請求與異地登入偵測 |
| **18** | **事件應變 Incident Response** | 🟡 中等 | 具備管理員重設、停權與備份還原工具箱 | 建立自動化 Webhook 即時告警通報 |
| **19** | **零信任 Zero Trust** | 🟡 基礎 | 不信任本地快取、雲端即時雙向校驗 | 核心業務轉由 Cloud Functions 驗證 |
| **20** | **安全開發 Secure SDLC** | 🟢 良好 | TypeScript 靜態編譯檢查、模組化架構 | 整合 npm audit / Snyk 自動相依性掃描 |

---

## 後續強化技術路線圖 (Roadmap)

1. **短期目標 (Immediate / 1-2 週)**：
   - 於 `SessionUser` 增加 `expiresAt` 與 30 分鐘無操作自動登出機制。
   - GCP 控制台設定 Firebase Web API Key 的 HTTP Referrer 來源限制。
   - 增加密碼複雜度檢驗（禁止弱密碼）。

2. **中期目標 (Medium-term / 1-2 個月)**：
   - 將前端帳號系統與 Firebase Auth 整合，改由 Custom Token / UID 連動 `firestore.rules`。
   - 於 Cloud Firestore 啟用 Firebase App Check（reCAPTCHA Enterprise）。
   - 增加資安事件 Webhook 即時通知（如連續登入失敗觸發鎖定時自動通報管理員）。

3. **長期目標 (Long-term / 3-6 個月)**：
   - 引入零信任後端微服務（Cloud Functions），所有資料修改全面由後端執行 RBAC / ABAC 權限校驗。
   - 關鍵審核操作整合硬體憑證卡或 WebAuthn 數位簽章，達成最高等級之不可否認性。
