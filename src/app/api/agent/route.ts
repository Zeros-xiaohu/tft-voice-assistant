/**
 * v2.1 吃鸡模式 — POST /api/agent
 *
 * 处理对局中的语音/文字输入，执行 Plan-then-Execute Agent 流程：
 *   Step 1: State Parser (DeepSeek, temp=0)
 *   Step 2: Session Merge
 *   Step 3: Decision Engine (DeepSeek, temp=0.3, function call)
 *   Step 4: Tool Executor (并行执行 tool_calls)
 *   Step 5: Synthesize (工具结果注入 → 模型继续输出)
 *   Step 6: Session Update
 *
 * 支持动作: new_game | update | end_game
 *
 * 参考: outputs/v2.1/architecture-v2.1-agent.md §3-§4
 *       outputs/v2.1/prompt-v2.1.md
 */

export const dynamic = 'force-dynamic'

import type { NextRequest } from 'next/server'
import type { AgentRequest, AgentResponse, GameState, ToolResult } from '@/types/agent'
import {
  createSession,
  getSession,
  updateState,
  addMessage,
  endSession,
  cleanExpired,
} from '@/lib/session-store'
import {
  STATE_PARSER_PARAMS,
  STATE_PARSER_SYSTEM_PROMPT,
  STATE_PARSER_JSON_SCHEMA,
  buildStateParserMessages,
} from '@/lib/prompts/state-parser'
import {
  DECISION_ENGINE_PARAMS,
  DECISION_TOOLS,
  DECISION_ENGINE_SYSTEM_PROMPT,
  buildDecisionUserMessage,
} from '@/lib/prompts/decision-engine'
import { executeTools, type ToolCall } from '@/lib/tools'
import { preprocessInput } from '@/lib/alias-map'

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''

/** 调用 DeepSeek State Parser */
/** State Parser 超时时间 (ms) */
const STATE_PARSER_TIMEOUT_MS = 5000

/**
 * 调用 DeepSeek State Parser，带超时和一次自动重试。
 */
async function callStateParser(query: string): Promise<Partial<GameState>> {
  const messages = buildStateParserMessages(query)

  let lastError: Error | null = null

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), STATE_PARSER_TIMEOUT_MS)

      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + DEEPSEEK_API_KEY,
        },
        body: JSON.stringify({
          ...STATE_PARSER_PARAMS,
          messages,
          response_format: STATE_PARSER_JSON_SCHEMA,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) throw new Error('State Parser API error: ' + res.status)
      const json = await res.json()
      const raw = json.choices[0].message.content
      // 清理可能的 markdown 代码块包裹
      const clean = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim()
      return JSON.parse(clean)
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err))
      // 如果是超时，重试一次；其他错误直接抛
      if (lastError.name === 'AbortError' || lastError.message.includes('abort')) {
        if (attempt === 0) continue // retry once
        throw new Error('State Parser timeout after retry')
      }
      throw lastError
    }
  }

  throw lastError || new Error('State Parser failed')
}

