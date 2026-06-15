export const dynamic = "force-dynamic"

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
}

function iname(id: string): string {
  const key = id.replace("TFT_Item_","").replace("TFT5_Item_","").replace("_Radiant","")
  return ITEM_NAMES[key] || key
}

function iicon(id: string): string {
  const key = id.replace("TFT_Item_","").replace("TFT5_Item_","").replace("TFT17_Item_","").replace("_Radiant","").toLowerCase()
  return `https://cdn.metatft.com/file/metatft/items/${key}.png`
}

let unitCache: any = null; let unitCacheTs = 0
let itemsCache: any = null; let itemsCacheTs = 0

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
  Lissandra:"丽桑卓",Kennen:"凯南",Gragas:"古拉加斯",Teemo:"提莫",
  Corki:"库奇",Illaoi:"俄洛伊",Chogath:"科加斯",Morgana:"莫甘娜",
  Leblanc:"乐芙兰",Volibear:"沃利贝尔",Zac:"扎克",JarvanIV:"嘉文四世",
  Swain:"斯维因",Syndra:"辛德拉",Braum:"布隆",LeeSin:"李青",
  Seraphine:"萨勒芬妮",Zyra:"婕拉",Ryze:"瑞兹",Malphite:"墨菲特",
  XinZhao:"赵信",Vi:"蔚",Smolder:"斯莫德",KogMaw:"克格莫",
  Rell:"芮尔",Rakan:"洛",Lucian:"卢锡安",Kayle:"凯尔",
  Jayce:"杰斯",Kalista:"卡莉丝塔",Gangplank:"普朗克",
  Naafiri:"纳亚菲利",Udyr:"乌迪尔",Sett:"瑟提",Katarina:"卡特琳娜",
  Ksante:"奎桑提",Renekton:"雷克顿",Ziggs:"吉格斯",Sivir:"希维尔",
  Yuumi:"悠米",TahmKench:"塔姆",Sejuani:"瑟庄妮",
  Varus:"韦鲁斯",Draven:"德莱文",Ekko:"艾克",Kobuko:"可布可",
  IvernMinion:"艾翁",Wukong:"孙悟空",Malzahar:"玛尔扎哈",
  Zeri:"泽丽",Sylas:"塞拉斯",Nidalee:"奈德丽",Warwick:"沃里克",
  Ambessa:"安蓓萨",Mel:"梅尔",AurelionSol:"奥瑞利安·索尔",
}

const HERO_ALIAS: Record<string,string> = {
  "剑圣":"MasterYi","易":"MasterYi","易大师":"MasterYi",
  "亚索":"Yasuo","剑豪":"Yasuo","yasuo":"Yasuo",
  "金克斯":"Jinx","金克丝":"Jinx","jinx":"Jinx",
  "瞎子":"LeeSin","盲僧":"LeeSin","李青":"LeeSin",
  "亚托克斯":"Aatrox","aatrox":"Aatrox",
  "烬":"Jhin","jhin":"Jhin",
  "劫":"Zed","zed":"Zed",
  "薇古丝":"Vex","vex":"Vex",
  "莫德凯撒":"Mordekaiser","铁男":"Mordekaiser",
  "菲奥娜":"Fiora","剑姬":"Fiora","fiora":"Fiora",
  "锐雯":"Riven","riven":"Riven",
  "慎":"Shen","shen":"Shen",
  "盖伦":"Garen","garen":"Garen",
  "凯隐":"Rhaast","拉亚斯特":"Rhaast","红凯":"Rhaast",
  "璐璐":"Lulu","lulu":"Lulu",
  "小法":"Veigar","维迦":"Veigar",
  "阿狸":"Ahri","ahri":"Ahri",
  "伊泽瑞尔":"Ezreal","ez":"Ezreal",
  "波比":"Poppy","poppy":"Poppy",
  "凯特琳":"Caitlyn","女警":"Caitlyn",
  "赛娜":"Senna","senna":"Senna",
  "艾希":"Ashe","寒冰":"Ashe",
  "诺手":"Darius","德莱厄斯":"Darius",
  "卡莎":"Kaisa","kaisa":"Kaisa",
  "永恩":"Yone","yone":"Yone",
  "拉克丝":"Lux","lux":"Lux",
  "格温":"Gwen","gwen":"Gwen",
  "金铲铲":"Jinx","云顶":"Jinx",
}

