export const dynamic = "force-dynamic"

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ""

const ITEM_NAMES: Record<string,string> = {
  GuinsoosRageblade:"鬼索的狂暴之刃",InfinityEdge:"无尽之刃",SpearOfShojin:"朔极之矛",
  JeweledGauntlet:"珠光护手",Deathblade:"死亡之刃",BlueBuff:"蓝霸符",
  GiantSlayer:"巨人杀手",LastWhisper:"最后的轻语",Bloodthirster:"饮血剑",
  RabadonsDeathcap:"灭世者的死亡之帽",ArchangelsStaff:"大天使之杖",
  WarmogsArmor:"狂徒铠甲",GargoyleStoneplate:"石像鬼石板甲",
  DragonsClaw:"巨龙之爪",BrambleVest:"棘刺背心",Redemption:"救赎",
  Quicksilver:"水银",TitansResolve:"泰坦的坚决",GuardianAngel:"守护天使",
  SteraksGage:"斯特拉克的挑战护手",Morellonomicon:"莫雷洛秘典",
  HextechGunblade:"海克斯科技枪刃",IonicSpark:"离子火花",
  StatikkShiv:"斯塔缇克电刃",Crownguard:"冕卫",UnstableConcoction:"正义之手",
  MadredsBloodrazor:"巨人杀手",RapidFireCannon:"疾射火炮",
  RunaansHurricane:"卢安娜的飓风",RedBuff:"红霸符",
  SpectralGauntlet:"薄暮法袍",NightHarvester:"坚定之心",
  FrozenHeart:"冰霜之心",Leviathan:"龙骨盾",AdaptiveHelm:"适应性头盔",
  PowerGauntlet:"强袭转职",SunfireCape:"日炎斗篷",
  EdgeOfNight:"夜之锋刃",Evenshroud:"薄暮法袍",ThiefsGloves:"窃贼手套",
}

const HERO_DISPLAY: Record<string,string> = {
  Jinx:"金克斯",Yasuo:"亚索",MasterYi:"易大师",Aatrox:"亚托克斯",
  Mordekaiser:"莫德凯撒",Fiora:"菲奥娜",Riven:"锐雯",Jhin:"烬",Shen:"慎",
  Lulu:"璐璐",Zed:"劫",Vex:"薇古丝",Garen:"盖伦",Rhaast:"拉亚斯特",
  Veigar:"维迦",Ahri:"阿狸",Ezreal:"伊泽瑞尔",Poppy:"波比",
  Caitlyn:"凯特琳",Senna:"赛娜",Ashe:"艾希",Darius:"德莱厄斯",
  Kaisa:"卡莎",Yone:"永恩",Lux:"拉克丝",Gwen:"格温",Diana:"黛安娜",
  Akali:"阿卡丽",Samira:"莎弥拉",Nasus:"内瑟斯",Milio:"米利欧",
  Xayah:"霞",Gnar:"纳尔",Kindred:"千珏",Graves:"格雷福斯",
  Urgot:"厄加特",Fizz:"菲兹",Bard:"巴德",Zoe:"佐伊",Leona:"蕾欧娜",
  Ornn:"奥恩",Belveth:"卑尔维斯",Pantheon:"潘森",Talon:"泰隆",
  Galio:"加里奥",Rammus:"拉莫斯",TwistedFate:"崔斯特",Karma:"卡尔玛",
  Sona:"娑娜",Nami:"娜美",Jax:"贾克斯",Blitzcrank:"布里茨",
  Maokai:"茂凯",Nunu:"努努",Viktor:"维克托",Aurora:"奥罗拉",
  Briar:"布莱尔",Pyke:"派克",RekSai:"雷克塞",MissFortune:"厄运小姐",
  Lissandra:"丽桑卓",Gragas:"古拉加斯",Teemo:"提莫",
  Corki:"库奇",Illaoi:"俄洛伊",Chogath:"科加斯",Morgana:"莫甘娜",
  Leblanc:"乐芙兰",TahmKench:"塔姆",LeeSin:"李青",
}

function iname(id: string): string {
  const key = id.replace("TFT_Item_","").replace("TFT5_Item_","").replace("_Radiant","")
  return ITEM_NAMES[key] || key
}

function iicon(id: string): string {
  const key = id.replace("TFT17_","").replace("TFT5_","").toLowerCase()
  return `https://cdn.metatft.com/file/metatft/items/${key}.png`
}

let unitCache: any = null; let unitCacheTs = 0
let itemsCache: any = null; let itemsCacheTs = 0
let heroItemCache = new Map<string, {data: any[], ts: number}>()

