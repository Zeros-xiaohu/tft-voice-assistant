export const dynamic = "force-dynamic"

// MetaTFT 缓存（服务级生命周期，5分钟 TTL）
let cache: { data: { items: any; comps: any }; ts: number } | null = null

async function getData() {
  if (cache && Date.now() - cache.ts < 300_000) return cache.data
  const [itemsRes, compsRes] = await Promise.all([
    fetch("https://api-hc.metatft.com/tft-stat-api/items"),
    fetch("https://api-hc.metatft.com/tft-comps-api/comp_options"),
  ])
  const items = await itemsRes.json()
  const comps = await compsRes.json()
  cache = { data: { items, comps }, ts: Date.now() }
  return { items, comps }
}

export async function POST(req: Request) {
  try {
    const { query } = await req.json()
    if (!query?.trim()) return Response.json({ type: "error", message: "请描述你想查的内容" })

    const apiKey = process.env.DEEPSEEK_API_KEY!
    const { items: itemsData } = await getData()

    // 精简数据：只取 Top 30 装备，算好分数再发
    const itemsTop = itemsData.results
      .filter((r: any) =>
        r.itemName.startsWith("TFT_Item_") &&
        !r.itemName.includes("Artifact") && !r.itemName.includes("Emblem") &&
        !r.itemName.includes("_Radiant") && !r.itemName.includes("Consumable") &&
        !r.itemName.includes("Spatula") && !r.itemName.includes("FryingPan") &&
        !r.itemName.includes("ForceOfNature") && !r.itemName.includes("ThiefsGloves") &&
        !r.itemName.includes("Tacticians")
      )
      .map((r: any) => {
        const total = (r.places as number[]).reduce((a: number, b: number) => a + b, 0)
        const score = +((r.places as number[]).reduce((s: number, c: number, i: number) => s + c * (8 - i), 0) / total).toFixed(2)
        return {
          id: r.itemName.replace("TFT_Item_", ""),
          score,
          total,
          // MetaTFT CDN 图标
          icon: `https://cdn.metatft.com/file/metatft/items/${r.itemName.replace("TFT_Item_", "").toLowerCase()}.png`,
        }
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 30)

    // 版本
    const patch = itemsData.games?.[0]?.patch || "17.5"

    // DeepSeek
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `你是云顶之弈助手。翻译装备ID为国服中文名。映射：
GuinsoosRageblade=鬼索的狂暴之刃 InfinityEdge=无尽之刃 SpearOfShojin=朔极之矛 JeweledGauntlet=珠光护手 Deathblade=死亡之刃 BlueBuff=蓝霸符 GiantSlayer=巨人杀手 RedBuff=红霸符 LastWhisper=最后的轻语 Bloodthirster=饮血剑 RabadonsDeathcap=灭世者的死亡之帽 ArchangelsStaff=大天使之杖 WarmogsArmor=狂徒铠甲 GargoyleStoneplate=石像鬼石板甲 GiantsBelt=巨人腰带 DragonsClaw=巨龙之爪 BrambleVest=棘刺背心 Redemption=救赎 Quicksilver=水银 TitansResolve=泰坦的坚决 GuardianAngel=守护天使 SteraksGage=斯特拉克的挑战护手 Morellonomicon=莫雷洛秘典 HextechGunblade=海克斯科技枪刃 IonicSpark=离子火花 StatikkShiv=斯塔缇克电刃 Crownguard=冕卫 UnstableConcoction=正义之手 MadredsBloodrazor=巨人杀手 RapidFireCannon=疾射火炮 RunaansHurricane=卢安娜的飓风 SpectralGauntlet=薄暮法袍 NightHarvester=坚定之心 FrozenHeart=冰霜之心 Leviathan=龙骨盾 SunfireCape=日炎斗篷 AdaptiveHelm=适应性头盔 PowerGauntlet=强袭转职

返回纯JSON，不要markdown：{"type":"item_tier","data":{"items":[{"name":"中文名","score":7.8,"usage":"123万","icon":"url"}],"patch":"17.5b"}}
英雄配装：{"type":"hero_build","data":{"heroName":"英雄名","items":[{"name":"装备","icon":"url"}]}}`,
          },
          {
            role: "user",
            content: `查询:"${query}" | 装备数据(JSON):${JSON.stringify(itemsTop.slice(0, 20))} | 翻译并返回`,
          },
        ],
        temperature: 0.1,
        max_tokens: 800,
      }),
    })

    const json = await res.json()
    const raw = json.choices[0].message.content.replace(/```json\n?|```/g, "").trim()
    const result = JSON.parse(raw)

    // 补充 patch 和 icon
    if (result.data?.items) {
      for (const item of result.data.items) {
        const found = itemsTop.find((i: any) => i.id === item.id || item.name?.includes(i.name))
        if (found && !item.icon) item.icon = found.icon
      }
    }
    if (result.data) result.data.patch = `Set 17 · Patch ${patch}`

    return Response.json(result)
  } catch (err: any) {
    return Response.json({ type: "error", message: "出了点问题，再试一次？" })
  }
}
