"use client"

import { useState, useRef, useCallback } from "react"
import { Mic, MicOff, Loader2 } from "lucide-react"

interface Props {
  onResult: (text: string) => void
  disabled?: boolean
}

export default function VoiceButton({ onResult, disabled }: Props) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError("浏览器不支持语音，请用文字输入")
      return
    }

    setError(null)
    const recognition = new SpeechRecognition()
    recognition.lang = "zh-CN"
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = (e: any) => {
      setListening(false)
      if (e.error !== "aborted") setError("没听清，请再试一次")
    }
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript.trim()
      if (text) onResult(text)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [onResult])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={listening ? stopListening : startListening}
        disabled={disabled}
        className={`
          w-[120px] h-[120px] rounded-full flex items-center justify-center
          border-2 transition-all duration-200
          ${listening
            ? "border-accent bg-accent/5 shadow-btn scale-105"
            : "border-divider bg-white hover:border-accent/30 active:scale-95"
          }
          ${disabled ? "opacity-50" : ""}
        `}
      >
        {disabled ? (
          <Loader2 className="w-10 h-10 text-textSecondary animate-spin" />
        ) : listening ? (
          <Mic className="w-10 h-10 text-accent" />
        ) : (
          <MicOff className="w-10 h-10 text-textSecondary" />
        )}
      </button>
      <p className="text-body text-textSecondary select-none">
        {disabled ? "思考中…" : listening ? "正在聆听…" : "点击或按住说话"}
      </p>
      {error && <p className="text-caption text-red-400">{error}</p>}
    </div>
  )
}
