# TFT Voice Assistant — 开发进度

**项目**: 云顶之弈语音数据助手  
**仓库**: `D:\tft-voice-assistant`  
**远程**: https://github.com/Zeros-xiaohu/tft-voice-assistant  
**最后更新**: 2026-06-16 凌晨

---

## 当前状态：英雄配装功能已完成

### ✅ 已完成

| 模块 | 文件 | 说明 |
|------|------|------|
| 项目骨架 | package.json / next.config.js / tailwind / tsconfig | Next.js 14 + TypeScript + Tailwind |
| 布局 | `src/app/layout.tsx` | PWA metadata，移动端优先 |
| 全局样式 | `src/app/globals.css` | 自定义动画 + Tailwind 主题色 |
| 主页面 | `src/app/page.tsx` (~340行) | 语音输入 + 文字输入 + 结果卡片 |
| API 路由 | `src/app/api/query/route.ts` (~270行) | DeepSeek 意图解析 + MetaTFT 数据代理 |
| 组件 | VoiceButton.tsx / QueryCard.tsx | 语音按钮 + 卡片组件 |
| 工具函数 | `src/lib/utils.ts` | cn() 类名合并 |
| 语音输入 | Web Speech API | 浏览器原生中文识别 |
| 文字输入 | 输入框 + 快捷按钮 | 降级方案 |
| AI 意图 | DeepSeek Chat API | JSON 格式意图解析 |
| 装备排行 | `item_tier` | Top 12 装备，按 avg 排序，含 top4/win |
| **英雄配装** | `hero_build` | ✨ 核心功能 |

### 英雄配装功能详情

**数据源**:
- 装备列表 + 排序：`tft-comps-api/unit_items_processed`（按英雄出场率排序）
- 装备统计（avg/top4/win）：`tft-explorer-api/items?unit_unique=`（按英雄 + 3天 + 全段位筛选）
- 英雄 stats：`tft-explorer-api/total?unit_unique=`（英雄胜率/对局数）

**展示内容**:
| 卡片区域 | 内容 |
|----------|------|
| 标题 | `{英雄名} · 近三天 · 大师宗师王者 · 大数据` |
| 英雄概览 | 英雄平均排名 / 英雄胜率 / 英雄对局数 |
| 装备表格 | 平均名次 / 前四率 / 胜率 / 选取次数 |

**支持英雄**: 70+ 英雄中英文名映射（从金克斯到李青）

**缓存**: 5 分钟内存缓存

### ❌ 待完成

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P1 | 阵容排行 comp_tier | 意图解析已支持，数据获取未实现 |
| P2 | 英雄克制 hero_counter | 意图 + 数据 |
| P2 | 装备合成 item_recipe | 意图 + 数据 |
| P2 | VoiceButton 组件复用 | page.tsx 内联了语音逻辑 |
| P3 | PWA manifest + icons | 192/512 图标 |
| P3 | 错误处理完善 | 更多边界情况 |

### 🔧 技术要点

- **AI**: DeepSeek Chat (`deepseek-chat`)，JSON 意图解析，temperature 0.01
- **数据 API**:
  - `api-hc.metatft.com/tft-comps-api/unit_items_processed` — 英雄装备列表
  - `api-hc.metatft.com/tft-stat-api/items` — 全局装备统计（装备排行用）
  - `api-hc.metatft.com/tft-explorer-api/items?unit_unique=` — 英雄专属装备统计
  - `api-hc.metatft.com/tft-explorer-api/total?unit_unique=` — 英雄总体数据
- **筛选条件**: days=3 / patch=current / 全段位
- **排序**: 按英雄出场率（unit_items_processed 原始顺序）
- **Node**: 开发用 v20.19.0（临时安装到 `%LOCALAPPDATA%\node-v20`），全局 Node 16 不支持
- **部署**: Vercel（standalone 模式）
- **Key**: `.env.local` 中配置 `DEEPSEEK_API_KEY`

### 📁 关键文件结构

```
D:\tft-voice-assistant\
├── src/
│   ├── app/
│   │   ├── page.tsx              # 主页面（语音/文字输入 + 结果展示）
│   │   ├── layout.tsx            # 根布局 + PWA meta
│   │   ├── globals.css           # Tailwind + 动画
│   │   └── api/query/route.ts    # API 路由（DeepSeek + MetaTFT）
│   ├── components/
│   │   ├── VoiceButton.tsx       # 语音按钮（独立，未在 page 中使用）
│   │   └── QueryCard.tsx         # 卡片组件
│   └── lib/
│       └── utils.ts              # cn() 工具
├── .env.local                    # DEEPSEEK_API_KEY
├── progress.md                   # 本文件
└── package.json
```

### 🚀 启动方式

```bash
npm run dev --port 3001    # 需要 Node >= 18.17
```

### 📝 已知问题

- `选取次数` 与 Explorer 页面频率有差异（Explorer 可能有隐式 level 6-10 过滤）
- `VoiceButton` 组件未复用，语音逻辑在 page.tsx 中内联
- Node 16 全局，需临时用 Node 20 启动
