import { useState, useEffect, useRef } from 'react'
import { useSentenceQueue } from './hooks/useSentenceQueue'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { translateEnglishToISL } from './isl/islTranslator'
import { InterviewerVideo } from './components/InterviewerVideo'
import { CandidateVideo } from './components/CandidateVideo'
import { LiveCaptionsFeed, type DialogueCaptionItem } from './components/LiveCaptionsFeed'
import { InterpreterStage } from './components/InterpreterStage'
import { PresetQuestionsBar } from './components/PresetQuestionsBar'
import { TranscriptDrawer, type TranscriptItem } from './components/TranscriptDrawer'
import { ISLGuideModal } from './components/ISLGuideModal'
import { InviteModal } from './components/InviteModal'
import { PreJoinLobby, type PreJoinConfig } from './components/PreJoinLobby'
import { RoomClient, type ParticipantRole } from './webrtc/roomClient'
import {
  FileText,
  HelpCircle,
  Link2,
  Clock,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MessageSquare,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'

export function App() {
  // 1. Role, Room & Remote Connection State
  const [role, setRole] = useState<ParticipantRole>('interviewer')
  const [roomId, setRoomId] = useState<string>('room-acc-1001')
  const [hostToken, setHostToken] = useState<string>('')
  const [candidateToken, setCandidateToken] = useState<string>('')
  const [inviteLink, setInviteLink] = useState<string>('')
  const [hasJoinedRoom, setHasJoinedRoom] = useState<boolean>(false)
  const [candidateName, setCandidateName] = useState<string>('Priya Sharma')
  const [interviewerName, setInterviewerName] = useState<string>('Dr. Vikram Sen (Host)')

  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isRemoteConnected, setIsRemoteConnected] = useState<boolean>(false)
  const [isSimulatedCandidate, setIsSimulatedCandidate] = useState<boolean>(false)

  // Modals & Panels
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [showPresetsBar, setShowPresetsBar] = useState(false)

  // Media Controls
  const [isLocalVideoOn, setIsLocalVideoOn] = useState(true)
  const [remoteMicOn, setRemoteMicOn] = useState(true)

  // 2. ISL Enable/Disable Option (Requirement 5: Disabled by default for candidate)
  const [isIslEnabled, setIsIslEnabled] = useState<boolean>(false)

  // Meeting duration timer
  const [meetingSeconds, setMeetingSeconds] = useState(0)
  const [isMeetingEnded, setIsMeetingEnded] = useState(false)

  const roomClientRef = useRef<RoomClient | null>(null)

  // 3. Dialogue Captions History (Interviewer + Candidate)
  const [dialogueCaptions, setDialogueCaptions] = useState<DialogueCaptionItem[]>([])
  const [activeSpeaker, setActiveSpeaker] = useState<'INTERVIEWER' | 'CANDIDATE' | null>(null)

  // 4. Sequential FIFO ISL Sentence Queue
  const {
    queue,
    currentSentence,
    addSentence,
    onSentenceComplete,
    clearQueue,
  } = useSentenceQueue()

  // Format timestamp (e.g. 8:30 PM)
  const getNowTimestamp = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Toggle ISL option
  const handleToggleIsl = () => {
    setIsIslEnabled((prev) => {
      const next = !prev
      if (!next) {
        // When disabled: clear pending signing queue immediately
        clearQueue()
      }
      return next
    })
  }

  // 5. Handle Finalized Local Speech (Strict Requirement 4: ONLY Host Speech converted to ISL)
  const handleFinalSentenceCommit = (finalSentence: string) => {
    const timestamp = getNowTimestamp()
    const speakerTag: 'INTERVIEWER' | 'CANDIDATE' = role === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'

    let islGlossText: string | undefined

    if (speakerTag === 'INTERVIEWER') {
      // Host speech: Translate to ISL
      const translation = translateEnglishToISL(finalSentence)
      islGlossText = translation.glossText

      // Only queue for 3D avatar signing if ISL is currently enabled!
      if (isIslEnabled) {
        addSentence(finalSentence)
      }
    } else {
      // CANDIDATE SPEECH: Never generate ISL translation, never send to avatar!
      islGlossText = undefined
    }

    // Add to dialogue conversation history (Instagram-style chats)
    const newEntry: DialogueCaptionItem = {
      id: `dialogue-${Date.now()}-${Math.random()}`,
      speaker: speakerTag,
      speakerName: role === 'interviewer' ? interviewerName : candidateName,
      text: finalSentence,
      timestamp,
      gloss: islGlossText,
    }
    setDialogueCaptions((prev) => [...prev, newEntry])

    // Broadcast finalized caption to remote peer over WebSocket
    roomClientRef.current?.broadcastCaption(speakerTag, finalSentence, true, islGlossText)
  }

  // 6. Speech Recognition Hook
  const {
    isListening,
    interimTranscript,
    audioLevel,
    error: speechError,
    toggleListening,
  } = useSpeechRecognition(handleFinalSentenceCommit)

  // Keep active speaker indicator in sync when speaking locally
  useEffect(() => {
    if (isListening && interimTranscript.trim()) {
      const currentSpeaker = role === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'
      setActiveSpeaker(currentSpeaker)
      // Broadcast live partial caption to remote peer
      roomClientRef.current?.broadcastCaption(currentSpeaker, interimTranscript, false)
    }
  }, [interimTranscript, isListening, role])

  // 7. Initialize Room & Check URL Query Parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const roomParam = params.get('room')
    const tokenParam = params.get('token')
    const roleParam = params.get('role')

    if (roomParam && roleParam === 'candidate' && tokenParam) {
      // Candidate joining via invitation link: ISL disabled by default
      setRole('candidate')
      setRoomId(roomParam)
      setCandidateToken(tokenParam)
      setIsIslEnabled(false)
      setHasJoinedRoom(false)
    } else {
      // Interviewer creates / joins room as Host
      fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: 'Dr. Vikram Sen' }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setRoomId(data.roomId)
            setHostToken(data.hostToken)
            setCandidateToken(data.candidateToken)
            setInviteLink(data.inviteLink)
          }
        })
        .catch((err) => {
          console.warn('Could not connect to /api/rooms/create:', err)
        })
    }
  }, [])

  // 8. Handle Pre-Join Lobby Confirmation (Both Host and Candidate)
  const handleLobbyJoin = (config: PreJoinConfig) => {
    if (role === 'interviewer') {
      setInterviewerName(config.name)
    } else {
      setCandidateName(config.name)
    }
    setIsLocalVideoOn(config.isVideoOn)
    setIsIslEnabled(config.isIslEnabled)
    setHasJoinedRoom(true)

    const token = role === 'interviewer' ? hostToken : candidateToken
    initRoomClient(roomId, role, token, config.name, config.localStream)
  }

  // 9. Setup RoomClient WebRTC & WebSocket
  const initRoomClient = (
    rId: string,
    pRole: ParticipantRole,
    pToken: string,
    pName: string,
    existingStream?: MediaStream | null
  ) => {
    if (roomClientRef.current) {
      roomClientRef.current.dispose()
    }

    const client = new RoomClient(rId, pRole, pToken, pName, {
      onLocalStream: (stream) => {
        setLocalStream(stream)
      },
      onRemoteStream: (stream) => {
        setRemoteStream(stream)
        setIsRemoteConnected(Boolean(stream))
      },
      onPeerStateChange: (peer) => {
        setIsRemoteConnected(peer.joined)
        if (peer.name) {
          if (pRole === 'interviewer') setCandidateName(peer.name)
          else setInterviewerName(peer.name)
        }
        if (peer.isMicOn !== undefined) {
          setRemoteMicOn(peer.isMicOn)
        }
      },
      onRemoteCaption: (caption) => {
        if (caption.isFinal) {
          const timestamp = getNowTimestamp()
          const newEntry: DialogueCaptionItem = {
            id: `dialogue-${Date.now()}-${Math.random()}`,
            speaker: caption.speaker,
            speakerName: caption.speaker === 'INTERVIEWER' ? interviewerName : candidateName,
            text: caption.text,
            timestamp,
            gloss: caption.gloss,
          }
          setDialogueCaptions((prev) => [...prev, newEntry])

          // Requirement 4: ONLY Interviewer / Host speech can trigger signing!
          // And ONLY if ISL is enabled by the candidate!
          if (caption.speaker === 'INTERVIEWER' && isIslEnabled) {
            addSentence(caption.text)
          }
        } else {
          setActiveSpeaker(caption.speaker)
        }
      },
      onMeetingEnded: () => {
        setIsMeetingEnded(true)
      },
      onError: (err) => {
        console.warn('[RoomClient] Error:', err)
      },
    })

    roomClientRef.current = client
    client.start(existingStream)
  }

  // Meeting duration ticker
  useEffect(() => {
    if (isMeetingEnded) return
    const timer = setInterval(() => {
      setMeetingSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isMeetingEnded])

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Toggle local video track
  const handleToggleLocalVideo = () => {
    const next = !isLocalVideoOn
    setIsLocalVideoOn(next)
    roomClientRef.current?.toggleLocalVideo(next)
  }

  // End Interview Meeting
  const handleEndInterview = () => {
    if (confirm('Are you sure you want to end this interview session?')) {
      roomClientRef.current?.endMeeting()
      setIsMeetingEnded(true)
    }
  }

  // Handle Preset Questions Submission (Host speech)
  const handleAskQuestion = (question: string) => {
    handleFinalSentenceCommit(question)

    // Optional synthesized speech for feedback
    if ('speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(question)
        utterance.rate = 1.0
        utterance.lang = 'en-US'
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utterance)
      } catch (e) {
        // SpeechSynthesis error ignored
      }
    }
  }

  // Simulated candidate toggle for instant single-user testing
  const handleToggleSimulation = () => {
    setIsSimulatedCandidate((p) => !p)
    setIsRemoteConnected(true)
  }

  // Build combined transcript items for drawer
  const transcriptItems: TranscriptItem[] = dialogueCaptions.map((item) => ({
    id: item.id,
    timestamp: item.timestamp,
    speaker: item.speaker === 'INTERVIEWER' ? 'Interviewer' : 'Candidate',
    englishText: item.text,
    islGloss: item.gloss,
  }))

  // Pre-join Lobby Screen (Before entering the live room)
  if (!hasJoinedRoom) {
    return (
      <PreJoinLobby
        role={role}
        initialName={role === 'interviewer' ? interviewerName : candidateName}
        roomId={roomId}
        onJoin={handleLobbyJoin}
      />
    )
  }

  // If meeting has ended
  if (isMeetingEnded) {
    return (
      <div className="min-h-screen bg-[#121212] text-[#e8eaed] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-[#202124] border border-[#3c4043] rounded-2xl p-8 space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-950/60 text-red-400 border border-red-800 flex items-center justify-center mx-auto mb-2">
            <PhoneOff className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white">Interview Session Ended</h1>
          <p className="text-xs text-[#9aa0a6]">
            Total meeting duration: <span className="font-mono font-semibold text-white">{formatTimer(meetingSeconds)}</span>
          </p>
          <p className="text-xs text-[#9aa0a6]">
            Recorded {dialogueCaptions.length} dialogue messages in transcript.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => setIsTranscriptOpen(true)}
              className="w-full py-2.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>Download Transcript</span>
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              className="w-full py-2.5 rounded-xl bg-[#28292c] hover:bg-[#35373b] text-[#e8eaed] border border-[#3c4043] text-xs font-medium transition"
            >
              Start New Interview Room
            </button>
          </div>
        </div>

        <TranscriptDrawer
          isOpen={isTranscriptOpen}
          onClose={() => setIsTranscriptOpen(false)}
          items={transcriptItems}
          onClear={clearQueue}
        />
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-[#121212] text-[#e8eaed] flex flex-col overflow-hidden font-sans select-none">
      {/* 1. TOP VIDEO CONFERENCING HEADER (Google Meet Style) */}
      <header className="h-14 px-4 bg-[#202124] border-b border-[#3c4043] flex items-center justify-between gap-3 shrink-0 z-20 shadow-md">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold tracking-wider uppercase text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
              LIVE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-white tracking-tight">
              Accessible Interview Room
            </h1>
            <span className="text-[11px] font-mono text-[#9aa0a6] bg-[#28292c] px-2 py-0.5 rounded border border-[#3c4043]">
              #{roomId}
            </span>
          </div>
        </div>

        {/* Center: Meeting Duration Timer */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#28292c] border border-[#3c4043] text-xs font-mono text-[#e8eaed]">
          <Clock className="w-3.5 h-3.5 text-[#8ab4f8]" />
          <span>{formatTimer(meetingSeconds)}</span>
        </div>

        {/* Right: Actions (Invite, Transcript, ISL Guide, End Call) */}
        <div className="flex items-center gap-2">
          {/* Invite Candidate Button */}
          <button
            onClick={() => setIsInviteOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            title="Invite Remote Candidate"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Invite Candidate</span>
          </button>

          {/* Transcript Button */}
          <button
            onClick={() => setIsTranscriptOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-[#28292c] hover:bg-[#35373b] text-[#e8eaed] border border-[#3c4043] text-xs font-medium flex items-center gap-1.5 transition shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span className="hidden md:inline">Transcript</span>
            {dialogueCaptions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#1a73e8] text-white font-bold">
                {dialogueCaptions.length}
              </span>
            )}
          </button>

          {/* ISL Guide Button */}
          <button
            onClick={() => setIsGuideOpen(true)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-[#28292c] hover:bg-[#35373b] text-[#e8eaed] border border-[#3c4043] text-xs font-medium flex items-center gap-1.5 transition shadow-2xs"
            title="Indian Sign Language Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span className="hidden md:inline">Guide</span>
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndInterview}
            className="px-3 py-1.5 rounded-lg bg-[#ea4335] hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs ml-1"
            title="Leave Meeting"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN TWO-COLUMN LAYOUT (Strict Requirement) */}
      <main className="flex-1 min-h-0 p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-3.5 overflow-hidden bg-[#121212]">
        {/* ============================================================ */}
        {/* LEFT COLUMN: Video Feeds (Interviewer on Top, Candidate Bottom) */}
        {/* ============================================================ */}
        <section className="lg:col-span-7 flex flex-col gap-3 min-h-0 h-full overflow-hidden">
          {/* Top Section – Interviewer Video */}
          <div className="flex-1 min-h-0 relative">
            <InterviewerVideo
              stream={role === 'interviewer' ? localStream : remoteStream}
              isMicOn={role === 'interviewer' ? isListening : remoteMicOn}
              isVideoOn={isLocalVideoOn}
              audioLevel={role === 'interviewer' ? audioLevel : 0}
              interviewerName={interviewerName}
              isLocal={role === 'interviewer'}
              onToggleMic={toggleListening}
              onToggleVideo={handleToggleLocalVideo}
            />
          </div>

          {/* Bottom Section – Candidate Video */}
          <div className="flex-1 min-h-0 relative">
            <CandidateVideo
              stream={role === 'candidate' ? localStream : remoteStream}
              isConnected={isRemoteConnected || role === 'candidate'}
              isMicOn={role === 'candidate' ? isListening : remoteMicOn}
              isVideoOn={isLocalVideoOn}
              candidateName={candidateName}
              isLocal={role === 'candidate'}
              onToggleMic={toggleListening}
              onToggleVideo={handleToggleLocalVideo}
              onInviteClick={() => setIsInviteOpen(true)}
              onStartSimulation={handleToggleSimulation}
              isSimulated={isSimulatedCandidate}
              activeQuestion={currentSentence?.sentence}
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Accessibility Feeds (Captions on Top, ISL Bottom) */}
        {/* ============================================================ */}
        <section className="lg:col-span-5 flex flex-col gap-3 min-h-0 h-full overflow-hidden">
          {/* Top Section – Live Captions (Instagram-style Conversation Stream) */}
          <div className="flex-[0.9] min-h-0 relative flex flex-col">
            <LiveCaptionsFeed
              captions={dialogueCaptions}
              interimTranscript={interimTranscript}
              activeSpeaker={activeSpeaker}
              isSpeaking={isListening && audioLevel > 8}
              interviewerName={interviewerName}
              candidateName={candidateName}
            />
          </div>

          {/* Bottom Section – Virtual 3D ISL Interpreter (Realistic Mannequin) */}
          <div className="flex-[1.1] min-h-0 relative flex flex-col">
            <InterpreterStage
              queue={queue}
              currentSentence={currentSentence}
              isIslEnabled={isIslEnabled}
              onToggleIsl={handleToggleIsl}
              onSentenceComplete={onSentenceComplete}
              onOpenGuide={() => setIsGuideOpen(true)}
              onResetQueue={clearQueue}
            />
          </div>
        </section>
      </main>

      {/* 3. BOTTOM CONTROL BAR (Google Meet Dark Style) */}
      <footer className="h-14 px-4 bg-[#202124] border-t border-[#3c4043] flex items-center justify-between gap-4 shrink-0 z-20 shadow-md">
        {/* Left: Quick Prompts Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPresetsBar((p) => !p)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
              showPresetsBar
                ? 'bg-blue-950/70 text-[#8ab4f8] border-blue-700'
                : 'bg-[#28292c] text-[#e8eaed] border-[#3c4043] hover:bg-[#35373b]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span className="hidden sm:inline">Quick Interview Questions</span>
            <span className="sm:hidden">Prompts</span>
          </button>
        </div>

        {/* Center: Main Mic and Camera Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleListening}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-xs ${
              isListening
                ? 'bg-[#3c4043] hover:bg-[#474a4d] text-[#e8eaed] border border-[#4f5358]'
                : 'bg-[#ea4335] hover:bg-red-700 text-white'
            }`}
          >
            {isListening ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5" />}
            <span>{isListening ? 'Mute Mic' : 'Unmute Mic'}</span>
          </button>

          <button
            onClick={handleToggleLocalVideo}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-xs ${
              isLocalVideoOn
                ? 'bg-[#3c4043] hover:bg-[#474a4d] text-[#e8eaed] border border-[#4f5358]'
                : 'bg-[#ea4335] hover:bg-red-700 text-white'
            }`}
          >
            {isLocalVideoOn ? <Video className="w-3.5 h-3.5 text-slate-300" /> : <VideoOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isLocalVideoOn ? 'Stop Camera' : 'Start Camera'}</span>
          </button>
        </div>

        {/* Right: ISL Toggle & Security Pill */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleToggleIsl}
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 border transition ${
              isIslEnabled
                ? 'bg-blue-950/70 text-[#8ab4f8] border-blue-700 font-semibold'
                : 'bg-[#28292c] text-[#9aa0a6] border-[#3c4043]'
            }`}
          >
            {isIslEnabled ? <ToggleRight className="w-4 h-4 text-[#8ab4f8]" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
            <span>ISL {isIslEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <span className="hidden lg:flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded font-mono">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Secure Room
          </span>
        </div>
      </footer>

      {/* Slide-Up Preset Interview Questions Tray */}
      {showPresetsBar && (
        <div className="fixed bottom-16 left-4 right-4 max-w-2xl mx-auto z-40 animate-in slide-in-from-bottom-2 duration-150 shadow-xl">
          <PresetQuestionsBar
            onAskQuestion={handleAskQuestion}
            isMicOn={isListening}
            onToggleMic={toggleListening}
            isListening={isListening}
            speechError={speechError}
          />
        </div>
      )}

      {/* Invite Candidate Modal */}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        roomId={roomId}
        inviteLink={
          (inviteLink && !inviteLink.includes('localhost') && !window.location.hostname.includes('localhost'))
            ? inviteLink
            : `${window.location.origin}/?room=${roomId}&token=${candidateToken}&role=candidate`
        }
        hostToken={hostToken}
      />

      {/* Transcript Drawer */}
      <TranscriptDrawer
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
        items={transcriptItems}
        onClear={clearQueue}
      />

      {/* ISL Guide Modal */}
      <ISLGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  )
}

export default App
