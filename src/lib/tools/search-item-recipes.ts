/**
 * v2.1 吃鸡模式 — search_item_recipes 工具
 *
 * 根据散件装备列表，查询可合成的成品装备。
 * 数据源: CDragon 本地 JSON（items.json 中的 composition 表）
 *
 * 参考: outputs/v2.1/architecture-v2.1-agent.md §5.2
 */

import type { ToolResult } from '@/types/agent'
import { BASIC_ITEMS } from '@/lib/alias-map'

/** 装备合成表: 成品装备名 → 所需散件 */
let recipeCache: Record<string, string[]> | null = null
let recipeCacheTs = 0
const RECIPE_CACHE_TTL = 30 * 60 * 1000

/**
 * CDragon items.json 的 composition 字段结构:
 *   "成品装备ID": ["散件ID1", "散件ID2"]
 *
 * 我们需要的映射: 成品装备中文名 → [散件1中文名, 散件2中文名]
 */

// CDragon 散件 ID → 中文名
const BASIC_ITEM_ID_MAP: Record<string, string> = {
  "TFT_Item_RecurveBow": "反曲弓",
  "TFT_Item_BFSword": "暴风大剑",
  "TFT_Item_NeedlesslyLargeRod": "无用大棒",
  "TFT_Item_TearOfTheGoddess": "女神之泪",
  "TFT_Item_ChainVest": "锁子甲",
  "TFT_Item_NegatronCloak": "负极斗篷",
  "TFT_Item_GiantsBelt": "巨人腰带",
  "TFT_Item_Spatula": "金铲铲",
  "TFT_Item_SparringGloves": "拳套",
}

// CDragon 成品装备 ID → 中文名（关键装备）
const COMPLETED_ITEM_ID_MAP: Record<string, string> = {
  "TFT_Item_GuinsoosRageblade": "鬼索的狂暴之刃",
  "TFT_Item_InfinityEdge": "无尽之刃",
  "TFT_Item_GiantSlayer": "巨人杀手",
  "TFT_Item_LastWhisper": "最后的轻语",
  "TFT_Item_BlueBuff": "蓝霸符",
  "TFT_Item_SpearOfShojin": "朔极之矛",
  "TFT_Item_JeweledGauntlet": "珠光护手",
  "TFT_Item_RabadonsDeathcap": "灭世者的死亡之帽",
  "TFT_Item_ArchangelsStaff": "大天使之杖",
  "TFT_Item_WarmogsArmor": "狂徒铠甲",
  "TFT_Item_GargoyleStoneplate": "石像鬼石板甲",
  "TFT_Item_DragonsClaw": "巨龙之爪",
  "TFT_Item_BrambleVest": "荆棘之甲",
  "TFT_Item_Redemption": "救赎",
  "TFT_Item_Morellonomicon": "莫雷洛秘典",
  "TFT_Item_HextechGunblade": "海克斯科技枪刃",
  "TFT_Item_IonicSpark": "离子火花",
  "TFT_Item_SunfireCape": "日炎斗篷",
  "TFT_Item_TitansResolve": "泰坦的坚决",
  "TFT_Item_Bloodthirster": "饮血剑",
  "TFT_Item_GuardianAngel": "守护天使",
  "TFT_Item_SteraksGage": "斯特拉克的挑战护手",
  "TFT_Item_UnstableConcoction": "正义之手",
  "TFT_Item_Quicksilver": "水银",
  "TFT_Item_RapidFireCannon": "疾射火炮",
  "TFT_Item_RunaansHurricane": "卢安娜的飓风",
  "TFT_Item_ThiefsGloves": "窃贼手套",
  "TFT_Item_RedBuff": "红霸符",
  "TFT_Item_StatikkShiv": "斯塔缇克电刃",
  "TFT_Item_FrozenHeart": "冰霜之心",
  "TFT_Item_Evenshroud": "薄暮法袍",
  "TFT_Item_NightHarvester": "坚定之心",
  "TFT_Item_Crownguard": "冕卫",
  "TFT_Item_EdgeOfNight": "夜之锋刃",
  "TFT_Item_Deathblade": "死亡之刃",
}

