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

// =========================================================
// 装备别名 → apiName 映射（用于 item_recipe 意图）
// =========================================================
const ITEM_ALIAS_MAP: Record<string, string> = {
  "暴风大剑":"TFT_Item_BFSword","大剑":"TFT_Item_BFSword","bf":"TFT_Item_BFSword",
  "反曲之弓":"TFT_Item_RecurveBow","反曲弓":"TFT_Item_RecurveBow","反曲":"TFT_Item_RecurveBow","弓":"TFT_Item_RecurveBow",
  "无用大棒":"TFT_Item_NeedlesslyLargeRod","大棒":"TFT_Item_NeedlesslyLargeRod","棒子":"TFT_Item_NeedlesslyLargeRod",
  "女神之泪":"TFT_Item_TearOfTheGoddess","眼泪":"TFT_Item_TearOfTheGoddess","女神泪":"TFT_Item_TearOfTheGoddess","蓝":"TFT_Item_TearOfTheGoddess",
  "锁子甲":"TFT_Item_ChainVest","锁子":"TFT_Item_ChainVest","护甲":"TFT_Item_ChainVest","布甲":"TFT_Item_ChainVest",
  "负极斗篷":"TFT_Item_NegatronCloak","斗篷":"TFT_Item_NegatronCloak","魔抗":"TFT_Item_NegatronCloak","负极":"TFT_Item_NegatronCloak",
  "巨人腰带":"TFT_Item_GiantsBelt","腰带":"TFT_Item_GiantsBelt","大腰带":"TFT_Item_GiantsBelt",
  "金铲铲":"TFT_Item_Spatula","铲子":"TFT_Item_Spatula","铲铲":"TFT_Item_Spatula","金铲":"TFT_Item_Spatula",
  "拳套":"TFT_Item_SparringGloves","暴击拳套":"TFT_Item_SparringGloves","手套":"TFT_Item_SparringGloves","暴击":"TFT_Item_SparringGloves",
  "金锅锅":"TFT_Item_FryingPan","锅铲":"TFT_Item_FryingPan","金锅":"TFT_Item_FryingPan","锅":"TFT_Item_FryingPan","金锅铲":"TFT_Item_FryingPan",
}

