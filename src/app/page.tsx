"use client"

import { useState, useRef, useEffect } from "react"
import { Mic, MicOff, ArrowUp, Database, Trophy, Drumstick, ArrowLeft, X } from "lucide-react"

type Mode = "home" | "battle" | "game"

interface Message {
  role: "user" | "assistant"
  text: string
  result?: any
}

// =========================================================
// Toast 组件
// =========================================================
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="flex items-center gap-3 bg-textPrimary text-white rounded-2xl px-5 py-3.5 shadow-lg">
        <Drumstick className="w-5 h-5 text-amber-400" />
        <span className="text-[14px] font-medium">{message}</span>
        <button onClick={onClose} className="ml-1 text-white/60 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// =========================================================
// 首页 — 双卡入口
// =========================================================
function HomeScreen({ onEnter }: { onEnter: (mode: Mode) => void }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-10 bg-white">
      {/* Header */}
      <div className="text-center mb-10 animate-fade-in">
        <h1 className="text-[28px] font-bold text-textPrimary tracking-tight">
          云顶语音助手
        </h1>
        <p className="text-[14px] text-textSecondary mt-2">
          语音查数据 · AI 决策建议 · 无需安装
        </p>
      </div>

      {/* Two cards */}
      <div className="w-full max-w-sm space-y-4">
        {/* 对战模式 */}
        <button
          onClick={() => onEnter("battle")}
          className="w-full text-left bg-warmGray rounded-2xl p-5 active:scale-[0.97] transition-transform animate-slide-up shadow-card"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-accentLight flex items-center justify-center flex-shrink-0">
              <Trophy className="w-7 h-7 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[18px] font-semibold text-textPrimary">对战模式</h2>
              <p className="text-[13px] text-textSecondary mt-1.5 leading-relaxed">
                版本强势阵容 · 装备排行 · 英雄配装
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {["阵容推荐", "装备排行", "英雄配装", "装备合成"].map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-full bg-white text-[11px] text-textSecondary border border-divider">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </button>

        {/* 吃鸡模式 */}
        <button
          onClick={() => onEnter("game")}
          className="w-full text-left bg-warmGray rounded-2xl p-5 active:scale-[0.97] transition-transform animate-slide-up shadow-card"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-warmGray flex items-center justify-center flex-shrink-0 border border-divider">
              <Drumstick className="w-7 h-7 text-textSecondary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[18px] font-semibold text-textPrimary">吃鸡模式</h2>
              <p className="text-[13px] text-textSecondary mt-1.5 leading-relaxed">
                实时对局追踪 · AI 决策建议
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-[11px] text-amber-600 border border-amber-100">
                  即将上线
                </span>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Footer */}
      <p className="text-center text-[11px] text-textSecondary/50 mt-10 flex items-center gap-1">
        <Database className="w-2.5 h-2.5" /> MetaTFT &amp; DeepSeek
      </p>
    </div>
  )
}

