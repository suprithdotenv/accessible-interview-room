import { useState } from 'react'
import {
  Subtitles,
  Volume2,
  Sparkles,
  Type,
  Eye,
} from 'lucide-react'

type LiveCaptionsOverlayProps = {
  interimTranscript: string
  finalTranscript: string
  lastGloss?: string
  isSpeaking: boolean
  speakerName?: string
}

export function LiveCaptionsOverlay({
  interimTranscript,
  finalTranscript,
  lastGloss,
  isSpeaking,
  speakerName = 'Interviewer',
}: LiveCaptionsOverlayProps) {
  const [textSize, setTextSize] = useState<'normal' | 'large' | 'xl'>('large')
  const [highContrast, setHighContrast] = useState<boolean>(false)

  const hasContent = interimTranscript.trim() || finalTranscript.trim()

  const cycleTextSize = () => {
    const sizes: Array<'normal' | 'large' | 'xl'> = ['normal', 'large', 'xl']
    const nextIdx = (sizes.indexOf(textSize) + 1) % sizes.length
    setTextSize(sizes[nextIdx])
  }

  const textSizeClass = {
    normal: 'text-sm sm:text-base',
    large: 'text-base sm:text-lg',
    xl: 'text-lg sm:text-2xl font-semibold',
  }[textSize]

  return (
    <div
      className={`w-full rounded-2xl overflow-hidden border shadow-2xl transition-all duration-200 ${
        highContrast
          ? 'bg-black text-yellow-300 border-yellow-400/80 ring-2 ring-yellow-400/40'
          : 'bg-slate-950/85 backdrop-blur-xl text-slate-100 border-slate-800/90'
      }`}
    >
      {/* Top Caption Toolbar */}
      <div
        className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
          highContrast ? 'border-yellow-400/40 bg-zinc-950 text-yellow-200' : 'border-slate-800/80 bg-slate-900/60 text-slate-400'
        }`}
      >
        <div className="flex items-center gap-2">
          <Subtitles className={`w-4 h-4 ${highContrast ? 'text-yellow-400' : 'text-indigo-400'}`} />
          <span className="font-semibold tracking-wide uppercase text-[11px]">
            Live English Closed Captions (CC)
          </span>
          {isSpeaking && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Transcribing
            </span>
          )}
        </div>

        {/* Accessibility display controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={cycleTextSize}
            title={`Font Size: ${textSize}`}
            className="px-2 py-0.5 rounded-lg border border-white/10 hover:bg-white/10 transition flex items-center gap-1 text-[11px] font-mono"
          >
            <Type className="w-3 h-3" />
            <span className="uppercase">{textSize}</span>
          </button>

          <button
            onClick={() => setHighContrast((prev) => !prev)}
            title={highContrast ? 'Disable High Contrast' : 'Enable High Contrast'}
            className={`px-2 py-0.5 rounded-lg border transition flex items-center gap-1 text-[11px] ${
              highContrast
                ? 'bg-yellow-400 text-black border-yellow-300 font-bold'
                : 'border-white/10 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Eye className="w-3 h-3" />
            High Contrast
          </button>
        </div>
      </div>

      {/* Main Subtitle Display Area */}
      <div className="p-4 sm:p-5 min-h-[90px] flex flex-col justify-center">
        {hasContent ? (
          <div className="space-y-2">
            <div className="flex items-start gap-2.5">
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase shrink-0 mt-0.5 ${
                  highContrast
                    ? 'bg-yellow-400 text-black'
                    : 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                {speakerName}
              </span>

              <div className={`leading-relaxed ${textSizeClass}`}>
                {/* Finalized text */}
                {finalTranscript && (
                  <span className={highContrast ? 'text-yellow-100' : 'text-slate-100 font-medium'}>
                    {finalTranscript}{' '}
                  </span>
                )}

                {/* Real-time interim streaming text */}
                {interimTranscript && (
                  <span
                    className={`italic inline-flex items-center gap-1 ${
                      highContrast ? 'text-yellow-400 underline' : 'text-indigo-300 font-normal opacity-90'
                    }`}
                  >
                    {interimTranscript}
                    <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse ml-0.5" />
                  </span>
                )}
              </div>
            </div>

            {/* Accompanying ISL Gloss Translation */}
            {lastGloss && (
              <div
                className={`pt-2 border-t flex flex-wrap items-center gap-1.5 text-xs ${
                  highContrast ? 'border-yellow-400/30' : 'border-slate-800/80'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-70 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  ISL Gloss:
                </span>
                {lastGloss.split(' ').map((token, i) => (
                  <span
                    key={i}
                    className={`px-1.5 py-0.2 rounded font-mono text-[11px] ${
                      highContrast
                        ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/50'
                        : 'bg-indigo-950/60 text-indigo-200 border border-indigo-800/50'
                    }`}
                  >
                    {token}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-slate-500 italic text-sm">
            <Volume2 className="w-4 h-4 text-slate-600" />
            <span>Speak into the microphone or use interview presets below to generate live captions & signs.</span>
          </div>
        )}
      </div>
    </div>
  )
}