async function parseIntent(query: string) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{
        role: "system",
        content: `You are a TFT intent parser. Extract intent and hero name from Chinese query.
Intent types: hero_build (hero items), item_tier (item rankings), comp_tier (comp rankings), unknown.
Hero name mapping (return English key only):
MasterYi,Yasuo,Jinx,Graves,LeeSin,Mordekaiser,Fiora,Riven,Jhin,Shen,
Zed,Vex,Garen,Rhaast,Veigar,Ahri,Ezreal,Poppy,Caitlyn,Senna,Ashe,Darius,
Kaisa,Yone,Lux,Gwen,Diana,Akali,Samira,Nasus,Milio,Xayah,Gnar,Kindred,
Urgot,Fizz,Bard,Zoe,Leona,Ornn,Belveth,Pantheon,Talon,Galio,Rammus,
TwistedFate,Karma,Sona,Nami,Jax,Blitzcrank,Maokai,Nunu,Viktor,Aurora,
Briar,Pyke,RekSai,MissFortune,Lissandra,Gragas,Teemo,Corki,Illaoi,
Chogath,Morgana,Leblanc,TahmKench

Return ONLY JSON: {"intent":"hero_build","hero":"Graves"}`,
      }, { role:"user", content: query }],
      temperature: 0.01, max_tokens: 80,
    }),
  })
  if (!res.ok) throw new Error("DS error")
  const json = await res.json()
  const raw = json.choices[0].message.content.replace(/```json\n?|```/g,"").trim()
  return JSON.parse(raw)
}

type PlaceArray = [number,number,number,number,number,number,number,number]

function calcStats(places: PlaceArray) {
  const total = places.reduce((a:number,b:number)=>a+b,0)
  if (total === 0) return { avg:0,top4:0,win:0,total:0 }
  const avg = +(places.reduce((s,c,i)=>s+c*(i+1),0)/total).toFixed(2)
  const top4 = +((places[0]+places[1]+places[2]+places[3])/total*100).toFixed(1)
  const win = +(places[0]/total*100).toFixed(1)
  return { avg, top4, win, total }
}

function avgChangeForItem(stats: {avg:number, top4:number, win:number}, baseline: {avg:number, top4:number, win:number}) {
  const avgDiff = +(stats.avg - baseline.avg).toFixed(2)
  return {
    avgLabel: `平均 ${stats.avg} 名`,
    avgDiff,
    top4Label: `前四 ${stats.top4}%`,
    winLabel: `吃鸡 ${stats.win}%`,
  }
}

async function getUnitData() {
  if (!unitCache || Date.now() - unitCacheTs > 300_000) {
    const res = await fetch("https://api-hc.metatft.com/tft-comps-api/unit_items_processed")
    unitCache = await res.json(); unitCacheTs = Date.now()
  }
  return unitCache
}

async function getItemsData() {
  if (!itemsCache || Date.now() - itemsCacheTs > 300_000) {
    const res = await fetch("https://api-hc.metatft.com/tft-stat-api/items")
    itemsCache = await res.json(); itemsCacheTs = Date.now()
  }
  return itemsCache
}

