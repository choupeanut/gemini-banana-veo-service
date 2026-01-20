# Gemini API Veo 3.1 Quickstart & Studio

這是一個基於 Next.js 的互動式網頁應用程式，專為展示與操作 Google Gemini API 的多模態生成能力而設計，特別聚焦於 **Veo 3.1** 影片生成模型的進階功能。

## ✨ 目前功能

### 1. 影片生成 (Video Generation) - Veo 3.1 Preview
-   **模型**: 預設使用 `veo-3.1-generate-preview`。
-   **多模態輸入**:
    -   支援 **文字提示 (Text Prompt)**。
    -   支援 **多張參考圖片 (Multi-Image)** 上傳（最多 3 張），用於 Image-to-Video 生成。
-   **參數控制**:
    -   **解析度 (Resolution)**: 720p (預設), 1080p, 4K。
    -   **長度 (Duration)**: 4s, 6s, 8s。
    -   **顯示比例 (Aspect Ratio)**: 16:9, 9:16。
-   **強制約束邏輯**: 當選擇高解析度 (1080p/4K) 或上傳了參考圖片時，系統會自動鎖定影片長度為 **8 秒**，以符合模型規格。
-   **對話式介面**: 生成結果以聊天氣泡形式呈現，保留歷史紀錄，並支援影片下載。

### 2. 圖片生成與編輯 (Image Generation & Editing)
-   **Create Image**: 使用 Imagen 3 或 Gemini 3 Pro 生成圖片。
-   **Edit Image**: 上傳圖片並透過文字指令進行編輯。
-   **Compose Image**: 上傳多張圖片進行合成與創作。
-   **Context Management**: 支援保留上一張生成的圖片作為後續操作的上下文。

### 3. 使用者介面 (UI/UX)
-   **Persistent Context Bar**: 在 Create Video 等模式下，提供常駐的圖片管理列，方便隨時新增、預覽或清除參考圖片。
-   **Video Parameters Bar**: 提供直覺的下拉選單來調整影片參數。
-   **Polling Feedback**: 完整的 API 狀態輪詢與錯誤處理，能顯示具體的安全性攔截 (RAI) 原因。

## 🛠️ 程式規格

### 技術堆疊
-   **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS.
-   **Backend**: Next.js API Routes (Route Handlers).
-   **SDK**: 直接使用 REST API (`fetch`) 呼叫 Google Generative Language API (解決部分 SDK 相容性問題)。
-   **State Management**: React `useState`, `useReducer` (History), `useContext` (implied).

### 關鍵檔案結構
-   `app/page.tsx`: 主應用程式頁面。包含所有狀態管理 (`history`, `mode`, `parameters`)、API 呼叫邏輯 (`startGeneration`)、以及主要 UI 佈局 (`Context Bar`, `Parameters Bar`)。
-   `components/ui/Composer.tsx`: 底部固定的輸入區塊。包含 Prompt 輸入框與送出按鈕。
-   `components/ui/ChatMessage.tsx`: 負責渲染對話紀錄，包含文字、圖片預覽與影片播放器。
-   `app/api/veo/generate/route.ts`: 處理影片生成請求。
    -   解析 `FormData` 中的多張圖片 (`imageFiles`)。
    -   處理 `resolution`, `durationSeconds` 等參數並封裝至 `config`。
    -   呼叫 Google API 啟動生成任務。
-   `app/api/veo/operation/route.ts`: 處理長執行任務 (Long-running Operation) 的狀態輪詢。
    -   使用 REST API 直接查詢 Operation 狀態。
    -   回傳 `generatedSamples` 或 `generatedVideos` 中的影片 URI。

## 🏗️ 程式架構

### 前端流程
1.  **User Input**: 使用者在 `Composer` 輸入文字，並透過 `Context Bar` 上傳圖片。
2.  **Validation**: `canStart` 檢查必要條件（如 Prompt 是否為空）。
3.  **Submission**: `startGeneration` 收集所有狀態（Prompt, Images, Params），打包成 `FormData`。
4.  **API Call**: 發送 POST 請求至 `/api/veo/generate`。
5.  **Polling**: 取得 Operation Name 後，前端啟動輪詢機制 (`poll` function)，每 5 秒呼叫 `/api/veo/operation`。
6.  **Rendering**: 
    -   生成中：顯示 Loading 狀態與模型訊息。
    -   完成：更新 `history` 狀態，`ChatMessage` 顯示影片播放器。
    -   錯誤：顯示 API 回傳的具體錯誤訊息（如 RAI 過濾）。

### 後端邏輯
-   **Generate Route**: 負責將前端的 `multipart/form-data` 轉換為 Gemini API 需要的 JSON payload。特別處理了多圖片的 Base64 轉換與陣列封裝。
-   **Operation Route**: 繞過 SDK 可能的型別問題，直接透過 HTTP GET 請求查詢 Google Operation API，確保能正確解析 Veo 3.1 的回應結構 (`generatedSamples`)。

## 🚀 部署

專案包含 `Dockerfile`，支援容器化部署。
建議使用 Docker Compose 或直接 Build & Run。

```bash
# Build
docker build -t veo-studio .

# Run
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key veo-studio
```
