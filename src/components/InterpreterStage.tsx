import { useState, useCallback } from 'react'
import {
  AvatarPlayer,
  type AvatarState,
} from '../avatar/AvatarPlayer'
import type { SentenceQueueItem } from '../hooks/useSentenceQueue'
import {
  Maximize2,
  Minimize2,
  Gauge,
  Camera,
  HelpCircle,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  HandMetal,
  SpellCheck,
} from 'lucide-react'

type InterpreterStageProps = {
  queue: SentenceQueueItem[]
  currentSentence: SentenceQueueItem | null
  isIslEnabled: boolean
  onToggleIsl: () => void
  onSentenceComplete: (id: string) => void
  onReplay?: () => void
  onOpenGuide?: () => void
  onResetQueue?: () => void
}

export function InterpreterStage({
  queue,
  currentSentence,
  isIslEnabled,
  onToggleIsl,
  onSentenceComplete,
  onOpenGuide,
}: InterpreterStageProps) {
  const [speed, setSpeed] = useState<number>(1.0)
  const [cameraView, setCameraView] = useState<'standard' | 'closeup' | 'wide'>('standard')
  const [stopId] = useState<number>(0)
  const [resetId] = useState<number>(0)
  const [avatarState, setAvatarState] = useState<AvatarState>('loading')
  const [currentSign, setCurrentSign] = useState<string | null>(null)
  const [, setRemainingSignsInSentence] = useState<number>(0)
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  const cycleSpeed = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5]
    const nextIndex = (speeds.indexOf(speed) + 1) % speeds.length
    setSpeed(speeds[nextIndex])
  }

  const cycleCamera = () => {
    const views: Array<'standard' | 'closeup' | 'wide'> = ['standard', 'closeup', 'wide']
    const nextIndex = (views.indexOf(cameraView) + 1) % views.length
    setCameraView(views[nextIndex])
  }

  const handleCurrentSignChange = useCallback((sign: string | null, remaining: number) => {
    setCurrentSign(sign)
    setRemainingSignsInSentence(remaining)
  }, [])

  const signingItem = queue.find((item) => item.status === 'signing')
  const isFingerspelling = currentSign ? currentSign.includes('-') : false

  // Split readable ISL gloss into individual words for synchronized highlighting
  const readableGloss = currentSentence?.glossText || ''
  const glossWords = readableGloss ? readableGloss.split(/\s+/).filter(Boolean) : []

  // Header status badge
  const getHeaderStatusBadge = () => {
    if (!isIslEnabled) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#303134] border border-[#3c4043] text-[#9aa0a6] flex items-center gap-1.5 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          ISL OFF
        </span>
      )
    }

    if (avatarState === 'loading') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/60 border border-amber-800 text-amber-300 flex items-center gap-1.5 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          LOADING MODEL
        </span>
      )
    }

    if (avatarState === 'error') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-950/60 border border-red-800 text-red-300 flex items-center gap-1.5 shadow-2xs">
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          MODEL ERROR
        </span>
      )
    }

    if (avatarState === 'signing' || !!signingItem) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-950/70 border border-blue-700 text-blue-300 flex items-center gap-1.5 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          SIGNING
        </span>
      )
    }

    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-1.5 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        INTERPRETER READY
      </span>
    )
  }

  return (
    <div
      className={`relative w-full bg-[#202124] rounded-2xl overflow-hidden border border-[#3c4043] shadow-md flex flex-col transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl h-[calc(100vh-2rem)]' : 'h-full min-h-0'
      }`}
    >
      {/* 1. TOP TOOLBAR: Title, Badges & Controls */}
      <div className="px-3.5 py-2 border-b border-[#3c4043] bg-[#202124] flex items-center justify-between gap-2 z-10 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-[#e8eaed] flex items-center gap-1.5">
            <span>3D ISL Interpreter</span>
          </h2>
          {getHeaderStatusBadge()}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Enable / Disable ISL Toggle */}
          <button
            onClick={onToggleIsl}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              isIslEnabled
                ? 'bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs'
                : 'bg-[#303134] hover:bg-[#3c4043] text-[#e8eaed] border border-[#3c4043]'
            }`}
          >
            {isIslEnabled ? (
              <>
                <ToggleRight className="w-4 h-4 text-white" />
                <span>ISL Active</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-slate-400" />
                <span>Enable ISL</span>
              </>
            )}
          </button>

          {/* Guide Button */}
          <button
            onClick={onOpenGuide}
            title="ISL Sign Vocabulary Guide"
            className="p-1.5 rounded-lg bg-[#28292c] hover:bg-[#35373b] text-[#e8eaed] border border-[#3c4043] transition text-xs flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span className="text-[11px] hidden sm:inline">Guide</span>
          </button>

          {/* Camera View Switcher */}
          <button
            onClick={cycleCamera}
            title={`Camera Framing: ${cameraView}`}
            className="p-1.5 rounded-lg bg-[#28292c] hover:bg-[#35373b] text-[#e8eaed] border border-[#3c4043] transition text-xs flex items-center gap-1"
          >
            <Camera className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-[10px] font-mono capitalize hidden sm:inline">{cameraView}</span>
          </button>

          {/* Speed Toggle */}
          <button
            onClick={cycleSpeed}
            title="Signing Playback Speed"
            className="p-1.5 rounded-lg bg-[#28292c] hover:bg-[#35373b] text-[#e8eaed] border border-[#3c4043] transition text-xs flex items-center gap-1 font-mono font-semibold"
          >
            <Gauge className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span className="text-[10px]">{speed}x</span>
          </button>

          {/* Expand / Minimize */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? 'Minimize Stage' : 'Expand Stage'}
            className="p-1.5 rounded-lg bg-[#28292c] hover:bg-[#35373b] text-[#e8eaed] border border-[#3c4043] transition text-xs"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. DEDICATED ISL TRANSLATION & GLOSS PANEL (Clear English + ISL Gloss in Readable Words for Judges) */}
      <div className="px-3.5 py-2.5 bg-[#18191c] border-b border-[#3c4043] flex flex-col gap-2 shrink-0">
        {/* Row 1: Original Spoken English */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#1a73e8]/20 text-[#8ab4f8] border border-[#1a73e8]/40 shrink-0">
              English
            </span>
            <p className="font-medium text-[#e8eaed] text-xs truncate">
              {!isIslEnabled
                ? 'ISL Interpreter disabled (Captions only)'
                : currentSentence
                ? `"${currentSentence.sentence}"`
                : 'Standing by for host speech...'}
            </p>
          </div>

          {/* Real-time sign animation badge */}
          {isIslEnabled && currentSign ? (
            <div className="flex items-center gap-1.5 shrink-0 bg-[#28292c] border border-[#3c4043] px-2.5 py-0.5 rounded-lg text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34a853] animate-pulse" />
              {isFingerspelling ? (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <SpellCheck className="w-3 h-3 text-amber-400" />
                  Spelling:
                </span>
              ) : (
                <span className="text-slate-400">Signing:</span>
              )}
              <span className="font-mono font-bold text-[#8ab4f8]">
                {currentSign.replaceAll('_', ' ')}
              </span>
            </div>
          ) : (
            <div className="shrink-0 text-[10px] text-slate-500 italic">
              {isIslEnabled ? 'Rest Pose' : 'Avatar Inactive'}
            </div>
          )}
        </div>

        {/* Row 2: ISL Gloss (Separately displayed in readable English words) */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-950/70 text-emerald-300 border border-emerald-700/60 shrink-0 flex items-center gap-1">
            <HandMetal className="w-3 h-3 text-emerald-400" />
            ISL Gloss
          </span>

          {isIslEnabled && currentSentence ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {glossWords.map((word, idx) => {
                const normalizedWord = word.toUpperCase()
                const isWordActive =
                  currentSign &&
                  (currentSign.toUpperCase() === normalizedWord ||
                    currentSign.replaceAll('-', '').toUpperCase() === normalizedWord ||
                    currentSign.replaceAll('_', ' ').toUpperCase() === normalizedWord)

                return (
                  <span
                    key={`${word}-${idx}`}
                    className={`px-2 py-0.5 rounded-md text-xs font-bold font-mono tracking-wide transition-all ${
                      isWordActive
                        ? 'bg-[#1a73e8] text-white shadow-md shadow-blue-500/30 scale-105 border border-blue-400'
                        : 'bg-[#28292c] text-[#e8eaed] border border-[#3c4043]'
                    }`}
                  >
                    {word}
                  </span>
                )
              })}
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic">
              {isIslEnabled
                ? 'Sign language gloss translation sequence will appear here...'
                : 'Enable ISL above to view sign gloss translation'}
            </span>
          )}
        </div>
      </div>

      {/* 3. MAIN 3D AVATAR VIEWPORT (Expanded with full vertical height, no queue box below) */}
      <div className="flex-1 w-full relative min-h-[220px] bg-[#13151b] flex items-center justify-center overflow-hidden">
        <AvatarPlayer
          currentSentence={isIslEnabled ? currentSentence : null}
          model="default"
          stopId={stopId}
          resetId={resetId}
          speed={speed}
          cameraView={cameraView}
          onSentenceComplete={onSentenceComplete}
          onStateChange={setAvatarState}
          onCurrentSignChange={handleCurrentSignChange}
        />
      </div>
    </div>
  )
}
