# TFT Voice Assistant — 开发进度

**项目**: 云顶之弈语音 AI 助手  
**仓库**: `D:\tft-voice-assistant`  
**远程**: https://github.com/Zeros-xiaohu/tft-voice-assistant  
**分支**: `v2.1-dev`（当前开发分支）  
**最后更新**: 2026-06-17

---

## 当前状态：v2.1 吃鸡模式 Agent 开发完成

### ✅ v1.0 MVP — 已上线

| 模块 | 说明 |
|------|------|
| 语音/文字输入 | Web Speech API 中文识别 |
| 英雄配装 (hero_build) | avg 排名 + Top4率 + 胜率 + 选取次数 |
| 装备排行 (item_tier) | Top 12 装备按 avg 排序 |
| PWA | 支持添加到手机主屏幕 |
| 部署 | Vercel |

### ✅ v2.0 对战模式 — 已上线

| 模块 | 文件 | 说明 |
|------|------|------|
| 首页双入口 | `src/app/page.tsx` | 对战模式 / 吃鸡模式两张卡片 |
| 阵容推荐 (comp_tier) | `src/app/api/query/route.ts` | DeepSeek 游戏知识推荐 Top 3 阵容 |
| 装备合成 (item_recipe) | `src/app/api/query/route.ts` | CDragon 本地 composition 表反向查询 |
| CDragon 数据 | `scripts/build-data.mjs` + `raw/` | 下载 23MB 原始数据，提取装备合成表到 `src/data/` |

### ✅ v2.1 吃鸡模式 Agent — 开发完成，评测通过

| 模块 | 文件 | 说明 |
|------|------|------|
| **State Parser** | `src/lib/prompts/state-parser.ts` | 自然语言 → 结构化局面 JSON，准确率 98.1% |
| **Decision Engine** | `src/lib/prompts/decision-engine.ts` | Plan-then-Execute，Function Call 自主选工具，F1 0.978 |
| **Session Store** | `src/lib/session-store.ts` | 内存 Map 存储对局状态，30 分钟过期 |
| **4 个工具** | `src/lib/tools/` | search_comps / search_item_recipes / search_hero_build / search_item_tier |
| **Agent API** | `src/app/api/agent/route.ts` | POST /api/agent，完整 Plan-then-Execute 调用链 |
| **GameMode 组件** | `src/components/GameMode.tsx` | 吃鸡模式主容器，idle/active/finished 三状态 |
| **StatePanel 组件** | `src/components/StatePanel.tsx` | 装备池/海克斯/英雄/血量/经济 状态面板 |
| **AgentAdviceCard 组件** | `src/components/AgentAdviceCard.tsx` | 建议卡片渲染 + 👍👎 隐式反馈 |
| **EquipmentPicker 组件** | `src/components/EquipmentPicker.tsx` | 装备点选弹窗 |
| **别名映射前置** | `src/lib/alias-map.ts` | 前端替换别名，减少 Parser 出错 |
| **评测测试集** | `tests/agent-eval.json` | 50 条测试用例 |
| **评测脚本** | `tests/eval.ts` | 离线评测，自动计算准确率/F1/延迟 |
| **评测报告** | `outputs/v2.1/eval-report.json` | 98.1% State Parser, 0.978 F1, 14/15 E2E |

### Agent 核心指标

| 指标 | 结果 | 目标 | 状态 |
|------|------|------|------|
| State Parser 字段准确率 | 98.1% (20/20) | > 90% | ✅ |
| Function Call F1 | 0.978 (14/15) | > 0.85 | ✅ |
| 端到端通过率 | 14/15 | — | ✅ |
| State Parser 平均延迟 | 1818ms | < 5s | ✅ |
| State Parser 最大延迟 | 12690ms（偶发） | — | ⚠️ 待加超时重试 |

### 📁 v2.1 新增文件结构

