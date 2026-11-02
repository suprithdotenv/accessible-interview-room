# Accessible Virtual Interview Room
### Real-Time Live English Captioning & 3D Indian Sign Language (ISL) Virtual Interpreter

A standalone, accessible virtual interview room engineered to enable seamless communication between English-speaking interviewers and Deaf / Hard-of-Hearing (D/HH) job candidates through **instant live English speech captioning** and an **interactive 3D signing avatar performing Indian Sign Language (ISL)**.

---

## 1. Sentence-by-Sentence Architecture & Lag Elimination

### Root Cause Analysis of Previous Lag
1. **Model Reload on Every State Change**: The 3D avatar scene initialization effect previously had callback functions in its dependency array. State updates during animation caused the entire Three.js WebGL context and `ybot.glb` (2.2 MB) to be disposed and reloaded repeatedly.
2. **Premature Acoustic Chunk Triggers**: Web Speech API emits `isFinal` on short partial acoustic chunks (e.g. *"Can you"*, then *"introduce yourself"*). Feeding these raw fragments immediately caused rapid restarts and animation frame conflicts.

### Resolved Implementation
- **Sentence-by-Sentence Finalization**: Live speech updates `interimTranscript` for instantaneous subtitle rendering. Sentences are finalized only when sentence punctuation (`?`, `.`, `!`) or a natural conversational pause (850ms) occurs.
- **Strict FIFO Sentence Animation Queue**: Finalized sentences are added to an animation queue. The avatar signs the active sentence completely to neutral rest pose before advancing to the next sentence.
- **Single Model Load & In-Memory Caching**: `ybot.glb` is loaded once and cached in memory. Scene effects have an empty `[]` dependency array with ref-bound callbacks, preventing all tears, re-renders, and memory leaks.
- **Duplicate Prevention**: Sentences identical to active or recently processed phrases within 3 seconds are ignored.

---

## 2. Interpreter Panel 3-Status Queue Display

As recommended, the right-side Interpreter Panel features an active queue status card showing up to 3 distinct sentence states:

```
┌────────────────────────────────────────────────────────┐
│ [SIGNING]  Can you introduce yourself?                 │
│ [QUEUED]   Tell me about your experience.              │
│ [WAITING]  What are your strengths?                    │
└────────────────────────────────────────────────────────┘
```

- **`[SIGNING]`** *(Green Badge)*: Currently being animated on the 3D avatar.
- **`[QUEUED]`** *(Orange/Amber Badge)*: Next in line; waiting for sentence 1 to finish.
- **`[WAITING]`** *(Gray Badge)*: Subsequent sentences queued in order.

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4.
- **3D Graphics & Rigging**: Three.js (`three`), Mixamo standard rig (`ybot.glb`), skeletal bone deltas, quaternion rotations.
- **Speech Recognition**: Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`), Web Audio API (`AudioContext`, `AnalyserNode`).
- **Icons & UI**: Lucide React (`lucide-react`), glassmorphic design system.

---

## 4. Setup & Running Instructions

### Prerequisites
- Node.js v18+ (tested on Node.js v22)
- Modern browser with Web Speech API and WebGL support (Google Chrome or Microsoft Edge recommended)

### Step 1: Navigate to Project
```bash
cd "interview-room"
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run the Development Server
```bash
npm run dev
```

Open `http://localhost:5173/` in your browser.

### Step 4: Run Queue & ISL Verification Tests
```bash
npx tsx test-queue.mjs
npx tsx test-engine.mjs
```
"# accessible-interview-room" 
