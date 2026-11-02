import { useState, useCallback } from 'react'
import {
  AvatarPlayer,
  type AvatarState,
} from '../avatar/AvatarPlayer'
import type { SentenceQueueItem } from '../hooks/useSentenceQueue'
import {
  Sparkles,
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
  onResetQueue,
}: InterpreterStageProps) {
  const [speed, setSpeed] = useState<number>(1.0)
  const [cameraView, setCameraView] = useState<'standard' | 'closeup' | 'wide'>('standard')
  const [stopId, setStopId] = useState<number>(0)
  const [resetId, setResetId] = useState<number>(0)
  const [avatarState, setAvatarState] = useState<AvatarState>('loading')
  const [currentSign, setCurrentSign] = useState<string | null>(null)
  const [remainingSignsInSentence, setRemainingSignsInSentence] = useState<number>(0)
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

  // Partition queue items for status badges:
  const signingItem = queue.find((item) => item.status === 'signing')
  const queuedItem = queue.find((item) => item.status === 'queued')
  const waitingItems = queue.filter((item) => item.status === 'waiting')

  const isFingerspelling = currentSign ? currentSign.includes('-') : false

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

      {/* 2. DEDICATED FIXED INFORMATION AREA (NO OVERLAP ON AVATAR HEAD) */}
      <div className="px-3.5 py-1.5 bg-[#18191c] border-b border-[#3c4043] flex items-center justify-between gap-3 text-xs shrink-0 min-h-[40px]">
        {/* Left: Active English Sentence being signed */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8ab4f8]" />
            <span>Interpreting Sentence:</span>
          </div>
          <p className="font-medium text-[#e8eaed] text-xs truncate mt-0.5">
            {!isIslEnabled
              ? 'ISL Interpreter disabled (Captions only)'
              : currentSentence
              ? `"${currentSentence.sentence}"`
              : 'Standing by for host speech...'}
          </p>
        </div>

        {/* Right: Active Sign & Fingerspelling Breakdown */}
        {isIslEnabled && currentSign ? (
          <div className="flex items-center gap-2 shrink-0 bg-[#28292c] border border-[#3c4043] px-3 py-1 rounded-xl shadow-2xs">
            {isFingerspelling ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-950/60 text-amber-300 border border-amber-800 flex items-center gap-1">
                <SpellCheck className="w-3 h-3 text-amber-400" />
                Fingerspelling
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-blue-950/70 text-blue-300 border border-blue-700 flex items-center gap-1">
                <HandMetal className="w-3 h-3 text-[#8ab4f8]" />
                ISL Sign
              </span>
            )}

            <span className="font-mono font-bold text-xs text-[#8ab4f8] tracking-wide">
              {currentSign.replaceAll('_', ' ')}
            </span>

            {remainingSignsInSentence > 1 && (
              <span className="text-[10px] font-mono text-slate-400">
                ({remainingSignsInSentence - 1} left)
              </span>
            )}
          </div>
        ) : (
          <div className="shrink-0 text-[11px] text-slate-400 italic">
            {isIslEnabled ? 'Rest Pose' : 'Avatar Inactive'}
          </div>
        )}
      </div>

      {/* 3. MAIN 3D AVATAR VIEWPORT (100% UNOBSTRUCTED SPACE FOR HEAD, CHEST & HANDS) */}
      <div className="flex-1 w-full relative min-h-[200px] bg-[#13151b] flex items-center justify-center overflow-hidden">
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

      {/* 4. LOWER SECTION: Sequential Sentence Queue Status */}
      <div className="p-3 bg-white border-t border-slate-100 flex flex-col gap-2 z-10 shrink-0">
        <div className="bg-[#fafafa] border border-slate-200/90 rounded-xl p-2.5 flex flex-col gap-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-between border-b border-slate-200/60 pb-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-600" />
              Sequential Sign Queue
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              {isIslEnabled ? `${queue.length} in queue` : 'Disabled'}
            </span>
          </div>

          {!isIslEnabled ? (
            <p className="text-xs text-slate-500 italic py-0.5">
              Click "Enable ISL" above to begin translating the host's spoken English into ISL signs.
            </p>
          ) : queue.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-0.5">
              Standing by for host's finalized speech...
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[70px] overflow-y-auto custom-scrollbar">
              {/* 1. SIGNING Status */}
              {signingItem && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    SIGNING
                  </span>
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {signingItem.sentence}
                  </span>
                </div>
              )}

              {/* 2. QUEUED Status */}
              {queuedItem && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                    QUEUED
                  </span>
                  <span className="text-xs font-medium text-slate-700 truncate">
                    {queuedItem.sentence}
                  </span>
                </div>
              )}

              {/* 3. WAITING Status */}
              {waitingItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                    WAITING
                  </span>
                  <span className="text-xs text-slate-600 truncate">
                    {item.sentence}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