export async function POST(req: Request) {
  try {
    const { query } = await req.json()
    const q = (query||"").toLowerCase().trim()
    if (!q) return Response.json({ type:"error",message:"请描述你想查的内容" })

    // 装备排行
    if (/装备排行|装备排名|item.*tier/.test(q)) {
      if (!itemsCache || Date.now() - itemsCacheTs > 300_000) {
        const res = await fetch("https://api-hc.metatft.com/tft-stat-api/items")
        itemsCache = await res.json(); itemsCacheTs = Date.now()
      }
      const items = itemsCache.results
        .filter((r:any) => r.itemName.startsWith("TFT_Item_") && !r.itemName.includes("Artifact") && !r.itemName.includes("Emblem") && !r.itemName.includes("_Radiant") && !r.itemName.includes("Consumable") && !r.itemName.includes("Spatula") && !r.itemName.includes("FryingPan") && !r.itemName.includes("ForceOfNature") && !r.itemName.includes("ThiefsGloves") && !r.itemName.includes("Tacticians") && !r.itemName.includes("BFSword") && !r.itemName.includes("RecurveBow") && !r.itemName.includes("GiantsBelt") && !r.itemName.includes("ChainVest") && !r.itemName.includes("NeedlesslyLargeRod") && !r.itemName.includes("NegatronCloak") && !r.itemName.includes("TearOfTheGoddess") && !r.itemName.includes("SparringGloves"))
        .map((r:any) => {
          const total = r.places.reduce((a:number,b:number)=>a+b,0)
          const score = +(r.places.reduce((s:number,c:number,i:number)=>s+c*(8-i),0)/total).toFixed(2)
          const name = iname(r.itemName)
          return { name, score, total, icon: iicon(r.itemName) }
        })
        .filter((i:any) => i.name !== i.icon && i.total > 1000)
        .sort((a:any,b:any)=>b.score-a.score)
        .slice(0,12)
      const patch = itemsCache.games?.[0]?.patch || "17.5"
      return Response.json({ type:"item_tier",data:{items,patch:`Set 17 · Patch ${patch}`} })
    }

    // 英雄配装
    if (!unitCache || Date.now() - unitCacheTs > 300_000) {
      const res = await fetch("https://api-hc.metatft.com/tft-comps-api/unit_items_processed")
      unitCache = await res.json(); unitCacheTs = Date.now()
    }

    // 找英雄
    let unitKey = ""
    for (const [alias, name] of Object.entries(HERO_ALIAS)) {
      if (q.includes(alias.toLowerCase())) {
        for (const [ukey] of Object.entries(unitCache.units)) {
          if (ukey.toLowerCase().includes(name.toLowerCase())) { unitKey = ukey; break }
        }
        if (unitKey) break
      }
    }

    if (!unitKey) {
      return Response.json({ type:"unknown", message:'没找到对应英雄，试试说「金克斯装备」或「亚索装备」' })
    }

    const unit = unitCache.units[unitKey]
    if (!unit?.items) return Response.json({ type:"unknown", message:"暂无该英雄的装备数据" })

    const seen = new Set<string>()
    const topItems = unit.items
      .filter((i:any) => i.itemName.startsWith("TFT_Item_") && !i.itemName.includes("Artifact") && !i.itemName.includes("Emblem") && !i.itemName.includes("_Radiant") && !i.itemName.includes("Consumable") && !i.itemName.includes("Spatula") && !i.itemName.includes("ForceOfNature") && !i.itemName.includes("ThiefsGloves"))
      .filter((i:any) => { const k = iname(i.itemName); if (seen.has(k)) return false; seen.add(k); return true })
      .slice(0,5)
      .map((i:any) => ({ name: iname(i.itemName), icon: iicon(i.itemName) }))

    const heroKey = unitKey.replace("TFT17_","").replace("TFT_","")
    const displayName = HERO_DISPLAY[heroKey] || heroKey

    return Response.json({
      type:"hero_build",
      data:{
        heroName: displayName,
        items: topItems,
        avg: unit.avg.toFixed(1),
        pick: (unit.pick * 100).toFixed(1),
        tip: `登场率 ${(unit.pick*100).toFixed(1)}% · 平均排名 ${unit.avg.toFixed(1)}`,
      }
    })
  } catch (err: any) {
    return Response.json({ type:"error", message: err.message || "出了点问题" })
  }
}
