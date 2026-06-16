import { ReactNode } from "react"
import { Flame, Wrench, TrendingUp } from "lucide-react"

// =========================================================
// 通用卡片容器
// =========================================================
interface CardProps {
  title: string
  children: ReactNode
}

export function Card({ title, children }: CardProps) {
  return (
    <div className="bg-warmGray rounded-2xl p-4 animate-slide-up">
      <h3 className="text-[15px] font-medium text-textPrimary mb-3">{title}</h3>
      {children}
    </div>
  )
}

// =========================================================
// 通用统计行
// =========================================================
export function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-divider last:border-0">
      <span className="text-[14px] text-textSecondary">{label}</span>
      <span className={`text-[15px] font-medium ${highlight ? "text-success" : "text-textPrimary"}`}>{value}</span>
    </div>
  )
}

// =========================================================
// comp_tier 阵容卡片
// =========================================================
interface CompItem {
  name: string
  trait?: string
  avg: number
  top4: number
  win: number
  difficulty?: string
  coreUnits?: string[]
  coreItems?: Record<string, string[]>
  recommendedAugments?: string[]
  howToPlay?: string
}

interface CompTierCardProps {
  comps: CompItem[]
  filter?: string | null
  source?: string
}

export function CompTierCard({ comps, filter, source }: CompTierCardProps) {
  return (
    <div className="bg-warmGray rounded-2xl p-4 animate-slide-up">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-medium text-textPrimary flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500" />
          强势阵容{filter ? ` · ${filter}` : ""}
        </h3>
        {source && (
          <span className="text-[10px] text-textSecondary/60">{source}</span>
        )}
      </div>

      {/* 阵容列表 */}
      {comps.map((comp, i) => (
        <div key={i} className="py-3 border-b border-divider last:border-0">
          {/* 阵容名 + 数据 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-accent text-[14px] font-semibold">#{i + 1}</span>
              <span className="text-[15px] font-semibold text-textPrimary truncate">{comp.name}</span>
              {comp.difficulty && (
                <span className="text-[10px] text-textSecondary bg-white rounded-full px-2 py-0.5 flex-shrink-0">
                  {comp.difficulty}难度
                </span>
              )}
            </div>
          </div>

          {/* 数据条 */}
          <div className="flex gap-3 mb-2.5">
            <span className="text-[12px]">
              <span className="text-textSecondary">avg </span>
              <strong className="text-accent">{comp.avg}</strong>
            </span>
            <span className="text-[12px]">
              <span className="text-textSecondary">前四 </span>
              <strong className="text-success">{comp.top4}%</strong>
            </span>
            <span className="text-[12px]">
              <span className="text-textSecondary">吃鸡 </span>
              <strong className="text-textPrimary">{comp.win}%</strong>
            </span>
          </div>

          {comp.trait && (
            <p className="text-[11px] text-accent/70 mb-2">{comp.trait}</p>
          )}

          {/* 核心英雄 */}
          {comp.coreUnits && comp.coreUnits.length > 0 && (
            <div className="mb-2.5">
              <p className="text-[10px] text-textSecondary/60 mb-1.5">核心英雄</p>
              <div className="flex flex-wrap gap-1.5">
                {comp.coreUnits.map((unit, j) => (
                  <span key={j} className="px-2.5 py-1 rounded-lg bg-white text-[12px] text-textPrimary border border-divider">
                    {unit}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 关键装备 */}
          {comp.coreItems && Object.keys(comp.coreItems).length > 0 && (
            <div className="mb-2.5">
              <p className="text-[10px] text-textSecondary/60 mb-1.5">关键装备</p>
              <div className="space-y-1">
                {Object.entries(comp.coreItems).map(([hero, items]) => (
                  <div key={hero} className="text-[12px]">
                    <strong className="text-textPrimary">{hero}</strong>
                    <span className="text-textSecondary">: {items.join(" · ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 推荐海克斯 */}
          {comp.recommendedAugments && comp.recommendedAugments.length > 0 && (
            <div className="mb-2.5">
              <p className="text-[10px] text-textSecondary/60 mb-1.5">推荐海克斯</p>
              <div className="flex flex-wrap gap-1">
                {comp.recommendedAugments.map((aug, j) => (
                  <span key={j} className="px-2 py-0.5 rounded-full bg-accentLight text-[10px] text-accent">
                    {aug}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 说明 */}
          {comp.howToPlay && (
            <p className="text-[11px] text-textSecondary/70 leading-relaxed mt-1">
              {comp.howToPlay}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// =========================================================
// item_recipe 装备合成卡片
// =========================================================
interface RecipeItem {
  name: string
  icon: string
  from?: string[]
  avg?: number
  top4?: number
  win?: number
}

interface ItemRecipeCardProps {
  inputItems: string[]
  recipes: RecipeItem[]
  message?: string
}

export function ItemRecipeCard({ inputItems, recipes, message }: ItemRecipeCardProps) {
  // 按 avg 排序
  const sorted = [...recipes].sort((a, b) => (a.avg ?? 99) - (b.avg ?? 99))

  return (
    <div className="bg-warmGray rounded-2xl p-4 animate-slide-up">
      {/* 头部：散件 */}
      <div className="flex items-center gap-1.5 mb-1">
        <Wrench className="w-4 h-4 text-textSecondary" />
        <h3 className="text-[15px] font-medium text-textPrimary">装备合成</h3>
      </div>
      <p className="text-[12px] text-textSecondary mb-3">
        你的散件：{inputItems.join(" · ")}
      </p>

      {sorted.length === 0 ? (
        <p className="text-[13px] text-textSecondary py-4 text-center">
          {message || "未找到可合成的装备组合"}
        </p>
      ) : (
        <>
          {/* 可合成列表 */}
          {sorted.map((r, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-divider last:border-0">
              <span className="text-textSecondary text-[12px] w-5">#{i + 1}</span>
              {r.icon && (
                <img src={r.icon} alt="" className="w-8 h-8 rounded-lg bg-white p-0.5 shadow-card" loading="lazy"
                  onError={e => (e.currentTarget.style.display = "none")} />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[14px] text-textPrimary block truncate">{r.name}</span>
                {r.from && (
                  <span className="text-[11px] text-textSecondary">{r.from[0]} + {r.from[1]}</span>
                )}
              </div>
              {r.avg != null && (
                <div className="text-right flex-shrink-0">
                  <span className="text-[13px] font-semibold text-accent">{r.avg}名</span>
                  {r.top4 != null && (
                    <span className="text-[10px] text-textSecondary block">前四 {r.top4}%</span>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* 底部推荐 */}
          {sorted.length > 1 && sorted[0].avg != null && (
            <div className="mt-3 flex items-center gap-2 text-[12px]">
              <TrendingUp className="w-3.5 h-3.5 text-success" />
              <span className="text-textSecondary">
                推荐优先合成 <strong className="text-textPrimary">{sorted[0].name}</strong>（avg {sorted[0].avg}名）
              </span>
            </div>
          )}

          <p className="text-[10px] text-textSecondary/50 mt-3">
            合成数据来自 Community Dragon
          </p>
        </>
      )}
    </div>
  )
}