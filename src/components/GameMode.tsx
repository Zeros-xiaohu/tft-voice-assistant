'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, ArrowUp, Play, RotateCcw, Flag } from 'lucide-react'
import StatePanel from './StatePanel'
import AgentAdviceCard from './AgentAdviceCard'
import EquipmentPicker from './EquipmentPicker'
import type { GameState, AgentAdvice, EquipmentEntry, AgentResponse } from '@/types/agent'

interface Message {
  role: 'user' | 'assistant'
  text: string
  advice?: AgentAdvice
  loading?: boolean
}

type GameStatus = 'idle' | 'active' | 'finished'

const PREF_OPTIONS = [
  { key: 'reroll', label: '赌狗', desc: '低费主C追3星' },
  { key: 'standard', label: '运营', desc: '4费主C正常节奏' },
  { key: 'fast9', label: '上9', desc: '存钱速升9级' },
  { key: 'any', label: '随缘', desc: '根据来牌动态调整' },
]

export default function GameMode() {
  const [status, setStatus] = useState<GameStatus>('idle')
  const [sessionId, setSessionId] = useState<string>('')
  const [gameState, setGameState] = useState<GameState>({
    round: null, equipment: [], augments: [], board: [],
    health: null, gold: null, preference: null, targetComp: null,
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Voice
  const toggleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const r = new SR()
    r.lang = 'zh-CN'
    r.interimResults = false
    r.maxAlternatives = 1
    r.onstart = () => setListening(true)
    r.onend = () => setListening(false)
    r.onerror = (e: any) => {
      setListening(false)
      if (e.error === 'no-speech') sendToAgent('没听清')
    }
    r.onresult = (e: any) => {
      const t = e.results[0][0].transcript.trim()
      if (t) sendToAgent(t)
    }
    recognitionRef.current = r
    r.start()
  }

  // Submit text
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    sendToAgent(input.trim())
    setInput('')
  }

  // Start new game
  const startGame = async (preference?: string) => {
    setStatus('active')
    setMessages([])
    setLoading(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: preference ? '想玩' + preference : '开始新对局',
          mode: 'game',
          sessionId: '',
          action: 'new_game',
        }),
      })
      const data: AgentResponse = await res.json()
      setSessionId(data.sessionId)
      if (data.gameState) {
        if (preference) data.gameState.preference = preference as any
        setGameState(data.gameState)
      }
      if (data.advice) {
        setMessages([{ role: 'assistant', text: data.advice.summary || '', advice: data.advice }])
      }
    } catch {
      setMessages([{ role: 'assistant', text: '启动失败，请稍后再试' }])
    } finally {
      setLoading(false)
    }
  }

  // Send to agent
  const sendToAgent = async (text: string) => {
    if (!text.trim()) return
    setMessages(prev => [...prev, { role: 'user', text }])
    setLoading(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          mode: 'game',
          sessionId,
          action: status === 'idle' ? 'new_game' : 'update',
        }),
      })
      const data: AgentResponse = await res.json()

      if (data.sessionId && !sessionId) setSessionId(data.sessionId)

      if (data.gameState) setGameState(data.gameState)

      if (data.message) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.message! }])
      } else if (data.advice) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.advice!.summary || '', advice: data.advice }])
      }

      if (status === 'idle') setStatus('active')
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: '网络开小差了，请重试' }])
    } finally {
      setLoading(false)
    }
  }

  // End game
  const endGame = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '结束对局', mode: 'game', sessionId, action: 'end_game' }),
      })
      const data = await res.json()
      setStatus('finished')
      if (data.advice) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.advice.summary || '对局已结束', advice: data.advice }])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  // Equipment handlers
  const handleAddEquipment = (items: EquipmentEntry[]) => {
    setGameState(prev => ({ ...prev, equipment: items }))
  }

  const handleRemoveEquipment = (index: number) => {
    setGameState(prev => ({
      ...prev,
      equipment: prev.equipment.filter((_, i) => i !== index),
    }))
  }

  // Idle screen
  if (status === 'idle') {
    return (
      <div className="min-h-dvh flex flex-col bg-zinc-950">
        <div className="flex-1 flex flex-col items-center justify-center px-6 space-y-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🍗</div>
            <h1 className="text-2xl font-bold text-white mb-2">吃鸡模式</h1>
            <p className="text-zinc-400 text-sm">
              AI 实时辅助决策 · 语音交互 · 记住对局状态
            </p>
          </div>

          <div className="w-full max-w-xs space-y-3">
            <p className="text-xs text-zinc-500 text-center">选择你的游戏偏好</p>
            <div className="grid grid-cols-2 gap-2">
              {PREF_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => startGame(opt.label)}
                  className="bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-2xl p-3 text-left transition-all active:scale-[0.98]"
                >
                  <p className="text-white text-sm font-medium">{opt.label}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => startGame()}
              className="w-full py-3 rounded-2xl bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Play className="w-4 h-4" /> 直接开始
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Active / Finished
  return (
    <div className="min-h-dvh flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={'w-2 h-2 rounded-full ' + (status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-zinc-600')} />
          <span className="text-white text-sm font-medium">
            {status === 'active' ? '对局中' : '对局结束'}
          </span>
          {gameState.round ? (
            <span className="text-xs text-zinc-500 ml-1">回合 {gameState.round}</span>
          ) : null}
        </div>
        {status === 'active' ? (
          <button
            onClick={endGame}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-400 text-xs hover:text-red-400 transition-colors disabled:opacity-40"
          >
            <Flag className="w-3 h-3" /> 结束
          </button>
        ) : (
          <button
            onClick={() => { setStatus('idle'); setSessionId(''); setMessages([]); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-400 text-xs hover:text-white transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> 新对局
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {messages.length === 0 && status === 'active' ? (
          <div className="text-center py-12 space-y-3">
            <div className="text-4xl">🎤</div>
            <p className="text-zinc-500 text-sm">告诉我你的局面</p>
            <p className="text-zinc-700 text-xs">例如：我3-2，反曲弓大剑，想玩赌狗</p>
          </div>
        ) : null}

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-end' : ''}>
            {msg.role === 'user' ? (
              <div className="bg-indigo-500/15 text-indigo-300 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%] text-sm animate-fade-in">
                {msg.text}
              </div>
            ) : msg.loading ? (
              <div className="flex gap-1 px-1">
                <div className="w-2 h-2 rounded-full bg-indigo-400/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-indigo-400/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-indigo-400/30 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : msg.advice ? (
              <AgentAdviceCard advice={msg.advice} />
            ) : (
              <div className="text-sm text-zinc-400 whitespace-pre-line px-1 animate-fade-in">
                {msg.text}
              </div>
            )}
          </div>
        ))}

        {loading && messages.length > 0 && !messages[messages.length - 1]?.loading ? (
          <div className="flex gap-1 px-1">
            <div className="w-2 h-2 rounded-full bg-indigo-400/30 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-indigo-400/30 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-indigo-400/30 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {/* State panel (compact, above input) */}
      {status === 'active' ? (
        <div className="px-4 pb-1">
          <StatePanel
            state={gameState}
            onOpenPicker={() => setPickerOpen(true)}
            onRemoveEquipment={handleRemoveEquipment}
          />
        </div>
      ) : null}

      {/* Input area */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex justify-center mb-3 relative">
          {listening ? (
            <>
              <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-pulse-ring" />
              <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
            </>
          ) : null}
          <button
            onClick={toggleMic}
            disabled={loading || status === 'finished'}
            className={
              'relative z-10 w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ' +
              (listening
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white') +
              (loading || status === 'finished' ? ' opacity-40' : '')
            }
          >
            {listening ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
          </button>
        </div>

        <form onSubmit={submit} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 h-[48px]">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={
              status === 'active'
                ? '告诉我你的局面...'
                : '输入第几名结束对局'
            }
            disabled={loading || status === 'finished'}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none"
          />
          {input.trim() ? (
            <button
              type="submit"
              disabled={loading || status === 'finished'}
              className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center active:scale-90 transition-transform"
            >
              <ArrowUp className="w-3.5 h-3.5 text-white" />
            </button>
          ) : null}
        </form>

        {/* Quick tags for active game */}
        {status === 'active' && messages.length <= 1 ? (
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {['我的装备', '推荐阵容', '装备排行', '结束对局'].map(tag => (
              <button
                key={tag}
                onClick={() => sendToAgent(tag)}
                className="px-3 py-1.5 rounded-full bg-zinc-900 text-xs text-zinc-500 border border-zinc-800 active:bg-indigo-500/20 active:text-indigo-300 active:border-indigo-500/30 transition-all"
              >
                {tag}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Equipment picker modal */}
      <EquipmentPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAddEquipment}
        currentEquipment={gameState.equipment}
      />
    </div>
  )
}