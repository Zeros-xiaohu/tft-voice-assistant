 # TFT Voice Assistant — 项目总结

 > 日期: 2026-06-17 · 从 MVP 到 Agent 的 30 小时

 ---

 ## 一、我们做了什么

 从 0 到 1 构建了一个**云顶之弈语音 AI 决策助手**。三个版本，两次产品模式跨越。

 ### 版本演进

 | 版本 | 定位 | 模式 | 核心能力 |
 |------|------|------|---------|
 | **v1.0 MVP** | 语音查询工具 | Workflow | 英雄配装 + 装备排行 |
 | **v2.0 对战模式** | 战前研究助手 | Workflow（扩展） | + 阵容推荐 + 装备合成 + 双入口 |
 | **v2.1 吃鸡模式** | 战中决策 Agent | **Agent** (Plan-then-Execute) | + 对局追踪 + Function Call + 自主决策 |

 ### 从工具到 Agent

 ```
 v1.0: "布里茨装备" → 返回数据卡片              （你问它答）
 v2.0: "法师阵容"   → 返回阵容卡片              （你问它答，范围大了）
 v2.1: "我3-2，反曲弓大剑，想玩赌狗"
        → Agent 自主查阵容+查装备合成+查英雄配装
        → 综合给建议 + 追问"商店刷了什么"          （它跟你一起想）
 ```

 ---

 ## 二、技术成果

 ### 核心数据

 | 指标 | v1.0 | v2.0 | v2.1 |
 |------|------|------|------|
 AI 调用次数/请求 | 1 | 1 | 2-3（含 Function Call） |
 API 路由 | 1 | 1 | 2（query + agent） |
 数据源 | MetaTFT | MetaTFT + CDragon | MetaTFT + CDragon（Agent 自主调） |
 工具数量 | 0 | 0 | 4（Function Call） |
 状态管理 | 无 | 无 | Session Store |
 Agent 范式 | — | — | Plan-then-Execute |

 ### Agent 评测结果

| 指标 | 结果 | 目标 |
|------|------|------|
| State Parser 准确率 | **98.1%** (20/20) | > 90% |
| Function Call F1 | **0.978** (14/15) | > 0.85 |
| 端到端通过率 | **14/15** | — |
| 平均延迟 | 1818ms | < 4s |

 ### 新增代码

| 模块 | 新增文件 |
|------|---------|
| Agent API | `src/app/api/agent/route.ts` |
| State Parser Prompt | `src/lib/prompts/state-parser.ts` |
| Decision Engine Prompt | `src/lib/prompts/decision-engine.ts` |
| 4 个工具 | `src/lib/tools/` (index + search-comps + search-item-recipes + search-hero-build + search-item-tier) |
| Session Store | `src/lib/session-store.ts` |
| 别名映射 | `src/lib/alias-map.ts` |
| 前端组件 | GameMode / StatePanel / AgentAdviceCard / EquipmentPicker |
| 评测体系 | tests/agent-eval.json + tests/eval.ts |

 ---

 ## 三、产品决策

 ### 关键选择

 | 决策 | 选了 | 没选 |
 |------|------|------|
| 交互方式 | 🎤 语音 | 📸 自动截图 |
| Agent 范式 | Plan-then-Execute | ReAct / Tool-use |
| 工具决策 | Agent Function Call 自主选 | 后端 if-else 规则 |
| 阵容数据 | AI 知识（短期），后续接实时 API | — |
| 装备输入 | 手动点选 + 语音 | 纯语音 |
| 状态存储 | 内存 Map → 后续 Redis | — |
| 部署 | Vercel Serverless | — |

 ### 产品壁垒

| 壁垒 | 说明 |
|------|------|
| 语音交互 | 所有竞品都是看屏幕，只有我们是说话 |
| 零安装 | 浏览器打开即用，竞品需安装桌面应用或 App |
| 战前+战中全覆盖 | 对战模式（研究）+ 吃鸡模式（协作）一条链路 |
| 中文深度优化 | 英雄/装备别名映射 70+，DeepSeek 中文理解 |

 ---

 ## 四、竞品生态

| 竞品 | 定位 | 我们的差异 |
|------|------|-----------|
| MetaTFT / Tactics.tools | 数据网站 | 语音交互 + AI 决策 |
| tft-helper | 数据浏览器 | AI + 语音 + 战中可用 |
| TFT-consider | 桌面截图 Agent | 零安装 + 语音 |
| tft-ai-coach | AI 教练 | 零安装 + Agent Function Call |
| 掌盟助手（腾讯） | 官方局内助手 | 语音交互 + 不依赖游戏 API |
| tftable.cc | 装备导向推荐 | Agent 多维度综合推理 |

 ---

 ## 五、文档体系

 ```
 outputs/
 ├── master-prd.md                      # 项目总 PRD
 ├── project-summary.md                 # 本文件
 │
 ├── v2.0/
 │   ├── prd-v3.md                       # v2.0 PRD
 │   └── architecture-v2.md              # v2.0 架构 + 流程图
 │
 └── v2.1/
     ├── prd-v2.1-game-mode.md            # 吃鸡模式功能规格
     ├── architecture-v2.1-agent.md       # Agent 技术架构
     ├── prompt-v2.1.md                   # 完整 Prompt（3 个 prompt + 4 个工具）
     ├── quality-plan.md                  # 质量保障方案（评测 + 优化）
     ├── business-view.md                 # 业务视角（两个模式业务逻辑）
     └── eval-report.json                 # 评测报告
 ```

 ---

 ## 六、当前状态

 | 维度 | 状态 |
|------|------|
| v2.0 对战模式 | ✅ 已上线 https://tft-voice-assistant.vercel.app |
| v2.1 吃鸡模式 | ✅ 开发完成，评测通过，本地运行中（端口3003） |
| v2.1 部署 | ⏳ 待推送到 GitHub → Vercel |
| 产品假设验证 | ⏳ 需亲自打 3 局验证"语音交互在战中是否可行" |

 ---

 ## 七、下一步

| 优先级 | 事项 |
|--------|------|
| 🔴 立刻 | 亲自打 3 局，验证语音交互假设 |
| 🟡 短期 | v2.1 部署上线；State Parser 超时重试；search_item_holders 工具 |
| 🟢 中期 | comp_tier 接入实时数据；Session 迁 Redis；关键决策点强化 |
| 🔵 远期 | 赛后复盘；用户偏好自动学习 |

 ---

 ## 八、反思

 ### 做得好的

- **先想清楚再做**：产品方案阶段花了大量时间，定义清楚了 Agent 范式、工具边界、评测标准，开发时几乎没有返工
- **评测先行**：50 条测试集在写代码前建好，跑完就知道靠不靠谱
- **竞品研究扎实**：分析了 6 个竞品（含腾讯官方），避免闭门造车

 ### 可以更好的

- 吃鸡模式第一版设计走了弯路（纯 prompt 推理假 Agent），推到重来了一次
- 开发初期没注意目录问题，在原仓库直接改了，后面才建 dev 分支
- 产品方案和代码开发分在两个窗口，切换有一定摩擦

 ### 最大的未验证风险

 > **"玩家在 30 秒准备时间里，愿意开口跟手机说话吗？"**

 所有文档、架构、代码、评测都基于这个假设成立。打通 3 局真实的云顶对局是下一件最重要的事。
