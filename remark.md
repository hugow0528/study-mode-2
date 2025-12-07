
# 🚀 10分鐘直連 Gemini / Cerebras！香港開發者嘅免翻牆魔法

有無試過，明明香港上網好自由，但想寫 Code 玩下 **Google Gemini API** 時，竟然彈個 `403 Forbidden` 或者 `User location is not supported`？

好多同學仔第一反應係：「死啦，要掛 VPN 寫 Code？」😩

其實唔使咁複雜！今日教大家一招 **「Vercel 借刀殺人法」**（講笑啫，係 **Serverless Proxy**），完全免費、唔使信用卡、唔使買 VPN，只要你有 GitHub 同 Vercel Account，10 分鐘搞掂！

---

## 🧐 原理係咩？點解 Vercel 可以當 VPN？

簡單講，當你喺香港直接 Call Gemini API：
> 🧑‍💻 **你 (香港 IP)** ➡️ ❌ **Google (Blocked!)**

Google 一見到你係香港 IP，即刻閘住。

但係，Vercel 係一個全球性嘅 Serverless 平台，佢嘅 Server 分佈全世界。我哋可以寫一段細細嘅 Code 放上 Vercel，然後指定要用 **美國 (USA)** 嘅 Server 黎行。

個流程就會變成咁：
> 🧑‍💻 **你 (香港 IP)** ➡️ ✅ **Vercel (美國 IP)** ➡️ ✅ **Google (放行!)**

**Vercel 就係你個「美國朋友」**。你將條問題交俾佢，佢幫你問 Google，Google 見到係美國人問，自然乖乖答覆，然後 Vercel 再將個答案傳返俾你。

這就是 **Reverse Proxy (反向代理)** 嘅威力。

---

## 🛠️ 點樣做？核心兩步曲

要成功「騙過」對方嘅防火牆（例如 Cerebras 嗰個 Cloudflare 盾），有兩個重點：

1.  **物理位置 (Region):** 必須強制 Vercel 喺美國東岸 (Washington, D.C.) 執行。
2.  **身分偽裝 (User-Agent):** 唔好話自己係程式，要偽裝成瀏覽器。

---

## 💻 實戰 Code Demo (Copy & Paste 就用得)

開個新 Folder，裡面只需要兩個 Files。

### 1. `vercel.json` (這是靈魂！強制美國 IP)
這個設定檔話俾 Vercel 知：「唔該幫我喺美國 `iad1` (Virginia) 行這段 Code。」如果唔加呢個，Vercel 可能會自作聰明用新加坡或日本 Server，咁就穿唔到牆啦。

```json
{
  "functions": {
    "api/chat.js": {
      "maxDuration": 60,
      "memory": 1024
    }
  },
  "regions": ["iad1"]
}
```

### 2. `api/chat.js` (這是大腦！中轉邏輯)
這段 Node.js 代碼會幫你收 Request，加個「美國身份證」，然後轉發去 Google/Cerebras。

> **注意：** 記住去 Vercel 後台 `Settings` -> `Environment Variables` 填返你個 `API_KEY`，唔好寫死喺 Code 度呀！

```javascript
// api/chat.js

// 這是最新的 Node.js Serverless Function 寫法
export default async function handler(req, res) {
  // 1. 只容許 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只收 POST 請求喔！' });
  }

  try {
    // 2. 從前端收到你嘅問題
    const { messages, model } = req.body;

    // 3. 設定目標 API (這裡用 Gemini 做例子，Cerebras 都係改 URL 只有)
    // 如果係 Cerebras，改做: https://api.cerebras.ai/v1/chat/completions
    const targetUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    
    // 這一步係由 Vercel Server (美國 IP) 發出嘅
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 記得喺 Vercel 後台設定 API_KEY
        'Authorization': `Bearer ${process.env.API_KEY}`, 
        // 🔥 關鍵！偽裝成 Mac 機上的 Chrome 瀏覽器，騙過 Cloudflare
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        model: model || "gemini-2.0-flash", // 預設模型
        messages: messages
      })
    });

    // 4. 處理錯誤
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `API 壞咗: ${errorText}` });
    }

    // 5. 收到 AI 回覆，傳返俾你在香港嘅電腦
    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

---

## 🚀 部署步驟

1.  將這兩個 Files 推上 **GitHub**。
2.  去 **Vercel** 官網，`Add New Project` -> Import 你個 Repo。
3.  在 Vercel 設定頁加 `Environment Variable`，Key 叫 `API_KEY`，Value 填你個 Gemini Key。
4.  撳 **Deploy**！

搞掂！你會得到一個網址，例如 `https://my-proxy.vercel.app/api/chat`。
以後你在香港寫 App，直接 Call 這個網址，就等同於在美國 Call API 一樣，暢通無阻！😎

**Happy Coding! 唔好俾 Region Lock 阻住你改變世界！**
