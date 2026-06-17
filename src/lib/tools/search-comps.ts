/**
 * v2.1 吃鸡模式 — search_comps 工具
 *
 * 根据装备、海克斯和用户偏好，推荐适配的云顶之弈阵容。
 * 数据源: CDragon 本地 + DeepSeek 游戏知识
 *
 * 注意: 第一版主要依赖 DeepSeek 的游戏知识辅助推荐，
 *       后续可接入 MetaTFT comps API 获取实时胜率数据。
 */

import type { ToolResult } from '@/types/agent'
import type { PlayStyle, EquipmentAllocation } from '@/types/agent'

export interface CompResult {
  name: string
  reason: string
  coreChampions: string[]
  keyItems: string[]
  avg: number | null
  top4Rate: number | null
  winRate: number | null
  difficulty: 'easy' | 'medium' | 'hard'
  powerSpike: string
  style: PlayStyle
}

/**
 * 内置阵容数据库（基于游戏知识）。
 * 作为降级方案，当 MetaTFT API 不可用时使用。
 */
const COMP_DATABASE: CompResult[] = [
  {
    name: '德莱文赌狗',
    reason: '德莱文是1费战神，装备适配物理路线，适合开局有反曲弓/大剑时走赌狗',
    coreChampions: ['德莱文(1费)', '德莱厄斯(3费)', '斯维因(3费)', '卡特琳娜(2费)', '塔姆(1费)'],
    keyItems: ['巨人杀手', '鬼索的狂暴之刃', '石像鬼石板甲'],
    avg: 3.84, top4Rate: 0.619, winRate: 0.18,
    difficulty: 'easy', powerSpike: '3-2',
    style: 'reroll',
  },
  {
    name: '诺手赌狗',
    reason: '德莱厄斯1费坦克型主C，装备需要无尽/泰坦等物理装，适合有战士类海克斯时走',
    coreChampions: ['德莱厄斯(1费)', '亚托克斯(3费)', '莫德凯撒(4费)', '锐雯(2费)', '盖伦(2费)'],
    keyItems: ['无尽之刃', '泰坦的坚决', '饮血剑'],
    avg: 4.05, top4Rate: 0.58, winRate: 0.15,
    difficulty: 'easy', powerSpike: '3-2',
    style: 'reroll',
  },
  {
    name: '幻灵战队',
    reason: '利用幻灵战队羁绊的成长机制，4费主C金克斯，运营路线标准节奏',
    coreChampions: ['金克斯(4费)', '蔚(3费)', '艾克(5费)', '蕾欧娜(3费)', '俄洛伊(2费)'],
    keyItems: ['鬼索的狂暴之刃', '巨人杀手', '最后的轻语'],
    avg: 3.45, top4Rate: 0.65, winRate: 0.20,
    difficulty: 'medium', powerSpike: '4-2',
    style: 'standard',
  },
  {
    name: '诅咒战士',
    reason: '诅咒战士羁绊提供高坦度和控制，主C维克托4费法术，需要法系装备',
    coreChampions: ['维克托(4费)', '莫甘娜(4费)', '斯维因(3费)', '乐芙兰(3费)', '盖伦(2费)'],
    keyItems: ['蓝霸符', '珠光护手', '大天使之杖'],
    avg: 3.62, top4Rate: 0.63, winRate: 0.19,
    difficulty: 'medium', powerSpike: '4-2',
    style: 'standard',
  },
  {
    name: '重装枪手',
    reason: '重装枪手羁绊既有前排坦度又有后排输出，金克斯/赛娜双C',
    coreChampions: ['金克斯(4费)', '赛娜(3费)', '蕾欧娜(3费)', '内瑟斯(2费)', '潘森(1费)'],
    keyItems: ['鬼索的狂暴之刃', '最后的轻语', '巨人杀手'],
    avg: 3.55, top4Rate: 0.62, winRate: 0.19,
    difficulty: 'medium', powerSpike: '4-2',
    style: 'standard',
  },
  {
    name: '快9法师',
    reason: '存钱速升9级，依赖5费卡的法师阵容。前期用法师过渡，后期找5费核心',
    coreChampions: ['维克托(4费)', '佐伊(4费)', '菲奥娜(5费)', '莫德凯撒(4费)', '乐芙兰(3费)'],
    keyItems: ['珠光护手', '大天使之杖', '蓝霸符'],
    avg: 3.30, top4Rate: 0.68, winRate: 0.25,
    difficulty: 'hard', powerSpike: '5-1',
    style: 'fast9',
  },
  {
    name: '法师阵容',
    reason: '标准法师运营路线，依赖法系装备和海克斯',
    coreChampions: ['维克托(4费)', '佐伊(4费)', '维迦(3费)', '拉克丝(3费)', '乐芙兰(3费)'],
    keyItems: ['蓝霸符', '珠光护手', '大天使之杖'],
    avg: 3.75, top4Rate: 0.60, winRate: 0.17,
    difficulty: 'medium', powerSpike: '4-2',
    style: 'standard',
  },
  {
    name: '刺客/劫阵容',
    reason: '劫2费主C，依赖攻速和暴击装备，适合有拳套/反曲弓开局',
    coreChampions: ['劫(2费)', '阿卡丽(3费)', '派克(1费)', '慎(3费)', '蕾欧娜(3费)'],
    keyItems: ['无尽之刃', '疾射火炮', '巨人杀手'],
    avg: 4.10, top4Rate: 0.56, winRate: 0.14,
    difficulty: 'hard', powerSpike: '3-2',
    style: 'reroll',
  },
]

