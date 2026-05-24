export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { matchId } = req.body;
  if (!matchId) return res.status(400).json({ error: "缺少 matchId" });

  const url = `https://api.opendota.com/api/matches/${parseInt(matchId)}`;

  try {
    const response = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "dota2-replay/1.0" },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `OpenDota API 错误 (${response.status})` });
    }

    const data = await response.json();

    if (!data.players || data.players.length === 0) {
      return res.status(404).json({ error: "比赛数据不完整" });
    }

    // 调试：把每个玩家的 slot、player_slot、hero_id 打出来
    console.log("[match] player list:");
    data.players.forEach((p, i) => {
      console.log(`  index=${i} player_slot=${p.player_slot} hero_id=${p.hero_id} account_id=${p.account_id}`);
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: `服务器错误: ${err.message}` });
  }
}