// =========================================================
// 本地装备数据缓存
// =========================================================
let localItemsCache: any = null
function getLocalItems() {
  if (!localItemsCache) {
    try {
      const fs = require("fs")
      const path = require("path")
      localItemsCache = JSON.parse(
        fs.readFileSync(path.resolve(process.cwd(), "src/data/items.json"), "utf8")
      )
    } catch (e) {
      console.error("Failed to load local items.json:", e)
      return null
    }
  }
  return localItemsCache
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

// =========================================================
// 意图解析
// =========================================================
async function parseIntent(query: string) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{
        role: "system",
        content: `You are a TFT intent parser. Extract intent and parameters from Chinese query.

Intent types:
- hero_build: query about hero item builds. Extract hero name.
- item_tier: query about item strength rankings.
- comp_tier: query about team compositions / meta comps. Extract optional trait/hero filters.
- item_recipe: query about item combining/recipes. Given 2-3 basic items, what can they form? Extract item names from query.

Hero name mapping (return English key):
MasterYi=易大师/剑圣, Yasuo=亚索/压缩/疾风剑豪, Jinx=金克斯, Graves=格雷福斯/男枪/枪手,
LeeSin=李青/盲僧/瞎子, Mordekaiser=莫德凯撒/铁男, Fiora=菲奥娜/剑姬, Riven=锐雯,
Jhin=烬, Shen=慎, Lulu=璐璐, Zed=劫, Vex=薇古丝, Garen=盖伦, Rhaast=拉亚斯特/剑魔,
Veigar=维迦/小法, Ahri=阿狸/狐狸, Ezreal=伊泽瑞尔/EZ/探险家, Poppy=波比,
Caitlyn=凯特琳/女警, Senna=赛娜, Ashe=艾希/寒冰, Darius=德莱厄斯/诺手/诺克萨斯,
Kaisa=卡莎, Yone=永恩, Lux=拉克丝/光辉, Gwen=格温, Diana=黛安娜/皎月,
Akali=阿卡丽, Samira=莎弥拉, Nasus=内瑟斯/狗头, Milio=米利欧,
Xayah=霞, Gnar=纳尔, Kindred=千珏, Urgot=厄加特/螃蟹, Fizz=菲兹/小鱼人,
Bard=巴德, Zoe=佐伊, Leona=蕾欧娜/日女, Ornn=奥恩, Belveth=卑尔维斯,
Pantheon=潘森, Talon=泰隆/男刀, Galio=加里奥/石像鬼, Rammus=拉莫斯/龙龟,
TwistedFate=崔斯特/卡牌, Karma=卡尔玛, Sona=娑娜/琴女, Nami=娜美,
Jax=贾克斯/武器, Blitzcrank=布里茨/机器人, Maokai=茂凯/大树, Nunu=努努/雪人,
Viktor=维克托/三只手, Aurora=奥罗拉, Briar=布莱尔/贝雷亚, Pyke=派克,
RekSai=雷克塞/挖掘机, MissFortune=厄运小姐/女枪/MF, Lissandra=丽桑卓/冰女,
Gragas=古拉加斯/酒桶, Teemo=提莫, Corki=库奇/飞机, Illaoi=俄洛伊/触手妈,
Chogath=科加斯/大虫子, Morgana=莫甘娜, Leblanc=乐芙兰/妖姬, TahmKench=塔姆/蛤蟆,
Aatrox=亚托克斯/暗裔剑魔

For item_recipe, extract item names from query. Common Chinese item names:
暴风大剑/大剑, 反曲之弓/反曲弓, 无用大棒/大棒, 女神之泪/眼泪, 锁子甲, 负极斗篷/斗篷,
巨人腰带/腰带, 金铲铲/铲子, 拳套/暴击拳套, 金锅锅/金锅铲, 羊刀/鬼索的狂暴之刃,
无尽/无尽之刃, 青龙刀/朔极之矛, 法爆/珠光护手, 饮血/饮血剑, 大天使/大天使之杖

Return ONLY JSON:
- hero_build: {"intent":"hero_build","hero":"Graves"}
- item_tier: {"intent":"item_tier"}
- comp_tier: {"intent":"comp_tier","filter":"法师"} (filter optional, null if not specified)
- item_recipe: {"intent":"item_recipe","items":["反曲之弓","大剑"]}
- unknown: {"intent":"unknown"}`,
      }, { role:"user", content: query }],
      temperature: 0.01, max_tokens: 120,
    }),
  })
  if (!res.ok) throw new Error("DS error")
  const json = await res.json()
  const raw = json.choices[0].message.content.replace(/```json\n?|```/g,"").trim()
  return JSON.parse(raw)
}

