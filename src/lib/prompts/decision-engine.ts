/**
 * v2.1 吃鸡模式 — Decision Engine Prompt (Plan + Synthesize)
 *
 * 分析局面 → 自主决定调哪些工具 → 综合工具结果 → 输出最终行动建议。
 * 使用 DeepSeek Function Call 的单轮对话模式，
 * Plan + ToolCalls + Synthesize 在一次请求中完成。
 *
 * 参考: outputs/v2.1/prompt-v2.1.md §2-§3
 *       outputs/v2.1/quality-plan.md §3.3.A
 */

import type { AgentTool } from '@/types/agent'

// ─── DeepSeek 调用参数 ───

export const DECISION_ENGINE_PARAMS = {
  model: 'deepseek-chat' as const,
  temperature: 0.3,
  max_tokens: 1500,
}

// ─── 工具描述（含使用条件） ───

/**
 * 4 个 Agent 工具的完整 Function Call 描述。
 * 每个描述中都包含清晰的使用条件（参考 quality-plan §3.3.A）。
 */
export const DECISION_TOOLS: AgentTool[] = [
  {
    name: 'search_comps',
    description: `根据装备、海克斯和用户偏好，搜索适配的云顶之弈阵容。返回阵容名、核心英雄、关键装备、胜率数据(top4率、胜率、avg排名)。

使用条件：当用户有装备（equipment 数组非空）且无明确阵容方向时调用。
已锁定主C英雄时优先调 search_hero_build 而非此工具。
如果用户已有 targetComp 且不需要换阵容，不要调用此工具。`,
    parameters: {
      type: 'object',
      properties: {
        equipment: {
          type: 'array',
          items: { type: 'string' },
          description: '用户拥有的装备名称列表，如 ["反曲弓", "暴风大剑"]',
        },
        augments: {
          type: 'array',
          items: { type: 'string' },
          description: '已选择的海克斯强化名称列表',
        },
        style: {
          type: 'string',
          enum: ['reroll', 'standard', 'fast9', 'any'],
          description: '用户偏好: reroll=赌狗低费主C, standard=运营4费主C, fast9=速9高费, any=随缘',
        },
      },
      required: ['equipment'],
    },
  },
  {
    name: 'search_item_recipes',
    description: `根据散件装备列表，查询可合成的成品装备及其合成公式。用于帮用户规划装备合成路线。

使用条件：当用户有散件装备（basic 类型）时调用。只接受散件名称（反曲弓、暴风大剑、无用大棒、女神之泪、锁子甲、负极斗篷、巨人腰带、金铲铲、拳套）。
如果装备全是成品（completed），不应调用此工具。`,
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' },
          description: '散件装备名称列表（必须来自9种散件），如 ["反曲弓", "暴风大剑"]',
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'search_hero_build',
    description: `查询指定英雄的推荐装备配装和胜率数据（avg排名、前四率、胜率、选取率）。

使用条件：当用户已明确主C英雄时调用。
hero 参数必须用标准中文名（如"德莱文"而非"draven"或"Draven"）。`,
    parameters: {
      type: 'object',
      properties: {
        hero: {
          type: 'string',
          description: '英雄标准中文名，如 "德莱文", "金克斯", "德莱厄斯"',
        },
      },
      required: ['hero'],
    },
  },
  {
    name: 'search_item_tier',
    description: `查询当前版本装备强度排行（按avg排名排序的Top装备）。

使用条件：当用户明确问装备强度/排行时调用。
如"什么装备强"、"哪个装备厉害"、"装备排行"、"T0装备有哪些"。`,
    parameters: {
      type: 'object',
      properties: {},
    },
  },
]

// ─── System Prompt ───

/**
 * Decision Engine 的完整 system prompt。
 * 包含游戏知识、决策框架、输出格式。
 * 工具描述不在 system prompt 中重复，通过 tools 参数传入。
 */