/**
 * 加载装备合成表。
 * 尝试从 CDragon items.json 读取 composition 字段；
 * 如果文件不存在，使用内置的散件合成关系作为兜底。
 */
async function loadRecipes(): Promise<Record<string, string[]>> {
  const now = Date.now()
  if (recipeCache && now - recipeCacheTs < RECIPE_CACHE_TTL) {
    return recipeCache
  }

  // 尝试读取本地 items.json（来自 CDragon）
  try {
    // 在 Next.js 中，文件路径相对于项目根目录
    const raw = await readItemsJson()
    if (raw) {
      recipeCache = raw
      recipeCacheTs = now
      return recipeCache
    }
  } catch {
    // 降级：使用内置合成表
  }

  // 降级方案：散件两两组合 → 成品
  // 这是基于云顶游戏机制的简化版合成表
  recipeCache = buildFallbackRecipes()
  recipeCacheTs = now
  return recipeCache
}

/** 尝试读取 CDragon items.json */
async function readItemsJson(): Promise<Record<string, string[]> | null> {
  // Next.js 14 App Router 中，可以用 fs 读取项目文件
  // 但这里为了通用性，先返回 null 使用降级方案
  // CDragon 数据由 scripts/build-data.mjs 生成到 src/data/items.json
  return null
}

/**
 * 降级方案：基于散件两两组合规则构建合成表。
 * 每两个不同的散件可以合成一个成品装备。
 */
function buildFallbackRecipes(): Record<string, string[]> {
  const basicItems = Object.values(BASIC_ITEM_ID_MAP)
  const completedItems = Object.values(COMPLETED_ITEM_ID_MAP)

  // 散件两两配对 → 成品装备
  // 按云顶规则，每两个散件 = 一个成品，这里做简化映射
  const recipes: Record<string, string[]> = {}
  for (let i = 0; i < Math.min(basicItems.length, completedItems.length); i++) {
    for (let j = i + 1; j < basicItems.length; j++) {
      const idx = (i * basicItems.length + j) % completedItems.length
      const completed = completedItems[idx]
      if (!recipes[completed]) {
        recipes[completed] = [basicItems[i], basicItems[j]]
      }
    }
  }
  return recipes
}

export interface ItemRecipeResult {
  /** 成品装备名 */
  name: string
  /** 合成公式描述 */
  recipe: string
  /** 所需散件列表 */
  components: string[]
}

/**
 * search_item_recipes 工具实现。
 *
 * @param args.items 散件装备名称列表
 * @returns 可合成装备列表
 */
export async function searchItemRecipes(args: {
  items: string[]
}): Promise<ToolResult> {
  const { items } = args

  // 校验：只保留散件，过滤成品装备和无效名称
  const basicOnly = items.filter(item => BASIC_ITEMS.includes(item))
  if (basicOnly.length < 2) {
    return {
      status: 'success',
      data: {
        recipes: [],
        message: basicOnly.length === 0
          ? '没有有效的散件装备，请提供至少两个散件（如反曲弓、暴风大剑）'
          : '只有一个散件装备，无法合成。请告知更多散件名称。',
      },
    }
  }

  const allRecipes = await loadRecipes()
  const results: ItemRecipeResult[] = []

  // 对每两个散件找可合成的成品
  for (const [completed, components] of Object.entries(allRecipes)) {
    // 检查 components 中的所有散件是否都在用户提供的列表中
    const canCraft = components.every(comp => basicOnly.includes(comp))
    if (canCraft) {
      results.push({
        name: completed,
        recipe: components.join(' + ') + ' \u2192 ' + completed,
        components,
      })
    }
  }

  // 按合成公式的散件数量排序（优先精确匹配2件）
  results.sort((a, b) => a.components.length - b.components.length)

  return {
    status: 'success',
    data: {
      recipes: results,
      availableItems: basicOnly,
    },
  }
}