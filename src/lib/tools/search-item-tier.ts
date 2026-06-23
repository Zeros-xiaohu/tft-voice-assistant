/**
 * v2.1 吃鸡模式 — search_item_tier 工具
 *
 * 查询当前版本装备强度排行。
 * 数据源: MetaTFT stat-api/items
 *
 * 复用对战模式 route.ts 中的逻辑。
 */

import type { ToolResult } from '@/types/agent'

// 复用装备名映射
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

// 缓存
let itemsCache: any = null
let itemsCacheTs = 0
const CACHE_TTL = 5 * 60 * 1000

export interface ItemTierResult {
  items: {
    name: string
    avg: number
    top4: number
    win: number
    total: number
  }[]
}

/**
 * search_item_tier 工具实现。
 */
export async function searchItemTier(): Promise<ToolResult> {
  try {
    const now = Date.now()
    if (!itemsCache || now - itemsCacheTs > CACHE_TTL) {
      const res = await fetch('https://api-hc.metatft.com/tft-stat-api/items')
      if (!res.ok) throw new Error('MetaTFT items API unavailable')
      itemsCache = await res.json()
      itemsCacheTs = now
    }

    const excludePatterns = [
      'Artifact', 'Emblem', '_Radiant', 'Consumable', 'Spatula',
      'FryingPan', 'ForceOfNature', 'ThiefsGloves', 'Tacticians',
      'BFSword', 'RecurveBow', 'GiantsBelt', 'ChainVest',
      'NeedlesslyLargeRod', 'NegatronCloak', 'TearOfTheGoddess',
      'SparringGloves',
    ]

    const items = (itemsCache.results || [])
      .filter((r: any) =>
        r.itemName.startsWith('TFT_Item_') &&
        !excludePatterns.some(p => r.itemName.includes(p))
      )
      .map((r: any) => {
        const total = r.places.reduce((a: number, b: number) => a + b, 0)
        if (total === 0) return null
        const avg = +(r.places.reduce((s: number, c: number, i: number) => s + c * (i + 1), 0) / total).toFixed(2)
        const top4 = +((r.places[0] + r.places[1] + r.places[2] + r.places[3]) / total * 100).toFixed(1)
        const win = +(r.places[0] / total * 100).toFixed(1)
        return { name: itemName(r.itemName), avg, top4, win, total }
      })
      .filter((i: any) => i && i.total > 1000)
      .sort((a: any, b: any) => a.avg - b.avg)
      .slice(0, 10)

    return {
      status: 'success',
      data: { items },
    }
  } catch (err: any) {
    return {
      status: 'error',
      data: null,
      error: '获取装备排行失败: ' + (err.message || 'unknown'),
    }
  }
}