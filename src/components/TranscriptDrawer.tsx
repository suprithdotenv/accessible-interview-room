import { useState } from 'react'
import {
  FileText,
  Download,
  X,
  Search,
  Sparkles,
  User,
  Trash2,
} from 'lucide-react'

export type TranscriptItem = {
  id: string
  timestamp: string
  speaker: 'Interviewer' | 'Candidate'
  englishText: string
  islGloss?: string
  fingerspelledWords?: string[]
}

type TranscriptDrawerProps = {
  isOpen: boolean
  onClose: () => void
  items: TranscriptItem[]
  onClear: () => void
}

export function TranscriptDrawer({
  isOpen,
  onClose,
  items,
  onClear,
}: TranscriptDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('')

  if (!isOpen) return null

  const filteredItems = items.filter(
    (item) =>
      item.englishText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.islGloss && item.islGloss.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const exportAsTxt = () => {
    let content = `ACCESSIBLE VIRTUAL INTERVIEW ROOM - TRANSCRIPT LOG\n`
    content += `Generated: ${new Date().toLocaleString()}\n`
    content += `Candidate: Priya Sharma (Hearing Impaired / ISL User)\n`
    content += `Host: Dr. Vikram Sen\n`
    content += `========================================================\n\n`

    items.forEach((item) => {
      content += `[${item.timestamp}] ${item.speaker.toUpperCase()}:\n`
      content += `English: "${item.englishText}"\n`
      if (item.islGloss) {
        content += `ISL Gloss: ${item.islGloss}\n`
      }
      content += `\n`
    })

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `interview-transcript-${new Date().toISOString().slice(0, 10)}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportAsJson = () => {
    const data = {
      title: 'Accessible Virtual Interview Room Transcript',
      exportedAt: new Date().toISOString(),
      turns: items,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `interview-transcript-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-full bg-[#202124] border-l border-[#3c4043] shadow-2xl flex flex-col text-[#e8eaed]">
        {/* Header */}
        <div className="p-4 border-b border-[#3c4043] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#8ab4f8]" />
            <div>
              <h2 className="font-semibold text-white text-sm">Interview Transcript & Signs</h2>
              <p className="text-[11px] text-[#9aa0a6]">{items.length} transcript turns recorded</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#28292c] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar: Search & Export */}
        <div className="p-3 bg-[#18191c] border-b border-[#3c4043] flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversation..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#28292c] border border-[#3c4043] rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#8ab4f8]"
            />
          </div>

          <button
            onClick={exportAsTxt}
            title="Download TXT Transcript"
            className="p-1.5 rounded-lg bg-[#28292c] hover:bg-[#35373b] border border-[#3c4043] text-[#e8eaed] text-xs flex items-center gap-1 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span className="text-[11px]">TXT</span>
          </button>

          <button
            onClick={exportAsJson}
            title="Download JSON Transcript"
            className="p-1.5 rounded-lg bg-[#28292c] hover:bg-[#35373b] border border-[#3c4043] text-[#e8eaed] text-xs flex items-center gap-1 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span className="text-[11px]">JSON</span>
          </button>

          <button
            onClick={onClear}
            title="Clear History"
            className="p-1.5 rounded-lg hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#18191c]">
          {filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <FileText className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-xs font-medium">No transcript items match your query</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-[#202124] border border-[#3c4043] rounded-xl shadow-xs space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span
                    className={`font-semibold uppercase tracking-wider text-[10px] ${
                      item.speaker === 'Interviewer' ? 'text-[#8ab4f8]' : 'text-slate-400'
                    }`}
                  >
                    {item.speaker === 'Interviewer' ? 'HOST' : 'CANDIDATE'}
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">{item.timestamp}</span>
                </div>

                <p className="text-xs text-white leading-relaxed font-normal">
                  "{item.englishText}"
                </p>

                {item.islGloss && (
                  <div className="flex items-center gap-1.5 text-[10px] text-blue-300 bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-800 font-mono">
                    <Sparkles className="w-3 h-3 text-[#8ab4f8] shrink-0" />
                    <span className="font-semibold text-blue-200">ISL Gloss:</span>
                    <span>{item.islGloss}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
