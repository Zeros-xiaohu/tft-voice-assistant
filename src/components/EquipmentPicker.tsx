'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { BASIC_ITEMS, COMPLETED_ITEMS } from '@/lib/alias-map'
import type { EquipmentEntry } from '@/types/agent'

interface EquipmentPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (items: EquipmentEntry[]) => void
  currentEquipment: EquipmentEntry[]
}

export default function EquipmentPicker({
  open,
  onClose,
  onSelect,
  currentEquipment,
}: EquipmentPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'basic' | 'completed'>('basic')

  if (!open) return null

  const items = tab === 'basic' ? BASIC_ITEMS : COMPLETED_ITEMS

  const toggle = (name: string) => {
    const next = new Set(selected)
    if (next.has(name)) next.delete(name); else next.add(name);
    setSelected(next);
  }

  const confirm = () => {
    const entries: EquipmentEntry[] = [];
    for (const name of selected) {
      const type: 'basic' | 'completed' = BASIC_ITEMS.includes(name) ? 'basic' : 'completed';
      entries.push({ name, type });
    }
    onSelect([...currentEquipment, ...entries]);
    setSelected(new Set());
    onClose();
  }

  const tabs: Array<{ key: 'basic' | 'completed'; label: string }> = [
    { key: 'basic', label: '散件' },
    { key: 'completed', label: '成品' },
  ]

  return (
    <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/50' onClick={onClose}>
      <div
        className='w-full max-w-md bg-zinc-900 rounded-t-3xl p-5 animate-slide-up'
        onClick={e => e.stopPropagation()}
      >
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-white text-lg font-semibold'>选择装备</h3>
          <button onClick={onClose} className='text-zinc-400 hover:text-white'><X className='w-5 h-5' /></button>
        </div>

        {/* Tabs */}
        <div className='flex gap-2 mb-4'>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={'px-4 py-1.5 rounded-full text-sm transition-all ' +
                (tab === t.key ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400')}
            >{t.label}</button>
          ))}
        </div>

        {/* Grid */}
        <div className='grid grid-cols-4 gap-2 mb-5 max-h-64 overflow-y-auto'>
          {items.map(name => {
            const isSel = selected.has(name);
            return (
              <button
                key={name}
                onClick={() => toggle(name)}
                className={'py-2 px-1 rounded-xl text-xs text-center transition-all border ' +
                  (isSel ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500')}
              >{name}</button>
            );
          })})
        </div>

        {/* Confirm */}
        <button
          onClick={confirm}
          disabled={selected.size === 0}
          className='w-full py-3 rounded-2xl bg-indigo-500 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all'
        >
          添加 {selected.size} 件装备
        </button>
      </div>
    </div>
  )
}