import { NextRequest, NextResponse } from "next/server"

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ""

// 静态数据作为 fallback
const HERO_BUILD_DATA: Record<string, any> = {
  "易大师": { heroName: "易大师（剑圣）", items: ["鬼索的狂暴之刃", "无尽之刃", "破败王者之刃"], winRate: 52.3, playRate: 18.7, tip: "羊刀是核心，开局抢弓" },
  "亚索": { heroName: "亚索（疾风剑豪）", items: ["无尽之刃", "饮血剑", "泰坦的坚决"], winRate: 50.8, playRate: 15.2, tip: "无尽优先级最高，前排站位" },
  "李青": { heroName: "李青（盲僧）", items: ["狂徒铠甲", "荆棘背心", "巨龙之爪"], winRate: 54.1, playRate: 12.3, tip: "肉装瞎子当前排" },
}

const COMP_TIER_DATA = {
  comps: [
    { name: "斗士狙神", winRate: 56.2 },
    { name: "法师龙", winRate: 54.1 },
    { name: "决斗大师", winRate: 52.8 },
    { name: "圣光守卫", winRate: 51.5 },
    { name: "暗影刺客", winRate: 50.3 },
  ],
}

const HERO_ALIAS: Record<string, string> = {
  "剑圣": "易大师", "剑豪": "亚索", "瞎子": "李青", "盲僧": "李青",
}

async function callDeepSeek(query: string) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `你是云顶之弈数据助手。用户会用中文口语查询，你需要理解意图并返回结构化结果。当前是 Set 16 版本。

支持的意图类型：
- hero_build: 查某个英雄的推荐装备、胜率、登场率
- comp_tier: 查当前版本强势阵容排名
- item_recipe: 查某个装备的合成配方
- augment_tier: 查海克斯强化排名
- unknown: 无法理解时返回

对于 hero_build，如果英雄名是简称/外号/英文名，需要映射到标准中文名。例如：剑圣→易大师，瞎子→李青，yasuo→亚索。

返回严格 JSON：
{"type":"hero_build","data":{"heroName":"易大师（剑圣）","items":["羊刀","无尽","破败"],"winRate":52.3,"playRate":18.7,"tip":"羊刀是核心"}}
或
{"type":"comp_tier","data":{"comps":[{"name":"斗士狙神","winRate":56.2},{"name":"法师龙","winRate":54.1}]}}
或
{"type":"unknown","message":"友好的提示文字"}`,
        },
        {
          role: "user",
          content: query,
        },
      ],
      temperature: 0.1,
      max_tokens: 600,
      response_format: { type: "json_object" },
    }),
  })

  if (!res.ok) throw new Error("DeepSeek API error")
  const json = await res.json()
  return JSON.parse(json.choices[0].message.content)
}

// 规则引擎 fallback
function parseIntentFallback(query: string) {
  const q = query.toLowerCase().trim()

  const heroMatch = q.match(/^(.*?)(?:带什么|装备|出装|怎么出|推荐|build)/)
  if (heroMatch) {
    const name = heroMatch[1].trim()
    for (const [alias, real] of Object.entries(HERO_ALIAS)) {
      if (name.includes(alias) || alias.includes(name)) return { type: "hero_build", data: HERO_BUILD_DATA[real]! }
    }
    for (const [real, data] of Object.entries(HERO_BUILD_DATA)) {
      if (name.includes(real) || real.includes(name)) return { type: "hero_build", data }
    }
  }

  if (/阵容|最强|强势|排行|版本|tier/.test(q)) return { type: "comp_tier", data: COMP_TIER_DATA }

  for (const [alias, real] of Object.entries(HERO_ALIAS)) {
    if (q.includes(alias)) return { type: "hero_build", data: HERO_BUILD_DATA[real]! }
  }

  return { type: "unknown", data: null, message: `不太确定你的意思，试试说「剑圣装备」或「最强阵容」` }
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()
    if (!query || typeof query !== "string") {
      return NextResponse.json({ type: "error", data: null, message: "请描述你想查的内容" })
    }

    // 优先用 DeepSeek，失败时 fallback 到规则引擎
    let result
    try {
      result = await callDeepSeek(query)
    } catch {
      result = parseIntentFallback(query)
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ type: "error", data: null, message: "出了点问题，再试一次？" })
  }
}
