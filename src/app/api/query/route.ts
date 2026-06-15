import { NextRequest, NextResponse } from "next/server"

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ""
const METATFT_ITEMS_API = "https://api-hc.metatft.com/tft-stat-api/items"
const METATFT_COMPS_API = "https://api-hc.metatft.com/tft-comps-api/comp_options"

// 缓存：5分钟有效期
let cache: { timestamp: number; items: any; comps: any } | null = null
const CACHE_TTL = 5 * 60 * 1000

async function fetchMetaTFT() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) return cache

  const [itemsRes, compsRes] = await Promise.all([
    fetch(METATFT_ITEMS_API).then(r => r.json()),
    fetch(METATFT_COMPS_API).then(r => r.json()),
  ])

  cache = {
    timestamp: Date.now(),
    items: itemsRes,
    comps: compsRes,
  }
  return cache
}

// 装备名简化映射
function simplifyItemName(raw: string): string {
  const map: Record<string, string> = {
    TFT_Item_BFSword: "暴风大剑",
    TFT_Item_RecurveBow: "反曲之弓",
    TFT_Item_NeedlesslyLargeRod: "无用大棒",
    TFT_Item_TearOfTheGoddess: "女神之泪",
    TFT_Item_ChainVest: "锁子甲",
    TFT_Item_NegatronCloak: "负极斗篷",
    TFT_Item_GiantsBelt: "巨人腰带",
    TFT_Item_SparringGloves: "拳套",
    TFT_Item_Spatula: "金铲铲",
    TFT_Item_FryingPan: "煎锅",
    TFT_Item_InfinityEdge: "无尽之刃",
    TFT_Item_JeweledGauntlet: "珠光护手",
    TFT_Item_Deathblade: "死亡之刃",
    TFT_Item_GuinsoosRageblade: "鬼索的狂暴之刃",
    TFT_Item_SpearOfShojin: "朔极之矛",
    TFT_Item_BlueBuff: "蓝霸符",
    TFT_Item_ArchangelsStaff: "大天使之杖",
    TFT_Item_RabadonsDeathcap: "灭世者的死亡之帽",
    TFT_Item_Morellonomicon: "莫雷洛秘典",
    TFT_Item_HextechGunblade: "海克斯科技枪刃",
    TFT_Item_IonicSpark: "离子火花",
    TFT_Item_StatikkShiv: "斯塔缇克电刃",
    TFT_Item_LastWhisper: "最后的轻语",
    TFT_Item_RapidFireCannon: "疾射火炮",
    TFT_Item_RunaansHurricane: "卢安娜的飓风",
    TFT_Item_MadredsBloodrazor: "鬼索之刃",
    TFT_Item_RedBuff: "红霸符",
    TFT_Item_Bloodthirster: "饮血剑",
    TFT_Item_SteraksGage: "斯特拉克的挑战护手",
    TFT_Item_GuardianAngel: "守护天使",
    TFT_Item_TitansResolve: "泰坦的坚决",
    TFT_Item_Quicksilver: "水银",
    TFT_Item_ThiefsGloves: "窃贼手套",
    TFT_Item_HandOfJustice: "正义之手",
    TFT_Item_GargoyleStoneplate: "石像鬼石板甲",
    TFT_Item_BrambleVest: "棘刺背心",
    TFT_Item_DragonsClaw: "巨龙之爪",
    TFT_Item_WarmogsArmor: "狂徒铠甲",
    TFT_Item_Crownguard: "冕卫",
    TFT_Item_Redemption: "救赎",
    TFT_Item_SunfireCape: "日炎斗篷",
    TFT_Item_FrozenHeart: "冰霜之心",
    TFT_Item_NightHarvester: "暗夜收割者",
    TFT_Item_SpectralGauntlet: "灵风",
    TFT_Item_UnstableConcoction: "不稳定炼金罐",
    TFT_Item_PowerGauntlet: "能量圣杯",
    TFT_Item_Leviathan: "利维坦之甲",
    TFT_Item_AdaptiveHelm: "适应性头盔",
  }
  return map[raw] || raw
    .replace("TFT_Item_", "")
    .replace("TFT5_Item_", "")
    .replace("TFT9_Item_", "")
    .replace("_Radiant", "（光明）")
    .replace("TFT17_Item_", "")
    .replace(/([A-Z])/g, " $1")
    .trim()
}

