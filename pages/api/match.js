export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { matchId, token } = req.body;

  if (!matchId || !token) {
    return res.status(400).json({ error: "缺少 matchId 或 token" });
  }

  // STRATZ GraphQL query
  const query = `{
    match(id: ${parseInt(matchId)}) {
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
      }
    }
  }`;

  try {
    const response = await fetch("https://api.stratz.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "User-Agent": "STRATZ_API",
      },
      body: JSON.stringify({ query }),
    });

    const text = await response.text();

    if (response.status === 401) {
      return res.status(401).json({ error: "Token 无效或已过期，请重新获取" });
    }

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `STRATZ API 错误 (${response.status})`,
        detail: text.slice(0, 200)
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      return res.status(500).json({ error: "STRATZ 返回数据解析失败", detail: text.slice(0, 200) });
    }

    if (data.errors) {
      return res.status(400).json({ error: data.errors[0]?.message || "GraphQL 错误" });
    }

    if (!data.data?.match) {
      return res.status(404).json({ error: "未找到该比赛，请确认 Match ID 正确" });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json(data.data.match);

  } catch (err) {
    return res.status(500).json({ error: `服务器错误: ${err.message}` });
  }
}
