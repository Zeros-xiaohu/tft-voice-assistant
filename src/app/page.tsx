"use client"

import { useState, useRef, useEffect } from "react"
import { Mic, MicOff, ArrowUp, Sparkles, Database } from "lucide-react"

interface QueryResult {
  type: "hero_build" | "comp_tier" | "error" | "unknown"
  data: any
  message?: string
}

interface Message {
  role: "user" | "assistant"
  text: string
  result?: QueryResult
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "你好！说出你想查的内容\n比如「最强阵容」或「装备排行」" },
  ])
  const [input, setInput] = useState("")
  const [listening, setListening] = useState(false)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendQuery = async (text: string) => {
    if (!text.trim()) return
    setMessages(prev => [...prev, { role: "user", text }])
    setLoading(true)

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      })
      const data: QueryResult = await res.json()
      setMessages(prev => [...prev, { role: "assistant", text, result: data }])
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant", text,
        result: { type: "error", data: null, message: "网络开小差了，再试一次？" }
      }])
    } finally {
      setLoading(false)
    }
  }

  const toggleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { sendQuery("语音识别"); return }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
    const recognition = new SpeechRecognition()
    recognition.lang = "zh-CN"
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = (e: any) => { setListening(false); if (e.error === "no-speech") sendQuery("没听清") }
    recognition.onresult = (e: any) => {
      const t = e.results[0][0].transcript.trim()
      if (t) sendQuery(t)
    }
    recognitionRef.current = recognition
    recognition.start()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) { sendQuery(input.trim()); setInput("") }
  }

  const renderResult = (result: QueryResult) => {
    if (result.type === "hero_build") {
      const d = result.data
      return (
        <div className="bg-warmGray rounded-2xl p-4 animate-slide-up">
          <p className="text-[15px] font-medium text-textPrimary mb-3">热门装备排行</p>
          <div className="space-y-2">
            {d.topItems?.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-divider last:border-0">
                <span className="text-[14px] text-textPrimary flex items-center gap-2">
                  <span className="text-textSecondary text-[12px]">#{i + 1}</span>
                  {item.name}
                </span>
                <span className="text-[13px] font-medium text-accent">{item.score}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-textSecondary mt-3 flex items-center gap-1">
            <Database className="w-3 h-3" /> {d.tip}
          </p>
        </div>
      )
    }

    if (result.type === "comp_tier") {
      const d = result.data
      return (
        <div className="bg-warmGray rounded-2xl p-4 animate-slide-up">
          <p className="text-[15px] font-medium text-textPrimary mb-3">
            {d.comps[0]?.winRate ? "装备排行" : "强势阵容"}
          </p>
          {d.comps?.slice(0, 10).map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-divider last:border-0">
              <span className="text-[14px] text-textPrimary flex items-center gap-2">
                <span className="text-textSecondary text-[12px] w-5">#{i + 1}</span>
                {item.name.length > 20 ? item.name.slice(0, 20) + "…" : item.name}
              </span>
              <span className={`text-[14px] font-semibold ${i === 0 ? "text-success" : "text-textPrimary"}`}>
                {item.winRate || item.avg}
                {item.count ? <span className="text-textSecondary font-normal text-[11px] ml-1">({item.count.toLocaleString()})</span> : null}
              </span>
            </div>
          ))}
          {d.updated && (
            <p className="text-[11px] text-textSecondary mt-3 flex items-center gap-1">
              <Database className="w-3 h-3" /> MetaTFT · {d.updated}
            </p>
          )}
        </div>
      )
    }

    if (result.type === "error") {
      return <div className="text-center py-6 animate-slide-up"><p className="text-[14px] text-textSecondary">{result.message}</p></div>
    }

    return (
      <div className="text-center py-6 animate-slide-up">
        <p className="text-[14px] text-textSecondary">{result.message}</p>
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          {["最强阵容", "装备排行", "热门装备"].map(ex => (
            <button key={ex} onClick={() => sendQuery(ex)}
              className="px-3.5 py-1.5 rounded-full bg-accentLight text-[13px] text-accent font-medium active:scale-95 transition-transform">
              {ex}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const quickExamples = ["最强阵容", "装备排行", "剑圣装备"]

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
            {msg.role === "user" ? (
              <div className="bg-accentLight text-accent rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%] text-[15px] animate-fade-in">
                {msg.text}
              </div>
            ) : (
              <div>
                {!msg.result && (
                  <div className="text-[14px] text-textSecondary whitespace-pre-line px-1 animate-fade-in">
                    {msg.text}
                  </div>
                )}
                {msg.result && renderResult(msg.result)}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 px-1 animate-fade-in">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-accent/30 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-accent/30 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-accent/30 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-4 pt-2">
        <div className="flex justify-center mb-4">
          <div className="relative">
            {listening && (
              <>
                <div className="absolute inset-0 rounded-full bg-accent/10 animate-pulse-ring" />
                <div className="absolute inset-0 rounded-full bg-accent/10 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
              </>
            )}
            <button onClick={toggleMic} disabled={loading}
              className={`relative z-10 w-[72px] h-[72px] rounded-full flex items-center justify-center
                transition-all duration-300 active:scale-90
                ${listening ? "bg-accent text-white shadow-micActive" : "bg-warmGray text-textSecondary hover:bg-accentLight hover:text-accent"}
                ${loading ? "opacity-50" : ""}`}>
              {listening ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-warmGray rounded-full px-4 h-[52px]">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder="输入文字查询，或点击上方麦克风"
            className="flex-1 bg-transparent text-[15px] text-textPrimary placeholder:text-textSecondary outline-none"
            disabled={loading} />
          {input.trim() && (
            <button type="submit" disabled={loading}
              className="w-8 h-8 rounded-full bg-accent flex items-center justify-center active:scale-90 transition-transform">
              <ArrowUp className="w-4 h-4 text-white" />
            </button>
          )}
        </form>

        {messages.length <= 1 && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {quickExamples.map(ex => (
              <button key={ex} onClick={() => sendQuery(ex)}
                className="px-4 py-2 rounded-full bg-warmGray text-[13px] text-textSecondary active:scale-95 active:bg-accentLight active:text-accent transition-all">
                {ex}
              </button>
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-textSecondary/50 mt-3 flex items-center justify-center gap-1">
          <Database className="w-2.5 h-2.5" /> MetaTFT 实时数据 · AI 驱动
        </p>
      </div>
    </div>
  )
}
