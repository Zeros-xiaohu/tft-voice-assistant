'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, TrendingUp, AlertTriangle } from 'lucide-react'
import type { AgentAdvice } from '@/types/agent'

interface AgentAdviceCardProps {
  advice: AgentAdvice
}

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-zinc-600',
}

const PRIORITY_BORDER: Record<string, string> = {
  high: 'border-l-red-400 bg-red-400/5',
  medium: 'border-l-amber-400 bg-amber-400/5',
  low: 'border-l-zinc-600 bg-zinc-800/50',
}

export default function AgentAdviceCard({ advice }: AgentAdviceCardProps) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

  const confPct = Math.round((advice.confidence || 0) * 100)
  const confColor =
    confPct >= 70 ? 'bg-green-400' : confPct >= 50 ? 'bg-amber-400' : 'bg-red-400'

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 animate-fade-in space-y-4">
      {/* Summary */}
      {advice.summary ? (
        <div className="flex items-start gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-zinc-300 leading-relaxed">{advice.summary}</p>
        </div>
      ) : null}

      {/* Comp Direction */}
      {advice.compDirection?.name ? (
        <section className="bg-zinc-800/50 rounded-xl p-3">
          <h4 className="text-xs text-zinc-500 mb-2">🎯 推荐阵容</h4>
          <p className="text-white font-semibold text-base">{advice.compDirection.name}</p>
          <p className="text-xs text-zinc-400 mt-1">{advice.compDirection.reason}</p>

          {advice.compDirection.coreChampions?.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-2">
              {advice.compDirection.coreChampions.map((ch, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-zinc-700 text-zinc-300 text-xs">
                  {ch}
                </span>
              ))}
            </div>
          ) : null}

          {advice.compDirection.stats?.avg > 0 ? (
            <div className="flex gap-3 mt-2 text-xs">
              <span className="text-zinc-500">
                avg <span className="text-zinc-300">{advice.compDirection.stats.avg}</span>
              </span>
              <span className="text-zinc-500">
                前四率{' '}
                <span className="text-green-400">
                  {Math.round(advice.compDirection.stats.top4Rate * 100)}%
                </span>
              </span>
              <span className="text-zinc-500">
                胜率{' '}
                <span className="text-amber-400">
                  {Math.round(advice.compDirection.stats.winRate * 100)}%
                </span>
              </span>
            </div>
          ) : null}

          {advice.compDirection.alternatives?.length > 0 ? (
            <p className="text-xs text-zinc-600 mt-1">
              备选: {advice.compDirection.alternatives.join(', ')}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Equipment Allocation */}
      {advice.equipmentAllocation?.length > 0 ? (
        <section>
          <h4 className="text-xs text-zinc-500 mb-2">📦 装备分配</h4>
          <div className="space-y-2">
            {advice.equipmentAllocation.map((eq, i) => (
              <div key={i} className="flex items-start gap-2">
                <span
                  className={
                    (PRIORITY_DOT[eq.priority] || 'bg-zinc-600') +
                    ' w-2 h-2 rounded-full mt-1.5 flex-shrink-0'
                  }
                />
                <div>
                  <p className="text-sm text-zinc-300">{eq.recipe}</p>
                  {eq.target ? (
                    <p className="text-xs text-zinc-500">→ {eq.target}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Actions */}
      {advice.actions?.length > 0 ? (
        <section>
          <h4 className="text-xs text-zinc-500 mb-2">⚡ 行动建议</h4>
          <div className="space-y-2">
            {advice.actions.map((act, i) => (
              <div
                key={i}
                className={
                  'border-l-2 rounded-r-lg px-3 py-2 text-sm ' +
                  (PRIORITY_BORDER[act.priority] || PRIORITY_BORDER.low)
                }
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={
                      (PRIORITY_DOT[act.priority] || 'bg-zinc-600') +
                      ' w-1.5 h-1.5 rounded-full'
                    }
                  />
                  <span className="text-zinc-300">{act.description}</span>
                </div>
                <p className="text-xs text-zinc-500 ml-3.5">{act.reason}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Risks */}
      {advice.risks?.length > 0 ? (
        <section className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <h4 className="text-xs text-amber-400 font-medium">风险提醒</h4>
          </div>
          <ul className="space-y-1">
            {advice.risks.map((r, i) => (
              <li key={i} className="text-xs text-amber-300/80 flex items-start gap-1.5">
                <span className="mt-1">·</span>
                {r}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Followup */}
      {advice.followup ? (
        <div className="bg-indigo-500/10 border border-indigo-400/20 rounded-xl px-3 py-2.5">
          <p className="text-xs text-indigo-300">💬 {advice.followup}</p>
        </div>
      ) : null}

      {/* Confidence bar + Feedback */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600">置信度</span>
          <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={'h-full rounded-full transition-all ' + confColor}
              style={{ width: confPct + '%' }}
            />
          </div>
          <span className="text-xs text-zinc-500">{confPct}%</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
            className={
              'p-1.5 rounded-lg transition-colors ' +
              (feedback === 'up'
                ? 'bg-green-400/10 text-green-400'
                : 'text-zinc-600 hover:text-zinc-400')
            }
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
            className={
              'p-1.5 rounded-lg transition-colors ' +
              (feedback === 'down'
                ? 'bg-red-400/10 text-red-400'
                : 'text-zinc-600 hover:text-zinc-400')
            }
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}