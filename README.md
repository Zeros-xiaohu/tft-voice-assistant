🍗 TFT Voice Assistant — 云顶之弈语音 AI 助手

- 主包是2026年S17赛季广州某赛区的云顶之弈冠军，同时还兼云顶之弈下棋辅导，结合高分段对大数据网站的需求，有了此项目的雏形。
- 结合对云顶的了解以及分析，细化了“战中”“战前”两个场景，因此，项目分成了“对战模式”与“吃鸡模式”。
- 对战模式：适合选择光明武器，海克斯选择，装备数据获取等站中阶段，只需给出目标（给出关键字or语音输入），即可获取即时数据。
- 吃鸡模式：适合开局进入游戏阶段，更像一个陪玩or教练的模型，根据个人的下棋风格，陪伴一整局的游戏。

---

## ✨ 这是什么

把云顶排位中的决策链路从 **15~25 秒（切屏→搜网站→阅读→决策）** 压缩到 **5 秒（说话→AI 分析→卡片展示→决策）**。


| 维度 | 说明                                                 |
| ---- | ---------------------------------------------------- |
| 平台 | Web / PWA，移动端优先                                |
| 输入 | 🎤 语音（Web Speech API）+ ⌨️ 文字 + 🖱️ 手动点选 |
| AI   | DeepSeek Chat                                        |
| 部署 | Vercel                                               |
| 数据 | MetaTFT API（实时）+ Community Dragon（本地缓存）    |

---

## 🏆 对战模式

> 战前，站中研究助手。排队中、打完查数据、跟朋友讨论时使用。


| 功能     | 用户输入               | 输出                                    |
| -------- | ---------------------- | --------------------------------------- |
| 英雄配装 | "布里茨/机器人装备"    | Top 5 推荐装备 + avg/Top4/胜率/选取次数 |
| 装备排行 | "什么装备强"           | Top 12 装备按 avg 排序                  |
| 阵容推荐 | "当前版本什么阵容强"   | Top 3 阵容卡片                          |
| 装备合成 | "反曲弓和大剑能合什么" | 可合成装备列表 + 合成公式               |
| 神器选取 | "lulu的神器有什么"     | Top 5 推荐装备 + avg/Top4/胜率/选取次数 |
---

## 🍗 吃鸡模式 (v2.1)

> 站前决策 Agent。开始新一局游戏时使用，AI 自主感知局面、调用工具查实时数据、配合你做决策。

### Agent 能做什么

- 🎤 **感知局面** — 语音/文字 → 结构化状态（装备、海克斯、英雄、血量、经济、偏好）
- 🧠 **自主规划** — AI 自己决定调哪个工具、什么顺序、怎么组合结果
- 🔧 **调用工具** — 4 个工具：搜阵容、查合成、查配装、查排行
- 📊 **综合推理** — 实时数据 + 游戏知识 → 具体操作建议
- 💾 **记住状态** — Session 追踪对局全程信息
- 💬 **主动追问** — 缺信息时追问，给建议后追问下一步
- 🎯 **理解偏好** — "赌狗" vs "运营" vs "上9" → 策略完全不同

### Agent 架构

```
感知 (Perceive)  →  State Parser: 自然语言 → 结构化状态
规划 (Plan)      →  Decision Engine: 分析局面 → Function Call
执行 (Execute)   →  Tool Executor: 并行调 MetaTFT + CDragon
合成 (Synthesize)→  工具结果 + 游戏知识 → 最终建议
记忆 (Memorize)  →  Session Store: 更新对局状态
```

### 典型对话

```
用户: 开始新对局，想玩赌狗
Agent: 🟢 新对局开始。偏好: 赌狗。你开局拿到了什么装备？

用户: 反曲弓和大剑
Agent: 📊 物理开局。[查数据] 🎯 推荐: 海魔人赌狗 or 女枪赌狗
       📦 反曲弓+大剑→巨人杀手，优先合成

用户: 2-1了，海克斯有棱彩门票、升级咯
Agent: 选棱彩门票。和你当前游戏方向一致。升级咯更适合95阵容，忽略。
```

---

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
echo DEEPSEEK_API_KEY=sk-xxx > .env.local

# 下载 CDragon 数据（可选，有降级方案）
node scripts/build-data.mjs

# 启动开发服务器
npm run dev -- --port 3003
```

浏览器打开 http://localhost:3003。

---

## 📁 项目结构

```
src/
├── app/
│   ├── page.tsx                    # 首页三模式 (home/battle/game)
│   └── api/
│       ├── query/route.ts           # 对战模式 API (v1.0/v2.0)
│       └── agent/route.ts           # 吃鸡模式 API (v2.1)
├── components/
│   ├── GameMode.tsx                 # 吃鸡模式主容器
│   ├── StatePanel.tsx               # 对局状态面板
│   ├── AgentAdviceCard.tsx          # Agent 建议卡片
│   └── EquipmentPicker.tsx          # 装备选择器
├── lib/
│   ├── alias-map.ts                 # 英雄/装备别名映射
│   ├── session-store.ts             # 对局状态存储
│   ├── prompts/
│   │   ├── state-parser.ts          # State Parser prompt
│   │   └── decision-engine.ts       # Decision Engine prompt + 工具描述
│   └── tools/
│       ├── index.ts                 # 工具注册 + 执行器
│       ├── search-comps.ts          # 查阵容
│       ├── search-hero-build.ts     # 查英雄配装
│       ├── search-item-recipes.ts   # 查装备合成
│       └── search-item-tier.ts      # 查装备排行
├── data/
│   ├── items.json                   # CDragon 装备数据
│   └── champions.json               # CDragon 英雄数据
└── types/
    └── agent.ts                     # Agent 类型定义
```

---

## 🧪 评测

```bash
# 设置 API Key
$env:DEEPSEEK_API_KEY="sk-xxx"

# 运行 50 条测试用例
node tests/eval.mjs
```


| 指标                | 结果  | 目标  |
| ------------------- | ----- | ----- |
| State Parser 准确率 | 98.1% | >90%  |
| Function Call F1    | 0.978 | >0.85 |
| E2E 通过率          | 14/15 | —    |

---

## 🛠 技术栈


| 层   | 选型                              |
| ---- | --------------------------------- |
| 框架 | Next.js 14 (App Router)           |
| 语言 | TypeScript                        |
| UI   | Tailwind CSS + lucide-react       |
| 语音 | Web Speech API                    |
| AI   | DeepSeek Chat + Function Call     |
| 数据 | MetaTFT API + Community Dragon    |
| 状态 | 内存 Map → Upstash Redis（后续） |
| 部署 | Vercel                            |

---

## 📋 路线图


| 版本 | 内容                                                  | 范式             |
| ---- | ----------------------------------------------------- | ---------------- |
| v1.0 | 语音 + 英雄配装 + 装备排行 + PWA                      | Workflow         |
| v2.0 | 首页双入口 + 阵容推荐 + 装备合成                      | Workflow（扩展） |
| v2.1 | Plan-then-Execute Agent + 4 工具 + Session + 偏好系统 | **Agent**        |
| v2.2 | 模式打通 + 关键决策点强化 + 工具数据补全              | Agent            |
| v2.3 | 对局复盘 + 用户偏好学习 + 常用阵容                    | Agent + Memory   |
