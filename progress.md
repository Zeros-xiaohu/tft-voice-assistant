# TFT Voice Assistant — 开发进度

**项目**: 云顶之弈语音数据助手
**仓库**: `D:\tft-voice-assistant`
**最后更新**: 2026-06-16 01:00

---

## 当前状态：MVP 核心功能已完成，装备统计增强完毕

### ✅ 已完成

| 模块 | 文件 | 状态 |
|------|------|------|
| 项目骨架 | `package.json`, `next.config.js`, `tailwind.config.ts`, `tsconfig.json` | ✅ |
| 布局 | `src/app/layout.tsx` + PWA metadata | ✅ |
| 全局样式 | `src/app/globals.css` + Tailwind 主题色 | ✅ |
| 主页面 | `src/app/page.tsx` (~320行) | ✅ |
| API 路由 | `src/app/api/query/route.ts` (~290行) | ✅ |
| 组件 | `VoiceButton.tsx`, `QueryCard.tsx` | ✅ |
| 工具函数 | `src/lib/utils.ts` (cn) | ✅ |
| 数据源 | MetaTFT API 代理 (装备 + 英雄数据) | ✅ |
| AI 意图 | DeepSeek API 意图解析 | ✅ |
| 语音输入 | Web Speech API (中文) | ✅ |
| 文字输入 | 输入框 + 快捷按钮 | ✅ |
| 装备排行 | `item_tier` — Top 12 装备卡片 (avg + top4%) | ✅ |
| 英雄配装 | `hero_build` — 5 件推荐装备 + avg/top4/win + 名次变化 | ✅ |
| **装备统计增强** | 关联 `/tft-stat-api/items` 获取 places 分布，计算 avg/top4/win rate | ✅ |
| **英雄概览卡** | 平均排名、登场率、对局数三指标卡片 | ✅ |
| **名次变化趋势** | 每件装备 vs 全局基线的 avg 变化 (↑↓ 箭头) | ✅ |

### ❌ 待完成

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P1 | **阵容排行 comp_tier** | 意图解析已支持，API 路由中数据获取未实现 |
| P1 | 数据显示验证 | 确认 MetaTFT API 返回的 format 在各种英雄下正确 |
| P2 | 英雄克制 hero_counter | 意图解析 + 数据获取 |
| P2 | 装备合成 item_recipe | 意图解析 + 数据获取 |
| P2 | VoiceButton 组件复用 | page.tsx 目前内联了语音逻辑，未用独立组件 |
| P3 | PWA manifest + icons | 192x192 / 512x512 图标 |
| P3 | 错误处理完善 | 更多边界情况 |

### 🔧 技术要点

- **AI**: DeepSeek Chat API (`deepseek-chat`)，意图解析用 JSON 格式 prompt
- **数据**: 
  - `api-hc.metatft.com/tft-comps-api/unit_items_processed` — 英雄装备列表
  - `api-hc.metatft.com/tft-stat-api/items` — 装备 places 分布
  - 两个 API 关联匹配，计算 avg/top4/win rate + 基准线对比
- **缓存**: 内存缓存，5 分钟 TTL
- **部署**: Vercel (standalone 模式)
- **UI**: 移动端优先，iOS 风格设计
- **Node**: 需要 v18.17+，当前临时使用 `%LOCALAPPDATA%\node-v20\node-v20.19.0-win-x64`

### 📁 关键文件

```
D:\tft-voice-assistant\
├── src/
│   ├── app/
│   │   ├── page.tsx          # 主页面 (语音+文字输入+结果展示)
│   │   ├── layout.tsx        # 根布局 + PWA meta
│   │   ├── globals.css       # Tailwind + 自定义动画
│   │   └── api/query/route.ts # API 路由 (DeepSeek意图 + MetaTFT双API)
│   ├── components/
│   │   ├── VoiceButton.tsx   # 语音按钮组件 (独立，暂未在 page 中使用)
│   │   └── QueryCard.tsx     # 卡片组件 (Card + StatRow)
│   └── lib/
│       └── utils.ts          # cn() 工具函数
├── tools/                    # 数据探索工具
│   ├── metatft_js.js         # MetaTFT 原始 JS 数据
│   ├── explorer.html         # 数据探索页面
│   └── test_deepseek.json    # DeepSeek 测试
├── .env.local                # DEEPSEEK_API_KEY (已配置)
├── progress.md               # 本文件
└── package.json
```

### 🚀 下一步

1. 实现阵容排行 `comp_tier` 的 MetaTFT 数据获取
2. 安装 nvm/fnm 管理 Node 版本，避免每次手动指定路径
3. 真机测试 PWA + 语音识别
4. 根据可视化结果调整 UI/数据