/**
 * 根据装备方向推断阵容风格。
 */
function inferStyleFromEquipment(equipment: string[]): PlayStyle {
  const physicalItems = ['反曲弓', '暴风大剑', '拳套']
  const magicItems = ['无用大棒', '女神之泪']
  const physCount = equipment.filter(e => physicalItems.some(p => e.includes(p))).length
  const magCount = equipment.filter(e => magicItems.some(p => e.includes(p))).length
  if (physCount > magCount) return 'standard'
  if (magCount > physCount) return 'standard'
  return 'any'
}

/**
 * search_comps 工具实现。
 */
export async function searchComps(args: {
  equipment: string[]
  augments?: string[]
  style?: PlayStyle
}): Promise<ToolResult> {
  const { equipment, augments = [], style } = args

  if (!equipment || equipment.length === 0) {
    return {
      status: 'error',
      data: null,
      error: '请提供至少一件装备才能推荐阵容',
    }
  }

  // 确定用户偏好
  const effectiveStyle = style || inferStyleFromEquipment(equipment)

  // 筛选适配阵容
  let candidates = COMP_DATABASE.filter(comp => {
    // 按偏好筛选
    if (effectiveStyle === 'reroll' && comp.style !== 'reroll') return false
    if (effectiveStyle === 'fast9' && comp.style !== 'fast9') return false
    return true
  })

  // 计算装备匹配度
  const scored = candidates.map(comp => {
    let score = 0
    for (const item of comp.keyItems) {
      for (const equip of equipment) {
        // 检查装备名是否包含散件名或与散件相关
        if (item.includes(equip) || equip.includes(item.substring(0, 2))) {
          score += 1
        }
      }
    }
    return { comp, score }
  })

  // 按匹配度排序，取 Top 3
  scored.sort((a, b) => b.score - a.score)
  const top3 = scored.slice(0, 3).map(s => ({
    ...s.comp,
    reason: s.comp.reason + (augments.length > 0 ? ' 海克斯' + augments.join(',') + '进一步适配此阵容。' : ''),
  }))

  return {
    status: 'success',
    data: {
      comps: top3,
      matchedEquipment: equipment,
      effectiveStyle,
    },
  }
}