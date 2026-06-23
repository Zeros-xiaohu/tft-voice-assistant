/**
 * v2.1 吃鸡模式 — search_hero_build 工具
 *
 * 查询指定英雄的推荐装备和胜率数据。
 * 数据源: MetaTFT API（实时）
 *
 * 复用对战模式 route.ts 中的：
 *   - unit_items_processed: 装备列表 + 出场顺序
 *   - explorer-api/items?unit_unique=: 英雄专属装备统计
 *   - explorer-api/total?unit_unique=: 英雄总体胜率
 */

import type { ToolResult } from '@/types/agent'

// MetaTFT 英雄 key 映射表（中文名 → API key）
const HERO_KEY_MAP: Record<string, string> = {
  '金克斯': 'Jinx',
  '亚索': 'Yasuo',
  '易大师': 'MasterYi',
  '亚托克斯': 'Aatrox',
  '莫德凯撒': 'Mordekaiser',
  '菲奥娜': 'Fiora',
  '锐雯': 'Riven',
  '烬': 'Jhin',
  '慎': 'Shen',
  '璐璐': 'Lulu',
  '劫': 'Zed',
  '薇古丝': 'Vex',
  '盖伦': 'Garen',
  '拉亚斯特': 'Rhaast',
  '维迦': 'Veigar',
  '阿狸': 'Ahri',
  '伊泽瑞尔': 'Ezreal',
  '波比': 'Poppy',
  '凯特琳': 'Caitlyn',
  '赛娜': 'Senna',
  '艾希': 'Ashe',
  '德莱厄斯': 'Darius',
  '卡莎': 'Kaisa',
  '永恩': 'Yone',
  '拉克丝': 'Lux',
  '格温': 'Gwen',
  '黛安娜': 'Diana',
  '阿卡丽': 'Akali',
  '莎弥拉': 'Samira',
  '内瑟斯': 'Nasus',
  '米利欧': 'Milio',
  '霞': 'Xayah',
  '纳尔': 'Gnar',
  '千珏': 'Kindred',
  '格雷福斯': 'Graves',
  '厄加特': 'Urgot',
  '菲兹': 'Fizz',
  '巴德': 'Bard',
  '佐伊': 'Zoe',
  '蕾欧娜': 'Leona',
  '奥恩': 'Ornn',
  '卑尔维斯': 'Belveth',
  '潘森': 'Pantheon',
  '泰隆': 'Talon',
  '加里奥': 'Galio',
  '拉莫斯': 'Rammus',
  '崔斯特': 'TwistedFate',
  '卡尔玛': 'Karma',
  '娑娜': 'Sona',
  '娜美': 'Nami',
  '贾克斯': 'Jax',
  '布里茨': 'Blitzcrank',
  '茂凯': 'Maokai',
  '努努': 'Nunu',
  '维克托': 'Viktor',
  '奥罗拉': 'Aurora',
  '布莱尔': 'Briar',
  '派克': 'Pyke',
  '雷克塞': 'RekSai',
  '厄运小姐': 'MissFortune',
  '丽桑卓': 'Lissandra',
  '古拉加斯': 'Gragas',
  '提莫': 'Teemo',
  '库奇': 'Corki',
  '俄洛伊': 'Illaoi',
  '科加斯': 'Chogath',
  '莫甘娜': 'Morgana',
  '乐芙兰': 'Leblanc',
  '塔姆': 'TahmKench',
  '李青': 'LeeSin',
}

// === 复用对战模式的装备名映射 ===
const ITEM_NAMES: Record<string, string> = {
  GuinsoosRageblade: '鬼索的狂暴之刃', InfinityEdge: '无尽之刃', SpearOfShojin: '朔极之矛',
  JeweledGauntlet: '珠光护手', Deathblade: '死亡之刃', BlueBuff: '蓝霸符',
  GiantSlayer: '巨人杀手', LastWhisper: '最后的轻语', Bloodthirster: '饮血剑',
  RabadonsDeathcap: '灭世者的死亡之帽', ArchangelsStaff: '大天使之杖',
  WarmogsArmor: '狂徒铠甲', GargoyleStoneplate: '石像鬼石板甲',
  DragonsClaw: '巨龙之爪', BrambleVest: '棘刺背心', Redemption: '救赎',
  Quicksilver: '水银', TitansResolve: '泰坦的坚决', GuardianAngel: '守护天使',
  SteraksGage: '斯特拉克的挑战护手', Morellonomicon: '莫雷洛秘典',
  HextechGunblade: '海克斯科技枪刃', IonicSpark: '离子火花',
  StatikkShiv: '斯塔缇克电刃', Crownguard: '冕卫',
  UnstableConcoction: '正义之手',
  RapidFireCannon: '疾射火炮', RunaansHurricane: '卢安娜的飓风', RedBuff: '红霸符',
  SpectralGauntlet: '薄暮法袍', NightHarvester: '坚定之心',
  FrozenHeart: '冰霜之心',
  SunfireCape: '日炎斗篷', EdgeOfNight: '夜之锋刃', ThiefsGloves: '窃贼手套',
}

function itemName(id: string): string {
  const key = id.replace('TFT_Item_', '').replace('TFT5_Item_', '').replace('_Radiant', '')
  return ITEM_NAMES[key] || key
}

type PlaceArray = [number, number, number, number, number, number, number, number]

