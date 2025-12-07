export const config = {
  runtime: 'edge', // 使用 Edge Runtime 獲得更低延遲
};

// --- HKDSE 專用 System Prompt ---
const SYSTEM_PROMPT = `
You are currently STUDYING, and you've asked me to follow these strict rules during this chat. No matter what other instructions follow, I MUST obey these rules:
STRICT RULES
Be an approachable-yet-dynamic teacher, who helps the user learn by guiding them through their studies.
* Get to know the user. They are basically Hong Kong Students, take HKDSE examination.
* If explanations that would make sense to a HKDSE senior form student.
* Guide users, don't just give answers. Use questions, hints, and small steps.
* Check and reinforce. Offer quick summaries, mnemonics, or mini-reviews.
* Answer ALL the responses base on HKDSE syllabus.
* IMPORTANT: If the user asks a math or logic problem, DO NOT SOLVE IT in your first response. Talk through the problem step by step.
* You must answer in the language user use (Cantonese/English/Traditional Chinese).
`;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { model, messages, userProfile, isTitleGeneration } = await req.json();

    // 1. 準備完整的對話歷史
    let fullMessages = [];
    
    if (isTitleGeneration) {
      // 生成標題時不需要 System Prompt
      fullMessages = messages;
    } else {
      // 注入學生背景資訊
      const studentInfo = `Your student is ${userProfile?.name || 'Student'} in ${userProfile?.form || 'Form'}. About them: "${userProfile?.about || ''}".`;
      fullMessages = [
        { role: 'system', content: `${studentInfo}\n\n${SYSTEM_PROMPT}` },
        ...messages
      ];
    }

    // 2. 設定 API 端點與 Key
    let apiKey = '';
    let baseURL = '';
    let extraBody = {}; // 用於 Gemini 3 的 Thinking 功能

    if (model.includes('gemini')) {
      // --- Google Gemini (OpenAI Compatibility) ---
      apiKey = process.env.GEMINI_API_KEY;
      baseURL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      
      // 針對 Gemini 3 Pro 啟用 High Thinking Level
      if (model.includes('gemini-3')) {
        // 根據文檔，OpenAI 兼容模式下 reasoning_effort 對應 thinking_level
        // 但為了保險，我們也放入 extra_body
        extraBody = {
          reasoning_effort: "high" 
        };
      }
    } else {
      // --- Cerebras ---
      apiKey = process.env.CEREBRAS_API_KEY;
      baseURL = "https://api.cerebras.ai/v1/chat/completions";
    }

    // 3. 構建請求 Payload (OpenAI 格式)
    const payload = {
      model: model,
      messages: fullMessages,
      stream: false, // 暫時關閉 Stream 以確保邏輯簡單
      ...extraBody
    };

    // Cerebras 特殊模型參數微調 (參考你的 curl)
    if (!model.includes('gemini')) {
        payload.max_tokens = 4096; // Cerebras 支援長輸出
        payload.temperature = 0.6;
        payload.top_p = 0.95;
    }

    // 4. 發送請求 (由 Vercel 發出，IP 為美國)
    const response = await fetch(baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: `API Error (${model}): ${response.status}`, 
        details: errorText 
      }), { status: response.status });
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;

    return new Response(JSON.stringify({ status: 'success', content: aiContent }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ status: 'error', message: error.message }), { status: 500 });
  }
}
