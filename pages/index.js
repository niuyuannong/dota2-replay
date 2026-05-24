import { useState } from "react";

const HERO_NAMES = {
  1:"反噬者",2:"剑圣",5:"水晶室女",6:"暗夜魔王",7:"暗影萨满",
  8:"幻影刺客",11:"影魔",13:"地穴刺客",14:"巫医",15:"幻影长矛手",
  16:"沙王",17:"风行者",18:"虚空假面",19:"干扰者",20:"赏金猎人",
  22:"炼金术士",25:"辉耀",26:"狮子",28:"剧毒巫师",29:"天怒法师",
  30:"破法者",31:"死亡骑士",32:"普格纳",33:"修补匠",35:"末日使者",
  36:"圣堂刺客",37:"炙热",38:"撼地者",39:"幸运儿",41:"鱼人守卫",
  42:"幻刺",43:"圣骑士",44:"蝙蝠骑士",45:"克林克兹",47:"幽鬼",
  49:"术士",50:"女王",51:"哈斯卡",53:"钢背兽",54:"百年将军",
  55:"风暴灵魂",56:"神谕者",57:"远古冰魄",58:"混沌骑士",59:"地精修补匠",
  62:"牛头人",63:"弧光",65:"熊战士",67:"先知",69:"祸乱之源",
  71:"超凡领主",74:"暗影恶魔",75:"矮人直升机",76:"狼人",77:"山地巨人",
  79:"召唤师",80:"斯拉达",81:"兽王",83:"维萨吉",84:"斯拉克",
  86:"狙击手",87:"幻影巫师",88:"冥魂大帝",89:"孽主",91:"剧毒术士",
  92:"圣堂武僧",94:"蛮荒猎人",96:"灵魂守卫",98:"时光游侠",99:"帕克",
  101:"斧王",103:"德鲁伊",104:"宙斯",106:"混沌战士",108:"海神",
  111:"黑曜毁灭者",113:"亚龙古斯",119:"幻影长矛手",123:"艾欧",
  126:"幻象刺客",128:"暗月骑士",129:"幽魂杀手",135:"暗影恶魔",
  136:"石魔",137:"幻影女王",138:"暗影猎手",145:"巫医",
  146:"奥术法师",152:"殒命使者",154:"裂魂人",155:"混沌之子"
};

function getHeroName(id) { return HERO_NAMES[id] || `英雄#${id}`; }
function fmt(sec) { return `${Math.floor(sec/60)}分${String(sec%60).padStart(2,"0")}秒`; }
function calcKDA(k,d,a) { return d===0 ? (k+a).toFixed(1) : ((k+a)/d).toFixed(2); }

function processMatch(match, focusSlot) {
  const players = match.players;
  const slot = Math.min(focusSlot, players.length - 1);
  const p = players[slot];
  const isRadiant = slot < 5;
  const won = isRadiant ? match.radiant_win : !match.radiant_win;

  const teamPlayers = players.filter((_, i) => isRadiant ? i < 5 : i >= 5);
  const enemyPlayers = players.filter((_, i) => isRadiant ? i >= 5 : i < 5);
  const teamKills = teamPlayers.reduce((s,x) => s+(x.kills||0), 0);
  const teamNW = teamPlayers.reduce((s,x) => s+(x.net_worth||0), 0);
  const enemyNW = enemyPlayers.reduce((s,x) => s+(x.net_worth||0), 0);
  const dur = match.duration || 1;
  const cspm = (((p.last_hits||0)+(p.denies||0))/dur*60).toFixed(1);
  const participation = teamKills > 0
    ? (((p.kills||0)+(p.assists||0))/teamKills*100).toFixed(0) : 0;

  return {
    heroName: getHeroName(p.hero_id),
    won, duration: dur,
    kills: p.kills||0, deaths: p.deaths||0, assists: p.assists||0,
    kdaRatio: calcKDA(p.kills||0, p.deaths||0, p.assists||0),
    lastHits: p.last_hits||0, denies: p.denies||0, cspm,
    gpm: p.gold_per_min||0, xpm: p.xp_per_min||0,
    heroDamage: p.hero_damage||0,
    netWorth: p.net_worth||0, level: p.level||25,
    participation, teamNW, enemyNW, nwDiff: teamNW-enemyNW,
    matchId: match.match_id,
    allPlayers: players.map((x,i) => ({
      slot: i, heroName: getHeroName(x.hero_id),
      kills:x.kills||0, deaths:x.deaths||0, assists:x.assists||0,
      gpm:x.gold_per_min||0, netWorth:x.net_worth||0,
      isTeam: isRadiant ? i<5 : i>=5, isFocus: i===slot,
    }))
  };
}

