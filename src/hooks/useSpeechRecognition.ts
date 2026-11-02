import { useState, useEffect, useRef, useCallback } from 'react'

export type SpeechRecognitionState = {
  isListening: boolean
  interimTranscript: string
  audioLevel: number
  error: string | null
  isSupported: boolean
}

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: any
  webkitSpeechRecognition?: any
}

export function useSpeechRecognition(onSentenceFinalized: (sentence: string) => void) {
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(true)

  const recognitionRef = useRef<any>(null)
  const shouldListenRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Callback ref to avoid tearing or re-binding SpeechRecognition
  const onSentenceFinalizedRef = useRef(onSentenceFinalized)
  useEffect(() => {
    onSentenceFinalizedRef.current = onSentenceFinalized
  }, [onSentenceFinalized])

  // Sentence completion buffering & debounce timer
  const accumulatedSpeechRef = useRef<string>('')
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastProcessedFinalIndexRef = useRef<number>(0)
  const lastCommittedSentenceRef = useRef<{ text: string; timestamp: number }>({ text: '', timestamp: 0 })

  const finalizeSentence = useCallback(() => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current)
      pauseTimerRef.current = null
    }

    const candidate = accumulatedSpeechRef.current.trim()
    if (candidate.length > 0) {
      const now = Date.now()
      const prev = lastCommittedSentenceRef.current

      // Deduplication guard: ignore technical duplicate if identical text arrived within 2.2 seconds
      const isTechnicalDuplicate =
        prev.text === candidate && now - prev.timestamp < 2200

      if (!isTechnicalDuplicate) {
        lastCommittedSentenceRef.current = { text: candidate, timestamp: now }
        console.log('[Speech Recognition] Sentence Finalized:', candidate)
        onSentenceFinalizedRef.current(candidate)
      } else {
        console.log('[Speech Recognition] Technical duplicate rejected:', candidate)
      }

      accumulatedSpeechRef.current = ''
      setInterimTranscript('')
    }
  }, [])

  // Initialize Speech Recognition once
  useEffect(() => {
    const win = window as SpeechRecognitionWindow
    const SpeechClass = win.SpeechRecognition || win.webkitSpeechRecognition

    if (!SpeechClass) {
      setIsSupported(false)
      setError('Web Speech API is not supported in this browser. Please use Chrome/Edge or manual simulation.')
      return
    }

    const recognition = new SpeechClass()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setError(null)
      setIsListening(true)
      lastProcessedFinalIndexRef.current = 0
    }

    recognition.onresult = (event: any) => {
      let liveInterim = ''
      let newFinalChunk = ''

      // Process strictly from lastProcessedFinalIndex to prevent re-processing finalized results
      const startIndex = Math.max(event.resultIndex, lastProcessedFinalIndexRef.current)

      for (let i = startIndex; i < event.results.length; ++i) {
        const item = event.results[i]
        const text = item[0]?.transcript || ''
        if (item.isFinal) {
          newFinalChunk += ' ' + text
          lastProcessedFinalIndexRef.current = i + 1
        } else {
          liveInterim += text
        }
      }

      // Update accumulator with newly finalized speech chunks
      if (newFinalChunk.trim()) {
        accumulatedSpeechRef.current = (
          accumulatedSpeechRef.current +
          ' ' +
          newFinalChunk.trim()
        ).trim()
      }

      // Live partial captions: only show active uncommitted speech for real-time responsiveness
      const currentFullDisplay = (accumulatedSpeechRef.current + ' ' + liveInterim).trim()
      setInterimTranscript(currentFullDisplay)

      // Sentence boundary check: explicit terminal punctuation (. ? !)
      const endsWithPunctuation = /[.?!]$/.test(accumulatedSpeechRef.current.trim())
      if (endsWithPunctuation && accumulatedSpeechRef.current.trim().length > 3) {
        finalizeSentence()
        return
      }

      // Natural speech pause timer:
      // When the speaker pauses for 800ms without new speech, commit the finalized phrase
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current)
      }

      pauseTimerRef.current = setTimeout(() => {
        finalizeSentence()
      }, 800)
    }

    recognition.onerror = (event: any) => {
      console.warn('[Speech Recognition] Error:', event.error)
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please grant microphone permission in your browser.')
        shouldListenRef.current = false
        setIsListening(false)
      } else if (event.error === 'no-speech') {
        // Normal silence, don't stop
      } else {
        setError(`Speech recognition: ${event.error}`)
      }
    }

    recognition.onend = () => {
      // Finalize any pending speech before restarting
      finalizeSentence()
      lastProcessedFinalIndexRef.current = 0

      if (shouldListenRef.current) {
        try {
          recognition.start()
        } catch {
          // Ignore if already starting
        }
      } else {
        setIsListening(false)
        setInterimTranscript('')
      }
    }

    recognitionRef.current = recognition

    return () => {
      shouldListenRef.current = false
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current)
      try {
        recognition.abort()
      } catch {}
    }
  }, [finalizeSentence])

  // Web Audio analyser for live audio volume meter
  const startAudioLevelMonitoring = async () => {
    try {
      if (audioContextRef.current) return
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      analyser.smoothingTimeConstant = 0.5

      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)

      audioContextRef.current = audioCtx
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const updateLevel = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const average = sum / dataArray.length
        setAudioLevel(Math.min(100, Math.round((average / 128) * 100)))
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()
    } catch (e) {
      console.warn('[Audio Level] Could not access mic audio stream:', e)
    }
  }

  const stopAudioLevelMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
    setAudioLevel(0)
  }

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return
    shouldListenRef.current = true
    setError(null)
    try {
      recognitionRef.current.start()
      startAudioLevelMonitoring()
    } catch {
      // If already started
    }
  }, [])

  const stopListening = useCallback(() => {
    shouldListenRef.current = false
    finalizeSentence()
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }
    stopAudioLevelMonitoring()
    setIsListening(false)
    setInterimTranscript('')
  }, [finalizeSentence])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  return {
    isListening,
    interimTranscript,
    audioLevel,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  }
}
