import { useState, useEffect, useRef } from 'react'
import {
  MessageSquare,
  Type,
  ArrowDown,
  Clock,
} from 'lucide-react'

export interface DialogueCaptionItem {
  id: string
  speaker: 'INTERVIEWER' | 'CANDIDATE'
  speakerName?: string
  text: string
  timestamp: string
  gloss?: string
}

interface LiveCaptionsFeedProps {
  captions: DialogueCaptionItem[]
  interimTranscript: string
  activeSpeaker: 'INTERVIEWER' | 'CANDIDATE' | null
  isSpeaking: boolean
  interviewerName?: string
  candidateName?: string
}

export function LiveCaptionsFeed({
  captions,
  interimTranscript,
  activeSpeaker,
  isSpeaking,
  interviewerName = 'Host',
  candidateName = 'Candidate',
}: LiveCaptionsFeedProps) {
  const [textSize, setTextSize] = useState<'normal' | 'large'>('normal')
  const [autoScroll, setAutoScroll] = useState<boolean>(true)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to bottom whenever new captions arrive or interim text updates
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [captions, interimTranscript, autoScroll])

  const cycleTextSize = () => {
    setTextSize((prev) => (prev === 'normal' ? 'large' : 'normal'))
  }

  const activeSpeakerDisplayName =
    activeSpeaker === 'INTERVIEWER' ? (interviewerName || 'Host') : (candidateName || 'Candidate')

  return (
    <div className="w-full h-full flex flex-col rounded-2xl bg-[#202124] border border-[#3c4043] shadow-md overflow-hidden text-[#e8eaed] transition-colors">
      {/* Panel Header */}
      <div className="px-4 py-2.5 border-b border-[#3c4043] bg-[#202124] flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-[#8ab4f8] shrink-0" />
          <span className="font-semibold text-[#e8eaed] text-xs">
            Live Conversation Captions
          </span>

          {isSpeaking && interimTranscript.trim() && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#8ab4f8] bg-blue-950/70 border border-blue-700 px-2.5 py-0.5 rounded-full shrink-0">
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8ab4f8] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#8ab4f8] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#8ab4f8] animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span>{activeSpeakerDisplayName} speaking</span>
            </span>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={cycleTextSize}
            title={`Font Size: ${textSize}`}
            className="p-1 px-2 rounded-md border border-[#3c4043] bg-[#28292c] hover:bg-[#35373b] transition text-[#e8eaed] flex items-center gap-1 text-[11px]"
          >
            <Type className="w-3.5 h-3.5" />
            <span className="uppercase text-[10px] font-medium">{textSize}</span>
          </button>

          <button
            onClick={() => setAutoScroll((p) => !p)}
            title={autoScroll ? 'Auto-scroll On' : 'Auto-scroll Paused'}
            className={`p-1 px-2 rounded-md border transition text-[11px] flex items-center gap-1 ${
              autoScroll ? 'border-blue-700 text-[#8ab4f8] bg-blue-950/70 font-medium' : 'border-[#3c4043] bg-[#28292c] text-slate-400'
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span className="text-[10px]">Scroll</span>
          </button>
        </div>
      </div>

      {/* Instagram-Style Conversation Stream */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 text-xs custom-scrollbar bg-[#18191c]"
      >
        {captions.length === 0 && !interimTranscript.trim() ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-10 h-10 rounded-full bg-[#28292c] flex items-center justify-center mb-2 text-slate-400">
              <MessageSquare className="w-5 h-5 text-[#8ab4f8]" />
            </div>
            <p className="text-xs font-semibold text-[#e8eaed]">Conversation transcript will appear here</p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
              Host and Candidate speech will appear in Instagram-style dialogue bubbles in real-time.
            </p>
          </div>
        ) : (
          <>
            {/* Finalized Dialogue Bubbles */}
            {captions.map((item) => {
              const isHost = item.speaker === 'INTERVIEWER'
              return (
                <div
                  key={item.id}
                  className={`flex flex-col ${isHost ? 'items-start' : 'items-end'}`}
                >
                  {/* Speaker Label & Timestamp Header */}
                  <div
                    className={`flex items-center gap-1.5 mb-1 px-1 text-[11px] ${
                      isHost ? 'flex-row' : 'flex-row-reverse'
                    }`}
                  >
                    <span
                      className={`font-semibold uppercase tracking-wider text-[10px] ${
                        isHost ? 'text-[#8ab4f8]' : 'text-slate-400'
                      }`}
                    >
                      {isHost ? 'HOST' : 'CANDIDATE'}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 font-mono text-[10px]">{item.timestamp}</span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs border transition-all ${
                      isHost
                        ? 'bg-[#1e3a5f] border-blue-900/50 text-[#ffffff] rounded-tl-xs'
                        : 'bg-[#2d3135] border-[#3c4043] text-[#ffffff] rounded-tr-xs'
                    }`}
                  >
                    <p
                      className={`leading-relaxed break-words whitespace-pre-wrap ${
                        textSize === 'large' ? 'text-sm font-medium' : 'text-[13px]'
                      }`}
                    >
                      {item.text}
                    </p>
                  </div>
                </div>
              )
            })}

            {/* Live Partial / Interim Typing Bubble */}
            {interimTranscript.trim() && (
              <div
                className={`flex flex-col ${
                  activeSpeaker === 'INTERVIEWER' ? 'items-start' : 'items-end'
                }`}
              >
                <div className="flex items-center gap-1 mb-1 px-1 text-[10px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8ab4f8] animate-ping" />
                  <span className="font-semibold uppercase tracking-wider text-slate-300">
                    {activeSpeaker === 'INTERVIEWER' ? 'HOST' : 'CANDIDATE'} (Speaking...)
                  </span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 border border-dashed animate-pulse ${
                    activeSpeaker === 'INTERVIEWER'
                      ? 'bg-blue-950/40 border-blue-700/60 text-blue-200 rounded-tl-xs'
                      : 'bg-[#25272a] border-[#3c4043] text-slate-200 rounded-tr-xs'
                  }`}
                >
                  <p
                    className={`italic leading-relaxed break-words ${
                      textSize === 'large' ? 'text-sm' : 'text-[13px]'
                    }`}
                  >
                    "{interimTranscript}"
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