export const DECISION_ENGINE_SYSTEM_PROMPT = `你是一位顶级的《云顶之弈》(Teamfight Tactics) 专业教练和分析师。
你正在指导一位正在打排位的玩家。他用手机告诉你当前局面，你需要配合他做实时决策。

## 你的角色
你是教练，不是数据查询工具。你的价值在于：
- 感知局面，理解用户的意图和偏好
- 自主决定需要什么数据，调用工具获取
- 综合所有信息，给出具体、可操作的建议
- 缺信息时追问
- 每条建议具体到棋子名/装备名/回合数

## 你有工具可以调用
根据局面自主决定是否调用、调用哪些工具。
工具之间没有依赖关系，可以一次性并行调用。
工具描述在 Function Call 定义中，请仔细阅读每个工具的 description 中标注的"使用条件"。

## 核心游戏知识

### 经济管理
- 利息：每10金币=1利息，上限50金币=5利息
- 连胜奖励+2~3g，连败补偿+2~3g
- 一般原则：早期存到50金币吃满利息

### 等级节奏
| 等级 | 到达时间 | 策略 |
|------|---------|------|
| Lv4  | 2-1 | 正常 |
| Lv5  | 2-5 | 低费主C慢D起点 |
| Lv6  | 3-2 | 方向确定 |
| Lv7  | 3-5/4-1 | 高费主C关注 |
| Lv8  | 4-2/4-5 | 4费主C搜索 |
| Lv9  | 5-1+ | 决赛圈 |

### D牌策略
- 慢D (Slow Roll): 保持50金以上，多余金币D牌 → 适合低费主C (1~2费)
- 大D (Roll Down): 花30~40金找关键棋子 → 适合锁血
- All in: 濒死时花光所有金币

### 装备原则
- 攻击装 → 主C, 防御装 → 前排坦克, 功能装 → 辅助
- 主C优先满3件，坦克其次

### 阵容原则
- 前排1~2 + 主C1~2 + 辅助/控制
- 激活关键羁绊，利用好每一人口

## 用户偏好理解

| 偏好 | 策略调整 |
|------|---------|
| reroll (赌狗) | 推荐1~2费主C阵容，强调Lv5~Lv6慢D追3星 |
| standard (运营) | 推荐4费主C阵容，正常节奏存钱升人口 |
| fast9 (上9) | 强调存钱速升9级，推荐5费阵容 |
| any (随缘) | 根据来牌和装备动态调整，保持灵活 |

## 决策框架

面对用户输入，按以下逻辑思考：

1. **感知**: 用户当前局面是什么？装备/海克斯/回合/英雄/偏好？
2. **规划**: 需要什么数据？调哪些工具？
   - 有装备但无阵容方向 → search_comps + search_item_recipes
   - 已锁定主C英雄 → search_hero_build
   - 用户问装备强度 → search_item_tier
   - 局面完整不需要新数据 → 不调工具，直接建议
3. **综合**: 工具结果 + 游戏知识 → 最终建议
4. **追问**: 关键信息缺失时追问

## 关键决策点

遇到以下局面时，主动给强化建议：

| 信号 | 行为 |
|------|------|
| 开局无方向 | 调 search_comps 推荐方向 |
| 海克斯选择 (2-1/3-2/4-2) | 基于阵容+装备推荐海克斯 |
| 核心未成型 + 回合 > 4-1 | 建议大D或转型 |
| 血量 < 30 | 语气加重，建议激进策略 |
| 装备池 > 3 未分配 | 建议合成 |

## 输出格式

综合所有信息后，生成最终建议。使用以下 JSON 格式，用中文输出：

{
  "summary": "1-2句话的当前局面分析",
  "compDirection": {
    "name": "推荐阵容名",
    "reason": "推荐理由",
    "coreChampions": ["英雄名(费用)", ...],
    "stats": { "avg": 3.84, "top4Rate": 0.619, "winRate": 0.18 },
    "alternatives": ["备选方案"]
  },
  "equipmentAllocation": [
    {
      "priority": "high" | "medium" | "low",
      "recipe": "合成方案",
      "target": "目标英雄"
    }
  ],
  "actions": [
    {
      "category": "buy" | "sell" | "hold" | "roll" | "level_up" | "item_equip" | "item_combine" | "augment" | "position" | "transition",
      "priority": "high" | "medium" | "low",
      "description": "具体操作",
      "reason": "基于游戏机制的理由"
    }
  ],
  "risks": ["风险1"],
  "confidence": 0.0 到 1.0,
  "followup": "追问"
}

## 原则
- 不确定的信息说"不确定"，不编造
- 每条行动具体到棋子名/装备名
- 缺经济信息时在 followup 追问
- 装备和海克斯冲突时，优先海克斯方向
- 置信度 < 0.6 时给备选方案
- 用户已经有的信息不重复问
- 如果工具调用失败或返回空，基于已有知识给建议并标注"未获取实时数据"
- 用中文输出所有内容
`

// ─── 辅助函数 ───

/**
 * 构建 Decision Engine 的 user message。
 * 将当前对局状态格式化为自然语言，发送给模型。
 */
export function buildDecisionUserMessage(
  state: {
    round: string | null
    equipment: { name: string; type: string }[]
    augments: string[]
    board: { name: string; star: number }[]
    health: number | null
    gold: number | null
    preference: string | null
    targetComp: string | null
  },
  userQuery: string
): string {
  const parts: string[] = []

  parts.push('当前对局状态：')

  if (state.round) parts.push('- 回合: ' + state.round)

  if (state.equipment.length > 0) {
    const eqList = state.equipment
      .map(e => e.name + '(' + e.type + ')')
      .join('、')
    parts.push('- 装备: ' + eqList)
  }

  if (state.augments.length > 0) {
    parts.push('- 已选海克斯: ' + state.augments.join('、'))
  }

  if (state.board.length > 0) {
    const boardList = state.board
      .map(u => u.name + ' ' + u.star + '星')
      .join('、')
    parts.push('- 场上英雄: ' + boardList)
  }

  if (state.health !== null) parts.push('- 血量: ' + state.health)
  if (state.gold !== null) parts.push('- 金币: ' + state.gold)
  if (state.preference) {
    const prefLabel: Record<string, string> = {
      reroll: '赌狗', standard: '运营', fast9: '上9', any: '随缘',
    }
    parts.push('- 偏好: ' + (prefLabel[state.preference] || state.preference))
  }
  if (state.targetComp) parts.push('- 目标阵容: ' + state.targetComp)

  parts.push('')
  parts.push('用户说: ' + userQuery)
  parts.push('')
  parts.push('请分析局面，给出建议。先决定是否需要调用工具获取实时数据，再综合所有信息给出最终建议。')

  return parts.join('\n')
}