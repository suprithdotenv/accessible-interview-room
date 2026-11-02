import { useState, useCallback, useRef } from 'react'
import { translateEnglishToISL } from '../isl/islTranslator'

export type SentenceStatus = 'signing' | 'queued' | 'waiting'

export type SentenceQueueItem = {
  id: string
  sentence: string
  glossText: string
  tokens: string[]
  status: SentenceStatus
  timestamp: string
}

export function useSentenceQueue() {
  const [queue, setQueue] = useState<SentenceQueueItem[]>([])
  const [history, setHistory] = useState<SentenceQueueItem[]>([])
  const lastAddedRef = useRef<{ text: string; time: number } | null>(null)

  // Current active sentence being signed (index 0 if status is 'signing')
  const currentSentence = queue.length > 0 && queue[0].status === 'signing' ? queue[0] : null

  /**
   * Adds a newly finalized sentence to the FIFO queue.
   * Prevents duplicates and avoids interrupting current signing.
   */
  const addSentence = useCallback((englishText: string) => {
    const trimmed = englishText.trim()
    if (!trimmed) return null

    const normalized = trimmed.toLowerCase().replace(/[.,!?;:'"-]/g, '').trim()
    if (!normalized) return null

    // Check against recent duplicate (within 3 seconds)
    const now = Date.now()
    if (
      lastAddedRef.current &&
      now - lastAddedRef.current.time < 3000 &&
      lastAddedRef.current.text === normalized
    ) {
      console.log('[Sentence Queue] Ignored rapid duplicate sentence:', trimmed)
      return null
    }

    let createdItem: SentenceQueueItem | null = null

    setQueue((prevQueue) => {
      // Check if duplicate of any currently pending or signing sentence
      const existsInQueue = prevQueue.some(
        (item) => item.sentence.toLowerCase().replace(/[.,!?;:'"-]/g, '').trim() === normalized
      )
      if (existsInQueue) {
        console.log('[Sentence Queue] Ignored duplicate in active queue:', trimmed)
        return prevQueue
      }

      // Translate finalized English sentence to ISL gloss tokens
      const translation = translateEnglishToISL(trimmed)
      if (!translation.tokens || translation.tokens.length === 0) {
        return prevQueue
      }

      // Assign status:
      // - First sentence in queue -> 'signing'
      // - Second sentence in queue -> 'queued'
      // - Third or more in queue -> 'waiting'
      let status: SentenceStatus = 'waiting'
      if (prevQueue.length === 0) {
        status = 'signing'
      } else if (prevQueue.length === 1) {
        status = 'queued'
      } else {
        status = 'waiting'
      }

      const item: SentenceQueueItem = {
        id: `sent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sentence: trimmed,
        glossText: translation.glossText,
        tokens: translation.tokens,
        status,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      createdItem = item
      lastAddedRef.current = { text: normalized, time: now }

      console.log(`[Sentence Queue] Added "${trimmed}" with status [${status.toUpperCase()}]`)
      return [...prevQueue, item]
    })

    return createdItem
  }, [])

  /**
   * Called when the avatar finishes signing all frames of the current sentence.
   * Promotes the next sentence from 'queued' to 'signing'.
   */
  const onSentenceComplete = useCallback((completedId: string) => {
    setQueue((prevQueue) => {
      if (prevQueue.length === 0) return prevQueue

      const finishedItem = prevQueue[0]
      if (finishedItem.id !== completedId) {
        // ID mismatch safety check
        const idx = prevQueue.findIndex((item) => item.id === completedId)
        if (idx === -1) return prevQueue
      }

      // Archive to history
      setHistory((prevHistory) => [...prevHistory, { ...finishedItem, status: 'signing' }])

      // Remove finished item and promote remaining sentences in FIFO order
      const remaining = prevQueue.slice(1)
      const updated = remaining.map((item, index) => {
        let newStatus: SentenceStatus = 'waiting'
        if (index === 0) {
          newStatus = 'signing'
        } else if (index === 1) {
          newStatus = 'queued'
        } else {
          newStatus = 'waiting'
        }
        return { ...item, status: newStatus }
      })

      if (updated.length > 0) {
        console.log(
          `[Sentence Queue] Advanced to next sentence: "${updated[0].sentence}" [SIGNING]`
        )
      } else {
        console.log('[Sentence Queue] Queue finished. Avatar is now ready.')
      }

      return updated
    })
  }, [])

  /** Clears all sentences from the queue */
  const clearQueue = useCallback(() => {
    setQueue([])
    lastAddedRef.current = null
  }, [])

  return {
    queue,
    currentSentence,
    history,
    addSentence,
    onSentenceComplete,
    clearQueue,
  }
}