```
D:\tft-voice-assistant\
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── agent/route.ts              # ✨ Agent API 路由
│   │   ├── page.tsx                         # 修改: 新增 GameMode 状态分支
│   ├── components/
│   │   ├── GameMode.tsx                     # ✨ 吃鸡模式主容器
│   │   ├── StatePanel.tsx                   # ✨ 对局状态面板
│   │   ├── AgentAdviceCard.tsx              # ✨ Agent 建议卡片
│   │   └── EquipmentPicker.tsx              # ✨ 装备选择器
│   ├── lib/
│   │   ├── session-store.ts                 # ✨ Session Store
│   │   ├── alias-map.ts                     # ✨ 别名映射
│   │   ├── tools/
│   │   │   ├── index.ts                     # ✨ 工具注册 + 执行器
│   │   │   ├── search-comps.ts              # ✨ 阵容匹配工具
│   │   │   ├── search-item-recipes.ts       # ✨ 装备合成工具
│   │   │   ├── search-hero-build.ts         # ✨ 英雄配装工具
│   │   │   └── search-item-tier.ts          # ✨ 装备排行工具
│   │   └── prompts/
│   │       ├── state-parser.ts              # ✨ State Parser prompt
│   │       └── decision-engine.ts           # ✨ Decision Engine prompt + 工具描述
│   └── types/
│       └── agent.ts                         # ✨ Agent 类型定义
├── tests/
│   ├── agent-eval.json                      # ✨ 50 条评测用例
│   └── eval.ts                              # ✨ 评测脚本
├── outputs/
│   ├── master-prd.md                        # ✨ 项目总 PRD
│   ├── v2.0/
│   │   ├── prd-v3.md                        # v2.0 PRD
│   │   └── architecture-v2.md               # v2.0 架构 + 流程图
│   └── v2.1/
│       ├── prd-v2.1-game-mode.md            # ✨ 吃鸡模式 PRD
│       ├── architecture-v2.1-agent.md       # ✨ Agent 架构
│       ├── prompt-v2.1.md                   # ✨ 完整 Prompt
│       ├── quality-plan.md                  # ✨ 质量保障方案
│       ├── business-view.md                 # ✨ 业务视角文档
│       └── eval-report.json                 # ✨ 评测报告
└── progress.md                              # 本文件
```

### 🔧 技术要点

- **AI**: DeepSeek Chat (`deepseek-chat`)，Function Call 模式
- **Agent 范式**: Plan-then-Execute（感知→规划→执行→合成→记忆）
- **数据 API**:
  - MetaTFT: hero_build + item_tier（实时）
  - Community Dragon: item_recipes + comps（本地缓存 JSON）
- **Session**: 内存 Map，30 分钟过期，后续迁 Upstash Redis
- **Node**: 开发用 v20.19.0（`%LOCALAPPDATA%\node-v20`）
- **部署**: Vercel（Hobby 计划，Function 10s 超时需注意）
- **Key**: `.env.local` 中配置 `DEEPSEEK_API_KEY`

### ❌ 待完成

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P1 | 部署 v2.1 到 Vercel | 推送到 GitHub → 自动部署 |
| P1 | State Parser 超时重试 | 解决偶发 12s 延迟 |
| P2 | comp_tier 接入 Tactics.Tools | 替代纯 AI 知识推荐 |
| P2 | Session 迁 Redis (Upstash) | 解决 Vercel 冷启动丢失 |
| P3 | 赛后复盘 | v2.3 |
| P3 | 用户偏好自动学习 | v2.3 |

### 🚀 启动方式

```bash
$env:PATH = "$env:LOCALAPPDATA\node-v20\node-v20.19.0-win-x64;" + $env:PATH
npm run dev -- --port 3003
```

### 📝 已知问题

- MetaTFT 无阵容 comps 接口，comp_tier 靠 AI 知识（非实时数据）
- State Parser 偶发高延迟（DeepSeek 波动）
- Session 为内存存储，Vercel 冷启动丢失