/** 调用 DeepSeek Decision Engine（非流式版本，用于含工具调用的场景） */
async function callDecisionEngine(
  state: GameState,
  userQuery: string
): Promise<{
  content: string | null;
  toolCalls: ToolCall[] | null;
}> {
  const userMessage = buildDecisionUserMessage(state, userQuery)

  const body: Record<string, unknown> = {
    ...DECISION_ENGINE_PARAMS,
    messages: [
      { role: 'system', content: DECISION_ENGINE_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    tools: DECISION_TOOLS.map(t => ({ type: 'function', function: t })),
    tool_choice: 'auto',
  }

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + DEEPSEEK_API_KEY,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error('Decision Engine API error: ' + res.status)
  const json = await res.json()
  const message = json.choices[0].message

  return {
    content: message.content || null,
    toolCalls: message.tool_calls || null,
  }
}

/**
 * 执行工具调用并让模型继续合成最终建议。
 * 将 tool_calls 的结果注入回对话，让模型在同一轮中输出最终建议。
 */
async function executeAndSynthesize(
  state: GameState,
  userQuery: string,
  toolCalls: ToolCall[]
): Promise<string> {
  // Step 4: 执行工具
  const toolResults = await executeTools(toolCalls)

  // 构建消息列表：system + user + assistant(tool_calls) + tool results
  const userMessage = buildDecisionUserMessage(state, userQuery)

  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: DECISION_ENGINE_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
    {
      role: 'assistant',
      tool_calls: toolCalls,
      content: null,
    },
  ]

  // 注入工具结果
  for (let i = 0; i < toolCalls.length; i++) {
    const result = toolResults[i]
    messages.push({
      role: 'tool',
      tool_call_id: toolCalls[i].id,
      content: JSON.stringify(result.data !== null ? result.data : { error: result.error }),
    })
  }

  // Step 5: 让模型综合输出
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + DEEPSEEK_API_KEY,
    },
    body: JSON.stringify({
      ...DECISION_ENGINE_PARAMS,
      messages,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) throw new Error('Synthesize API error: ' + res.status)
  const json = await res.json()
  const raw = json.choices[0].message.content || ''
  return raw.replace(/```json\n?/g, '').replace(/```/g, '').trim()
}

/**
 * 流式版本的 Decision Engine 调用（无工具时使用）。
 * 返回 ReadableStream，前端可以逐步展示 AI 思考和建议。
 */
async function streamDecisionEngine(
  state: GameState,
  userQuery: string
): Promise<Response> {
  const userMessage = buildDecisionUserMessage(state, userQuery)

  const body: Record<string, unknown> = {
    ...DECISION_ENGINE_PARAMS,
    messages: [
      { role: 'system', content: DECISION_ENGINE_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    tools: DECISION_TOOLS,
    tool_choice: 'auto',
    stream: true,
  }

  const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + DEEPSEEK_API_KEY,
    },
    body: JSON.stringify(body),
  })

  if (!dsRes.ok) throw new Error('Stream API error: ' + dsRes.status)

  // 将 DeepSeek 的 SSE 流透传给前端
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const reader = dsRes.body?.getReader()
      if (!reader) {
        controller.close()
        return
      }

      try {
        let buffer = ''
        let toolCallsAccumulated: ToolCall[] = []
        let streamStarted = false

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += new TextDecoder().decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta

              // 收集 tool_calls（增量）
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index || 0;
                  if (!toolCallsAccumulated[idx]) {
                    toolCallsAccumulated[idx] = { id: tc.id || '', type: 'function', function: { name: '', arguments: '' } }
                  }
                  if (tc.id) toolCallsAccumulated[idx].id = tc.id;
                  if (tc.function?.name) toolCallsAccumulated[idx].function.name = tc.function.name;
                  if (tc.function?.arguments) toolCallsAccumulated[idx].function.arguments += tc.function.arguments;
                }
                continue;
              }

              // 发送内容增量给前端
              if (delta?.content) {
                const chunk = JSON.stringify({ type: 'delta', content: delta.content })
                controller.enqueue(encoder.encode('data: ' + chunk + '\n\n'))
                streamStarted = true;
              }
            } catch {}
          }
        }

        // 如果模型返回了 tool_calls 但没 streaming content
        if (!streamStarted && toolCallsAccumulated.length > 0) {
          const tcMsg = JSON.stringify({ type: 'tool_calls', toolCalls: toolCallsAccumulated });
          controller.enqueue(encoder.encode('data: ' + tcMsg + '\n\n'))
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'unknown'
        controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'error', message: errMsg }) + '\n\n'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

// ─── POST /api/agent ───

