 # TFT Voice Assistant — 架构文档 v2.1 吃鸡模式

 > 日期: 2026-06-16 · 状态: 方案定稿 · 依赖: v2.0 对战模式已上线

 ---

 ## 目录

 1. [Agent 范式](#1-agent-范式)
 2. [整体架构](#2-整体架构)
 3. [API 路由设计](#3-api-路由设计)
 4. [核心流程](#4-核心流程)
 5. [工具设计](#5-工具设计)
 6. [Session Store](#6-session-store)
 7. [前端组件树](#7-前端组件树)
 8. [文件结构](#8-文件结构)
 9. [性能估算](#9-性能估算)
 10. [部署注意](#10-部署注意)

 ---

 ## 1. Agent 范式

 ### 1.1 Paradigm: Plan-then-Execute

 ```
   用户输入
      │
      ▼
 ┌──────────┐
 │ 感知      │  State Parser
 │ Perceive  │  自然语言 → 结构化状态
 └────┬─────┘
      │
      ▼
 ┌──────────┐
 │ 规划      │  Decision Engine (Plan)
 │ Plan      │  分析局面 → 决定调哪些工具
 └────┬─────┘
      │ tool_calls: [search_comps, search_item_recipes]
      ▼
 ┌──────────┐
 │ 执行      │  Tool Executor
 │ Execute   │  并行调工具 → 收集结果
 └────┬─────┘
      │
      ▼
 ┌──────────┐
 │ 合成      │  Decision Engine (Synthesize)
 │ Synthesize│  工具结果 + 游戏知识 → 最终建议
 └────┬─────┘
      │
      ▼
 ┌──────────┐
 │ 记忆      │  Session Store
 │ Memorize  │  更新对局状态
 └──────────┘
 ```

 ### 1.2 为什么是 Plan-then-Execute

 | 对比 | ReAct | Plan-then-Execute |
 |------|-------|-------------------|
 | 模式 | 思考→行动→观察→再思考（串行） | 先规划所有工具→一次性并行执行→综合 |
 | 延迟 | 每个工具等上一个结束 | 所有工具并行，等待最慢的一个 |
 | 适合场景 | 不确定性高，需边做边看反馈 | 工具无依赖，可以一次性全查 |
 | 你的场景 | ❌ | ✅ 阵容查询+装备合成+英雄配装无依赖 |

 ### 1.3 简化流程（可选）

 如果 Plan 和 Synthesize 合并在一次 Function Call 流程中：

 ```
 Perceive → Plan+ToolCalls → Execute → Synthesize → Memorize
            └──────同一轮 DeepSeek 对话──────┘
 ```

 DeepSeek 支持在单次请求中：返回 tool_calls → 后端执行 → 结果注入 → 模型继续输出最终回复。

 ---

 ## 2. 整体架构

 ```
 ┌───────────────────────────────────────────────────────────┐
 │                    用户 (手机浏览器)                        │
 │                                                           │
 │  语音输入 ── 自然语言                                       │
 │  手动输入 ── 点选装备/回合/偏好                             │
 └───────────────────────────┬───────────────────────────────┘
                              │
                              ▼
 ┌───────────────────────────────────────────────────────────┐
 │                  POST /api/agent                           │
 │                                                           │
 │  输入: { query, mode: 'game', sessionId, action }          │
 │                                                           │
 │  ┌───────────────────────────────────────────────────┐   │
 │  │ Step 1: Perceive (State Parser)                    │   │
 │  │ DeepSeek · temp: 0 · ~500ms                        │   │
 │  │ 用户自然语言 → { round, equipment, augments,       │   │
 │  │                  board, health, gold, preference } │   │
 │  └───────────────────┬───────────────────────────────┘   │
 │                      │                                    │
 │                      ▼                                    │
 │  ┌───────────────────────────────────────────────────┐   │
 │  │ Step 2: Session Merge (纯代码)                      │   │
 │  │ 旧状态 ∪ 新解析结果                                  │   │
 │  │ 用户没说的保留，用户说的覆盖                         │   │
 │  └───────────────────┬───────────────────────────────┘   │
 │                      │                                    │
 │                      ▼                                    │
 │  ┌───────────────────────────────────────────────────┐   │
 │  │ Step 3: Plan (Decision Engine)                     │   │
 │  │ DeepSeek · temp: 0.3 · function call enabled       │   │
 │  │ System: 云顶教练 + 4 个工具描述                     │   │
 │  │ User: 当前状态 + 用户原始输入                        │   │
 │  │                                                    │   │
 │  │ → Agent 自主决定 tool_calls:                        │   │
 │  │   [search_comps(...), search_item_recipes(...)]    │   │
 │  └───────────────────┬───────────────────────────────┘   │
 │                      │                                    │
 │                      ▼                                    │
 │  ┌───────────────────────────────────────────────────┐   │
 │  │ Step 4: Execute (Tool Executor)                    │   │
 │  │                                                    │   │
 │  │  ┌──────────────┐  ┌──────────────┐  ┌─────────┐  │   │
 │  │  │search_comps  │  │search_item_  │  │search_  │  │   │
 │  │  │→ CDragon +   │  │recipes       │  │hero_    │  │   │
 │  │  │  MetaTFT     │  │→ CDragon本地 │  │build    │  │   │
 │  │  └──────┬───────┘  └──────┬───────┘  └────┬────┘  │   │
 │  │         └──────────┬──────┘───────────────┘       │   │
 │  │                    ▼                                │   │
 │  │            合并所有工具结果                           │   │
 │  └───────────────────┬───────────────────────────────┘   │
 │                      │                                    │
 │                      ▼                                    │
 │  ┌───────────────────────────────────────────────────┐   │
 │  │ Step 5: Synthesize (Decision Engine 继续)          │   │
 │  │ 工具结果注入 → 模型综合推理 → 输出最终建议           │   │
 │  │                                                    │   │
 │  │ → { summary, compDirection, equipmentAllocation,  │   │
 │  │     actions[], risks[], confidence, followup }    │   │
 │  └───────────────────┬───────────────────────────────┘   │
 │                      │                                    │
 │                      ▼                                    │
 │  ┌───────────────────────────────────────────────────┐   │
 │  │ Step 6: Memorize (Session Store)                   │   │
 │  │ 更新对局状态 → 保存对话历史                          │   │
 │  └───────────────────┬───────────────────────────────┘   │
 └──────────────────────┼────────────────────────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ 返回建议卡片  │
                  └──────────────┘

 数据层
 ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐
 │  DeepSeek API │  │  MetaTFT API  │  │  Community Dragon │
 │  State Parser │  │  英雄配装      │  │  装备合成表        │
 │  Decision Eng │  │  胜率/avg数据   │  │  本地缓存 JSON     │
 │  Function Call│  │  实时调用      │  │                   │
 └───────────────┘  └───────────────┘  └───────────────────┘
 ```

 ---

 ## 3. API 路由设计

 ### 3.1 POST /api/agent

 ```
 Request:
 {
   "query": "我3-2，反曲弓大剑，海克斯战士之心，想玩赌狗",
   "mode": "game",
   "sessionId": "uuid-xxxx",
   "action": "update"  // update | new_game | end_game
 }

 Response:
 {
   "status": "success",
   "sessionId": "uuid-xxxx",
   "gameState": {                    // 更新后的完整状态
     "round": "3-2",
     "equipment": ["反曲弓", "暴风大剑"],
     "augments": ["战士之心"],
     "board": [...],
     "health": null,
     "gold": null,
     "preference": "reroll",
     "targetComp": "德莱文赌狗"
   },
   "advice": {                       // 结构化建议
     "summary": "...",
     "compDirection": {
       "name": "德莱文赌狗",
       "reason": "...",
       "coreChampions": ["德莱文(1费)", ...],
       "stats": { "avg": 3.84, "top4Rate": 0.619, "winRate": 0.18 },
       "alternatives": ["诺手赌狗"]
     },
     "equipmentAllocation": [...],
     "actions": [...],
     "risks": [...],
     "confidence": 0.82,
     "followup": "你商店里刷到了什么？"
   },
   "toolsUsed": ["search_comps", "search_item_recipes"]  // 调试信息
 }
 ```

 ### 3.2 action 类型

 | action | 含义 |
 |--------|------|
 | `update` | 更新局面 + 获取建议（默认） |
 | `new_game` | 开始新对局，初始化 session |
 | `end_game` | 结束对局，记录排名 |

 ### 3.3 与对战模式路由共存

 `POST /api/query` → 对战模式（不变）
 `POST /api/agent` → 吃鸡模式（新增）

 ---

 ## 4. 核心流程

 ### 4.1 完整调用时序

 ```
 前端                    /api/agent                    DeepSeek         工具
  │                         │                            │               │
  │  POST /api/agent        │                            │               │
  │────────────────────────→│                            │               │
  │                         │  State Parser              │               │
  │                         │───────────────────────────→│               │
  │                         │←───────────────────────────│               │
  │                         │  { round, equipment... }   │               │
  │                         │                            │               │
  │                         │  Session Merge (纯代码)     │               │
  │                         │                            │               │
  │                         │  Decision Engine (Plan)    │               │
  │                         │───────────────────────────→│               │
  │                         │                            │ tool_calls:   │
  │                         │                            │ [search_comps,│
  │                         │                            │  search_item_ │
  │                         │                            │  recipes]     │
  │                         │  Tool Executor (并行)       │               │
  │                         │───────────────────────────────────────────→│
  │                         │←───────────────────────────────────────────│
  │                         │  工具结果注入                │               │
  │                         │───────────────────────────→│               │
  │                         │←───────────────────────────│               │
  │                         │  { summary, actions... }   │               │
  │                         │                            │               │
  │                         │  Session Update (纯代码)    │               │
  │                         │                            │               │
  │  ← Response             │                            │               │
  │─────────────────────────│                            │               │
 ```

 ### 4.2 并行 vs 串行对比

 | 方案 | DeepSeek 调用次数 | 延迟 |
 |------|------------------|------|
 | 串行 (Plan → 执行 tool 1 → 执行 tool 2 → Synthesize) | 每 tool 独立调 + Synthesize | 3-5s |
 | **并行 (Plan → 同时执行所有 tools → Synthesize)** | **1 次 (Plan+ToolCalls+Synthesize)** | **2-3s** ✅ |

 使用 DeepSeek Function Call 的单轮对话模式，Plan + ToolCalls + Synthesize 在一次请求中完成。

 ### 4.3 工具调用降级

 如果某个工具超时/失败：
 - 标记该工具结果为空
 - Agent 综合可用结果给建议
 - 标注"部分数据未获取到实时数据"

 ---

 ## 5. 工具设计

 ### 5.1 工具注册

 ```typescript
 const tools: Tool[] = [
   {
     name: "search_comps",
     description: "根据装备、海克斯和用户偏好，搜索适配的云顶之弈阵容",
     parameters: {
       equipment: { type: "array", items: "string", description: "用户拥有的装备列表" },
       augments: { type: "array", items: "string", description: "已选择的海克斯强化" },
       style: { type: "string", enum: ["reroll", "standard", "fast9", "any"], description: "用户偏好" }
     }
   },
   {
     name: "search_item_recipes",
     description: "根据散件装备列表，查询可合成的成品装备",
     parameters: {
       items: { type: "array", items: "string", description: "散件装备名称列表" }
     }
   },
   {
     name: "search_hero_build",
     description: "查询指定英雄的推荐装备和胜率数据",
     parameters: {
       hero: { type: "string", description: "英雄名称" }
     }
   },
   {
     name: "search_item_tier",
     description: "查询当前版本装备强度排行",
     parameters: {}
   }
 ];
 ```

 ### 5.2 工具实现

 #### search_item_recipes

 ```
 输入: ["反曲弓", "暴风大剑"]
 实现: 读 src/data/items.json → 遍历 composition 字段
       → 找出两个散件能合成的成品装备
       → 返回可合成列表 + 合成公式
 输出: [
   { name: "巨人杀手", recipe: "反曲弓 + 暴风大剑", components: ["反曲弓", "暴风大剑"] },
   ...
 ]
 ```

 #### search_comps

 ```
 输入: { equipment: ["反曲弓","大剑"], augments: ["战士之心"], style: "reroll" }
 实现:
   1. CDragon 本地: 按装备方向+海克斯类型筛选英雄池
   2. MetaTFT: 查相关阵容胜率数据
   3. AI 辅助: 综合给出阵容推荐
 输出: [
   {
     name: "德莱文赌狗",
     coreChampions: ["德莱文(1费)", ...],
     keyItems: ["巨人杀手", ...],
     avg: 3.84, top4Rate: 0.619, winRate: 0.18,
     difficulty: "easy", powerSpike: "3-2"
   },
   ...
 ]
 ```

 #### search_hero_build

 ```
 输入: { hero: "德莱文" }
 实现: 调 MetaTFT API (复用对战模式逻辑)
       → unit_items_processed + items?unit_unique + total?unit_unique
 输出: [
   { item: "巨人杀手", avg: 3.84, top4Rate: 0.619, winRate: 0.18, pickRate: 0.45 },
   ...
 ]
 ```

 #### search_item_tier

 ```
 输入: {}
 实现: 调 MetaTFT stat-api/items (复用对战模式逻辑)
 输出: [
   { name: "巨人杀手", avg: 3.84, top4Rate: 0.619, winRate: 0.18 },
   ...
 ]
 ```

 ---

 ## 6. Session Store

 ### 6.1 数据结构

 ```typescript
 interface GameSession {
   sessionId: string;
   createdAt: number;
   updatedAt: number;
   status: 'active' | 'finished';
   state: GameState;
   history: Message[];
   result: GameResult | null;
 }

 interface GameState {
   round: string | null;
   equipment: string[];
   augments: string[];
   board: { name: string; star: number }[];
   health: number | null;
   gold: number | null;
   preference: 'reroll' | 'standard' | 'fast9' | 'any' | null;
   targetComp: string | null;
 }
 ```

 ### 6.2 存储方案

 **第一版: 内存 Map**
 ```typescript
 const sessions = new Map<string, GameSession>();
 ```

 优点: 极快，零依赖。缺点: Vercel 冷启动丢失。

 **后续升级: Upstash Redis**（Vercel 原生集成）

 ### 6.3 过期策略

 - 活跃 session: 保留 30 分钟
 - 空闲: 15 分钟无交互自动清理
 - finished: 标记后保留 1 小时

 ---

 ## 7. 前端组件树

 ```
 page.tsx (首页双入口，已有)
   │
   ├── BattleMode (已有)
   │
   └── GameMode ✨ 新增
       │
       ├── GameHeader
       │   · 返回按钮、对局状态指示器 (idle/active)
       │   · 当前回合、偏好标签
       │
       ├── StatePanel
       │   · 装备池（图标 + 添加按钮）
       │   · 海克斯、英雄、血量/经济、目标阵容
       │
       ├── ChatArea (对话滚动)
       │   · AgentAdviceCard (Agent 建议卡片)
       │   · UserMessage
       │
       ├── VoiceInput (复用)
       │
       └── ActionBar
           · [添加装备] → EquipmentPicker
           · [新对局] / [结束对局]
 ```

 ### 7.1 新增/修改文件

 | 文件 | 操作 | 说明 |
 |------|------|------|
 | `src/app/api/agent/route.ts` | ✨ 新增 | 吃鸡模式 API |
 | `src/app/page.tsx` | 修改 | 新增 GameMode 状态 |
 | `src/components/GameMode.tsx` | ✨ 新增 | 吃鸡模式主容器 |
 | `src/components/StatePanel.tsx` | ✨ 新增 | 对局状态面板 |
 | `src/components/AgentAdviceCard.tsx` | ✨ 新增 | Agent 建议卡片 |
 | `src/components/EquipmentPicker.tsx` | ✨ 新增 | 装备选择器 |
 | `src/lib/session-store.ts` | ✨ 新增 | Session Store |
 | `src/lib/tools/` | ✨ 新增 | 工具实现目录 |
 | `src/lib/tools/search-comps.ts` | ✨ 新增 | search_comps 工具 |
 | `src/lib/tools/search-item-recipes.ts` | ✨ 新增 | search_item_recipes 工具 |
 | `src/lib/tools/search-hero-build.ts` | ✨ 新增 | search_hero_build 工具 |
 | `src/lib/tools/search-item-tier.ts` | ✨ 新增 | search_item_tier 工具 |
 | `src/lib/prompts/` | ✨ 新增 | Prompt 管理目录 |
 | `src/lib/prompts/state-parser.ts` | ✨ 新增 | State Parser prompt |
 | `src/lib/prompts/decision-engine.ts` | ✨ 新增 | Decision Engine prompt + 工具描述 |
 | `src/types/agent.ts` | ✨ 新增 | Agent 类型定义 |

 ---

 ## 8. 文件结构

 ```
 D:\tft-voice-assistant-v2\
 ├── src/
 │   ├── app/
 │   │   ├── api/
 │   │   │   ├── query/route.ts            # 已有，对战模式
 │   │   │   └── agent/route.ts            # ✨ 新增
 │   │   ├── page.tsx                       # 修改
 │   │   ├── layout.tsx
 │   │   └── globals.css
 │   ├── components/
 │   │   ├── VoiceButton.tsx               # 已有
 │   │   ├── QueryCard.tsx                 # 已有
 │   │   ├── GameMode.tsx                  # ✨ 新增
 │   │   ├── StatePanel.tsx                # ✨ 新增
 │   │   ├── AgentAdviceCard.tsx           # ✨ 新增
 │   │   └── EquipmentPicker.tsx           # ✨ 新增
 │   ├── lib/
 │   │   ├── utils.ts                      # 已有
 │   │   ├── session-store.ts              # ✨ 新增
 │   │   ├── tools/                        # ✨ 新增
 │   │   │   ├── index.ts                  # 工具注册 + 执行器
 │   │   │   ├── search-comps.ts
 │   │   │   ├── search-item-recipes.ts
 │   │   │   ├── search-hero-build.ts
 │   │   │   └── search-item-tier.ts
 │   │   └── prompts/                      # ✨ 新增
 │   │       ├── state-parser.ts
 │   │       └── decision-engine.ts
 │   ├── data/
 │   │   ├── items.json                    # 已有
 │   │   └── champions.json               # 已有
 │   └── types/
 │       └── agent.ts                      # ✨ 新增
 ├── outputs/
 │   └── v2.1/
 │       ├── prd-v2.1-game-mode.md
 │       ├── architecture-v2.1-agent.md
 │       └── prompt-v2.1.md
 └── package.json
 ```

 ---

 ## 9. 性能估算

 ### 9.1 响应延迟

 | 场景 | 调用链 | 延迟 |
 |------|--------|------|
 | 简单追问（无需工具） | State Parser → Decision Engine | ~2s |
 | 含 1 个工具 | + 1 tool call 并行 | ~2.5s |
 | 含 2 个工具 | + 2 tool calls 并行 | ~2.5s |
 | 含 3 个工具 | + 3 tool calls 并行 | ~3s |
 | MetaTFT 慢 | 单个 API 超时 3s | ~3.5s |

 全部在 <4s 目标内。

 ### 9.2 Token 消耗

 | Prompt | Token |
 |--------|-------|
 | State Parser (system + user) | ~500 |
 | Decision Engine (system + 工具描述 + user 状态) | ~1500 |
 | 工具返回结果 | ~300-800 |
 | Synthesize 输出 | ~500 |

 单次对话 ~2500-3500 token。

 ---

 ## 10. 部署注意

 ### 10.1 Vercel 限制

 | 限制 | 值 | 影响 |
 |------|-----|------|
 | Function 超时 | 10s (Hobby) / 60s (Pro) | Plan+Execute+Synthesize 串行可能接近 10s |
 | 内存 | 1024MB (Hobby) | 充足 |

 **建议**: 使用 Hobby 计划可能需要将 Function Call 流程拆成两次请求（Plan→返回工具结果→前端再调 Synthesize），或升级到 Pro。

 **备选方案（Hobby 兼容）**: 
 ```
 前端调 /api/agent/plan → 返回 tool_calls + 工具结果 → 前端调 /api/agent/synthesize
 ```

 ### 10.2 环境变量

 `.env.local` 已有 `DEEPSEEK_API_KEY`，无需新增。
 DeepSeek Function Call 与 Chat API 共用同一 endpoint 和 key。

 ### 10.3 已有数据文件

 `src/data/items.json` + `src/data/champions.json` 在 v2.0 已处理好，v2.1 直接复用。
