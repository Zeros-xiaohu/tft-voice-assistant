/**
 * v2.1 吃鸡模式 — Agent 类型定义
 *
 * 参考: outputs/v2.1/architecture-v2.1-agent.md §6
 *       outputs/v2.1/prd-v2.1-game-mode.md §4-§5
 */

// ─── 对局状态 ───

export interface GameState {
  /** 当前回合，如 "3-2"，未设置时为 null */
  round: string | null

  /** 装备池：包含散件和成品装备 */
  equipment: EquipmentEntry[]

  /** 已选择的海克斯强化列表 */
  augments: string[]

  /** 场上英雄列表 */
  board: BoardUnit[]

  /** 当前血量 1-100，未知时为 null */
  health: number | null

  /** 当前金币，未知时为 null */
  gold: number | null

  /** 用户偏好/游戏风格 */
  preference: PlayStyle | null

  /** 目标阵容名称，可从对战模式带入或 Agent 推荐 */
  targetComp: string | null
}

/** 装备条目：区分散件和成品 */
export interface EquipmentEntry {
  name: string
  type: 'basic' | 'completed'
}

/** 场上英雄 */
export interface BoardUnit {
  name: string
  star: number // 1 | 2 | 3
}

/** 用户偏好 */
export type PlayStyle = 'reroll' | 'standard' | 'fast9' | 'any'

// ─── Agent 建议 ───

/** Agent 返回的完整建议 */
export interface AgentAdvice {
  /** 1-2 句话的局面分析 */
  summary: string

  /** 推荐阵容方向 */
  compDirection: CompDirection | null

  /** 装备分配方案 */
  equipmentAllocation: EquipmentAllocation[]

  /** 当前行动建议（按优先级排列） */
  actions: ActionItem[]

  /** 风险提醒 */
  risks: string[]

  /** 置信度 0.0-1.0 */
  confidence: number

  /** Agent 追问 */
  followup: string
}

/** 阵容方向 */
export interface CompDirection {
  name: string
  reason: string
  coreChampions: string[]
  stats: CompStats
  alternatives: string[]
}

/** 阵容统计数据 */
export interface CompStats {
  /** 平均排名 */
  avg: number
  /** 前四率 */
  top4Rate: number
  /** 吃鸡率 */
  winRate: number
}

/** 装备分配条目 */
export interface EquipmentAllocation {
  priority: 'high' | 'medium' | 'low'
  recipe: string
  target: string | null
}

/** 行动建议条目 */
export interface ActionItem {
  /** 行动类别 */
  category: ActionCategory
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 具体操作描述 */
  description: string
  /** 基于游戏机制的理由 */
  reason: string
}

/** 行动类别 */
export type ActionCategory =
  | 'buy'          // 购买棋子
  | 'sell'         // 出售棋子
  | 'hold'         // 保持/存钱
  | 'roll'         // D牌刷新
  | 'level_up'     // 升人口
  | 'item_equip'   // 装备穿戴
  | 'item_combine' // 装备合成
  | 'augment'      // 海克斯选择
  | 'position'     // 站位调整
  | 'transition'   // 阵容转型

// ─── 对局会话 ───

/** 对话消息 */
export interface AgentMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: number
  /** 工具调用名称（仅 role === 'tool' 时） */
  toolName?: string
}

/** 对局结果 */
export interface GameResult {
  rank: number
  endedAt: number
}

/** 对局会话状态 */
export type SessionStatus = 'active' | 'finished'

/** 对局会话 */
export interface GameSession {
  sessionId: string
  createdAt: number
  updatedAt: number
  status: SessionStatus
  state: GameState
  history: AgentMessage[]
  result: GameResult | null
}

// ─── API 类型 ───

/** POST /api/agent 请求 */
export interface AgentRequest {
  query: string
  mode: 'game'
  sessionId: string
  action: AgentAction
}

/** Agent 操作类型 */
export type AgentAction = 'update' | 'new_game' | 'end_game'

/** POST /api/agent 响应 */
export interface AgentResponse {
  status: 'success' | 'error'
  sessionId: string
  gameState?: GameState
  advice?: AgentAdvice
  toolsUsed?: string[]
  message?: string
}

// ─── 工具定义 ───

/** Function Call 工具 */
export interface AgentTool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

/** 工具调用结果 */
export interface ToolResult {
  status: 'success' | 'timeout' | 'error'
  data: unknown
  error?: string
}