// places 数组索引0-7 = 排名1-8的使用次数，按排名越靠前越好排序
function calcScore(places: number[]): number {
  // 排名1=8分, 排名2=7分... 排名8=1分 的加权
  let score = 0
  let total = 0
  for (let i = 0; i < 8; i++) {
    score += places[i] * (8 - i)
    total += places[i]
  }
  return total > 0 ? score / total : 0
}

function getTopItems(itemsData: any, limit = 5) {
  const results = itemsData.results as any[]
  const items = results
    .filter((r: any) => !r.itemName.includes("_Radiant") && !r.itemName.includes("_Emblem") && !r.itemName.includes("_Consumable") && !r.itemName.includes("_Artifact"))
    .map((r: any) => ({
      name: simplifyItemName(r.itemName),
      score: calcScore(r.places),
      usage: r.places.reduce((a: number, b: number) => a + b, 0),
    }))
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, limit)
  return items
}

async function parseIntent(query: string, data: any) {
  const q = query.toLowerCase().trim()

  // 阵容排名
  if (/阵容|最强|强势|排行|版本|tier|什么厉害|吃鸡/.test(q)) {
    const comps = Object.entries(data.comps.results.options)
      .flatMap(([_, levels]: any) =>
        Object.values(levels).flat()
      )
      .filter((c: any) => c.avg > 0 && c.count > 100)
      .sort((a: any, b: any) => a.avg - b.avg)
      .slice(0, 5)

    if (comps.length > 0) {
      return {
        type: "comp_tier",
        data: {
          comps: comps.map((c: any) => ({
            name: `阵容 ${c.cluster?.slice(-3) || ""}`,
            avg: (c.avg || 0).toFixed(1),
            count: c.count,
          })),
          updated: new Date(data.items.updated).toLocaleString("zh-CN"),
        },
      }
    }
  }

  // 英雄配装（从 DeepSeek 或规则匹配拿到英雄名后查装备）
  if (/装备|出装|带什么|build/.test(q) || q.length <= 8) {
    const topItems = getTopItems(data.items)
    return {
      type: "hero_build",
      data: {
        heroName: "当前版本",
        items: topItems.map((i: any) => i.name),
        winRate: null,
        playRate: null,
        tip: `数据来源 MetaTFT · 更新于 ${new Date(data.items.updated).toLocaleString("zh-CN")}`,
        topItems: topItems.map((i: any) => ({ name: i.name, score: i.score.toFixed(1) })),
      },
    }
  }

  // 装备排行
  if (/装备|item/.test(q)) {
    const topItems = getTopItems(data.items, 10)
    return {
      type: "comp_tier",
      data: {
        comps: topItems.map((i: any) => ({ name: i.name, winRate: i.score.toFixed(1), count: i.usage })),
        updated: new Date(data.items.updated).toLocaleString("zh-CN"),
      },
    }
  }

  return { type: "unknown", data: null, message: `试试说「最强阵容」或「装备排行」查看实时数据` }
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()
    if (!query || typeof query !== "string") {
      return NextResponse.json({ type: "error", data: null, message: "请描述你想查的内容" })
    }

    // 1. 获取 MetaTFT 实时数据
    let mftData
    try {
      mftData = await fetchMetaTFT()
    } catch {
      return NextResponse.json({ type: "error", data: null, message: "数据源暂时不可用，请稍后重试" })
    }

    // 2. 意图理解
    let result = await parseIntent(query, mftData)

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ type: "error", data: null, message: "出了点问题，再试一次？" })
  }
}