export async function POST(req: NextRequest) {
  try {
    const body: AgentRequest = await req.json()
    const { query = '', mode = 'game', sessionId = '', action = 'update' } = body

    // 定期清理过期 session
    cleanExpired()

    // ─── action: new_game ───
    if (action === 'new_game') {
      const session = createSession()
      addMessage(session.sessionId, 'assistant', '新对局已开始。请告诉我你的开局装备和偏好（赌狗/运营/上9/随缘）。')
      return Response.json({
        status: 'success',
        sessionId: session.sessionId,
        gameState: session.state,
        advice: {
          summary: '新对局已开始',
          compDirection: null,
          equipmentAllocation: [],
          actions: [],
          risks: [],
          confidence: 1.0,
          followup: '请告诉我你的开局装备和偏好（赌狗/运营/上9/随缘）。',
        },
      })
    }

    // ─── action: end_game ───
    if (action === 'end_game') {
      const session = getSession(sessionId)
      if (!session) {
        return Response.json({ status: 'error', sessionId, message: '找不到对局记录' }, { status: 404 })
      }

      // 从 query 中提取排名
      const rankMatch = query.match(/第\s*(\d)\s*名?/);
      const rank = rankMatch ? parseInt(rankMatch[1]) : 0;
      if (!rank || rank < 1 || rank > 8) {
        return Response.json({
          status: 'error',
          sessionId,
          message: '请告诉我你第几名（1-8）',
        })
      }

      const ended = endSession(sessionId, rank)
      addMessage(sessionId, 'user', query)
      addMessage(sessionId, 'assistant', '对局结束，排名第' + rank + '名。已记录。')

      var followupMsg = rank <= 4 ? '不错！想复盘一下吗？' : '下次加油！'
      return Response.json({
        status: 'success',
        sessionId,
        gameState: ended.state,
        advice: {
          summary: '对局已结束，排名第' + rank + '名',
          compDirection: null,
          equipmentAllocation: [],
          actions: [],
          risks: [],
          confidence: 1.0,
          followup: followupMsg,
        },
      })
    }

    // ─── action: update (默认) ───

    // 校验 session
    const session = getSession(sessionId)
    if (!session) {
      return Response.json({
        status: 'error',
        sessionId,
        message: '没有进行中的对局，请先开始新对局。',
      })
    }

    // 记录用户消息
    addMessage(sessionId, 'user', query)

    // 前置别名映射
    const processedQuery = preprocessInput(query)

    // Step 1: State Parser
    let parsedState: Partial<GameState>
    try {
      parsedState = await callStateParser(processedQuery)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'unknown'
      addMessage(sessionId, 'assistant', '抱歉，我没听清楚。能再说一遍吗？')
      return Response.json({
        status: 'error',
        sessionId,
        gameState: session.state,
        message: '解析失败: ' + errMsg + '。请重新描述你的局面。',
      })
    }

    // 验证 State Parser 输出（确保合法字段）
    const safeParsed: Partial<GameState> = {
      round: parsedState.round || null,
      equipment: Array.isArray(parsedState.equipment) ? parsedState.equipment : [],
      augments: Array.isArray(parsedState.augments) ? parsedState.augments : [],
      board: Array.isArray(parsedState.board) ? parsedState.board : [],
      health: typeof parsedState.health === 'number' ? parsedState.health : null,
      gold: typeof parsedState.gold === 'number' ? parsedState.gold : null,
      preference: parsedState.preference || null,
      targetComp: parsedState.targetComp || null,
    }

    // Step 2: Session Merge
    const mergedSession = updateState(sessionId, safeParsed)
    const currentState = mergedSession.state

    // Step 3+4+5: Decision Engine → tool_calls → execute → synthesize
    let advice: Record<string, unknown> | null = null
    const toolsUsed: string[] = []

    try {
      const decision = await callDecisionEngine(currentState, processedQuery)

      // 模型返回了 tool_calls
      if (decision.toolCalls && decision.toolCalls.length > 0) {
        for (const tc of decision.toolCalls) {
          toolsUsed.push(tc.function.name)
        }

        // 执行工具 + 合成
        const finalOutput = await executeAndSynthesize(currentState, processedQuery, decision.toolCalls)

        try {
          advice = JSON.parse(finalOutput)
        } catch {
          advice = { summary: finalOutput || decision.content || '无法解析AI输出', compDirection: null, equipmentAllocation: [], actions: [], risks: [], confidence: 0.5, followup: '能再说详细一点吗？' }
        }

        // 记录工具调用到对话历史
        addMessage(sessionId, 'assistant', JSON.stringify({ toolsUsed, advice }))
      } else if (decision.content) {
        // 模型直接输出了建议（无需工具）
        try {
          advice = JSON.parse(decision.content.replace(/`{3}json\n?/g, '').replace(/`{3}/g, '').trim())
        } catch {
          advice = { summary: decision.content, compDirection: null, equipmentAllocation: [], actions: [], risks: [], confidence: 0.5, followup: '' }
        }
        addMessage(sessionId, 'assistant', decision.content)
      } else {
        advice = { summary: '我正在分析你的局面...', compDirection: null, equipmentAllocation: [], actions: [], risks: [], confidence: 0.3, followup: '能告诉我更多细节吗？' }
      }
    } catch (err: unknown) {
      // 工具调用失败，降级为AI知识推理
      const errMsg = err instanceof Error ? err.message : 'unknown'
      addMessage(sessionId, 'assistant', '部分数据未获取到实时数据（' + errMsg + '），基于已有知识给出建议。')
      advice = {
        summary: '无法获取实时数据: ' + errMsg,
        compDirection: null,
        equipmentAllocation: [],
        actions: [],
        risks: ['数据获取失败: ' + errMsg],
        confidence: 0.2,
        followup: '能重新说一下你的局面吗？',
      }
    }

    // Step 6: 返回结果
    return Response.json({
      status: 'success',
      sessionId,
      gameState: currentState,
      advice,
      toolsUsed,
    })

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'unknown'
    return Response.json({
      status: 'error',
      message: '服务器错误: ' + errMsg,
    }, { status: 500 })
  }
}