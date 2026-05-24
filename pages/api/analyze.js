// pages/api/analyze.js
// 服务端调用 Claude API，绕过浏览器 CORS 限制

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, apiKey } = req.body;
  if (!prompt || !apiKey) {
    return res.status(400).json({ error: "缺少 prompt 或 apiKey" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (response.status === 401) {
      return res.status(401).json({ error: "Anthropic API Key 无效，请检查后重试" });
    }
    if (response.status === 429) {
      return res.status(429).json({ error: "请求过于频繁，请稍后再试" });
    }
    if (!response.ok) {
      const e = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: e.error?.message || `Claude API 错误 (${response.status})` });
    }

    const data = await response.json();
    const text = data.content.map(b => b.text || "").join("");
    return res.status(200).json({ result: text });

  } catch (err) {
    return res.status(500).json({ error: `服务器错误: ${err.message}` });
  }
}
