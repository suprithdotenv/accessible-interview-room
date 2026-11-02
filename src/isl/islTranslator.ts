import { textToGloss } from '../avatar/textToGloss'
import { sanitizeTokens, SUPPORTED_TOKEN_SET, spellToken } from './islVocabulary'

export type TranslationResult = {
  tokens: string[]
  glossText: string
  original: string
  fingerspelled: string[]
  directSigns: string[]
  mode: 'rule-based' | 'interview-preset'
}

/** Specific high-accuracy mappings for common interview phrases in Indian Sign Language */
const INTERVIEW_PRESET_MAP: Record<string, string[]> = {
  'can you introduce yourself': ['YOU', 'NAME', 'TELL', 'WHAT'],
  'please introduce yourself': ['PLEASE', 'YOU', 'NAME', 'TELL'],
  'introduce yourself': ['YOU', 'NAME', 'TELL', 'WHAT'],
  'tell me about yourself': ['YOU', 'NAME', 'TELL', 'I'],
  
  'tell me about your experience': ['YOUR', 'WORK', 'TIME', 'TELL', 'I'],
  'what is your experience': ['YOUR', 'WORK', 'TIME', 'WHAT'],
  'do you have experience': ['YOU', 'WORK', 'TIME', 'HAVE'],
  
  'what are your strengths': ['YOUR', 'GOOD', 'WORK', 'WHAT'],
  'tell me your strengths': ['YOUR', 'GOOD', 'WORK', 'TELL'],
  
  'what are your weaknesses': ['YOUR', 'BAD', 'WORK', 'WHAT'],
  'tell me your weaknesses': ['YOUR', 'BAD', 'WORK', 'TELL'],
  
  'why do you want to join our company': ['YOU', 'OFFICE', 'WORK', 'WANT', 'WHY'],
  'why do you want to join us': ['YOU', 'OFFICE', 'WORK', 'WANT', 'WHY'],
  'why join our company': ['OFFICE', 'WORK', 'WANT', 'WHY'],
  
  'what are your career goals': ['YOUR', 'FUTURE', 'WORK', 'GOAL', 'WHAT'],
  'what is your goal': ['YOUR', 'FUTURE', 'WORK', 'GOAL', 'WHAT'],
  
  'do you have any questions': ['YOU', 'QUESTION', 'ASK'],
  'do you have any question': ['YOU', 'QUESTION', 'ASK'],
  'any questions for me': ['QUESTION', 'ASK', 'I'],
  'any question': ['QUESTION', 'ASK'],
  
  'welcome to the interview': ['WELCOME', 'INTERVIEW'],
  'thank you for coming': ['THANK_YOU', 'COME'],
  'nice to meet you': ['GOOD', 'MEET', 'YOU'],
  'how are you': ['YOU', 'HOW'],
  'good morning': ['GOOD', 'MORNING'],
  'good afternoon': ['GOOD', 'TIME'],
  'good evening': ['GOOD', 'TIME'],
}

/** Normalize input text for pattern matching */
function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Translates spoken English text into ISL Gloss representation.
 * Prioritizes common interview phrases, and falls back to deterministic
 * rule-based SOV grammar translation with fingerspelling for out-of-vocabulary words.
 */
export function translateEnglishToISL(text: string): TranslationResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return {
      tokens: [],
      glossText: '',
      original: '',
      fingerspelled: [],
      directSigns: [],
      mode: 'rule-based',
    }
  }

  const normalized = normalizeForMatching(trimmed)

  // 1. Check interview preset phrase library
  for (const [phrase, tokens] of Object.entries(INTERVIEW_PRESET_MAP)) {
    if (normalized === phrase || normalized.includes(phrase)) {
      const sanitized = sanitizeTokens(tokens)
      return {
        tokens: sanitized,
        glossText: sanitized.join(' '),
        original: trimmed,
        fingerspelled: sanitized.filter((t) => t.includes('-')),
        directSigns: sanitized.filter((t) => SUPPORTED_TOKEN_SET.has(t)),
        mode: 'interview-preset',
      }
    }
  }

  // 2. Perform rule-based ISL translation via textToGloss
  try {
    const glossRes = textToGloss(trimmed) as { tokens?: string[] }
    let rawTokens = glossRes?.tokens ?? []

    if (rawTokens.length === 0) {
      rawTokens = trimmed.toUpperCase().split(/\s+/)
    }

    // Coerce into avatar-supported format (known signs preserved, unknown words spelled)
    const sanitized = sanitizeTokens(rawTokens)

    // Analyze tokens
    const fingerspelled: string[] = []
    const directSigns: string[] = []

    for (const token of sanitized) {
      if (token.includes('-')) {
        fingerspelled.push(token)
      } else if (SUPPORTED_TOKEN_SET.has(token)) {
        directSigns.push(token)
      } else {
        // Fallback spelling
        const spelled = spellToken(token)
        if (spelled) fingerspelled.push(spelled)
      }
    }

    return {
      tokens: sanitized,
      glossText: sanitized.join(' '),
      original: trimmed,
      fingerspelled,
      directSigns,
      mode: 'rule-based',
    }
  } catch (error) {
    console.warn('[ISL Translator] Rule engine error, falling back to spelled words:', error)
    const fallback = sanitizeTokens(trimmed.toUpperCase().split(/\s+/))
    return {
      tokens: fallback,
      glossText: fallback.join(' '),
      original: trimmed,
      fingerspelled: fallback.filter((t) => t.includes('-')),
      directSigns: fallback.filter((t) => SUPPORTED_TOKEN_SET.has(t)),
      mode: 'rule-based',
    }
  }
}
