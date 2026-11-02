import { useState, useEffect, useRef } from 'react'
import { Video, Mic, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

interface CandidateJoinModalProps {
  roomId: string
  token: string
  onJoin: (candidateName: string) => void
}

export function CandidateJoinModal({
  roomId,
  token,
  onJoin,
}: CandidateJoinModalProps) {
  const [name, setName] = useState('Priya Sharma')
  const [isValidating, setIsValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const [cameraActive, setCameraActive] = useState(false)

  // 1. Validate Token on Mount
  useEffect(() => {
    let unmounted = false

    fetch('/api/rooms/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (unmounted) return
        setIsValidating(false)
        if (data.valid) {
          setTokenValid(true)
          if (data.participantName && data.participantName !== 'Candidate') {
            setName(data.participantName)
          }
        } else {
          setTokenValid(false)
          setErrorMsg(data.error || 'Invalid or expired interview invitation token.')
        }
      })
      .catch((err) => {
        if (unmounted) return
        setIsValidating(false)
        setTokenValid(false)
        setErrorMsg('Network error validating invitation link.')
      })

    return () => {
      unmounted = true
    }
  }, [roomId, token])

  // 2. Camera Preview
  useEffect(() => {
    let localStream: MediaStream | null = null

    const startPreview = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = localStream
        }
        setCameraActive(true)
      } catch (e) {
        console.warn('Camera preview not available:', e)
        setCameraActive(false)
      }
    }

    startPreview()

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onJoin(name.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#f8fafc] text-slate-800">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-7 flex flex-col space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Accessible Interview Room</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Join Technical Interview</h1>
          <p className="text-xs text-slate-500 font-mono">Room ID: #{roomId}</p>
        </div>

        {/* Video Preview Window */}
        <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
          <video
            ref={videoPreviewRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transform scale-x-[-1] ${cameraActive ? 'block' : 'hidden'}`}
          />
          {!cameraActive && (
            <div className="flex flex-col items-center justify-center p-4 text-center text-slate-400">
              <Video className="w-8 h-8 mb-2 text-slate-500" />
              <p className="text-xs font-medium">Camera preview inactive</p>
              <p className="text-[11px] text-slate-500">Camera permissions will be requested on join</p>
            </div>
          )}

          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-black/60 backdrop-blur-sm text-white flex items-center gap-1.5">
              <Mic className="w-3 h-3 text-emerald-400" />
              Ready
            </span>
          </div>
        </div>

        {/* Token Status Badge */}
        {isValidating ? (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-600">
            <span className="w-3 h-3 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <span>Verifying invitation token...</span>
          </div>
        ) : tokenValid ? (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900">Authorized Candidate Link</p>
              <p className="text-[11px] text-emerald-700">Role: Candidate • Live captions & 3D ISL interpreter enabled</p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <div>
              <p className="font-semibold text-red-900">Access Denied</p>
              <p className="text-[11px] text-red-700">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Join Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Your Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={isValidating || !tokenValid}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition"
          >
            <span>Join Interview Room</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400">
          Indian Sign Language (ISL) Avatar & Real-time Live English Captioning available.
        </p>
      </div>
    </div>
  )
}