// =========================================================
// 对战模式页面（现有 MVP 的聊天界面）
// =========================================================
function BattleScreen({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "欢迎使用对战模式！\n试试说「装备排行」「什么阵容强」「反曲弓和大剑能合什么」" },
  ])
  const [input, setInput] = useState("")
  const [listening, setListening] = useState(false)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const sendQuery = async (text: string) => {
    if (!text.trim()) return
    setMessages(prev => [...prev, { role: "user", text }])
    setLoading(true)
    try {
      const res = await fetch("/api/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: text }) })
      const data = await res.json()
      setMessages(prev => [...prev, { role: "assistant", text, result: data }])
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text, result: { type: "error", message: "网络开小差了" } }])
    } finally { setLoading(false) }
  }

  const toggleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { sendQuery("语音识别"); return }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
    const r = new SR(); r.lang = "zh-CN"; r.interimResults = false; r.maxAlternatives = 1
    r.onstart = () => setListening(true)
    r.onend = () => setListening(false)
    r.onerror = (e: any) => { setListening(false); if (e.error === "no-speech") sendQuery("没听清") }
    r.onresult = (e: any) => { const t = e.results[0][0].transcript.trim(); if (t) sendQuery(t) }
    recognitionRef.current = r; r.start()
  }

  const submit = (e: React.FormEvent) => { e.preventDefault(); if (input.trim()) { sendQuery(input.trim()); setInput("") } }

  const renderResult = (result: any) => {
    if (result.type === "item_tier") {
      return (
        <div className="bg-warmGray rounded-2xl p-4 animate-slide-up">
          <p className="text-[15px] font-medium text-textPrimary mb-3">装备排行</p>
          {result.data.items?.slice(0, 12).map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-divider last:border-0">
              <span className="text-textSecondary text-[12px] w-5">#{i + 1}</span>
              {item.icon && (
                <img src={item.icon} alt="" className="w-8 h-8 rounded-lg bg-white p-0.5 shadow-card" loading="lazy"
                  onError={e => (e.currentTarget.style.display = "none")}
                />
              )}
              <span className="flex-1 text-[14px] text-textPrimary truncate">{item.name}</span>
              <div className="text-right">
                <span className="text-[13px] font-semibold text-accent">{item.avg}名</span>
                {item.top4 != null && <span className="text-[10px] text-textSecondary block">前四{item.top4}%</span>}
              </div>
            </div>
          ))}
          {result.data.patch && (
            <p className="text-[10px] text-textSecondary/60 mt-3 flex items-center gap-1"><Database className="w-2.5 h-2.5" /> {result.data.patch}</p>
          )}
        </div>
      )
    }

    if (result.type === "comp_tier") {
      const comps = result.data.comps
      return (
        <div className="bg-warmGray rounded-2xl p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[15px] font-medium text-textPrimary">
              强势阵容{result.data.filter ? ` · ${result.data.filter}` : ""}
            </p>
            <span className="text-[10px] text-textSecondary/60">{result.data.source}</span>
          </div>
          {comps?.map((comp: any, i: number) => (
            <div key={i} className="py-3 border-b border-divider last:border-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[15px] font-semibold text-textPrimary">
                  <span className="text-accent text-[13px] mr-1.5">#{i + 1}</span>
                  {comp.name}
                </span>
                <span className="text-[11px] text-textSecondary bg-white rounded-full px-2 py-0.5">
                  {comp.difficulty || "中"}
                </span>
              </div>
              {comp.trait && (
                <p className="text-[11px] text-accent/70 mb-1.5">{comp.trait}</p>
              )}
              <div className="flex gap-3 mb-2">
                <span className="text-[12px] text-textSecondary">avg <strong className="text-accent">{comp.avg}</strong></span>
                <span className="text-[12px] text-textSecondary">Top4 <strong className="text-success">{comp.top4}%</strong></span>
                <span className="text-[12px] text-textSecondary">Win <strong className="text-textPrimary">{comp.win}%</strong></span>
              </div>
              {comp.coreUnits && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {comp.coreUnits.map((u: string, j: number) => (
                    <span key={j} className="px-2 py-0.5 rounded-md bg-white text-[11px] text-textPrimary border border-divider">{u}</span>
                  ))}
                </div>
              )}
              {comp.coreItems && (
                <div className="text-[11px] text-textSecondary space-y-0.5 mb-2">
                  {Object.entries(comp.coreItems).slice(0, 3).map(([hero, items]) => (
                    <div key={hero}><strong className="text-textPrimary">{hero}</strong>: {(items as string[]).join(" · ")}</div>
                  ))}
                </div>
              )}
              {comp.recommendedAugments && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {comp.recommendedAugments.map((aug: string, j: number) => (
                    <span key={j} className="px-2 py-0.5 rounded-full bg-accentLight text-[10px] text-accent">{aug}</span>
                  ))}
                </div>
              )}
              {comp.howToPlay && (
                <p className="text-[11px] text-textSecondary/70 leading-relaxed">{comp.howToPlay}</p>
              )}
            </div>
          ))}
        </div>
      )
    }

    if (result.type === "item_recipe") {
      const recipes = result.data.recipes
      return (
        <div className="bg-warmGray rounded-2xl p-4 animate-slide-up">
          <p className="text-[15px] font-medium text-textPrimary mb-1">装备合成</p>
          <p className="text-[12px] text-textSecondary mb-3">
            你的散件：{result.data.inputItems?.join(" · ")}
          </p>
          {recipes.length === 0 ? (
            <p className="text-[13px] text-textSecondary py-3 text-center">{result.data.message || "未找到可合成的装备"}</p>
          ) : (
            recipes.map((r: any, i: number) => (
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
                  <div className="text-right">
                    <span className="text-[13px] font-semibold text-accent">{r.avg}名</span>
                    {r.top4 != null && <span className="text-[10px] text-textSecondary block">Top4 {r.top4}%</span>}
                  </div>
                )}
              </div>
            ))
          )}
          <p className="text-[10px] text-textSecondary/60 mt-3">装备合成数据来自 Community Dragon</p>
        </div>
      )
    }

    if (result.type === "hero_build") {
      const data = result.data
      const heroAvg = data.heroAvg
      const heroWin = data.heroWin
      const heroCount = data.heroCount

      return (
        <div className="bg-warmGray rounded-2xl p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[15px] font-medium text-textPrimary">{data.heroName} · 近三天 · 大师宗师王者 · 大数据</p>
          </div>

          <div className="flex gap-2 mb-4">
            <div className="flex-1 bg-white rounded-xl p-2 text-center shadow-card">
              <p className="text-[10px] text-textSecondary">英雄平均排名</p>
              <p className="text-[15px] font-semibold text-accent">{heroAvg}名</p>
            </div>
            <div className="flex-1 bg-white rounded-xl p-2 text-center shadow-card">
              <p className="text-[10px] text-textSecondary">英雄胜率</p>
              <p className="text-[15px] font-semibold text-success">{heroWin != null ? heroWin + "%" : "-"}</p>
            </div>
            <div className="flex-1 bg-white rounded-xl p-2 text-center shadow-card">
              <p className="text-[10px] text-textSecondary">英雄对局数</p>
              <p className="text-[15px] font-semibold text-textPrimary">{(heroCount || 0).toLocaleString()}</p>
            </div>
          </div>

          <p className="text-[12px] text-textSecondary mb-2">推荐装备（按英雄出场率）</p>
          <div className="flex items-center gap-1 text-[10px] text-textSecondary/50 px-1 mb-1">
            <span className="w-5"></span>
            <span className="w-7"></span>
            <span className="flex-1"></span>
            <span className="w-[52px] text-center">平均名次</span>
            <span className="w-10 text-center">前四率</span>
            <span className="w-9 text-center">胜率</span>
            <span className="w-14 text-center">选取次数</span>
          </div>
          {data.items?.map((item: any, i: number) => {
            const avgDiff = item.avgDiff
            const diffColor = avgDiff == null ? "" : avgDiff < 0 ? "text-green-500 font-semibold" : avgDiff > 0 ? "text-red-400" : "text-textSecondary"

            return (
              <div key={i} className="flex items-center gap-1 py-2 border-b border-divider last:border-0 text-[12px]">
                <span className="text-textSecondary/40 w-5 text-right text-[11px]">{i + 1}</span>
                {item.icon && (
                  <img src={item.icon} alt="" className="w-6 h-6 rounded-md bg-white p-0.5 flex-shrink-0" loading="lazy"
                    onError={e => (e.currentTarget.style.display = "none")} />
                )}
                <span className="flex-1 text-[13px] text-textPrimary truncate px-0.5">{item.name}</span>
                <span className={"w-[52px] text-center " + diffColor}>{item.avg != null ? item.avg + "名" : "-"}</span>
                <span className="w-10 text-center text-textSecondary/80">{item.top4 != null ? item.top4 + "%" : "-"}</span>
                <span className="w-9 text-center text-textSecondary/80">{item.win != null ? item.win + "%" : "-"}</span>
                <span className="w-14 text-center text-textSecondary/80">{item.count ? (item.count / 10000).toFixed(1) + "万" : "-"}</span>
              </div>
            )
          })}
        </div>
      )
    }

    if (result.type === "error") {
      return <div className="text-center py-6"><p className="text-[14px] text-textSecondary">{result.message}</p></div>
    }

    return (
      <div className="text-center py-6 animate-slide-up">
        <p className="text-[14px] text-textSecondary">{result.message || "试试说「装备排行」或「最强阵容」"}</p>
        <div className="flex gap-2 justify-center mt-3">
          {["装备排行", "最强阵容", "反曲弓和大剑能合什么"].map(ex => (
            <button key={ex} onClick={() => sendQuery(ex)}
              className="px-3.5 py-1.5 rounded-full bg-accentLight text-[13px] text-accent font-medium active:scale-95 transition-transform">{ex}</button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-2">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-warmGray flex items-center justify-center active:scale-90 transition-transform">
          <ArrowLeft className="w-5 h-5 text-textSecondary" />
        </button>
        <div>
          <p className="text-[16px] font-semibold text-textPrimary">对战模式</p>
          <p className="text-[11px] text-textSecondary">战前研究助手</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
            {msg.role === "user" ? (
              <div className="bg-accentLight text-accent rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%] text-[15px] animate-fade-in">{msg.text}</div>
            ) : (
              <div>
                {!msg.result && <div className="text-[14px] text-textSecondary whitespace-pre-line px-1 animate-fade-in">{msg.text}</div>}
                {msg.result && renderResult(msg.result)}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-1 px-1">
            <div className="w-2 h-2 rounded-full bg-accent/30 animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-accent/30 animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-accent/30 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Bottom input area */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex justify-center mb-4 relative">
          {listening && (
            <>
              <div className="absolute inset-0 rounded-full bg-accent/10 animate-pulse-ring" />
              <div className="absolute inset-0 rounded-full bg-accent/10 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
            </>
          )}
          <button onClick={toggleMic} disabled={loading}
            className={`relative z-10 w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all duration-300 active:scale-90
              ${listening ? "bg-accent text-white shadow-micActive" : "bg-warmGray text-textSecondary hover:bg-accentLight hover:text-accent"}
              ${loading ? "opacity-50" : ""}`}>
            {listening ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
          </button>
        </div>

        <form onSubmit={submit} className="flex items-center gap-2 bg-warmGray rounded-full px-4 h-[52px]">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="输入查询，或点击麦克风说话" disabled={loading}
            className="flex-1 bg-transparent text-[15px] text-textPrimary placeholder:text-textSecondary outline-none" />
          {input.trim() && (
            <button type="submit" disabled={loading}
              className="w-8 h-8 rounded-full bg-accent flex items-center justify-center active:scale-90 transition-transform">
              <ArrowUp className="w-4 h-4 text-white" />
            </button>
          )}
        </form>

        {messages.length <= 1 && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {["装备排行", "最强阵容", "反曲弓和大剑能合什么", "金克斯装备"].map(ex => (
              <button key={ex} onClick={() => sendQuery(ex)}
                className="px-4 py-2 rounded-full bg-warmGray text-[13px] text-textSecondary active:scale-95 active:bg-accentLight active:text-accent transition-all">{ex}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// =========================================================
// 根组件 — 单页 useState 状态机
// =========================================================
export default function Home() {
  const [mode, setMode] = useState<Mode>("home")
  const [showToast, setShowToast] = useState(false)

  const handleEnter = (m: Mode) => {
    if (m === "game") {
      setShowToast(true)
    } else {
      setMode(m)
    }
  }

  return (
    <>
      {showToast && (
        <Toast message="吃鸡模式即将在 v2.1 上线" onClose={() => setShowToast(false)} />
      )}

      {mode === "home" && <HomeScreen onEnter={handleEnter} />}
      {mode === "battle" && <BattleScreen onBack={() => setMode("home")} />}
    </>
  )
}