// =========================================================
// DeepSeek 阵容推荐（comp_tier）
// =========================================================
async function getCompTierDeepSeek(filter?: string) {
  // Try MetaTFT real-time data first
  try {
    const infoRes = await fetch("https://api-hc.metatft.com/tft-comps-api/latest_cluster_info", {
      headers: { "User-Agent": "TFT-Voice-Assistant/2.0" }
    });
    if (infoRes.ok) {
      const infoData = await infoRes.json();
      const clusters = infoData?.cluster_info?.cluster_details?.clusters || [];
      
      if (clusters.length > 0) {
        // centroid array: last 3 indices ~ [placements, games, top4%?]
        // Based on the report data, extract avg_placement from centroid
        const comps = clusters
          .map((c: any) => {
            const cent = c.centroid || [];
            const avgIdx = 23; // avg_placement position in centroid (from debugging)
            const gamesIdx = 92; // games count position
            const avg = cent[23] != null ? +cent[23].toFixed(2) : null;
            const playRate = cent[92] != null ? cent[92] : null;
            
            return {
              name: c.name_string?.replace(/, /g, " / ") || ("阵容 " + c.Cluster),
              avg,
              playRate,
              trait: (c.traits_string || "").replace(/, /g, " / ").replace(/TFT17_/g, ""),
              coreUnits: (c.units_string || "").split(", ").map((u: string) => u.replace("TFT17_", "")),
              clusterId: c.Cluster,
            };
          })
          .filter((c: any) => c.avg != null && c.avg > 0 && c.playRate != null && c.playRate > 0)
          .sort((a: any, b: any) => a.avg - b.avg)
          .slice(0, 5);
        
        if (comps.length > 0) {
          // Calculate estimated top4/win from avg
          return comps.map((c: any) => ({
            name: c.name,
            trait: c.trait,
            avg: c.avg,
            top4: +(Math.min(90, Math.max(40, 100 - (c.avg - 3) * 22)).toFixed(1)),
            win: +(Math.min(30, Math.max(6, 45 - c.avg * 10)).toFixed(1)),
            difficulty: "中",
            coreUnits: c.coreUnits.slice(0, 8),
            coreItems: {},
            howToPlay: "",
            source: "MetaTFT 实时数据",
          }));
        }
      }
    }
  } catch (e) {
    console.error("MetaTFT comps fallback:", (e as Error).message);
  }
  
  // Fallback to DeepSeek
  const filterText = filter
    ? "用户想了解" + filter + "相关阵容，请重点推荐" + filter + "相关的主流阵容。"
    : "请推荐当前版本（Set 17.6 云顶之弈 S17.6）胜率最高的阵容。"
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":"Bearer " + DEEPSEEK_API_KEY },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{
        role: "system",
        content: "你是云顶之弈 S17.6（Set 17.6）专家。" + filterText + "\n\n返回严格的 JSON 数组，包含 5 个阵容，每个阵容格式：\n{\n  \"name\": \"阵容名称（中文）\",\n  \"trait\": \"主要羁绊\",\n  \"avg\": 平均排名（如 3.84）,\n  \"top4\": 前四率百分比（如 61.9）,\n  \"win\": 吃鸡率百分比（如 18.2）,\n  \"difficulty\": \"低/中/高\",\n  \"coreUnits\": [\"核心英雄1\",\"核心英雄2\",...],\n  \"coreItems\": {\"核心英雄1\":[\"关键装备1\",\"关键装备2\",\"关键装备3\"], ...},\n  \"howToPlay\": \"运营思路简述\"\n}\n\n确保数据准确反映 Set 17.6（当前版本）的生态环境。只返回 JSON 数组，不要其他文字。",
      }, { role:"user", content: filterText }],
      temperature: 0.3, max_tokens: 2000,
    }),
  });
  if (!res.ok) throw new Error("DS comp error");
  const json = await res.json();
  const raw = json.choices[0].message.content.replace(/```json\n?|```/g,"").trim();
  return JSON.parse(raw);
}



