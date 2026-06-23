'use client'

import type { GameState } from '@/types/agent'
import { Plus, X, Heart, Coins } from 'lucide-react'

interface StatePanelProps {
  state: GameState;
  onOpenPicker: () => void;
  onRemoveEquipment: (index: number) => void;
}

const PREF_LABELS: Record<string, string> = {
  reroll: '赌狗',
  standard: '运营',
  fast9: '上9',
  any: '随缘',
}

export default function StatePanel({
  state,
  onOpenPicker,
  onRemoveEquipment,
}: StatePanelProps) {
  const prefLabel = state.preference ? PREF_LABELS[state.preference] : null;

  return (
    <div className='bg-zinc-900/80 backdrop-blur rounded-2xl p-4 space-y-3 border border-zinc-800'>

      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='w-2 h-2 rounded-full bg-green-400 animate-pulse' />
          <span className='text-white text-sm font-medium'>
            {state.round ? '回合 ' + state.round : '对局中'}
          </span>
        </div>
        {prefLabel && (
          <span className='px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium'>
            {prefLabel}
          </span>
        )}
      </div>

      {/* Equipment */}
      <div>
        <p className='text-zinc-500 text-xs mb-1.5'>装备池</p>
        <div className='flex flex-wrap gap-1.5'>
          {state.equipment.map((eq, i) => (
            <span
              key={i}
              className={'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs ' +
                (eq.type === 'basic'
                  ? 'bg-zinc-800 text-zinc-300'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30')}
            >
              {eq.name}
              <button onClick={() => onRemoveEquipment(i)} className='text-zinc-500 hover:text-red-400'>
                <X className='w-3 h-3' />
              </button>
            </span>
          ))}
          <button
            onClick={onOpenPicker}
            className='inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-zinc-800 text-zinc-500 hover:text-zinc-300 border border-dashed border-zinc-700 transition-colors'
          >
            <Plus className='w-3 h-3' /> 添加
          </button>
        </div>
      </div>

      {/* Augments & Board */}
      <div className='flex gap-3 text-xs'>
        {state.augments.length > 0 && (
          <div className='flex-1'>
            <p className='text-zinc-500 mb-1'>海克斯</p>
            <div className='flex flex-wrap gap-1'>
              {state.augments.map((a, i) => (
                <span key={i} className='px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300'>{a}</span>
              ))}
            </div>
          </div>
        )}
        {state.board.length > 0 && (
          <div className='flex-1'>
            <p className='text-zinc-500 mb-1'>场上英雄</p>
            <div className='flex flex-wrap gap-1'>
              {state.board.map((u, i) => (
                <span key={i} className='px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300'>{u.name} {u.star}星</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Health & Gold */}
      {(state.health !== null || state.gold !== null) && (
        <div className='flex gap-4 text-xs'>
          {state.health !== null && (
            <div className='flex items-center gap-1.5'>
              <Heart className={'w-3.5 h-3.5 ' + (state.health <= 30 ? 'text-red-400' : 'text-zinc-500')} />
              <span className={state.health <= 30 ? 'text-red-400 font-semibold' : 'text-zinc-400'}>
                {state.health}血
              </span>
            </div>
          )}
          {state.gold !== null && (
            <div className='flex items-center gap-1.5'>
              <Coins className='w-3.5 h-3.5 text-amber-400' />
              <span className='text-zinc-400'>{state.gold}金</span>
            </div>
          )}
        </div>
      )}

      {/* Target comp */}
      {state.targetComp && (
        <div className='text-xs'>
          <span className='text-zinc-500'>目标阵容: </span>
          <span className='text-zinc-300 font-medium'>{state.targetComp}</span>
        </div>
      )}
    </div>
  )
}