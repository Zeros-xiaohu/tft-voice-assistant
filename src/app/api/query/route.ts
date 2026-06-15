export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const { query } = await req.json()
    if (!query || typeof query !== "string") {
      return Response.json({ type: "error", data: null, message: "请描述你想查的内容" })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY!

    // 并行拉 MetaTFT 数据
    const [itemsRes, compsRes] = await Promise.all([
      fetch("https://api-hc.metatft.com/tft-stat-api/items"),
      fetch("https://api-hc.metatft.com/tft-comps-api/comp_options"),
    ])
    const itemsData = await itemsRes.json()
    const compsData = await compsRes.json()

    // 提取装备 Top 50
    const itemsRaw = itemsData.results
      .filter((r: any) =>
        r.itemName.startsWith("TFT_Item_") &&
        !r.itemName.includes("Artifact") &&
        !r.itemName.includes("Emblem") &&
        !r.itemName.includes("_Radiant") &&
        !r.itemName.includes("Consumable") &&
        !r.itemName.includes("Spatula") &&
        !r.itemName.includes("FryingPan") &&
        !r.itemName.includes("ForceOfNature") &&
        !r.itemName.includes("ThiefsGloves") &&
        !r.itemName.includes("Tacticians")
      )
      .slice(0, 50)

    // 提取阵容 Top 10
    const allComps: any[] = []
    for (const [_, levels] of Object.entries(compsData.results.options)) {
      for (const comps of Object.values(levels as any)) {
        for (const c of comps as any[]) {
          if (c.count > 100 && c.avg > 0) {
            allComps.push({
              count: c.count,
              avg: +c.avg.toFixed(2),
              units: c.units_list.split("&").map((u: string) => u.replace("TFT17_", "").replace("TFT_", "")).slice(0, 6).join(","),
            })
          }
        }
      }
    }
    const topComps = allComps.sort((a, b) => a.avg - b.avg).slice(0, 8)

    // 发给 DeepSeek
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `你是云顶之弈国服助手。把英文ID翻译成国服中文名后，根据用户查询返回JSON：

装备：GuinsoosRageblade→鬼索的狂暴之刃, InfinityEdge→无尽之刃, SpearOfShojin→朔极之矛, JeweledGauntlet→珠光护手, Deathblade→死亡之刃, BlueBuff→蓝霸符, GiantSlayer→巨人杀手, RedBuff→红霸符, LastWhisper→最后的轻语, Bloodthirster→饮血剑, RabadonsDeathcap→灭世者的死亡之帽, ArchangelsStaff→大天使之杖, WarmogsArmor→狂徒铠甲, GargoyleStoneplate→石像鬼石板甲, DragonsClaw→巨龙之爪, BrambleVest→棘刺背心, Redemption→救赎, Quicksilver→水银, TitansResolve→泰坦的坚决, GuardianAngel→守护天使, SteraksGage→斯特拉克的挑战护手, Morellonomicon→莫雷洛秘典, HextechGunblade→海克斯科技枪刃, IonicSpark→离子火花, StatikkShiv→斯塔缇克电刃, Crownguard→冕卫, UnstableConcoction→正义之手, MadredsBloodrazor→巨人杀手, RapidFireCannon→疾射火炮, RunaansHurricane→卢安娜的飓风, SpectralGauntlet→薄暮法袍, NightHarvester→坚定之心, FrozenHeart→冰霜之心, PowerGauntlet→强袭转职, Leviathan→纳什之牙, SunfireCape→日炎斗篷, AdaptiveHelm→适应性头盔

英雄：MasterYi→易大师, Yasuo→亚索, Aatrox→亚托克斯, Mordekaiser→莫德凯撒, Fiora→菲奥娜, Riven→锐雯, Jhin→烬, Shen→慎, Lulu→璐璐, Zed→劫, Vex→薇古丝

返回格式：
{"type":"item_tier","data":{"items":[{"name":"中文名","score":"评分(1-8)","usage":"使用次数(数字)"}],"patch":"17.5b(1680万局)"}}
{"type":"comp_tier","data":{"comps":[{"name":"阵容简称","avg":4.2,"count":1234,"units":"英雄中文列表"}],"patch":"17.5b(1680万局)"}}
{"type":"hero_build","data":{"heroName":"英雄中文名","items":["装1","装2","装3"],"tip":"一句话建议"}}`,
          },
          {
            role: "user",
            content: `用户查询: "${query}"

装备数据(top50): ${JSON.stringify(itemsRaw)}

阵容数据(top8): ${JSON.stringify(topComps)}

请翻译并返回结果。Items 的places数组的加权分计算方法: places[0]*8+places[1]*7+...+places[7]*1 / total. 如果用户问装备，也解释一下计算逻辑。`,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    })

    const json = await res.json()
    const rawContent = json.choices[0].message.content
    const cleanContent = rawContent.replace(/```json\n?/g, "").replace(/```/g, "").trim()
    const result = JSON.parse(cleanContent)
    return Response.json(result)
  } catch (err: any) {
    return Response.json({
      type: "error",
      data: null,
      message: err.message?.length < 100 ? "出了点问题: " + err.message : "出了点问题，再试一次？",
    })
  }
}
