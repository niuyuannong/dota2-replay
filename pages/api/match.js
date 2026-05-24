// 使用 OpenDota API —— 无需 Token，无 IP 白名单限制，Vercel 服务端可直接访问

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { matchId } = req.body;
  if (!matchId) {
    return res.status(400).json({ error: "缺少 matchId" });
  }

  try {
    const response = await fetch(
      `https://api.opendota.com/api/matches/${parseInt(matchId)}`,
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "dota2-replay-analyzer/1.0",
        },
      }
    );

    if (response.status === 404) {
      return res.status(404).json({ error: "未找到该比赛，请确认 Match ID 正确" });
    }
    if (!response.ok) {
      return res.status(response.status).json({ error: `OpenDota API 错误 (${response.status})` });
    }

    const data = await response.json();

    if (!data.players || data.players.length === 0) {
      return res.status(404).json({ error: "比赛数据不完整，可能该比赛尚未被解析" });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: `服务器错误: ${err.message}` });
  }
}
