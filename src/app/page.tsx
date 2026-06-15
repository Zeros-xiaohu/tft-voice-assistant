"use client"

import { useState, useRef, useEffect } from "react"
import { Mic, MicOff, ArrowUp, Database, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  text: string
  result?: any
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "语音或输入查询\n试试「装备排行」「最强阵容」" },
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
    const patch = result.data?.patch ? (
      <p className="text-[10px] text-textSecondary/60 mt-3 flex items-center gap-1"><Database className="w-2.5 h-2.5" /> Set 17 · Patch {result.data.patch}</p>
    ) : null

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
          {patch}
        </div>
      )
    }

    if (result.type === "comp_tier") {
      return (
        <div className="bg-warmGray rounded-2xl p-4 animate-slide-up">
          <p className="text-[15px] font-medium text-textPrimary mb-3">强势阵容</p>
          {result.data.comps?.slice(0, 8).map((comp: any, i: number) => (
            <div key={i} className="py-2.5 border-b border-divider last:border-0">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium text-textPrimary">
                  <span className="text-textSecondary text-[12px] mr-1">#{i + 1}</span>{comp.name}
                </span>
                <span className="text-[14px] font-semibold text-success">平均{comp.avg}名</span>
              </div>
              {comp.units && <p className="text-[11px] text-textSecondary mt-1">{comp.units}</p>}
            </div>
          ))}
          {patch}
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
            <span className="text-[10px] text-textSecondary/60">Patch {data.patch}</span>
          </div>

          {/* 英雄统计概览 */}
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
              <p className="text-[15px] font-semibold text-textPrimary">{(heroCount||0).toLocaleString()}</p>
            </div>
          </div>

          {/* 装备表格 — 按平均排名排序 */}
          <p className="text-[12px] text-textSecondary mb-2">推荐装备（按英雄出场率）</p>
          {/* 表头 */}
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
                <span className="w-14 text-center text-textSecondary/80">{item.count ? (item.count/10000).toFixed(1) + "万" : "-"}</span>

              </div>
            )
          })}

          {patch}
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
          {["装备排行", "最强阵容", "剑圣装备"].map(ex => (
            <button key={ex} onClick={() => sendQuery(ex)} className="px-3.5 py-1.5 rounded-full bg-accentLight text-[13px] text-accent font-medium active:scale-95 transition-transform">{ex}</button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-4 space-y-4">
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
            {["装备排行", "最强阵容", "剑圣装备"].map(ex => (
              <button key={ex} onClick={() => sendQuery(ex)}
                className="px-4 py-2 rounded-full bg-warmGray text-[13px] text-textSecondary active:scale-95 active:bg-accentLight active:text-accent transition-all">{ex}</button>
            ))}
          </div>
        )}
        <p className="text-center text-[11px] text-textSecondary/50 mt-3 flex items-center justify-center gap-1">
          <Database className="w-2.5 h-2.5" /> MetaTFT & DeepSeek
        </p>
      </div>
    </div>
  )
}
