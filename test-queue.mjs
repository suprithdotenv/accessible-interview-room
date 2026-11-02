import { translateEnglishToISL } from './src/isl/islTranslator.js';

// Simulated Sentence Queue Controller identical to useSentenceQueue
class TestSentenceQueue {
  constructor() {
    this.queue = [];
    this.history = [];
    this.lastAdded = null;
  }

  addSentence(sentence) {
    const trimmed = sentence.trim();
    if (!trimmed) return null;

    const normalized = trimmed.toLowerCase().replace(/[.,!?;:'"-]/g, '').trim();
    if (!normalized) return null;

    const now = Date.now();
    if (this.lastAdded && now - this.lastAdded.time < 3000 && this.lastAdded.text === normalized) {
      return { rejected: true, reason: 'Rapid duplicate rejected' };
    }

    const existsInQueue = this.queue.some(
      (item) => item.sentence.toLowerCase().replace(/[.,!?;:'"-]/g, '').trim() === normalized
    );
    if (existsInQueue) {
      return { rejected: true, reason: 'In-queue duplicate rejected' };
    }

    const translation = translateEnglishToISL(trimmed);
    if (!translation.tokens || translation.tokens.length === 0) {
      return { rejected: true, reason: 'No tokens' };
    }

    let status = 'waiting';
    if (this.queue.length === 0) {
      status = 'signing';
    } else if (this.queue.length === 1) {
      status = 'queued';
    } else {
      status = 'waiting';
    }

    const item = {
      id: `sent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sentence: trimmed,
      glossText: translation.glossText,
      tokens: translation.tokens,
      status,
      timestamp: new Date().toLocaleTimeString(),
    };

    this.lastAdded = { text: normalized, time: now };
    this.queue.push(item);
    return item;
  }

  onSentenceComplete(completedId) {
    if (this.queue.length === 0) return;

    const finished = this.queue.shift();
    this.history.push({ ...finished, status: 'completed' });

    this.queue = this.queue.map((item, index) => {
      let newStatus = 'waiting';
      if (index === 0) newStatus = 'signing';
      else if (index === 1) newStatus = 'queued';
      else newStatus = 'waiting';
      return { ...item, status: newStatus };
    });
  }
}

console.log("===============================================================================");
console.log("TESTING SEQUENTIAL SENTENCE QUEUE & 3 STATUS BADGES (SIGNING, QUEUED, WAITING)");
console.log("===============================================================================\n");

const q = new TestSentenceQueue();

// Step 1: Add Sentence 1
const s1 = q.addSentence("Can you introduce yourself?");
console.log(`[Step 1] Added Sentence 1: "${s1.sentence}" -> Status: [${s1.status.toUpperCase()}]`);
if (s1.status !== 'signing') throw new Error("Sentence 1 should be 'signing'");

// Step 2: Add Sentence 2 while Sentence 1 is signing
const s2 = q.addSentence("Tell me about your experience.");
console.log(`[Step 2] Added Sentence 2: "${s2.sentence}" -> Status: [${s2.status.toUpperCase()}]`);
if (s2.status !== 'queued') throw new Error("Sentence 2 should be 'queued'");

// Step 3: Add Sentence 3 while Sentence 1 is signing
const s3 = q.addSentence("What are your strengths?");
console.log(`[Step 3] Added Sentence 3: "${s3.sentence}" -> Status: [${s3.status.toUpperCase()}]`);
if (s3.status !== 'waiting') throw new Error("Sentence 3 should be 'waiting'");

// Step 4: Test Duplicate Prevention
const dup = q.addSentence("Tell me about your experience.");
console.log(`[Step 4] Attempted to re-add Sentence 2 -> Result: ${dup.reason}`);
if (!dup.rejected) throw new Error("Duplicate should have been rejected");

// Display Queue state matching user screenshot
console.log("\n--- Active Queue Display (Matches User Screenshot) ---");
q.queue.forEach(item => {
  console.log(`[${item.status.toUpperCase()}] ${item.sentence}`);
});
console.log("------------------------------------------------------\n");

// Step 5: Sentence 1 finishes signing
console.log(`[Step 5] Sentence 1 ("${s1.sentence}") finished signing!`);
q.onSentenceComplete(s1.id);

console.log(`         Current Signing: "${q.queue[0]?.sentence}" -> Status: [${q.queue[0]?.status.toUpperCase()}]`);
console.log(`         Next Queued:    "${q.queue[1]?.sentence}" -> Status: [${q.queue[1]?.status.toUpperCase()}]`);
if (q.queue[0]?.status !== 'signing' || q.queue[0]?.sentence !== s2.sentence) {
  throw new Error("Sentence 2 should now be 'signing'");
}
if (q.queue[1]?.status !== 'queued' || q.queue[1]?.sentence !== s3.sentence) {
  throw new Error("Sentence 3 should now be 'queued'");
}

// Step 6: Sentence 2 finishes signing
console.log(`\n[Step 6] Sentence 2 ("${s2.sentence}") finished signing!`);
q.onSentenceComplete(s2.id);

console.log(`         Current Signing: "${q.queue[0]?.sentence}" -> Status: [${q.queue[0]?.status.toUpperCase()}]`);
if (q.queue[0]?.status !== 'signing' || q.queue[0]?.sentence !== s3.sentence) {
  throw new Error("Sentence 3 should now be 'signing'");
}

// Step 7: Sentence 3 finishes signing
console.log(`\n[Step 7] Sentence 3 ("${s3.sentence}") finished signing!`);
q.onSentenceComplete(s3.id);

console.log(`         Queue length: ${q.queue.length} (Avatar returned to neutral rest pose)`);
if (q.queue.length !== 0) throw new Error("Queue should be empty");

console.log("\nALL SEQUENTIAL QUEUE & STATUS BADGE TESTS PASSED 100%!");
