import { useState } from 'react'
import { Copy, Check, Link2, ShieldCheck, Users, X } from 'lucide-react'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  roomId: string
  inviteLink: string
  hostToken: string
}

export function InviteModal({
  isOpen,
  onClose,
  roomId,
  inviteLink,
}: InviteModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#202124] border border-[#3c4043] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#e8eaed]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#3c4043] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-950/70 text-[#8ab4f8] border border-blue-800">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Invite Candidate</h2>
              <p className="text-xs text-[#9aa0a6]">Share this secure link with the interviewee</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#28292c] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Room ID & Security Pill */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#18191c] border border-[#3c4043]">
            <div className="flex items-center gap-2">
              <span className="text-[#9aa0a6] font-medium">Room ID:</span>
              <span className="font-mono font-bold text-white text-sm">{roomId}</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-medium bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Token Protected (2h)</span>
            </div>
          </div>

          {/* Invitation Link Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold tracking-wide uppercase text-[#9aa0a6]">
              Candidate Invitation Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="w-full px-3 py-2 bg-[#18191c] border border-[#3c4043] rounded-xl text-xs text-[#e8eaed] font-mono focus:outline-none select-all truncate"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-xl font-medium text-xs flex items-center gap-1.5 transition shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Instructions Card */}
          <div className="p-3.5 rounded-xl bg-[#18191c] border border-[#3c4043] space-y-2 text-[#9aa0a6]">
            <div className="flex items-center gap-2 font-medium text-white">
              <Users className="w-4 h-4 text-[#8ab4f8]" />
              <span>How it works:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[#9aa0a6] pl-1">
              <li>Send this link to the candidate.</li>
              <li>Their browser authenticates using the candidate access token.</li>
              <li>Both participants connect via live video, audio, and two-way captions.</li>
              <li>Candidate can enable the 3D ISL interpreter at their convenience.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
