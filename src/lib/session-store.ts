/**
 * v2.1 吃鸡模式 — Session Store
 *
 * 管理对局生命周期状态。实现 Plan-then-Execute Agent 的「记忆」层。
 *
 * 存储方案: 内存 Map（第一版）
 * 后续升级: Upstash Redis
 *
 * 参考: outputs/v2.1/architecture-v2.1-agent.md §6
 *       outputs/v2.1/prd-v2.1-game-mode.md §4
 */

import type {
  GameSession,
  GameState,
  AgentMessage,
  GameResult,
  PlayStyle,
} from '@/types/agent'

// ─── 内部存储 ───

/** 内存会话存储 */
const sessions = new Map<string, GameSession>()

/** 会话过期时间 (ms): 30 分钟 */
const SESSION_TTL_MS = 30 * 60 * 1000

/** 已完成会话保留时间 (ms): 1 小时 */
const FINISHED_TTL_MS = 60 * 60 * 1000

// ─── 工具函数 ───

/** 生成唯一 session ID */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return 'tft-ses-' + timestamp + '-' + random
}

/** 创建空的初始状态 */
function createEmptyState(): GameState {
  return {
    round: null,
    equipment: [],
    augments: [],
    board: [],
    health: null,
    gold: null,
    preference: null,
    targetComp: null,
  }
}

/** 深度合并状态：新值覆盖旧值，新值为 null/空时保留旧值 */
function mergeState(oldState: GameState, newState: Partial<GameState>): GameState {
  return {
    round: newState.round !== undefined ? newState.round : oldState.round,
    equipment:
      newState.equipment !== undefined && newState.equipment.length > 0
        ? newState.equipment
        : oldState.equipment,
    augments:
      newState.augments !== undefined && newState.augments.length > 0
        ? newState.augments
        : oldState.augments,
    board:
      newState.board !== undefined && newState.board.length > 0
        ? newState.board
        : oldState.board,
    health: newState.health !== undefined ? newState.health : oldState.health,
    gold: newState.gold !== undefined ? newState.gold : oldState.gold,
    preference: newState.preference !== undefined ? newState.preference : oldState.preference,
    targetComp: newState.targetComp !== undefined ? newState.targetComp : oldState.targetComp,
  }
}

// ─── 公开 API ───

/**
 * 创建新对局会话。
 *
 * @param initialPreference 可选的初始偏好
 * @param initialTargetComp 可选的目标阵容（从对战模式带入）
 * @returns 新创建的 GameSession
 */
export function createSession(
  initialPreference?: PlayStyle,
  initialTargetComp?: string
): GameSession {
  const sessionId = generateSessionId()
  const now = Date.now()
  const state = createEmptyState()

  if (initialPreference) state.preference = initialPreference
  if (initialTargetComp) state.targetComp = initialTargetComp

  const session: GameSession = {
    sessionId,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    state,
    history: [],
    result: null,
  }

  sessions.set(sessionId, session)
  return { ...session, state: { ...session.state }, history: [...session.history] }
}

/**
 * 获取会话。
 *
 * @param sessionId 会话 ID
 * @returns GameSession 或 null（不存在/已过期）
 */
export function getSession(sessionId: string): GameSession | null {
  const session = sessions.get(sessionId)
  if (!session) return null

  const now = Date.now()

  // 检查是否过期
  if (session.status === 'active' && now - session.updatedAt > SESSION_TTL_MS) {
    sessions.delete(sessionId)
    return null
  }
  if (session.status === 'finished' && now - session.updatedAt > FINISHED_TTL_MS) {
    sessions.delete(sessionId)
    return null
  }

  return { ...session, state: { ...session.state }, history: [...session.history] }
}

/**
 * 更新对局状态。合并旧状态和新状态：
 * - 用户说了的字段覆盖旧值
 * - 用户没说的字段保留旧值（newState 中为 null/undefined 的跳过）
 * - preference 一旦设定不主动改，除非用户显式覆盖
 *
 * @param sessionId 会话 ID
 * @param newState 从 State Parser 获得的新状态片段
 * @returns 更新后的完整 GameSession
 * @throws 如果 session 不存在
 */
export function updateState(
  sessionId: string,
  newState: Partial<GameState>
): GameSession {
  const session = sessions.get(sessionId)
  if (!session) {
    throw new Error('Session not found: ' + sessionId)
  }

  const oldState = session.state

  const preference =
    newState.preference !== undefined && newState.preference !== null
      ? newState.preference
      : oldState.preference

  const merged = mergeState(oldState, {
    ...newState,
    preference,
  })

  session.state = merged
  session.updatedAt = Date.now()

  return { ...session, state: { ...session.state }, history: [...session.history] }
}

/**
 * 追加对话消息到会话历史。
 *
 * @param sessionId 会话 ID
 * @param role 消息角色: 'user' | 'assistant' | 'tool'
 * @param content 消息内容
 * @param toolName 工具名称（仅 role === 'tool' 时）
 * @throws 如果 session 不存在
 */
export function addMessage(
  sessionId: string,
  role: AgentMessage['role'],
  content: string,
  toolName?: string
): AgentMessage {
  const session = sessions.get(sessionId)
  if (!session) {
    throw new Error('Session not found: ' + sessionId)
  }

  const message: AgentMessage = {
    role,
    content,
    timestamp: Date.now(),
    ...(toolName ? { toolName } : {}),
  }

  session.history.push(message)
  session.updatedAt = Date.now()

  return message
}

/**
 * 结束对局，记录排名。
 *
 * @param sessionId 会话 ID
 * @param rank 最终排名 1-8
 * @returns 更新后的 GameSession
 * @throws 如果 session 不存在或已经结束
 */
export function endSession(sessionId: string, rank: number): GameSession {
  const session = sessions.get(sessionId)
  if (!session) {
    throw new Error('Session not found: ' + sessionId)
  }
  if (session.status === 'finished') {
    throw new Error('Session already finished: ' + sessionId)
  }

  const now = Date.now()
  session.status = 'finished'
  session.updatedAt = now
  session.result = {
    rank,
    endedAt: now,
  }

  return { ...session, state: { ...session.state }, history: [...session.history] }
}

/**
 * 清理过期会话。
 *
 * - active 会话超过 30 分钟未更新 \u2192 \u5220除
 * - finished 会话超过 1 小时 \u2192 \u5220除
 *
 * @returns 清理的会话数量
 */
export function cleanExpired(): number {
  const now = Date.now()
  let cleaned = 0

  for (const [id, session] of sessions) {
    if (session.status === 'active' && now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(id)
      cleaned++
    } else if (session.status === 'finished' && now - session.updatedAt > FINISHED_TTL_MS) {
      sessions.delete(id)
      cleaned++
    }
  }

  return cleaned
}

/**
 * 获取所有活跃会话数（用于调试/监控）。
 */
export function getActiveCount(): number {
  let count = 0
  for (const session of sessions.values()) {
    if (session.status === 'active') count++
  }
  return count
}

/**
 * 删除指定会话（用于测试/手动清理）。
 */
export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId)
}

/**
 * 获取所有会话（用于调试）。
 */
export function getAllSessions(): GameSession[] {
  return Array.from(sessions.values()).map(s => ({
    ...s,
    state: { ...s.state },
    history: [...s.history],
  }))
}