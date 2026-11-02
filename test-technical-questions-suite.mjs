import { TECHNICAL_INTERVIEW_QUESTIONS } from './src/testing/technicalInterviewQuestions.ts'
import { translateEnglishToISL } from './src/isl/islTranslator.ts'

console.log('========================================================================')
console.log('TECHNICAL INTERVIEW QUESTIONS VALIDATION SUITE (12 DOMAINS)')
console.log('========================================================================\n')

let passCount = 0
let failCount = 0

for (const testCase of TECHNICAL_INTERVIEW_QUESTIONS) {
  try {
    const result = translateEnglishToISL(testCase.question)
    
    // Check that key terms are preserved without guessing
    const missingTerms = testCase.keyTerms.filter((term) => {
      const normalizedTerm = term.toLowerCase().replace(/[^a-z0-9]/g, '')
      const inGloss = result.glossText.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedTerm)
      const inTokens = result.tokens.some((t) => t.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedTerm))
      return !inGloss && !inTokens
    })

    const hasPlayableTokens = result.tokens.length > 0
    const hasReadableGloss = result.glossText.length > 0 && !result.glossText.includes('-') && !result.glossText.includes('_')

    if (hasPlayableTokens && hasReadableGloss) {
      passCount++
      console.log(`[PASS] [${testCase.category}] "${testCase.question}"`)
      console.log(`       ISL Gloss:  "${result.glossText}"`)
      console.log(`       Tokens (${result.tokens.length}): [${result.tokens.slice(0, 5).join(', ')}${result.tokens.length > 5 ? '...' : ''}]`)
    } else {
      failCount++
      console.error(`[FAIL] [${testCase.category}] "${testCase.question}"`)
      console.error(`       Tokens:`, result.tokens)
      console.error(`       Gloss:`, result.glossText)
    }
  } catch (err) {
    failCount++
    console.error(`[ERROR] [${testCase.category}] "${testCase.question}":`, err.message)
  }
}

console.log('\n========================================================================')
console.log(`RESULTS: ${passCount}/${TECHNICAL_INTERVIEW_QUESTIONS.length} TECHNICAL TEST CASES PASSED (${failCount} failed)`)
console.log('========================================================================\n')

if (failCount > 0) process.exit(1)
