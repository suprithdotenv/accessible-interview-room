import { X, BookOpen, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react'

type ISLGuideModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function ISLGuideModal({ isOpen, onClose }: ISLGuideModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[85vh] bg-[#202124] border border-[#3c4043] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#e8eaed]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#3c4043] flex items-center justify-between bg-[#18191c]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-950/70 text-[#8ab4f8] border border-blue-800">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-base">
                Indian Sign Language (ISL) Interpreter Guide
              </h2>
              <p className="text-xs text-[#9aa0a6]">
                Linguistic architecture, vocabulary coverage, and technical specifications
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#28292c] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-[#e8eaed] leading-relaxed custom-scrollbar bg-[#18191c]">
          {/* Section 1: Core Interview Mapping */}
          <div className="p-4 rounded-xl bg-[#202124] border border-[#3c4043] space-y-2">
            <h3 className="font-semibold text-[#8ab4f8] text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#8ab4f8]" />
              Prioritized Interview Questions & ISL Mappings
            </h3>
            <p className="text-[#9aa0a6]">
              Our grammar engine provides specialized translation for standard job interview interactions:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-[#28292c] border border-[#3c4043] shadow-xs">
                <span className="text-[#9aa0a6] block text-[10px]">English:</span>
                "Can you introduce yourself?"
                <span className="text-[#8ab4f8] font-semibold block mt-1">ISL: YOU NAME TELL WHAT</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#28292c] border border-[#3c4043] shadow-xs">
                <span className="text-[#9aa0a6] block text-[10px]">English:</span>
                "Tell me about your experience."
                <span className="text-[#8ab4f8] font-semibold block mt-1">ISL: YOUR WORK TIME TELL I</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#28292c] border border-[#3c4043] shadow-xs">
                <span className="text-[#9aa0a6] block text-[10px]">English:</span>
                "What are your strengths?"
                <span className="text-[#8ab4f8] font-semibold block mt-1">ISL: YOUR GOOD WORK WHAT</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#28292c] border border-[#3c4043] shadow-xs">
                <span className="text-[#9aa0a6] block text-[10px]">English:</span>
                "Why do you want to join our company?"
                <span className="text-[#8ab4f8] font-semibold block mt-1">ISL: YOU OUR OFFICE WORK WANT WHY</span>
              </div>
            </div>
          </div>

          {/* Section 2: Grammar Pipeline */}
          <div className="p-4 rounded-xl bg-[#202124] border border-[#3c4043] space-y-2">
            <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Linguistic Rule-Based Translation Engine
            </h3>
            <ul className="list-disc list-inside space-y-1 text-[#9aa0a6] pl-1">
              <li><strong className="text-white">SOV Structure:</strong> English Subject-Verb-Object (SVO) is reordered to ISL Subject-Object-Verb (SOV).</li>
              <li><strong className="text-white">WH-Movement:</strong> Interrogative words (What, Why, Where) move to the end of the sentence.</li>
              <li><strong className="text-white">Lemmatization:</strong> Inflected verbs and tenses are reduced to standard base signs.</li>
              <li><strong className="text-white">Fingerspelling Fallback:</strong> Any unsupported or domain-specific word (e.g. <code className="text-[#8ab4f8]">React</code>, <code className="text-[#8ab4f8]">Kubernetes</code>) is automatically fingerspelled letter-by-letter using Mixamo hand bone rotations.</li>
            </ul>
          </div>

          {/* Section 3: Speech Routing & Accessibility Control */}
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 space-y-2">
            <h3 className="font-semibold text-amber-300 text-sm flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Accessibility Routing & Consent
            </h3>
            <p className="text-amber-200/90">
              Only the Host / Interviewer's finalized speech is converted into ISL signs. Candidate speech is transcribed as live captions only. ISL interpretation is off by default and can be enabled or disabled at any time by the candidate.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#3c4043] flex justify-end bg-[#18191c]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#28292c] hover:bg-[#35373b] text-white text-xs font-semibold transition border border-[#3c4043]"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  )
}
