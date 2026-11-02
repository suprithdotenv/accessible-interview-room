import { useState, type FormEvent } from 'react'
import {
  Send,
  HelpCircle,
  Mic,
  MicOff,
  Sparkles,
} from 'lucide-react'

type PresetQuestionsBarProps = {
  onAskQuestion: (question: string) => void
  isMicOn: boolean
  onToggleMic: () => void
  isListening: boolean
  speechError: string | null
}

const PRESET_INTERVIEW_QUESTIONS = [
  {
    category: 'Core',
    text: 'What is your name?',
    gloss: 'YOUR NAME WHAT',
  },
  {
    category: 'Core',
    text: 'Can you introduce yourself?',
    gloss: 'YOU INTRODUCE YOURSELF',
  },
  {
    category: 'Core',
    text: 'Tell me about your experience.',
    gloss: 'YOUR WORK TIME TELL I',
  },
  {
    category: 'Skills',
    text: 'What are your strengths?',
    gloss: 'YOUR GOOD WORK WHAT',
  },
  {
    category: 'Skills',
    text: 'What are your weaknesses?',
    gloss: 'YOUR BAD WORK WHAT',
  },
  {
    category: 'Interest',
    text: 'Why do you want to join our company?',
    gloss: 'YOU OUR OFFICE WORK WANT WHY',
  },
  {
    category: 'Vision',
    text: 'What are your career goals?',
    gloss: 'YOUR FUTURE WORK GOAL WHAT',
  },
  {
    category: 'Closing',
    text: 'Do you have any questions?',
    gloss: 'YOU QUESTION ASK',
  },
]

export function PresetQuestionsBar({
  onAskQuestion,
  isMicOn,
  onToggleMic,
  isListening,
  speechError,
}: PresetQuestionsBarProps) {
  const [customText, setCustomText] = useState('')

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!customText.trim()) return
    onAskQuestion(customText.trim())
    setCustomText('')
  }

  return (
    <div className="w-full bg-[#202124] border border-[#3c4043] rounded-2xl p-4 shadow-xl flex flex-col gap-3 text-[#e8eaed]">
      {/* Top Header: Mic control + Speech Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#3c4043]">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleMic}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              isMicOn
                ? 'bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs'
                : 'bg-[#ea4335] hover:bg-red-700 text-white shadow-xs'
            }`}
          >
            {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            {isMicOn ? 'Microphone Active' : 'Unmute Microphone'}
          </button>

          <div className="text-xs text-[#9aa0a6] flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span className="font-medium text-[#e8eaed]">
              {isListening ? 'Listening for speech...' : 'Microphone paused'}
            </span>
          </div>
        </div>

        {speechError && (
          <div className="text-xs text-amber-300 bg-amber-950/60 border border-amber-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{speechError}</span>
          </div>
        )}
      </div>

      {/* Preset Interview Question Quick Pills */}
      <div>
        <p className="text-[10px] font-semibold text-[#9aa0a6] uppercase tracking-wider mb-1.5">
          Quick Interview Questions (One-Click)
        </p>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {PRESET_INTERVIEW_QUESTIONS.map((q) => (
            <button
              key={q.text}
              onClick={() => onAskQuestion(q.text)}
              className="px-2.5 py-1 rounded-lg bg-[#28292c] hover:bg-blue-950/60 text-[#e8eaed] hover:text-[#8ab4f8] border border-[#3c4043] text-xs font-medium whitespace-nowrap transition shadow-2xs shrink-0 flex items-center gap-1"
            >
              <span>{q.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Input Submission for testing */}
      <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Or type a question to speak / translate into ISL..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-[#18191c] border border-[#3c4043] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#8ab4f8]"
        />
        <button
          type="submit"
          disabled={!customText.trim()}
          className="px-3.5 py-1.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1 transition shadow-2xs"
        >
          <Send className="w-3 h-3" />
          <span>Speak</span>
        </button>
      </form>
    </div>
  )
}
