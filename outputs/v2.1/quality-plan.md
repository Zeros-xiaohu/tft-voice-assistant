 # TFT Voice Assistant — v2.1 吃鸡模式 质量保障方案

 > 日期: 2026-06-16 · 状态: 方案定稿

 ---

 ## 目录

 1. [总览](#1-总览)
 2. [意图识别准确性](#2-意图识别准确性-state-parser)
 3. [Function Call 有效性](#3-function-call-有效性)
 4. [耗时优化](#4-耗时优化)
 5. [评测体系](#5-评测体系)
 6. [开发前检查清单](#6-开发前检查清单)

 ---

 ## 1. 总览

 v2.1 吃鸡模式的核心链路：

 ```
 用户输入 → State Parser → Session Merge → Decision Engine (Plan)
           → Function Call → Tool Executor → Synthesize → 输出
 ```

 这条链路上有三个关键质量风险：

 | 风险 | 影响 | 本章节 |
 |------|------|--------|
 | State Parser 解析错误 | 后续所有决策基于错误信息 | §2 |
 | Agent 调了不该调的/没调该调的 | 建议不准确或浪费 token | §3 |
 | 响应太慢 | 用户等不及，体验差 | §4 |

 ---

 ## 2. 意图识别准确性 (State Parser)

 ### 2.1 风险点

 State Parser 将用户自然语言 → 结构化 JSON。用户说话随意，可能缺字段、说别名、信息矛盾、成品装备和散件混在一起。

 ### 2.2 高频失效场景

 | 用户说 | Parser 可能的错误 | 正确结果 |
 |--------|------------------|---------|
 "我有羊刀和大剑" | 羊刀是成品装备，但 parser 可能把羊刀当散件，导致装备池混乱 | equipment: [{ name: "鬼索的狂暴之刃", type: "completed" }, { name: "暴风大剑", type: "basic" }] |
 "诺手德莱文都有" | 没解析出星级 | board: [{ name: "德莱厄斯", star: 1 }, { name: "德莱文", star: 1 }] — 未提星级默认 1 |
 "第二个海克斯是战士之心" | 可能不识别"第二个海克斯"表达 | augments: ["战士之心"] — 编号忽略 |
 "我差一张德莱文就2星了" | 可能解析为德莱文已经是 2 星 | board: [{ name: "德莱文", star: 1 }] — 差一张 = 现在还是 1 星 |
 "2-1" | 可能不识别为回合 | round: "2-1" |
 "选战士之心还是法师之心" | 可能把两个都放进 augments | augments: [] — 用户还没选，不应填入 |

 ### 2.3 解决方案

 #### A. JSON Schema 强约束

 ```typescript
 const stateParserSchema = {
   type: "json_object",
   schema: {
     round: { type: ["string", "null"], pattern: "^\\d-\\d$" },
     equipment: {
       type: "array",
       items: {
         type: "object",
         properties: {
           name: { type: "string" },
           type: { type: "string", enum: ["basic", "completed"] }
         }
       }
     },
     augments: { type: "array", items: { type: "string" } },
     board: {
       type: "array",
       items: {
         type: "object",
         properties: {
           name: { type: "string" },
           star: { type: "integer", minimum: 1, maximum: 3 }
         }
       }
     },
     health: { type: ["integer", "null"], minimum: 1, maximum: 100 },
     gold: { type: ["integer", "null"], minimum: 0 },
     preference: { type: ["string", "null"], enum: ["reroll", "standard", "fast9", "any"] },
     targetComp: { type: ["string", "null"] }
   }
 };
 ```

 #### B. 别名映射前置到前端

 不在 prompt 里让 AI 猜别名，前端直接替换：

 ```typescript
 // frontend alias map
 const HERO_ALIAS: Record<string, string> = {
   "剑圣": "易大师", "瞎子": "李青", "亚索": "疾风剑豪",
   "男枪": "格雷福斯", "努努": "雪人骑士", "机器人": "布里茨",
   "诺手": "德莱厄斯", ...
 };

 const ITEM_ALIAS: Record<string, string> = {
   "羊刀": "鬼索的狂暴之刃", "无尽": "无尽之刃",
   "巨杀": "巨人杀手", "蓝buff": "蓝霸符", ...
 };

 function preprocessInput(raw: string): string {
   let processed = raw;
   for (const [alias, standard] of Object.entries(HERO_ALIAS)) {
     processed = processed.replace(new RegExp(alias, 'g'), standard);
   }
   for (const [alias, standard] of Object.entries(ITEM_ALIAS)) {
     processed = processed.replace(new RegExp(alias, 'g'), standard);
   }
   return processed;
 }
 ```

 #### C. 区分成品 vs 散件

 Parser prompt 中明确：

 ```
 装备分两类:
 - 散件 (type: "basic"): 反曲弓、暴风大剑、无用大棒、女神之泪、锁子甲、负极斗篷、巨人腰带、金铲铲、拳套
 - 成品 (type: "completed"): 由散件合成的装备，如 鬼索的狂暴之刃、无尽之刃、巨人杀手

 如果用户说的是成品装备，放进 equipment，type="completed"。
 如果用户说的是散件，放进 equipment，type="basic"。
 如果用户说"羊刀"（鬼索的狂暴之刃），type="completed"。
 ```

 #### D. 用户正在选择 vs 已选择

 ```
 如果用户说"海克斯有A和B，选哪个" → augments 保持旧值或空，不要填 A 或 B。
 如果用户说"我选了A"或"A已经选了" → augments 添加 A。
 如果无法判断，保持旧值。
 ```

 ### 2.4 评测方案

 准备 50 条真实场景测试用例，人工标注标准答案：

 ```json
 {
   "id": 1,
   "input": "我3-2，反曲弓大剑锁子甲，海克斯战士之心，2星诺手1星德莱文，想玩赌狗",
   "expected": {
     "round": "3-2",
     "equipment": [
       { "name": "反曲弓", "type": "basic" },
       { "name": "暴风大剑", "type": "basic" },
       { "name": "锁子甲", "type": "basic" }
     ],
     "augments": ["战士之心"],
     "board": [
       { "name": "德莱厄斯", "star": 2 },
       { "name": "德莱文", "star": 1 }
     ],
     "preference": "reroll"
   }
 }
 ```

 跑 Parser 对比每个字段，计算准确率。

 **目标：整体字段准确率 > 90%。**

 ### 2.5 错误恢复

 如果某字段置信度低或 schema 校验失败：

 | 策略 | 说明 |
 |------|------|
 重试 | 同一条输入再调一次 Parser（temp=0 时不会变，不适用） |
 追问 | Agent 追问"你刚才说的是 xx 装备对吗？" |
 降级 | 该字段保持旧值或 null，Agent 标注不确定 |

 ---

 ## 3. Function Call 有效性

 ### 3.1 风险点

 Agent 自主决定调哪些工具。可能：
- 该调的没调（漏工具）
- 不该调的瞎调（多余调用，浪费 token 和时间）
- 参数填错（英雄名/装备名不在合法范围内）

 ### 3.2 高频失效场景

 | 局面 | Agent 可能错误 |
 |------|--------------|
 用户已有目标阵容，只问装备分配 | 多余调了 search_comps |
 用户没有装备，问阵容方向 | 调了 search_item_recipes（items 为空，返回空） |
 用户说"金克斯"，Agent 传参 `hero: "jinx"` | 应为 `hero: "金克斯"` |
 用户说"羊刀"，Agent 传参 `items: ["羊刀"]` | 别名未映射，工具不认识 |
 连续两轮问同一个问题 | Agent 重复调同样的工具 |

 ### 3.3 解决方案

 #### A. 工具描述写清楚使用条件

 ```
 search_comps: 当用户有装备（equipment 数组非空）且无明确阵容方向时调用。
               已锁定主C英雄时优先调 search_hero_build 而非此工具。

 search_item_recipes: 当用户有散件装备（basic 类型）时调用。
                      如果装备全是成品（completed），不应调用此工具。

 search_hero_build: 当用户已明确主C英雄时调用。
                    hero 参数必须用标准中文名（如"德莱文"而非"draven"）。

 search_item_tier: 当用户明确问装备强度/排行时调用。
                   如"什么装备强"、"哪个装备厉害"、"装备排行"。
 ```

 #### B. 后端校验 + 兜底

 ```typescript
 const BASIC_ITEMS = [
   "反曲弓", "暴风大剑", "无用大棒", "女神之泪",
   "锁子甲", "负极斗篷", "巨人腰带", "金铲铲", "拳套"
 ];

 const VALID_HERO_NAMES = [/* from champions.json */];

 function validateAndFix(tool: ToolCall): ToolCall | null {
   switch (tool.name) {
     case "search_item_recipes": {
       // 只保留散件，过滤成品
       const basicOnly = tool.args.items.filter((i: string) => BASIC_ITEMS.includes(i));
       if (basicOnly.length === 0) return null; // 全是成品，跳过此工具
       return { ...tool, args: { ...tool.args, items: basicOnly } };
     }
     case "search_comps": {
       if (!tool.args.equipment || tool.args.equipment.length === 0) return null;
       return tool;
     }
     case "search_hero_build": {
       if (!VALID_HERO_NAMES.includes(tool.args.hero)) return null;
       return tool;
     }
     default:
       return tool;
   }
 }
 ```

 返回 null 的工具调用直接跳过，执行日志记录跳过原因。

 #### C. 去重

 ```typescript
 function deduplicateToolCalls(calls: ToolCall[]): ToolCall[] {
   const seen = new Set<string>();
   return calls.filter(call => {
     const key = `${call.name}:${JSON.stringify(call.args)}`;
     if (seen.has(key)) return false;
     seen.add(key);
     return true;
   });
 }
 ```

 #### D. 工具超时处理

 ```typescript
 const TOOL_TIMEOUT_MS = 3000;

 async function executeWithTimeout(tool: ToolCall): Promise<ToolResult> {
   try {
     const result = await Promise.race([
       executeTool(tool),
       new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), TOOL_TIMEOUT_MS))
     ]);
     return { status: "success", data: result };
   } catch {
     return { status: "timeout", data: null }; // 降级
   }
 }
 ```

 ### 3.4 评测方案

 准备 30 个典型局面，人工标注预期工具调用：

 ```json
 {
   "id": 1,
   "scene": "用户有装备无阵容方向",
   "input": "反曲弓大剑，想玩赌狗",
   "state": { "equipment": ["反曲弓", "暴风大剑"], "preference": "reroll" },
   "expectedTools": ["search_comps", "search_item_recipes"],
   "forbiddenTools": ["search_hero_build", "search_item_tier"]
 }
 ```

 评测维度：

 | 指标 | 计算方式 |
 |------|---------|
 召回率 | 预期工具中有几个被调了 / 预期工具总数 |
 精确率 | 调了的工具中有几个是对的 / 调了的工具总数 |
 F1 | 调和平均 |

 **目标：F1 > 0.85。**

 ---

 ## 4. 耗时优化

 ### 4.1 耗时拆解

 | 步骤 | 瓶颈 | 典型耗时 | 占比 |
 |------|------|---------|------|
 | ① State Parser (DeepSeek) | LLM 推理 | ~500ms | 20% |
 | ② Decision Engine Plan (DeepSeek) | LLM 推理 | ~1.5s | 50% |
 | ③ Tool Executor | CDragon 读本地 | ~50ms | 2% |
 | ③ Tool Executor | MetaTFT HTTP | ~500ms-1s | 20% |
 | ④ Synthesize | LLM 继续推理 | ~300ms | 8% |

 主要瓶颈是 ② Decision Engine 的推理时间。

 ### 4.2 优化策略

 #### 策略 1: 流式响应（推荐，零风险）

 不改调用链路，用 streaming 改善用户感知：

 ```
 [State Parser 静默完成 → 显示"分析中..." → Decision Engine 流式输出]
 ```

 用户在第 1 秒就看到 Agent "在思考"，感知延迟降低 50%+。

 实现：DeepSeek API 设置 `stream: true`。

 | 收益 | 风险 |
 |------|------|
 | 感知延迟降低 50% | 无 |

 #### 策略 2: 工具并行执行（已采用）

 所有 tool calls 并行执行，等待最慢的一个：

 ```
 search_comps() ────────┐
 search_item_recipes() ─┤→ 并行 → 耗时 = max(各工具)
 search_hero_build() ───┘
 ```

 | 收益 | 风险 |
 |------|------|
 | 省 500ms-1s | 无 |

 #### 策略 3: Parser 高频缓存（推荐）

 对于短输入（如"3-2"、"反曲弓"、"大剑"），Parser 的结果高度可预测：

 ```typescript
 const parserCache = new Map<string, ParsedState>();

 function shouldCache(input: string): boolean {
   // 只缓存短输入（< 10 字），长输入不缓存
   return input.length < 10;
 }
 ```

 | 收益 | 风险 |
 |------|------|
 | 高频短输入省 500ms | 低（缓存 key 精确匹配） |

 #### 策略 4: CDragon 预热

 State Parser 调用时，同步预热 CDragon 数据：

 ```typescript
 const itemsPromise = loadItems(); // 提前读 JSON
 const [state, items] = await Promise.all([stateParser(query), itemsPromise]);
 ```

 | 收益 | 风险 |
 |------|------|
 | 工具执行时零等待 | 无 |

 #### 策略 5: 合并 Parser + Engine（备选，有风险）

 一个 prompt 同时输出状态 JSON + tool_calls，省掉一次 API 调用：

 ```
 单次 DeepSeek:
   System: 你是局面解析器+教练。先输出状态JSON，再决定调什么工具。
   → 输出: { state: {...}, tool_calls: [...] }
 ```

 | 收益 | 风险 |
 |------|------|
 | 省 500ms | prompt 过长导致解析质量下降，不推荐初期采用 |

 ### 4.3 推荐组合

 | 策略 | 采用 | 优先级 |
 |------|------|--------|
 | 流式响应 | ✅ 必做 | P0 |
 | 工具并行 | ✅ 架构已支持 | P0 |
 | Parser 高频缓存 | ✅ 推荐 | P1 |
 | CDragon 预热 | ✅ 推荐 | P1 |
 | 合并 Parser+Engine | 🔶 备选 | P2 |

 全部采用后预估延迟：

 | 场景 | 优化前 | 优化后 |
 |------|--------|--------|
 | 简单追问 | ~2s | ~1.5s（感知 <1s 流式） |
 | 含 2 工具 | ~2.5s | ~2s（感知 <1.5s 流式） |
 | 含 MetaTFT | ~3s | ~2.5s（感知 <2s 流式） |

 ---

 ## 5. 评测体系

 ### 5.1 测试集设计

 文件：`tests/agent-eval.json`

 ```json
 [
   {
     "id": "state-01",
     "category": "state_parser",
     "input": "我3-2，反曲弓大剑锁子甲，海克斯战士之心，2星诺手1星德莱文，72血，想玩赌狗",
     "expectedState": {
       "round": "3-2",
       "equipment": [
         { "name": "反曲弓", "type": "basic" },
         { "name": "暴风大剑", "type": "basic" },
         { "name": "锁子甲", "type": "basic" }
       ],
       "augments": ["战士之心"],
       "board": [
         { "name": "德莱厄斯", "star": 2 },
         { "name": "德莱文", "star": 1 }
       ],
       "health": 72,
       "preference": "reroll"
     }
   },
   {
     "id": "tool-01",
     "category": "function_call",
     "input": "反曲弓大剑，想玩赌狗，还没选海克斯",
     "state": {
       "equipment": [
         { "name": "反曲弓", "type": "basic" },
         { "name": "暴风大剑", "type": "basic" }
       ],
       "preference": "reroll"
     },
     "expectedTools": ["search_comps", "search_item_recipes"],
     "forbiddenTools": ["search_hero_build"]
   },
   {
     "id": "e2e-01",
     "category": "end_to_end",
     "input": "我2-1，反曲弓大剑，海克斯有战士之心和法师之心，选哪个",
     "state": {
       "round": "2-1",
       "equipment": [
         { "name": "反曲弓", "type": "basic" },
         { "name": "暴风大剑", "type": "basic" }
       ],
       "augments": []
     },
     "expectedTools": ["search_comps"],
     "checks": {
       "confidenceAbove": 0.6,
       "hasFollowup": true,
       "recommendsAugment": true
     }
   }
 ]
 ```

 ### 5.2 测试用例覆盖

 | 维度 | 用例数 | 覆盖的场景 |
 |------|--------|-----------|
 | State Parser | 20 | 完整输入、缺字段输入、别名输入、歧义输入、错误输入 |
 | Function Call | 15 | 该调/不该调/多调/少调/参数错误 |
 | End-to-End | 15 | 开局、中期、后期、赌狗、运营、海克斯选择、濒死 |

 **总计 50 条用例。**

 ### 5.3 评测脚本

 ```typescript
 // tests/eval.ts
 interface EvalResult {
   id: string;
   category: string;
   passed: boolean;
   stateAccuracy?: number;      // 0-1, State Parser 字段准确率
   toolRecall?: number;         // 0-1, 工具召回率
   toolPrecision?: number;      // 0-1, 工具精确率
   endToEndPassed?: boolean;    // 端到端是否通过
   latencyMs: number;
   actualResponse: object;
 }

 async function runEval(): Promise<EvalResult[]> {
   const testCases = JSON.parse(readFileSync("tests/agent-eval.json", "utf8"));
   const results: EvalResult[] = [];

   for (const tc of testCases) {
     const start = Date.now();

     if (tc.category === "state_parser") {
       const actual = await stateParser(tc.input);
       const accuracy = compareState(actual, tc.expectedState);
       results.push({
         id: tc.id, category: tc.category,
         passed: accuracy >= 0.9,
         stateAccuracy: accuracy,
         latencyMs: Date.now() - start,
         actualResponse: actual
       });
     }

     if (tc.category === "function_call") {
       const { toolCalls } = await decisionEngine(tc.input, tc.state);
       const { recall, precision } = evaluateTools(toolCalls, tc.expectedTools, tc.forbiddenTools);
       const f1 = 2 * recall * precision / (recall + precision) || 0;
       results.push({
         id: tc.id, category: tc.category,
         passed: f1 >= 0.85,
         toolRecall: recall, toolPrecision: precision,
         latencyMs: Date.now() - start,
         actualResponse: { toolCalls }
       });
     }

     if (tc.category === "end_to_end") {
       const response = await fullAgentPipeline(tc.input, tc.state);
       const passed = tc.checks.confidenceAbove
         ? response.advice.confidence >= tc.checks.confidenceAbove
         : true;
       results.push({
         id: tc.id, category: tc.category,
         passed,
         latencyMs: Date.now() - start,
         actualResponse: response
       });
     }
   }

   return results;
 }

 function evaluateTools(
   actual: string[],
   expected: string[],
   forbidden: string[]
 ): { recall: number; precision: number } {
   const actualSet = new Set(actual);
   const expectedSet = new Set(expected);
   const forbiddenSet = new Set(forbidden);

   const tp = [...actualSet].filter(t => expectedSet.has(t)).length;
   const fp = [...actualSet].filter(t => forbiddenSet.has(t) || (!expectedSet.has(t) && !forbiddenSet.has(t))).length;
   const fn = [...expectedSet].filter(t => !actualSet.has(t)).length;

   const recall = tp / (tp + fn) || 0;
   const precision = tp / (tp + fp) || 0;

   return { recall, precision };
 }
 ```

 ### 5.4 评测指标总览

 | 指标 | 测量方式 | 目标 | 达标判断 |
 |------|---------|------|---------|
 | State Parser 字段准确率 | 离线测试集，字段级对比 | > 90% | ≥ 90% 测试用例通过 |
 | 工具调用 F1 | 离线测试集，召回+精确 | > 0.85 | ≥ 85% F1 |
 | 端到端响应时间 | 真实环境计时 | < 4s | 95 分位 < 4s |
 | 建议置信度均值 | Agent 输出的 confidence | > 0.7 | 均值 > 0.7 |
 | 建议可操作性 | 人工抽样 20 条评估 | > 80% | ≥ 80% 含具体棋子/装备名 |

 ### 5.5 持续评测

 | 阶段 | 频率 | 方式 |
 |------|------|------|
 | 开发阶段 | 每次改 Agent 代码后 | 跑 eval 脚本，全量 50 条 |
 | 上线前 | 一次性 | 全量 + 人工抽检 20 条 |
 | 上线后 | 每周 | 随机抽样 20 条真实对话，人工 review |

 ### 5.6 在线反馈

 UI 中隐式收集：

 ```
 AgentAdviceCard 底部:
   [这条建议有用吗？  👍  👎]
 ```

 不强制，用户可选点。数据存入日志，定期分析。

 ---

 ## 6. 开发前检查清单

 | # | 事项 | 状态 |
 |----|------|------|
 | 1 | 建 `tests/agent-eval.json`，50 条测试用例 | ☐ |
 | 2 | 别名映射前置到前端 (`HERO_ALIAS` + `ITEM_ALIAS`) | ☐ |
 | 3 | State Parser 加入成品/散件区分逻辑 | ☐ |
 | 4 | State Parser 加入"正在选择 vs 已选择"判断 | ☐ |
 | 5 | 工具描述写清楚使用条件 | ☐ |
 | 6 | 后端 tool call 校验 + 兜底函数 | ☐ |
 | 7 | 后端 tool call 去重函数 | ☐ |
 | 8 | 后端 tool call 超时处理 | ☐ |
 | 9 | DeepSeek API 接入流式响应 (`stream: true`) | ☐ |
 | 10 | Parser 高频缓存（短输入 < 10 字） | ☐ |
 | 11 | CDragon 数据预热 | ☐ |
 | 12 | 前端 AdviceCard 底部 👍👎 反馈按钮 | ☐ |
 | 13 | 跑 `tests/eval.ts`，确认所有指标达标 | ☐ |
 | 14 | 人工抽检 20 条真实场景对话 | ☐ |
