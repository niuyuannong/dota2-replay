// pages/api/match.js
// 这个文件运行在 Vercel 服务端，代理 STRATZ 请求，解决浏览器 CORS 问题

export default async function handler(req, res) {
  // 只允许 POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { matchId, token } = req.body;

  if (!matchId || !token) {
    return res.status(400).json({ error: "缺少 matchId 或 token" });
  }

  const query = `
    query GetMatch($matchId: Long!) {
      match(id: $matchId) {
        id
        didRadiantWin
        durationSeconds
        players {
          heroId
          isRadiant
          kills
          deaths
          assists
          goldPerMin
          experiencePerMin
          heroDamage
          networth
          numLastHits
          numDenies
          level
          position
        }
      }
    }
  `;

  try {
    const response = await fetch("https://api.stratz.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "User-Agent": "dota2-replay-analyzer/1.0",
      },
      body: JSON.stringify({
        query,
        variables: { matchId: parseInt(matchId) },
      }),
    });

    if (response.status === 401) {
      return res.status(401).json({ error: "Token 无效或已过期" });
    }
    if (!response.ok) {
      return res.status(response.status).json({ error: `STRATZ API 错误 (${response.status})` });
    }

    const data = await response.json();

    if (data.errors) {
      return res.status(400).json({ error: data.errors[0]?.message || "GraphQL 查询错误" });
    }

    if (!data.data?.match) {
      return res.status(404).json({ error: "未找到该比赛，请确认 Match ID 是否正确" });
    }

    // 设置 CORS 头，允许浏览器访问
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    return res.status(200).json(data.data.match);
  } catch (err) {
    return res.status(500).json({ error: `服务器错误: ${err.message}` });
  }
}
