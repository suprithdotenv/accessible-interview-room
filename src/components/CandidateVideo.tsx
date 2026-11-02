import { useEffect, useRef, useState } from 'react'
import { Video, VideoOff, Mic, MicOff, User, Link2 } from 'lucide-react'

interface CandidateVideoProps {
  stream?: MediaStream | null
  isConnected: boolean
  isMicOn?: boolean
  isVideoOn?: boolean
  candidateName?: string
  isLocal?: boolean
  onToggleMic?: () => void
  onToggleVideo?: () => void
  onInviteClick?: () => void
  onStartSimulation?: () => void
  isSimulated?: boolean
  activeQuestion?: string
}

function getInitials(name: string): string {
  const cleaned = name.replace(/Dr\.|Mr\.|Mrs\.|Ms\./gi, '').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return parts[0]?.[0]?.toUpperCase() || 'C'
}

export function CandidateVideo({
  stream,
  isConnected,
  isMicOn = true,
  isVideoOn = true,
  candidateName = 'Priya Sharma',
  isLocal = false,
  onToggleMic,
  onToggleVideo,
  onInviteClick,
  onStartSimulation,
  isSimulated = false,
}: CandidateVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [internalVideoOn, setInternalVideoOn] = useState(true)

  const activeVideoOn = isLocal ? isVideoOn : internalVideoOn

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream, activeVideoOn])

  const initials = getInitials(candidateName)

  return (
    <div className="relative w-full h-full min-h-0 bg-[#202124] rounded-2xl overflow-hidden border border-[#3c4043] shadow-md flex flex-col group">
      {/* Video Surface */}
      <div className="relative w-full h-full flex items-center justify-center bg-[#18191c] overflow-hidden">
        {isConnected && stream && activeVideoOn ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className={`w-full h-full object-cover ${isLocal ? 'transform scale-x-[-1]' : ''}`}
          />
        ) : isConnected && isSimulated ? (
          /* Simulated Candidate feed */
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-[#202124] to-[#18191c] select-none">
            <div className="relative mb-3">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 ring-4 ring-emerald-500/30 flex items-center justify-center text-xl sm:text-2xl font-bold text-white shadow-lg">
                {initials}
              </div>
            </div>
            <p className="font-semibold text-[#e8eaed] text-sm tracking-tight">{candidateName}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <p className="text-[11px] text-emerald-400 font-medium">Candidate Stream (Simulated)</p>
            </div>
          </div>
        ) : isConnected && !activeVideoOn ? (
          /* Connected but camera off */
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-[#202124] to-[#18191c] select-none">
            <div className="relative mb-3">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 ring-2 ring-[#3c4043] flex items-center justify-center text-xl sm:text-2xl font-bold text-white shadow-lg">
                {initials}
              </div>
            </div>
            <p className="font-semibold text-[#e8eaed] text-sm tracking-tight">{candidateName}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <p className="text-[11px] text-[#9aa0a6] font-medium">Camera Disabled</p>
            </div>
          </div>
        ) : (
          /* Waiting for remote candidate to join */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#202124] to-[#18191c] space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#28292c] border border-[#3c4043] flex items-center justify-center text-[#8ab4f8]">
              <User className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#e8eaed]">Waiting for Candidate to join...</p>
              <p className="text-xs text-[#9aa0a6] max-w-xs mx-auto">
                Share the interview invitation link with the candidate to connect via live video and captions.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onInviteClick}
                className="px-3.5 py-1.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Invite Candidate</span>
              </button>

              {onStartSimulation && (
                <button
                  onClick={onStartSimulation}
                  className="px-3.5 py-1.5 rounded-lg bg-[#28292c] hover:bg-[#35373b] text-[#e8eaed] border border-[#3c4043] text-xs font-medium transition shadow-2xs"
                >
                  Test with Simulated Candidate
                </button>
              )}
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-black/70 backdrop-blur-md text-white border border-white/10 flex items-center gap-1.5 shadow-xs">
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}
            />
            <span className="font-semibold">{candidateName}</span>
          </span>

          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider uppercase backdrop-blur-sm ${
              isConnected
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-600 text-white'
            }`}
          >
            {isConnected ? (isSimulated ? 'Simulated' : 'Connected') : 'Waiting'}
          </span>
        </div>

        {/* Top Right Mic Status */}
        {isConnected && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md border border-white/10 flex items-center gap-1.5">
              {isMicOn ? (
                <Mic className="w-3 h-3 text-emerald-400" />
              ) : (
                <MicOff className="w-3 h-3 text-red-400" />
              )}
            </div>
          </div>
        )}

        {/* Google Meet Style Float Controls (Local Candidate) */}
        {isLocal && isConnected && (
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full opacity-90 group-hover:opacity-100 transition z-10 shadow-md">
            <button
              onClick={onToggleMic}
              title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              className={`p-2 rounded-full text-xs transition ${
                isMicOn ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-600 text-white'
              }`}
            >
              {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <button
              onClick={onToggleVideo}
              title={activeVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
              className={`p-2 rounded-full text-xs transition ${
                activeVideoOn ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-600 text-white'
              }`}
            >
              {activeVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
