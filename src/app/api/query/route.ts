import { NextRequest, NextResponse } from "next/server"

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

async function parseIntent(query: string) {
  const q = query.toLowerCase().trim()

  // 英雄配装
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

  // 阵容排名
  if (/阵容|最强|强势|排行|版本|tier|什么厉害/.test(q)) {
    return { type: "comp_tier", data: COMP_TIER_DATA }
  }

  // 装备合成
  if (/合成|配方|recipe|怎么做|怎么合/.test(q)) {
    return { type: "error", data: null, message: "装备合成功能开发中，先试试「剑圣装备」或「最强阵容」吧" }
  }

  // 海克斯
  if (/海克斯|augment|强化/.test(q)) {
    return { type: "error", data: null, message: "海克斯推荐功能开发中，先试试「剑圣装备」或「最强阵容」吧" }
  }

  // friendly fallback: 尝试从话语中提取英雄名
  for (const [alias, real] of Object.entries(HERO_ALIAS)) {
    if (q.includes(alias)) return { type: "hero_build", data: HERO_BUILD_DATA[real]! }
  }
  for (const real of Object.keys(HERO_BUILD_DATA)) {
    if (q.includes(real)) return { type: "hero_build", data: HERO_BUILD_DATA[real]! }
  }

  return { type: "unknown", data: null, message: `不太确定你的意思，试试说具体一点？比如「剑圣装备」` }
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()
    if (!query || typeof query !== "string") {
      return NextResponse.json({ type: "error", data: null, message: "请描述你想查的内容" })
    }
    const result = await parseIntent(query)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ type: "error", data: null, message: "出了点问题，再试一次？" })
  }
}
