import { translateEnglishToISL } from './src/isl/islTranslator.js';

const testCases = [
  // 1. Common Interview Questions
  "Can you introduce yourself?",
  "Tell me about your experience.",
  "What are your strengths?",
  "What are your weaknesses?",
  "Why do you want to join our company?",
  "What are your career goals?",
  "Do you have any questions?",

  // 2. Greetings & Courtesy
  "Welcome to the interview.",
  "Thank you for coming.",
  "Nice to meet you.",
  "Good morning, how are you?",

  // 3. Technical & Domain Terms (Unknown words that trigger fingerspelling)
  "Can you write React code?",
  "Do you know Python and Docker?",
  "Have you used Kubernetes?",

  // 4. Complex / Long Sentences
  "I want to work with your engineering team to build accessible computer software for students and teachers.",
  "We need to start the technical interview now because time is important.",

  // 5. Short Commands & Feedback
  "Please wait a minute.",
  "Yes, that is very good.",
  "No problem, thank you.",
];

console.log("===============================================================================");
console.log("TESTING INDIAN SIGN LANGUAGE (ISL) TRANSLATION ENGINE FOR INTERVIEW ROOM");
console.log("===============================================================================\n");

let passedCount = 0;

for (let i = 0; i < testCases.length; i++) {
  const query = testCases[i];
  const result = translateEnglishToISL(query);

  console.log(`[Test ${i + 1}] Input English: "${query}"`);
  console.log(`          ISL Gloss:     "${result.glossText}"`);
  console.log(`          Tokens (${result.tokens.length}):   [${result.tokens.join(', ')}]`);
  if (result.fingerspelled.length > 0) {
    console.log(`          Fingerspelled: [${result.fingerspelled.join(', ')}]`);
  }
  console.log(`          Mode:          ${result.mode}`);
  console.log('-------------------------------------------------------------------------------');

  if (result.tokens.length > 0) {
    passedCount++;
  }
}

console.log(`\nTEST RESULTS: ${passedCount}/${testCases.length} test cases successfully converted to ISL Gloss!\n`);