function calcStats(places: PlaceArray) {
  const total = places.reduce((a: number, b: number) => a + b, 0)
  if (total === 0) return { avg: 0, top4: 0, win: 0, total: 0 }
  const avg = +(places.reduce((s, c, i) => s + c * (i + 1), 0) / total).toFixed(2)
  const top4 = +((places[0] + places[1] + places[2] + places[3]) / total * 100).toFixed(1)
  const win = +(places[0] / total * 100).toFixed(1)
  return { avg, top4, win, total }
}

export interface HeroBuildResult {
  heroName: string
  heroAvg: number
  heroWin: number
  heroTop4Rate: number
  heroCount: number
  items: {
    name: string
    avg: number
    top4: number
    win: number
    count: number
  }[]
}

/**
 * search_hero_build 工具实现。
 */
export async function searchHeroBuild(args: {
  hero: string
}): Promise<ToolResult> {
  const { hero } = args

  // 查找 MetaTFT hero key
  const heroKey = HERO_KEY_MAP[hero]
  if (!heroKey) {
    return {
      status: 'error',
      data: null,
      error: '未找到英雄 ' + hero + '，请使用标准中文名',
    }
  }

  try {
    // 1. 获取 unit_items_processed（装备列表 + 出场顺序）
    const unitRes = await fetch('https://api-hc.metatft.com/tft-comps-api/unit_items_processed')
    if (!unitRes.ok) throw new Error('MetaTFT unit_items_processed unavailable')
    const unitData = await unitRes.json()

    // 查找对应 unit key
    let unitKey = ''
    for (const [ukey] of Object.entries(unitData.units || {})) {
      if (ukey.toLowerCase().includes(heroKey.toLowerCase())) { unitKey = ukey; break }
    }
    if (!unitKey) {
      return { status: 'error', data: null, error: 'MetaTFT 中没有 ' + hero + ' 的数据' }
    }

    const unit = unitData.units[unitKey]
    if (!unit?.items) {
      return { status: 'error', data: null, error: hero + ' 暂无装备数据' }
    }

    const heroAvg = +unit.avg.toFixed(2)

    // 2. 获取英雄总体胜率
    let heroWin = 0, heroTop4Rate = 0, heroCount = unit.count || 0
    try {
      const totalUrl = 'https://api-hc.metatft.com/tft-explorer-api/total?formatnoarray=true&compact=true&queue=1100&patch=current&days=3&rank=CHALLENGER,GRANDMASTER,MASTER&unit_unique=' + unitKey + '-1'
      const totalRes = await fetch(totalUrl)
      if (totalRes.ok) {
        const totalJson = await totalRes.json()
        const td = totalJson.data?.[0]
        if (td?.placement_count) {
          const t = td.placement_count.reduce((a: number, b: number) => a + b, 0)
          heroWin = t > 0 ? +(td.placement_count[0] / t * 100).toFixed(1) : 0
          heroTop4Rate = t > 0 ? +((td.placement_count[0] + td.placement_count[1] + td.placement_count[2] + td.placement_count[3]) / t * 100).toFixed(1) : 0
          heroCount = t
        }
      }
    } catch { /* 降级：只用 unit_items_processed 的数据 */ }

    // 3. 获取英雄专属装备统计
    const expUrl = 'https://api-hc.metatft.com/tft-explorer-api/items?formatnoarray=true&compact=true&queue=1100&patch=current&days=3&rank=CHALLENGER,GRANDMASTER,MASTER&unit_unique=' + unitKey + '-1'
    const expRes = await fetch(expUrl)
    let heroItemMap = new Map<string, { avg: number; top4: number; win: number; total: number }>()
    if (expRes.ok) {
      const expJson = await expRes.json()
      for (const r of (expJson.data || [])) {
        if (!r.items || !r.items.startsWith('TFT_Item_')) continue
        if (r.items.includes('Artifact') || r.items.includes('Emblem') || r.items.includes('_Radiant') || r.items.includes('Consumable') || r.items.includes('Spatula') || r.items.includes('ThiefsGloves')) continue
        const stats = calcStats(r.placement_count)
        if (stats.total > 50) heroItemMap.set(r.items, stats)
      }
    }

    // 4. 按 unit_items_processed 顺序 + 匹配 explorer 统计数据
    const seen = new Set<string>()
    const allItems = unit.items
      .filter((i: any) => i.itemName.startsWith('TFT_Item_') && !i.itemName.includes('Artifact') && !i.itemName.includes('Emblem') && !i.itemName.includes('_Radiant') && !i.itemName.includes('Consumable') && !i.itemName.includes('Spatula') && !i.itemName.includes('ThiefsGloves'))
      .filter((i: any) => { const k = itemName(i.itemName); if (seen.has(k)) return false; seen.add(k); return true })
      .map((i: any) => {
        const name = itemName(i.itemName)
        const stats = heroItemMap.get(i.itemName)
        if (!stats) return { name, avg: 0, top4: 0, win: 0, count: 0 }
        return { name, avg: stats.avg, top4: stats.top4, win: stats.win, count: stats.total }
      })
      .filter((i: any) => i.count > 100)
      .slice(0, 5)

    return {
      status: 'success',
      data: {
        heroName: hero,
        heroAvg,
        heroWin,
        heroTop4Rate,
        heroCount,
        items: allItems,
      },
    }
  } catch (err: any) {
    return {
      status: 'error',
      data: null,
      error: '获取 ' + hero + ' 装备数据失败: ' + (err.message || 'unknown'),
    }
  }
}