// =========================================================
// 装备合成查询（item_recipe）- 本地数据
// =========================================================
async function getItemRecipe(itemNames: string[]) {
  const local = getLocalItems()
  if (!local) return null

  const { basic, recipeIndex, componentToCompleted } = local

  // 找到用户输入的基础装备 apiName
  const matchedApis: string[] = []
  const matchedNames: string[] = []
  for (const name of itemNames) {
    const api = ITEM_ALIAS_MAP[name]
    if (api) {
      matchedApis.push(api)
      matchedNames.push(name)
    } else {
      // 尝试模糊匹配 basic 列表中的名字
      const found = basic.find((b:any) =>
        b.name.includes(name) || name.includes(b.name) ||
        b.apiName.toLowerCase().includes(name.toLowerCase())
      )
      if (found) {
        matchedApis.push(found.apiName)
        matchedNames.push(found.name)
      }
    }
  }

  if (matchedApis.length < 2) return null

  // 查找所有两两组合的配方
  const recipes: { compA:string, compB:string, name:string, icon:string, apiName:string }[] = []
  const seen = new Set<string>()

  for (let i = 0; i < matchedApis.length; i++) {
    for (let j = i + 1; j < matchedApis.length; j++) {
      const key = [matchedApis[i], matchedApis[j]].sort().join("+")
      const recipe = recipeIndex[key]
      if (recipe && !seen.has(recipe.name)) {
        seen.add(recipe.name)
        recipes.push({
          compA: matchedNames[i],
          compB: matchedNames[j],
          name: recipe.name,
          icon: recipe.icon,
          apiName: recipe.apiName,
        })
      }
    }
  }

  // 如果用户输入了 3 个以上装备，也查所有组合
  if (matchedApis.length >= 3) {
    for (let i = 0; i < matchedApis.length; i++) {
      for (let j = i + 1; j < matchedApis.length; j++) {
        // 检查是否可以利用 componentToCompleted 反查
        const key = [matchedApis[i], matchedApis[j]].sort().join("+")
        const recipe = recipeIndex[key]
        if (recipe && !seen.has(recipe.name)) {
          seen.add(recipe.name)
          recipes.push({
            compA: matchedNames[i],
            compB: matchedNames[j],
            name: recipe.name,
            icon: recipe.icon,
            apiName: recipe.apiName,
          })
        }
      }
    }
  }

  return {
    inputItems: matchedNames,
    recipes,
    componentToCompleted: matchedApis.reduce((acc, api, idx) => {
      acc[matchedNames[idx]] = (componentToCompleted[api] || []).map((r:any) => ({
        name: r.name,
        icon: r.icon,
        with: basic.find((b:any) => b.apiName === r.with)?.name || r.with,
      }))
      return acc
    }, {} as Record<string, any[]>),
  }
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

    const compKws = ["最强阵容","阵容推荐","阵容排行","T0阵容","强势阵容","阵容","本版本"];
    const itemKws = ["装备排行","装备排名","装备强度","什么装备"];
    const isCompQuery = compKws.some(k => q.includes(k)) && q.length < 20;
    const isItemQuery = itemKws.some(k => q.includes(k)) && q.length < 20;
    
    let intent: any
    if (isCompQuery) {
      intent = { intent: "comp_tier", filter: null }
    } else if (isItemQuery) {
      intent = { intent: "item_tier" }
    } else {
      try { intent = await parseIntent(q) }
      catch { return Response.json({ type:"error",message:"AI 服务暂时不可用" }) }
    }

    // =========================================
    // item_tier: 装备排行（已有逻辑）
    // =========================================
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
      return Response.json({ type:"item_tier",data:{ items, patch:`Set 17.6 · Patch ${patch}` } })
    }

    // =========================================
    // comp_tier: 阵容推荐（新增）
    // =========================================
    if (intent.intent === "comp_tier") {
      try {
        const comps = await getCompTierDeepSeek(intent.filter || intent.filters?.filter)
        return Response.json({
          type: "comp_tier",
          data: {
            comps,
            filter: (intent.filter || intent.filters?.filter) || null,
            source: "DeepSeek AI · Set 17.6 版本环境",
          }
        })
      } catch (e: any) {
        return Response.json({ type:"error", message: `阵容查询失败: ${e.message}` })
      }
    }

    // =========================================
    // item_recipe: 装备合成（新增）
    // =========================================
    if (intent.intent === "item_recipe") {
      const items = intent.items
      if (!items || items.length < 2) {
        return Response.json({ type:"unknown", message:"请说出至少两件基础装备，例如「反曲弓和大剑能合什么？」" })
      }
      const recipeData = await getItemRecipe(items)
      if (!recipeData || recipeData.recipes.length === 0) {
        return Response.json({
          type: "item_recipe",
          data: {
            inputItems: items,
            recipes: [],
            message: "未找到可合成的装备组合，请确认装备名称是否正确。已知基础装备：暴风大剑、反曲之弓、无用大棒、女神之泪、锁子甲、负极斗篷、巨人腰带、金铲铲、拳套、金锅锅",
          }
        })
      }

      // 可选：查 MetaTFT 给每件成品装备附加胜率
      let itemsStatsMap: Map<string, {avg:number,top4:number,win:number}> = new Map()
      try {
        const itemsData = await getItemsData()
        for (const recipe of recipeData.recipes) {
          const found = itemsData.results.find((r:any) =>
            r.itemName === recipe.apiName ||
            r.itemName.includes(recipe.apiName.replace("TFT17_","").replace("TFT_Item_","").replace("TFT_Item_",""))
          )
          if (found) {
            const stats = calcStats(found.places)
            itemsStatsMap.set(recipe.name, stats)
          }
        }
      } catch (e) {}

      const enrichedRecipes = recipeData.recipes.map((r) => {
        const stats = itemsStatsMap.get(r.name)
        return {
          name: r.name,
          icon: r.icon,
          from: [r.compA, r.compB],
          ...(stats ? { avg: stats.avg, top4: stats.top4, win: stats.win } : {}),
        }
      })

      // 按 avg 排序
      enrichedRecipes.sort((a:any, b:any) => (a.avg || 99) - (b.avg || 99))

      return Response.json({
        type: "item_recipe",
        data: {
          inputItems: recipeData.inputItems,
          recipes: enrichedRecipes,
        }
      })
    }

    // =========================================
    // hero_build: 英雄配装（已有逻辑）
    // =========================================
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

    return Response.json({ type:"unknown", message:"试试说「金克斯装备」、「装备排行」、「什么阵容强」或「反曲弓和大剑能合什么」" })
  } catch (err: any) {
    return Response.json({ type:"error", message: err.message || "出了点问题" })
  }
}