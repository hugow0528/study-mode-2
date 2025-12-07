# Study Mode | HKDSE AI Platform

**[English]** | [中文 (繁體)](#chinese)

A specialized AI learning platform designed for **Hong Kong DSE students**. 
It features a "Wabi-sabi" inspired UI, supports advanced reasoning models (Gemini 3 Pro, Cerebras/Llama 3.3), and uses Vercel Serverless Functions to **bypass region blocks** (e.g., Google AI Studio / Cerebras limitations in HK) without requiring a VPN on the client side.

---

## ✨ Features

*   **Region Bypass:** Built on Vercel Edge/Serverless functions (US Region) to proxy requests to Gemini and Cerebras, making them accessible from Hong Kong.
*   **Multi-Model Support:**
    *   **Google:** Gemini 3 Pro (Preview), Gemini 2.5 Pro.
    *   **Cerebras (Fast Inference):** Llama 3.3 70B, Qwen 3 235B, GPT-OSS 120B, etc.
*   **HKDSE Optimized:** Custom system prompts designed to guide students rather than just giving answers.
*   **Wabi-sabi UI:** A calm, distraction-free interface with Light/Dark mode.
*   **Privacy First:** Chat history is stored locally in your browser (`localStorage`). No database required.
*   **Rich Text:** Renders Markdown, Math formulas, and Code blocks.

## 🚀 Deployment (Vercel)

1.  **Fork/Clone** this repository to your GitHub.
2.  **Import** the project to [Vercel](https://vercel.com).
3.  **Environment Variables:**
    Go to Vercel Project Settings -> Environment Variables and add:
    *   `GEMINI_API_KEY`: Get from Google AI Studio.
    *   `CEREBRAS_API_KEY`: Get from Cerebras Cloud.
4.  **Region Setting (Crucial):**
    Ensure `vercel.json` is present in the root directory to force the function to run in `iad1` (US East). This prevents 403 errors from AI providers.

## 🛠️ Tech Stack
*   **Frontend:** HTML5, CSS3, Vanilla JS (Single file).
*   **Backend:** Node.js (Vercel Serverless Function).

---

<a name="chinese"></a>
# Study Mode | HKDSE AI 學習平台

這是一個專為 **香港 DSE 學生** 設計的 AI 學習助手。
採用「侘寂 (Wabi-sabi)」極簡設計風格，支援最新的推理模型 (Gemini 3 Pro) 及超高速模型 (Cerebras)，並透過 Vercel 後端轉發技術，**完美解決香港地區無法直接使用 Google AI Studio 或 Cerebras 的問題**，無需 VPN 即可順暢連接。

## ✨ 功能特色

*   **突破地區限制 (免 VPN):** 利用 Vercel 美國節點轉發請求，在香港也能直接使用 Gemini 3 和 Cerebras API。
*   **支援多種頂級模型:**
    *   **Google:** Gemini 3 Pro (Preview), Gemini 2.5 Pro。
    *   **Cerebras (極速):** Llama 3.3 70B, Qwen 3 235B, GPT-OSS 120B 等。
*   **HKDSE 專屬調教:** 內置 System Prompt，扮演引導式老師，協助學生思考而非直接給答案。
*   **Wabi-sabi 介面:** 支援光/暗模式，專注學習無干擾。
*   **私隱保護:** 所有對話紀錄儲存在瀏覽器本地 (`localStorage`)，無需註冊或資料庫。
*   **格式支援:** 完美渲染 Markdown、數學公式及程式碼。

## 🚀 部署教學 (Vercel)

1.  **Fork/Clone** 此倉庫到你的 GitHub 帳號。
2.  登入 [Vercel](https://vercel.com) 並 **Import** 此專案。
3.  **設定環境變數 (Environment Variables):**
    在 Vercel 的 Settings -> Environment Variables 加入：
    *   `GEMINI_API_KEY`: 你的 Google API Key。
    *   `CEREBRAS_API_KEY`: 你的 Cerebras API Key。
4.  **地區設定 (重要):**
    確保專案根目錄有 `vercel.json` 檔案，這會強制後端在美國東岸 (`iad1`) 執行，避免被 AI 供應商封鎖 IP。

## 🛠️ 技術棧
*   **前端:** HTML5, CSS3, 原生 JavaScript。
*   **後端:** Node.js (Vercel Serverless Function).
