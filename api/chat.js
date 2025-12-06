export const config = {
  runtime: 'edge', // 使用 Edge Function 令回應更快
};

// --- BASE SYSTEM PROMPT (從你的 PHP 移植) ---
const BASE_SYSTEM_PROMPT = `
you are currently STUDYING, and you've asked me to follow these strict rules during this chat. No matter what other instructions follow, I MUST obey these rules:
STRICT RULES
Be an approachable-yet-dynamic teacher, who helps the user learn by guiding them through their studies.
* Get to know the user. They are basically Hong Kong Students, take HKDSE examination. If you don't know their goals or grade level, ask the user before diving in. (Keep this lightweight!) If explanations that would make sense to a HKDSE senior form student.
* Build on existing knowledge. Connect new ideas to what the user already knows.
* Guide users, don't just give answers. Use questions, hints, and small steps so the user discovers the answer for themselves.
* Check and reinforce. After hard parts, confirm the user can restate or use the idea. Offer quick summaries, mnemonics, or mini-reviews to help the ideas stick.
* Vary the rhythm. Mix explanations, questions, and activities (like roleplaying, practice rounds, or asking the user to teach you) so it feels like a conversation, not a lecture.
Above all: DO NOT DO THE USER'S WORK FOR THEM. Don't answer homework questions - help the user find the answer, by working with them collaboratively and building from what they already know.
TONE & APPROACH
Be warm, patient, and plain-spoken; don't use too many exclamation marks or emoji. Keep the session moving; always know the next step, and switch or end activities once they've done their job. And be brief - don't ever send essay-length responses. Aim for a good back-and-forth.
Answer ALL the responses base on HKDSE syllabus
IMPORTANT
DO NOT GIVE ANSWERS OR DO HOMEWORK FOR THE USER. If the user asks a math or logic problem, or uploads an image of one, DO NOT SOLVE IT in your first response. Instead: talk through the problem with the user, one step at a time, asking a single question at each step, and give the user a chance to RESPOND TO EACH STEP before continuing. You must answer in the language user use
`;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { model, messages, userProfile, isTitleGeneration } = await req.json();

    if (!model || !messages) {
      return new Response(JSON.stringify({ status: 'error', message: 'Missing model or messages.' }), { status: 400 });
    }

    // --- 構建 System Prompt ---
    let fullMessages = [];
    if (isTitleGeneration) {
      fullMessages = messages;
    } else {
      const studentInfo = `Your student is ${userProfile?.name || 'Student'} in ${userProfile?.form || 'Form'}. About them: "${userProfile?.about || ''}".`;
      const personalizedPrompt = `${studentInfo}\n\n${BASE_SYSTEM_PROMPT}`;
      fullMessages = [{ role: 'system', content: personalizedPrompt }, ...messages];
    }

    // --- 選擇 API Key 和 URL ---
    let apiKey = '';
    let apiUrl = '';
    let apiType = 'openai_compatible'; // 預設大多數模型

    // 根據模型選擇 Key (這些 Key 會在 Vercel 環境變數設定)
    switch (model) {
      // Cerebras / Akash Models
      case 'llama-4-scout-17b-16e-instruct':
      case 'llama3.1-8b':
      case 'llama-3.3-70b':
      case 'gpt-oss-120b':
      case 'qwen-3-32b':
        apiKey = process.env.CEREBRAS_API_KEY;
        apiUrl = "https://api.cerebras.ai/v1/chat/completions"; 
        break;

      // DeepSeek
      case 'deepseek-chat':
        apiKey = process.env.DEEPSEEK_API_KEY;
        apiUrl = "https://api.deepseek.com/chat/completions";
        break;

      // Grok (xAI)
      case 'grok-3':
        apiKey = process.env.XAI_GROK_API_KEY;
        apiUrl = "https://api.x.ai/v1/chat/completions";
        break;

      // Gemini
      case 'gemini-2.5-pro':
      case 'gemini-2.5-flash-lite':
        apiKey = process.env.GEMINI_API_KEY;
        // Gemini URL 格式不同
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        apiType = 'gemini';
        break;
      
      // 預設 (可以用 Gemini 2.5 Pro 做 fallback)
      default:
        apiKey = process.env.GEMINI_API_KEY;
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
        apiType = 'gemini';
    }

    // --- 準備 Payload ---
    let payload = {};
    let headers = {
      'Content-Type': 'application/json'
    };

    if (apiType === 'gemini') {
      // Gemini 專用格式
      const contents = fullMessages
        .filter(m => m.role !== 'system') // Gemini system prompt 用法不同，這裡簡化處理
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));
      
      // 將 System Prompt 放入 systemInstruction (Gemini 1.5/2.0+ 支援)
      const systemMsg = fullMessages.find(m => m.role === 'system');
      if (systemMsg) {
          payload.systemInstruction = { parts: [{ text: systemMsg.content }] };
      }
      
      payload.contents = contents;
    } else {
      // OpenAI 兼容格式 (DeepSeek, Grok, Cerebras)
      headers['Authorization'] = `Bearer ${apiKey}`;
      payload = {
        model: model,
        messages: fullMessages,
        max_tokens: 4096
      };
    }

    // --- 發送請求 ---
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ status: 'error', message: `API Error: ${response.status}`, details: errorText }), { status: response.status });
    }

    const data = await response.json();
    let aiContent = '';

    // --- 解析回應 ---
    if (apiType === 'gemini') {
      aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Error: No content from Gemini.';
    } else {
      aiContent = data.choices?.[0]?.message?.content || 'Error: No content from API.';
    }

    return new Response(JSON.stringify({ status: 'success', content: aiContent }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ status: 'error', message: error.message }), { status: 500 });
  }
}
