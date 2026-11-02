import { useEffect, useRef, useState } from 'react'
import { Video, VideoOff, Mic, MicOff, User, Crown } from 'lucide-react'

interface InterviewerVideoProps {
  stream?: MediaStream | null
  isMicOn: boolean
  isVideoOn?: boolean
  audioLevel?: number
  interviewerName?: string
  isLocal?: boolean
  onToggleMic?: () => void
  onToggleVideo?: () => void
}

function getInitials(name: string): string {
  const cleaned = name.replace(/Dr\.|Mr\.|Mrs\.|Ms\./gi, '').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return parts[0]?.[0]?.toUpperCase() || 'H'
}

export function InterviewerVideo({
  stream,
  isMicOn,
  isVideoOn = true,
  audioLevel = 0,
  interviewerName = 'Dr. Vikram Sen',
  isLocal = true,
  onToggleMic,
  onToggleVideo,
}: InterviewerVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [internalVideoOn, setInternalVideoOn] = useState(true)

  const activeVideoOn = isLocal ? isVideoOn : internalVideoOn

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream, activeVideoOn])

  const initials = getInitials(interviewerName)
  const isSpeaking = isMicOn && audioLevel > 0.08

  return (
    <div className="relative w-full h-full min-h-0 bg-[#202124] rounded-2xl overflow-hidden border border-[#3c4043] shadow-md flex flex-col group">
      {/* Video Surface */}
      <div className="relative w-full h-full flex items-center justify-center bg-[#18191c] overflow-hidden">
        {stream && activeVideoOn ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className={`w-full h-full object-cover ${isLocal ? 'transform scale-x-[-1]' : ''}`}
          />
        ) : (
          /* Google Meet Style Camera-Off Placeholder */
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-[#202124] to-[#18191c] select-none">
            <div className="relative mb-3">
              {/* Audio Pulse Ring */}
              {isSpeaking && (
                <div className="absolute -inset-2.5 rounded-full bg-blue-500/30 animate-ping" />
              )}
              <div
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold text-white shadow-lg transition-all duration-200 ${
                  isSpeaking
                    ? 'bg-gradient-to-tr from-[#1a73e8] to-[#1557b0] ring-4 ring-[#8ab4f8]/50 scale-105'
                    : 'bg-gradient-to-tr from-[#1a73e8] to-[#2563eb] ring-2 ring-[#3c4043]'
                }`}
              >
                {initials}
              </div>
            </div>
            <p className="font-semibold text-[#e8eaed] text-sm tracking-tight">{interviewerName}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <p className="text-[11px] text-[#9aa0a6] font-medium">Camera Off</p>
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-black/70 backdrop-blur-md text-white border border-white/10 flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#8ab4f8]" />
            <span className="font-semibold">{interviewerName}</span>
          </span>

          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[#1a73e8] text-white backdrop-blur-sm flex items-center gap-1 shadow-xs">
            <Crown className="w-3 h-3 text-white" />
            Host
          </span>
        </div>

        {/* Top Right Mic & Audio Indicator */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <div className="px-2 py-1 bg-black/70 backdrop-blur-md rounded-md border border-white/10 flex items-center gap-1.5">
            {isMicOn ? (
              <div className="flex items-center gap-0.5 h-3">
                <Mic className="w-3 h-3 text-emerald-400" />
                <span
                  className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                  style={{ height: `${Math.min(100, Math.max(20, audioLevel * 10))}%` }}
                />
              </div>
            ) : (
              <MicOff className="w-3 h-3 text-red-400" />
            )}
          </div>
        </div>

        {/* Google Meet Style Float Controls (Local Interviewer) */}
        {isLocal && (
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-[#202124]/90 border border-[#3c4043] backdrop-blur-md rounded-full opacity-90 group-hover:opacity-100 transition z-10 shadow-lg">
            <button
              onClick={onToggleMic}
              title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              className={`p-2 rounded-full text-xs transition ${
                isMicOn ? 'bg-[#3c4043] hover:bg-[#474a4d] text-white' : 'bg-[#ea4335] text-white hover:bg-red-700'
              }`}
            >
              {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <button
              onClick={onToggleVideo}
              title={activeVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
              className={`p-2 rounded-full text-xs transition ${
                activeVideoOn ? 'bg-[#3c4043] hover:bg-[#474a4d] text-white' : 'bg-[#ea4335] text-white hover:bg-red-700'
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