async function generateAnalysis(s, apiKey) {
  const prompt = `你是一名专业的 Dota2 教练，请对以下比赛数据进行深度复盘分析，用中文输出。

## 比赛信息
英雄：${s.heroName} | 结果：${s.won?"胜利":"失败"} | 时长：${fmt(s.duration)}

## 个人数据
- KDA：${s.kills}/${s.deaths}/${s.assists}（比率 ${s.kdaRatio}）
- 补刀/反补：${s.lastHits}/${s.denies}（每分钟 ${s.cspm} 刀）
- GPM / XPM：${s.gpm} / ${s.xpm}
- 英雄伤害：${s.heroDamage.toLocaleString()}
- 净身家：${s.netWorth.toLocaleString()}
- 参团率：${s.participation}%
- 最终等级：${s.level}

## 全队对比
${s.allPlayers.map(p =>
  `${p.isFocus?"👉":p.isTeam?"队友":"敌方"} ${p.heroName}: ${p.kills}/${p.deaths}/${p.assists} GPM:${p.gpm} 身家:${p.netWorth.toLocaleString()}`
).join("\n")}
经济差：我方 ${s.teamNW.toLocaleString()} vs 敌方 ${s.enemyNW.toLocaleString()}（${s.nwDiff>0?"+":""}${s.nwDiff.toLocaleString()}）

---
请按以下结构输出（Markdown 格式）：

### 🎯 本局评分
1-10分 + 一句话理由

### ✅ 做得好的地方
2-3条亮点，结合具体数据

### ⚠️ 主要失误分析
2-3条，指出问题根源

### 📈 针对性提升建议
结合 ${s.heroName} 英雄特性，2-3条可执行建议

### 💡 一句话总结`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({}));
    throw new Error(e.error?.message || `Claude API 错误 (${res.status})`);
  }
  const data = await res.json();
  return data.content.map(b => b.text||"").join("");
}

function renderMd(text) {
  if (!text) return "";
  return text
    .replace(/### (.+)/g, '<h3 class="mh3">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n- (.+)/g, '<li class="mli">$1</li>')
    .replace(/(<li[^>]*>.*?<\/li>\n?)+/gs, m => `<ul class="mul">${m}</ul>`)
    .replace(/\n\n/g, '<div class="sp"></div>')
    .replace(/\n/g, "<br/>");
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="sc">
      <div className="scv" style={color?{color}:{}}>{value}</div>
      <div className="scl">{label}</div>
      {sub && <div className="scs">{sub}</div>}
    </div>
  );
}