export async function POST(req: Request) {
  try {
    const { query } = await req.json()
    const q = (query||"").trim()
    if (!q) return Response.json({ type:"error",message:"请描述你想查的内容" })

    let intent: any
    try { intent = await parseIntent(q) }
    catch { return Response.json({ type:"error",message:"AI 服务暂时不可用" }) }

    if (intent.intent === "item_tier") {
      const itemsData = await getItemsData()
      const items = itemsData.results
        .filter((r:any) => r.itemName.startsWith("TFT_Item_") && !r.itemName.includes("Artifact") && !r.itemName.includes("Emblem") && !r.itemName.includes("_Radiant") && !r.itemName.includes("Consumable") && !r.itemName.includes("Spatula") && !r.itemName.includes("FryingPan") && !r.itemName.includes("ForceOfNature") && !r.itemName.includes("ThiefsGloves") && !r.itemName.includes("Tacticians") && !r.itemName.includes("BFSword") && !r.itemName.includes("RecurveBow") && !r.itemName.includes("GiantsBelt") && !r.itemName.includes("ChainVest") && !r.itemName.includes("NeedlesslyLargeRod") && !r.itemName.includes("NegatronCloak") && !r.itemName.includes("TearOfTheGoddess") && !r.itemName.includes("SparringGloves"))
        .map((r:any) => {
          const stats = calcStats(r.places)
          return { name: iname(r.itemName), icon: iicon(r.itemName), ...stats }
        })
        .filter((i:any) => i.name !== i.icon && i.total > 1000)
        .sort((a:any,b:any)=>a.avg-b.avg).slice(0,12)
      const patch = itemsData.games?.[0]?.patch || "17.5"
      return Response.json({ type:"item_tier",data:{ items, patch:`Set 17 \u00b7 Patch ${patch}` } })
    }

    if (intent.intent === "hero_build" && intent.hero) {
      const [unitData] = await Promise.all([getUnitData()])

      const heroKey = intent.hero
      let unitKey = ""
      for (const [ukey] of Object.entries(unitData.units)) {
        if (ukey.toLowerCase().includes(heroKey.toLowerCase())) { unitKey = ukey; break }
      }
      if (!unitKey) return Response.json({ type:"unknown",message:`没找到 ${heroKey} 的装备数据` })

      const unit = unitData.units[unitKey]
      if (!unit?.items) return Response.json({ type:"unknown",message:"暂无该英雄的装备数据" })

      const heroAvg = +unit.avg.toFixed(2)
      const heroPick = +(unit.pick*100).toFixed(1)
      const heroCount = unit.count

      // Get hero win/top4 rate from explorer total API
      let heroWin = 0, heroTop4Rate = 0, heroCountTotal = 0
      try {
        const totalUrl = `https://api-hc.metatft.com/tft-explorer-api/total?formatnoarray=true&compact=true&queue=1100&patch=current&days=3&rank=CHALLENGER,GRANDMASTER,MASTER&unit_unique=${unitKey}-1`
        const totalRes = await fetch(totalUrl)
        if (totalRes.ok) {
          const totalJson = await totalRes.json()
          const td = totalJson.data?.[0]
          if (td?.placement_count) {
            const t = td.placement_count.reduce((a:number,b:number)=>a+b,0)
            heroWin = t > 0 ? +(td.placement_count[0]/t*100).toFixed(1) : 0
            heroTop4Rate = t > 0 ? +((td.placement_count[0]+td.placement_count[1]+td.placement_count[2]+td.placement_count[3])/t*100).toFixed(1) : 0
            heroCountTotal = t
          }
        }
      } catch(e) {}

      // Use explorer API for hero-specific item stats
      let heroItemStats: any[] = []
      const cacheKey = `hero_items_${unitKey}`
      const cached = heroItemCache.get(cacheKey)
      if (cached && Date.now() - cached.ts < 300_000) {
        heroItemStats = cached.data
      } else {
        try {
          const expUrl = `https://api-hc.metatft.com/tft-explorer-api/items?formatnoarray=true&compact=true&queue=1100&patch=current&days=3&rank=CHALLENGER,GRANDMASTER,MASTER&unit_unique=${unitKey}-1`
          const expRes = await fetch(expUrl)
          if (expRes.ok) {
            const expJson = await expRes.json()
            heroItemStats = (expJson.data || []).filter((r:any) =>
              r.items && r.items.startsWith("TFT_Item_") &&
              !r.items.includes("Artifact") && !r.items.includes("Emblem") &&
              !r.items.includes("_Radiant") && !r.items.includes("Consumable") &&
              !r.items.includes("Spatula") && !r.items.includes("FryingPan") &&
              !r.items.includes("ForceOfNature") && !r.items.includes("ThiefsGloves") &&
              !r.items.includes("AnimaSquad")
            ).map((r:any) => {
              const stats = calcStats(r.placement_count)
              return { itemName: r.items, ...stats }
            })
            heroItemCache.set(cacheKey, { data: heroItemStats, ts: Date.now() })
          }
        } catch(e) {}
      }

      const heroItemMap = new Map<string, {avg:number,top4:number,win:number,total:number}>()
      for (const r of heroItemStats) heroItemMap.set(r.itemName, r)

      const allHeroItems = heroItemStats.filter((r:any) => r.total > 100)
      let bTotal = 0, bAvg = 0
      for (const r of allHeroItems) { bTotal += r.total; bAvg += r.avg * r.total }
      const baselineAvg = bTotal > 0 ? +(bAvg/bTotal).toFixed(2) : 0

      // Use unit_items_processed for item order (hero-specific pick rate),
      // then match with explorer API for hero-specific avg/top4/win stats
      const seen = new Set<string>()
      const allMapped = unit.items
        .filter((i:any) => i.itemName.startsWith("TFT_Item_") && !i.itemName.includes("Artifact") && !i.itemName.includes("Emblem") && !i.itemName.includes("_Radiant") && !i.itemName.includes("Consumable") && !i.itemName.includes("Spatula") && !i.itemName.includes("FryingPan") && !i.itemName.includes("ForceOfNature") && !i.itemName.includes("ThiefsGloves"))
        .filter((i:any) => { const k = iname(i.itemName); if (seen.has(k)) return false; seen.add(k); return true })
        .map((i:any) => {
        const name = iname(i.itemName)
        const icon = iicon(i.itemName)
        const stats = heroItemMap.get(i.itemName)
        if (!stats) return { name, icon }
        const avgDiff = +(stats.avg - baselineAvg).toFixed(2)
        return {
          name, icon,
          avg: stats.avg,
          top4: stats.top4,
          win: stats.win,
          avgDiff,
          count: stats.total,
        }
      })

      // Sort by avg (ascending = better) and take top 5
      const topItems = allMapped
        .filter((i:any) => i.avg != null)
        .slice(0, 5)

      const displayName = HERO_DISPLAY[heroKey] || heroKey
      return Response.json({
        type:"hero_build",
        data: {
          heroName: displayName,
          heroAvg,
          heroWin,
          heroTop4Rate,
          heroCount: heroCountTotal > 0 ? heroCountTotal : heroCount,
          items: topItems,
          tip: `登场率 ${heroPick}% | 平均 ${heroAvg} 名 | 对局 ${(heroCount||0).toLocaleString()}`,
        }
      })
    }

return Response.json({ type:"unknown", message:"试试说「金克斯装备」或「装备排行」" })
  } catch (err: any) {
    return Response.json({ type:"error", message: err.message || "出了点问题" })
  }
}
