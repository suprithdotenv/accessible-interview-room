import { useState, useEffect, useRef } from 'react'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  ShieldCheck,
  Settings,
  Sparkles,
  MessageSquare,
  ArrowRight,
  User,
  Crown,
  Volume2,
} from 'lucide-react'

export interface PreJoinConfig {
  name: string
  isMicOn: boolean
  isVideoOn: boolean
  isIslEnabled: boolean
  selectedAudioDeviceId?: string
  selectedVideoDeviceId?: string
  localStream: MediaStream | null
}

interface PreJoinLobbyProps {
  role: 'interviewer' | 'candidate'
  initialName?: string
  roomId: string
  onJoin: (config: PreJoinConfig) => void
}

export function PreJoinLobby({
  role,
  initialName,
  roomId,
  onJoin,
}: PreJoinLobbyProps) {
  const [name, setName] = useState(
    initialName || (role === 'interviewer' ? 'Dr. Vikram Sen' : 'Priya Sharma')
  )
  const [isMicOn, setIsMicOn] = useState(true)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isIslEnabled, setIsIslEnabled] = useState(false) // Default off per accessibility requirements

  // Device selection
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedAudioId, setSelectedAudioId] = useState<string>('')
  const [selectedVideoId, setSelectedVideoId] = useState<string>('')

  // Media & Meter
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // 1. Enumerate Devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audios = devices.filter((d) => d.kind === 'audioinput')
        const videos = devices.filter((d) => d.kind === 'videoinput')
        setAudioDevices(audios)
        setVideoDevices(videos)
        if (audios.length > 0 && !selectedAudioId) setSelectedAudioId(audios[0].deviceId)
        if (videos.length > 0 && !selectedVideoId) setSelectedVideoId(videos[0].deviceId)
      } catch (err) {
        console.warn('Could not enumerate devices:', err)
      }
    }

    getDevices()
  }, [])

  // 2. Initialize / Update Camera and Mic preview stream
  useEffect(() => {
    let active = true

    const startStream = async () => {
      try {
        if (localStream) {
          localStream.getTracks().forEach((t) => t.stop())
        }

        const constraints: MediaStreamConstraints = {
          audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true,
          video: selectedVideoId ? { deviceId: { exact: selectedVideoId } } : true,
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        setLocalStream(stream)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }

        // Setup audio visualizer meter
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
          if (AudioCtx) {
            const audioCtx = new AudioCtx()
            audioContextRef.current = audioCtx
            const analyser = audioCtx.createAnalyser()
            analyser.fftSize = 64
            analyserRef.current = analyser

            const source = audioCtx.createMediaStreamSource(stream)
            source.connect(analyser)

            const dataArray = new Uint8Array(analyser.frequencyBinCount)

            const checkLevel = () => {
              if (!active) return
              analyser.getByteFrequencyData(dataArray)
              let sum = 0
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i]
              }
              const avg = sum / dataArray.length
              const normalized = Math.min(1, avg / 128)
              setAudioLevel(normalized)
              animFrameRef.current = requestAnimationFrame(checkLevel)
            }
            checkLevel()
          }
        } catch (e) {
          console.warn('AudioContext meter setup error:', e)
        }
      } catch (err) {
        console.warn('Error starting lobby stream:', err)
      }
    }

    startStream()

    return () => {
      active = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [selectedAudioId, selectedVideoId])

  // Toggle mic track
  const toggleMic = () => {
    setIsMicOn((prev) => {
      const next = !prev
      if (localStream) {
        localStream.getAudioTracks().forEach((t) => {
          t.enabled = next
        })
      }
      return next
    })
  }

  // Toggle video track
  const toggleVideo = () => {
    setIsVideoOn((prev) => {
      const next = !prev
      if (localStream) {
        localStream.getVideoTracks().forEach((t) => {
          t.enabled = next
        })
      }
      return next
    })
  }

  // Submit and enter room
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    onJoin({
      name: name.trim(),
      isMicOn,
      isVideoOn,
      isIslEnabled,
      selectedAudioDeviceId: selectedAudioId,
      selectedVideoDeviceId: selectedVideoId,
      localStream,
    })
  }

  const isHost = role === 'interviewer'

  return (
    <div className="min-h-screen bg-[#18191c] text-[#e8eaed] flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* Top Brand Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between pb-4 border-b border-[#3c4043]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1a73e8] flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">
              Virtual Accessible Interview Room
            </h1>
            <p className="text-[11px] text-[#9aa0a6]">Live Captions & 3D ISL Interpreter</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9aa0a6] font-mono">Room: {roomId}</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
              isHost
                ? 'bg-blue-950/70 text-[#8ab4f8] border-blue-800'
                : 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
            }`}
          >
            {isHost ? 'Host Session' : 'Candidate Invitation'}
          </span>
        </div>
      </div>

      {/* Main Lobby Container */}
      <div className="max-w-5xl w-full mx-auto my-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Camera Preview & Test Controls (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="relative w-full aspect-video max-w-lg bg-[#121212] rounded-2xl overflow-hidden shadow-xl border border-[#3c4043]">
              {localStream && isVideoOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#202124] text-[#9aa0a6]">
                  <div className="w-20 h-20 rounded-full bg-[#28292c] border border-[#3c4043] flex items-center justify-center text-[#8ab4f8] mb-2">
                    <User className="w-10 h-10" />
                  </div>
                  <p className="text-xs font-semibold text-[#e8eaed]">{name || 'Your Video'}</p>
                  <p className="text-[11px] text-[#9aa0a6]">Camera is switched off</p>
                </div>
              )}

              {/* Floating Camera / Mic Quick Controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#202124]/90 border border-[#3c4043] backdrop-blur-md px-4 py-2 rounded-full shadow-lg z-10">
                <button
                  type="button"
                  onClick={toggleMic}
                  title={isMicOn ? 'Turn Microphone Off' : 'Turn Microphone On'}
                  className={`p-2.5 rounded-full text-white transition ${
                    isMicOn ? 'bg-[#3c4043] hover:bg-[#474a4d]' : 'bg-[#ea4335] hover:bg-red-700'
                  }`}
                >
                  {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={toggleVideo}
                  title={isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
                  className={`p-2.5 rounded-full text-white transition ${
                    isVideoOn ? 'bg-[#3c4043] hover:bg-[#474a4d]' : 'bg-[#ea4335] hover:bg-red-700'
                  }`}
                >
                  {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Live Mic Level Visualizer */}
            <div className="w-full max-w-lg mt-3 px-2 flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-[#9aa0a6] shrink-0" />
              <div className="flex-1 h-2 bg-[#28292c] rounded-full overflow-hidden p-0.5 border border-[#3c4043]">
                <div
                  className={`h-full rounded-full transition-all duration-75 ${
                    isMicOn ? 'bg-[#34a853]' : 'bg-slate-600'
                  }`}
                  style={{
                    width: isMicOn ? `${Math.min(100, Math.max(4, audioLevel * 100))}%` : '0%',
                  }}
                />
              </div>
              <span className="text-[11px] text-[#9aa0a6] font-mono shrink-0">
                {isMicOn ? (audioLevel > 0.05 ? 'Mic Active' : 'Mic Ready') : 'Mic Muted'}
              </span>
            </div>

            {/* Hardware Selection Dropdowns */}
            <div className="w-full max-w-lg mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-[#9aa0a6] mb-1">
                  Microphone
                </label>
                <select
                  value={selectedAudioId}
                  onChange={(e) => setSelectedAudioId(e.target.value)}
                  className="w-full bg-[#28292c] border border-[#3c4043] rounded-lg px-2.5 py-1.5 text-xs text-[#e8eaed] focus:outline-hidden focus:border-[#8ab4f8]"
                >
                  {audioDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Microphone ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#9aa0a6] mb-1">
                  Camera
                </label>
                <select
                  value={selectedVideoId}
                  onChange={(e) => setSelectedVideoId(e.target.value)}
                  className="w-full bg-[#28292c] border border-[#3c4043] rounded-lg px-2.5 py-1.5 text-xs text-[#e8eaed] focus:outline-hidden focus:border-[#8ab4f8]"
                >
                  {videoDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right: Pre-Join Form & Accessibility Settings (5 cols) */}
          <div className="lg:col-span-5 bg-[#202124] border border-[#3c4043] rounded-2xl p-6 sm:p-7 shadow-xl flex flex-col space-y-5">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8ab4f8]">
                {isHost ? (
                  <>
                    <Crown className="w-3.5 h-3.5" />
                    <span>Host / Interviewer Setup</span>
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5" />
                    <span>Candidate Joining Room</span>
                  </>
                )}
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Ready to join?</h2>
              <p className="text-xs text-[#9aa0a6]">
                Check your name and preferences before entering the room.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-xs font-semibold text-[#e8eaed] mb-1.5">
                  Your Display Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#28292c] border border-[#3c4043] text-sm font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-[#8ab4f8] focus:border-[#8ab4f8] transition outline-hidden"
                />
              </div>

              {/* Accessibility Preferences Card */}
              <div className="bg-[#18191c] border border-[#3c4043] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#8ab4f8] shrink-0" />
                    <div>
                      <p className="font-semibold text-white">Live Captions</p>
                      <p className="text-[11px] text-[#9aa0a6]">Real-time English transcription</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/80 text-[#8ab4f8] border border-blue-800">
                    Always On
                  </span>
                </div>

                <div className="border-t border-[#3c4043] pt-2.5 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-[#8ab4f8] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">3D ISL Interpreter</p>
                      <p className="text-[11px] text-[#9aa0a6] leading-tight">
                        Translate interviewer speech into Indian Sign Language avatar signs
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={isIslEnabled}
                      onChange={(e) => setIsIslEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#3c4043] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1a73e8]"></div>
                  </label>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-[#1a73e8] hover:bg-[#1557b0] transition flex items-center justify-center gap-2 shadow-sm"
              >
                <span>{isHost ? 'Start Interview as Host' : 'Join Interview Now'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="max-w-5xl w-full mx-auto text-center text-xs text-[#9aa0a6] pt-4 border-t border-[#3c4043]">
        <p>Enterprise Accessible Virtual Interview Room • End-to-End Encrypted WebRTC</p>
      </div>
    </div>
  )
}