export default function Home() {
  const [anthropicKey, setAnthropicKey] = useState("");
  const [matchId, setMatchId] = useState("");
  const [slotInput, setSlotInput] = useState("0");
  const [phase, setPhase] = useState("idle");
  const [stats, setStats] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState("analysis");

  async function run() {
    if (!matchId.trim()) { setError("请填写 Match ID"); return; }
    if (!anthropicKey.trim()) { setError("请填写 Anthropic API Key"); return; }
    setPhase("fetching"); setError(""); setStats(null); setAnalysis("");
    try {
      // 调用 Vercel 服务端代理 → OpenDota
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: matchId.trim() })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "获取比赛数据失败");

      const s = processMatch(json, parseInt(slotInput)||0);
      setStats(s);
      setPhase("analyzing");

      const report = await generateAnalysis(s, anthropicKey.trim());
      setAnalysis(report);
      setPhase("done");
      setTab("analysis");
    } catch(e) {
      setError(e.message);
      setPhase("error");
    }
  }

  const busy = phase==="fetching" || phase==="analyzing";

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{
        --bg:#080b0f;--s1:#0f1318;--s2:#161b22;--bd:#252b36;
        --gold:#c9a84c;--gd:#7a6028;--red:#d95f5f;--grn:#52c98a;
        --tx:#cdd2de;--td:#6b7491;
      }
      html,body{background:var(--bg);color:var(--tx);font-family:'Noto Sans SC',sans-serif;min-height:100vh}
      .wrap{max-width:860px;margin:0 auto;padding:28px 16px 64px}
      .hdr{text-align:center;margin-bottom:28px}
      .hdr-t{font-family:'Rajdhani',sans-serif;font-size:2.1rem;font-weight:700;
             color:var(--gold);letter-spacing:.14em;text-transform:uppercase}
      .hdr-s{font-size:.78rem;color:var(--td);margin-top:5px;letter-spacing:.06em}
      .hdr-line{width:90px;height:1px;margin:12px auto 0;
                background:linear-gradient(90deg,transparent,var(--gold),transparent)}
      .panel{background:var(--s1);border:1px solid var(--bd);border-radius:8px;
             padding:22px;margin-bottom:18px}
      .sec-title{font-size:.7rem;color:var(--td);text-transform:uppercase;
                 letter-spacing:.1em;margin-bottom:12px}
      .frow{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px}
      .frow:last-child{margin-bottom:0}
      .fld{display:flex;flex-direction:column;gap:5px}
      .flbl{font-size:.7rem;color:var(--td);text-transform:uppercase;letter-spacing:.08em}
      .fhint{font-size:.67rem;color:var(--td);margin-top:2px}
      .fld-grow{flex:1;min-width:180px}
      .fld-slot{width:84px}
      input{background:var(--s2);border:1px solid var(--bd);border-radius:6px;
            padding:9px 12px;color:var(--tx);font-family:'Noto Sans SC',sans-serif;
            font-size:.9rem;outline:none;transition:border-color .2s;width:100%}
      input:focus{border-color:var(--gd)}
      .divider{height:1px;background:var(--bd);margin:16px 0}
      .btn{background:var(--gold);color:#080b0f;border:none;border-radius:6px;
           padding:10px 28px;font-family:'Rajdhani',sans-serif;font-size:.95rem;
           font-weight:700;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;
           transition:opacity .15s,transform .1s;width:100%;margin-top:4px}
      .btn:hover:not(:disabled){opacity:.85;transform:translateY(-1px)}
      .btn:disabled{opacity:.35;cursor:not-allowed}
      .note{font-size:.72rem;color:var(--td);margin-top:6px;line-height:1.6}
      .note a{color:var(--gd)}
      .status{display:flex;align-items:center;gap:9px;padding:11px 16px;
              background:var(--s1);border:1px solid var(--bd);border-radius:8px;
              margin-bottom:16px;font-size:.84rem}
      .spin{width:15px;height:15px;border:2px solid var(--bd);
            border-top-color:var(--gold);border-radius:50%;
            animation:spin .7s linear infinite;flex-shrink:0}
      @keyframes spin{to{transform:rotate(360deg)}}
      .err{background:rgba(217,95,95,.09);border:1px solid rgba(217,95,95,.4);
           border-radius:8px;padding:13px 16px;color:var(--red);
           font-size:.86rem;line-height:1.6;margin-bottom:16px}
      .rhdr{display:flex;align-items:center;justify-content:space-between;
            flex-wrap:wrap;gap:10px;margin-bottom:16px;padding-bottom:14px;
            border-bottom:1px solid var(--bd)}
      .hnm{font-family:'Rajdhani',sans-serif;font-size:1.45rem;font-weight:700;
           color:var(--gold);letter-spacing:.05em}
      .hmeta{font-size:.74rem;color:var(--td);margin-top:2px}
      .badge{padding:5px 16px;border-radius:20px;font-family:'Rajdhani',sans-serif;
             font-size:.88rem;font-weight:700;letter-spacing:.1em}
      .bw{background:rgba(82,201,138,.12);color:var(--grn);border:1px solid var(--grn)}
      .bl{background:rgba(217,95,95,.12);color:var(--red);border:1px solid var(--red)}
      .sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));
             gap:8px;margin-bottom:18px}
      .sc{background:var(--s1);border:1px solid var(--bd);border-radius:7px;
          padding:12px 10px;text-align:center}
      .scv{font-family:'Rajdhani',sans-serif;font-size:1.35rem;font-weight:700;
           color:var(--gold);line-height:1}
      .scl{font-size:.65rem;color:var(--td);margin-top:4px;text-transform:uppercase;letter-spacing:.07em}
      .scs{font-size:.63rem;color:var(--td);margin-top:1px}
      .tabs{display:flex;border-bottom:1px solid var(--bd);margin-bottom:16px}
      .tab{padding:8px 18px;font-size:.82rem;color:var(--td);cursor:pointer;
           border-bottom:2px solid transparent;transition:color .15s,border-color .15s}
      .tab.on{color:var(--gold);border-bottom-color:var(--gold)}
      .tab:hover:not(.on){color:var(--tx)}
      .abox{background:var(--s1);border:1px solid var(--bd);border-radius:8px;
            padding:22px;line-height:1.8;font-size:.9rem}
      .mh3{font-family:'Rajdhani',sans-serif;font-size:1.02rem;font-weight:700;
           color:var(--gold);letter-spacing:.06em;margin:16px 0 7px;
           padding-bottom:4px;border-bottom:1px solid var(--bd)}
      .mh3:first-child{margin-top:0}
      .mul{padding-left:18px;margin:4px 0}
      .mli{margin:3px 0}
      .sp{margin:8px 0}
      strong{color:var(--gold)}
      .ptbl{width:100%;border-collapse:collapse;font-size:.85rem}
      .ptbl th{text-align:left;padding:7px 12px;color:var(--td);font-size:.7rem;
               text-transform:uppercase;letter-spacing:.07em;
               border-bottom:1px solid var(--bd);font-weight:500}
      .pr td{padding:8px 12px;border-bottom:1px solid var(--bd)}
      .pr.focus td{background:rgba(201,168,76,.05)}
      .pr.focus td:first-child{font-weight:700;color:var(--gold)}
      .pr.enemy td:first-child{color:#d07575}
      .pr.ally td:first-child{color:#6495cc}
      .mono{font-family:monospace;font-size:.82rem}
      .divrow td{text-align:center;padding:4px;font-size:.68rem;color:var(--td);
                 background:var(--s2);letter-spacing:.09em;text-transform:uppercase}
      .foot{margin-top:26px;text-align:center;font-size:.7rem;color:var(--td);line-height:1.7}
      .foot a{color:var(--gd)}
    `}</style>

    <div className="wrap">
      <div className="hdr">
        <div className="hdr-t">Dota 2 AI 复盘</div>
        <div className="hdr-s">OpenDota + Claude · MVP</div>
        <div className="hdr-line"/>
      </div>

      <div className="panel">
        <div className="sec-title">API 配置</div>
        <div className="frow">
          <div className="fld fld-grow">
            <div className="flbl">Anthropic API Key</div>
            <input type="password" value={anthropicKey}
              onChange={e=>setAnthropicKey(e.target.value)}
              placeholder="sk-ant-api03-..."/>
            <div className="note">
              登录 <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a> → API Keys 获取
            </div>
          </div>
        </div>

        <div className="divider"/>
        <div className="sec-title">比赛信息</div>
        <div className="frow">
          <div className="fld fld-grow">
            <div className="flbl">Match ID</div>
            <input value={matchId} onChange={e=>setMatchId(e.target.value)}
              placeholder="例：8781211995"
              onKeyDown={e=>e.key==="Enter"&&!busy&&run()}/>
          </div>
          <div className="fld fld-slot">
            <div className="flbl">席位 0–9</div>
            <input value={slotInput} onChange={e=>setSlotInput(e.target.value)}
              type="number" min="0" max="9" placeholder="0"/>
            <div className="fhint">天辉0-4/夜魇5-9</div>
          </div>
        </div>
        <button className="btn" onClick={run}
          disabled={busy||!matchId.trim()||!anthropicKey.trim()}>
          {phase==="fetching"?"拉取数据中…":phase==="analyzing"?"AI 分析中…":"开始复盘"}
        </button>
      </div>

      {busy && (
        <div className="status">
          <div className="spin"/>
          <span>{phase==="fetching"?"正在从 OpenDota 拉取比赛数据…":"Claude 正在生成复盘报告…"}</span>
        </div>
      )}
      {phase==="error" && <div className="err">⚠️ {error}</div>}

      {stats && phase==="done" && (<>
        <div className="rhdr">
          <div>
            <div className="hnm">{stats.heroName}</div>
            <div className="hmeta">比赛 #{stats.matchId} · {fmt(stats.duration)}</div>
          </div>
          <div className={`badge ${stats.won?"bw":"bl"}`}>{stats.won?"胜利":"失败"}</div>
        </div>

        <div className="sgrid">
          <StatCard label="KDA" value={`${stats.kills}/${stats.deaths}/${stats.assists}`}
            sub={`比率 ${stats.kdaRatio}`} color={stats.deaths===0?"var(--grn)":undefined}/>
          <StatCard label="GPM" value={stats.gpm} sub="每分钟金币"/>
          <StatCard label="XPM" value={stats.xpm} sub="每分钟经验"/>
          <StatCard label="补刀" value={stats.lastHits} sub={`每分 ${stats.cspm} 刀`}/>
          <StatCard label="参团率" value={`${stats.participation}%`} sub="击+助/队杀"/>
          <StatCard label="英雄伤害" value={`${(stats.heroDamage/1000).toFixed(1)}k`}/>
          <StatCard label="净身家" value={`${(stats.netWorth/1000).toFixed(1)}k`}/>
          <StatCard label="经济差"
            value={`${stats.nwDiff>0?"+":""}${Math.round(stats.nwDiff/1000)}k`}
            sub="全队对比" color={stats.nwDiff>0?"var(--grn)":"var(--red)"}/>
        </div>

        <div className="tabs">
          {[["analysis","AI 复盘报告"],["players","全队数据"]].map(([k,v])=>(
            <div key={k} className={`tab${tab===k?" on":""}`} onClick={()=>setTab(k)}>{v}</div>
          ))}
        </div>

        {tab==="analysis" && (
          <div className="abox">
            <div dangerouslySetInnerHTML={{__html:renderMd(analysis)}}/>
          </div>
        )}

        {tab==="players" && (
          <div className="abox" style={{padding:0}}>
            <table className="ptbl">
              <thead><tr>
                <th>英雄</th><th>KDA</th><th>GPM</th><th>净身家</th>
              </tr></thead>
              <tbody>
                {stats.allPlayers.filter(p=>p.isTeam).map(p=>(
                  <tr key={p.slot} className={`pr ${p.isFocus?"focus":"ally"}`}>
                    <td>{p.isFocus?"👉 ":"🟦 "}{p.heroName}</td>
                    <td className="mono">{p.kills}/{p.deaths}/{p.assists}</td>
                    <td className="mono">{p.gpm}</td>
                    <td className="mono">{p.netWorth.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="divrow"><td colSpan={4}>── 敌方 ──</td></tr>
                {stats.allPlayers.filter(p=>!p.isTeam).map(p=>(
                  <tr key={p.slot} className="pr enemy">
                    <td>🟥 {p.heroName}</td>
                    <td className="mono">{p.kills}/{p.deaths}/{p.assists}</td>
                    <td className="mono">{p.gpm}</td>
                    <td className="mono">{p.netWorth.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>)}

      <div className="foot">
        数据来源：<a href="https://www.opendota.com" target="_blank" rel="noreferrer">OpenDota API</a>（免费开放，无需 Token）·
        Match ID 可在 Dota2 游戏内战绩或 Dotabuff 中找到
      </div>
    </div>
  </>);
}
