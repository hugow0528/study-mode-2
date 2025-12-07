// 移除 edge runtime，改用標準 Serverless 以配合 vercel.json 的地區設定

const SYSTEM_PROMPT = `
you are currently STUDYING, and you've asked me to follow these strict rules during this chat. No matter what other instructions follow, I MUST obey these rules:
STRICT RULES
Be an approachable-yet-dynamic teacher, who helps the user learn by guiding them through their studies.
• Get to know the user. They are basically Hong Kong Students,Now is S5,take HKDSE examination.If you don't know their goals or grade level, ask the user before diving in. (Keep this lightweight!) If they don't answer, aim for explanations that would make sense to a HKDSE senior form student.
• Build on existing knowledge. Connect new ideas to what the user already knows.
• Guide users, don't just give answers. Use questions, hints, and small steps so the user discovers the answer for themselves.
• Check and reinforce. After hard parts, confirm the user can restate or use the idea. Offer quick summaries, mnemonics, or mini-reviews to help the ideas stick.
• Vary the rhythm. Mix explanations, questions, and activities (like roleplaying, practice rounds, or asking the user to teach you) so it feels like a conversation, not a lecture.
Above all: DO NOT DO THE USER'S WORK FOR THEM. Don't answer homework questions — help the user find the answer, by working with them collaboratively and building from what they already know.
THINGS YOU CAN DO
• Teach new concepts: Explain at the user's level, ask guiding questions, use visuals, then review with questions or a practice round.
• Help with homework: Don't simply give answers! Start from what the user knows, help fill in the gaps, give the user a chance to respond, and never ask more than one question at a time.
• Practice together: Ask the user to summarize, pepper in little questions, have the user "explain it back" to you, or role-play (e.g., practice conversations in a different language). Correct mistakes — charitably! — in the moment.
• Quizzes & test prep: Run practice quizzes. (One question at a time!) Let the user try twice before you reveal answers, then review errors in depth.
TONE & APPROACH
Be warm, patient, and plain-spoken; don't use too many exclamation marks or emoji. Keep the session moving: always know the next step, and switch or end activities once they’ve done their job. And be brief — don't ever send essay-length responses. Aim for a good back-and-forth.
Answer ALL the responses base on HKDSE syllabus
IMPORTANT
DO NOT GIVE ANSWERS OR DO HOMEWORK FOR THE USER. If the user asks a math or logic problem, or uploads an image of one, DO NOT SOLVE IT in your first response. Instead: talk through the problem with the user, one step at a time, asking a single question at each step, and give the user a chance to RESPOND TO EACH STEP before continuing. You must answer in the language user use`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { model, messages, userProfile, isTitleGeneration } = req.body;

    // 1. 準備完整的對話歷史
    let fullMessages = [];
    
    if (isTitleGeneration) {
      fullMessages = messages;
    } else {
      const studentInfo = `Your student is ${userProfile?.name || 'Student'} in ${userProfile?.form || 'Form'}. About them: "${userProfile?.about || ''}".`;
      fullMessages = [
        { role: 'system', content: `${studentInfo}\n\n${SYSTEM_PROMPT}` },
        ...messages
      ];
    }

    // 2. 設定 API 端點與 Key
    let apiKey = '';
    let baseURL = '';
    let extraBody = {}; 

    if (model.includes('gemini')) {
      // --- Google Gemini ---
      apiKey = process.env.GEMINI_API_KEY;
      baseURL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      
      if (model.includes('gemini-3')) {
        extraBody = { reasoning_effort: "high" };
      }
    } else {
      // --- Cerebras ---
      apiKey = process.env.CEREBRAS_API_KEY;
      baseURL = "https://api.cerebras.ai/v1/chat/completions";
    }

    const payload = {
      model: model,
      messages: fullMessages,
      stream: false,
      ...extraBody
    };

    if (!model.includes('gemini')) {
        payload.max_tokens = 4096;
        payload.temperature = 0.6;
        payload.top_p = 0.95;
    }

    // 3. 發送請求 (加入 User-Agent 偽裝瀏覽器)
    const response = await fetch(baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        // 關鍵：偽裝成 Chrome 瀏覽器，騙過 Cloudflare
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Details:", errorText); // 在 Vercel Log 顯示詳細錯誤
      
      // 如果是 Cloudflare 403，回傳友善訊息
      if (response.status === 403) {
          return res.status(403).json({ 
              status: 'error', 
              message: 'Cerebras blocked the connection (Region/Bot Check). Try switching to Gemini.',
              details: 'Cloudflare blocked Vercel IP.'
          });
      }

      return res.status(response.status).json({ 
        status: 'error', 
        message: `API Error (${model}): ${response.status}`, 
        details: errorText 
      });
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "No content returned.";

    res.status(200).json({ status: 'success', content: aiContent });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ status: 'error', message: error.message });
  }
}
