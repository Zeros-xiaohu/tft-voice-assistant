/**
 * v2.1 吃鸡模式 — 工具注册与执行器
 *
 * 职责:
 *   1. 注册 4 个 Agent 工具（Function Call definitions）
 *   2. 并行执行 tool_calls
 *   3. 校验参数合法性
 *   4. 去重（相同工具+相同参数）
 *   5. 超时控制（3s / 工具）
 *
 * 参考: outputs/v2.1/architecture-v2.1-agent.md §5
 *       outputs/v2.1/prompt-v2.1.md §3
 *       outputs/v2.1/quality-plan.md §3.3
 */

import type { AgentTool, ToolResult, PlayStyle } from '@/types/agent'
import { BASIC_ITEMS } from '@/lib/alias-map'
import { searchItemRecipes } from './search-item-recipes'
import { searchHeroBuild } from './search-hero-build'
import { searchItemTier } from './search-item-tier'
import { searchComps } from './search-comps'

// ─── 工具注册（DeepSeek Function Call definitions） ───

/**
 * 4 个 Agent 工具的 Function Call 描述。
 * 直接喂给 DeepSeek Decision Engine 的 tools 参数。
 */
export const AGENT_TOOLS: AgentTool[] = [
  {
    name: 'search_comps',
    description: '根据装备、海克斯和用户偏好，搜索适配的云顶之弈阵容。当用户有装备但无明确阵容方向时调用。返回阵容名、核心英雄、关键装备、胜率数据。',
    parameters: {
      type: 'object',
      properties: {
        equipment: {
          type: 'array',
          items: { type: 'string' },
          description: '用户拥有的装备名称列表，如["反曲弓","暴风大剑"]',
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
    description: '根据散件装备列表，查询可合成的成品装备及其合成公式。当用户有散件装备（basic类型）时调用。如果装备全是成品，不应调用此工具。用于帮用户规划装备合成路线。',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'string' },
          description: '散件装备名称列表，如["反曲弓","暴风大剑"]',
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'search_hero_build',
    description: '查询指定英雄的推荐装备配装和胜率数据（avg排名、前四率、胜率、选取率）。用于用户已锁定主C英雄后查配装。hero参数必须用标准中文名（如"德莱文"而非"draven"）。',
    parameters: {
      type: 'object',
      properties: {
        hero: {
          type: 'string',
          description: '英雄标准中文名，如"德莱文","金克斯"',
        },
      },
      required: ['hero'],
    },
  },
  {
    name: 'search_item_tier',
    description: '查询当前版本装备强度排行（按avg排名排序的Top装备）。当用户明确问装备强度/排行时调用，如"什么装备强""哪个装备厉害"。',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
]

// ─── Tool Call 类型 ───

/** DeepSeek 返回的 tool_call */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

// ─── 校验 ───

/**
 * 校验并修复 tool call 参数。
 * 返回 null 表示应该跳过此工具。
 */
function validateAndFix(call: ToolCall): ToolCall | null {
  try {
    const args = JSON.parse(call.function.arguments)

    switch (call.function.name) {
      case 'search_item_recipes': {
        if (!args.items || !Array.isArray(args.items)) return null
        // 只保留散件，过滤成品装备
        const basicOnly = args.items.filter((i: string) => BASIC_ITEMS.includes(i))
        if (basicOnly.length === 0) return null
        call.function.arguments = JSON.stringify({ items: basicOnly })
        return call
      }
      case 'search_comps': {
        if (!args.equipment || !Array.isArray(args.equipment) || args.equipment.length === 0) return null
        return call
      }
      case 'search_hero_build': {
        if (!args.hero || typeof args.hero !== 'string') return null
        return call
      }
      case 'search_item_tier': {
        return call
      }
      default:
        return null
    }
  } catch {
    return null
  }
}

// ─── 去重 ───

/**
 * 去重：相同工具名 + 相同参数的去重。
 */
function deduplicateToolCalls(calls: ToolCall[]): ToolCall[] {
  const seen = new Set<string>()
  return calls.filter(call => {
    const key = call.function.name + ':' + call.function.arguments
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ─── 超时控制 ───

/** 单个工具超时 3 秒 */
const TOOL_TIMEOUT_MS = 3000

/**
 * 带超时的工具执行。
 */
async function executeWithTimeout(
  name: string,
  execute: () => Promise<ToolResult>
): Promise<ToolResult> {
  try {
    const result = await Promise.race([
      execute(),
      new Promise<ToolResult>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), TOOL_TIMEOUT_MS)
      ),
    ])
    return result
  } catch (err: any) {
    return {
      status: err.message === 'timeout' ? 'timeout' : 'error',
      data: null,
      error: err.message === 'timeout'
        ? '工具 ' + name + ' 超时（' + TOOL_TIMEOUT_MS + 'ms）'
        : '工具 ' + name + ' 执行失败: ' + err.message,
    }
  }
}

// ─── 调度器 ───

/**
 * 工具名称 → 执行函数的映射。
 */
const TOOL_EXECUTORS: Record<string, (args: any) => Promise<ToolResult>> = {
  search_comps: (args) => searchComps(args),
  search_item_recipes: (args) => searchItemRecipes(args),
  search_hero_build: (args) => searchHeroBuild(args),
  search_item_tier: () => searchItemTier(),
}

/**
 * 并行执行所有 tool_calls。
 *
 * 流程: 校验 → 去重 → 并行执行(各3s超时) → 收集结果
 *
 * @param toolCalls DeepSeek 返回的 tool_calls 数组
 * @returns 每个 tool_call 对应的执行结果
 */
export async function executeTools(toolCalls: ToolCall[]): Promise<ToolResult[]> {
  if (!toolCalls || toolCalls.length === 0) return []

  // 1. 校验 — 过滤无效调用
  const valid = toolCalls
    .map(validateAndFix)
    .filter((c): c is ToolCall => c !== null)

  // 2. 去重
  const unique = deduplicateToolCalls(valid)

  // 3. 并行执行
  const results = await Promise.all(
    unique.map(call => {
      const executor = TOOL_EXECUTORS[call.function.name]
      if (!executor) {
        return Promise.resolve({
          status: 'error' as const,
          data: null,
          error: '未知工具: ' + call.function.name,
        })
      }

      let args: any
      try {
        args = JSON.parse(call.function.arguments)
      } catch {
        return Promise.resolve({
          status: 'error' as const,
          data: null,
          error: '工具参数 JSON 解析失败',
        })
      }

      return executeWithTimeout(call.function.name, () => executor(args))
    })
  )

  return results
}

/**
 * 获取所有已注册工具的名称列表（调试用）。
 */
export function getToolNames(): string[] {
  return Object.keys(TOOL_EXECUTORS)
}