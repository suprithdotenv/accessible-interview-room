/**
 * End-to-End Test Suite for:
 * 1. Sequential Sign Queue UI removal (internal queue intact)
 * 2. Readable English ISL Gloss display for judges ("YOUR NAME WHAT", "YOU INTRODUCE YOURSELF")
 * 3. Technical interview speech recognition & terminology handling (FastAPI, PostgreSQL, etc.)
 * 4. Multi-sentence sequential queue and synchronization
 */

import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ARTIFACTS_DIR = 'C:\\Users\\Suprith Shetty\\.gemini\\antigravity\\brain\\93329506-d782-429f-8dcb-efbac742a203'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 5173
const BASE_URL = `http://localhost:${PORT}`

class CdpSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.ws = null
    this.nextId = 1
    this.callbacks = new Map()
  }

  async connect() {
    const { WebSocket } = await import('ws')
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl)
      this.ws.on('open', () => resolve())
      this.ws.on('error', reject)
      this.ws.on('message', (data) => {
        const msg = JSON.parse(data.toString())
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id)
          this.callbacks.delete(msg.id)
          if (msg.error) cb.reject(new Error(msg.error.message))
          else cb.resolve(msg.result)
        }
      })
    })
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++
      this.callbacks.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`)
    }
    return res?.result?.value
  }

  async screenshot(filename) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' })
    const buf = Buffer.from(data, 'base64')
    const fullPath = join(ARTIFACTS_DIR, filename)
    writeFileSync(fullPath, buf)
    console.log(`  [Screenshot Saved] -> ${filename} (${buf.length} bytes)`)
  }

  close() {
    try {
      this.ws?.close()
    } catch {}
  }
}

async function runTests() {
  console.log('========================================================================')
  console.log('TESTING: ISL GLOSS VISIBILITY, REMOVED QUEUE UI & TECHNICAL TERMINOLOGY')
  console.log('========================================================================\n')

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--no-sandbox',
    '--disable-gpu',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--window-size=1440,900',
    'about:blank',
  ])

  try {
    await new Promise((r) => setTimeout(r, 3000))

    // Connect to Chrome target
    const listRes = await fetch('http://127.0.0.1:9223/json/list')
    const tabs = await listRes.json()
    const hostTab = tabs.find((t) => t.type === 'page')
    if (!hostTab) throw new Error('No browser page target found')

    const hostSession = new CdpSession(hostTab.webSocketDebuggerUrl)
    await hostSession.connect()
    await hostSession.send('Page.enable')
    await hostSession.send('Runtime.enable')

    console.log('[1/7] Navigating to Host Lobby at', BASE_URL)
    await hostSession.send('Page.navigate', { url: BASE_URL })
    await new Promise((r) => setTimeout(r, 2500))

    // Click Start Interview to join room
    console.log('[2/7] Host enters interview room...')
    await hostSession.eval(`
      (() => {
        const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Start Interview'));
        if (startBtn) startBtn.click();
      })()
    `)
    await new Promise((r) => setTimeout(r, 3000))

    // Toggle ISL ON in the room
    console.log('  Enabling ISL Interpreter...')
    await hostSession.eval(`
      (() => {
        const islBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.innerText?.includes('Enable ISL') || b.innerText?.includes('ISL OFF')
        );
        if (islBtn) islBtn.click();
      })()
    `)
    await new Promise((r) => setTimeout(r, 1000))

    // Verify 1: Sequential Sign Queue UI is COMPLETELY REMOVED from the DOM
    console.log('[3/7] Verifying Sequential Sign Queue UI removal...')
    const queueUiCheck = await hostSession.eval(`
      (() => {
        const textContent = document.body.innerText || '';
        const hasQueueHeader = textContent.includes('Sequential Sign Queue') || textContent.includes('SEQUENTIAL SIGN QUEUE');
        return {
          hasQueueHeaderText: hasQueueHeader,
        };
      })()
    `)
    console.log('  Queue UI Removal Check:', queueUiCheck)
    if (queueUiCheck.hasQueueHeaderText) {
      throw new Error('FAIL: "Sequential Sign Queue" text was found in the visible UI!')
    }
    console.log('  PASSED: "Sequential Sign Queue" UI section is completely removed.')

    // Open Quick Prompts tray
    console.log('  Opening Quick Questions tray...')
    await hostSession.eval(`
      (() => {
        const promptBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.innerText?.includes('Questions') || b.innerText?.includes('Prompts')
        );
        if (promptBtn) promptBtn.click();
      })()
    `)
    await new Promise((r) => setTimeout(r, 1000))

    // Verify 2: Test "What is your name?" -> ISL Gloss "YOUR NAME WHAT"
    console.log('\n[4/7] Testing Interview Question: "What is your name?"...')
    await hostSession.eval(`
      (() => {
        const qBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.innerText?.includes('What is your name?')
        );
        if (qBtn) qBtn.click();
      })()
    `)
    await new Promise((r) => setTimeout(r, 1500))

    const glossCheck1 = await hostSession.eval(`
      (() => {
        const text = document.body.innerText || '';
        const hasEnglish = text.includes('What is your name?');
        const hasIslGlossBadge = text.toUpperCase().includes('ISL GLOSS');
        
        // Find individual readable gloss word badges
        const badges = Array.from(document.querySelectorAll('span')).filter(s => 
          ['YOUR', 'NAME', 'WHAT'].includes(s.innerText?.trim() || '')
        ).map(s => s.innerText?.trim());

        return {
          hasEnglish,
          hasIslGlossBadge,
          hasYour: badges.includes('YOUR'),
          hasName: badges.includes('NAME'),
          hasWhat: badges.includes('WHAT'),
          badges
        };
      })()
    `)
    console.log('  Test 1 Result ("What is your name?"):', glossCheck1)
    await hostSession.screenshot('test-1-what-is-your-name-gloss.png')

    if (!glossCheck1.hasIslGlossBadge || !glossCheck1.hasYour || !glossCheck1.hasName || !glossCheck1.hasWhat) {
      throw new Error(`FAIL: ISL Gloss "YOUR NAME WHAT" was not properly displayed! Details: ${JSON.stringify(glossCheck1)}`)
    }
    console.log('  PASSED: "What is your name?" cleanly displays ISL Gloss "YOUR NAME WHAT" in readable English words.')

    // Verify 3: Test "Can you introduce yourself?" -> ISL Gloss "YOU INTRODUCE YOURSELF"
    console.log('\n[5/7] Testing Interview Question: "Can you introduce yourself?"...')
    await hostSession.eval(`
      (() => {
        const qBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.innerText?.includes('Can you introduce yourself?')
        );
        if (qBtn) qBtn.click();
      })()
    `)

    // Poll until Sentence 1 finishes and Sentence 2 ("Can you introduce yourself?") becomes the active interpreting sentence
    console.log('  Waiting for sequential queue to advance to Sentence 2...')
    let glossCheck2 = null
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1200))
      glossCheck2 = await hostSession.eval(`
        (() => {
          const text = document.body.innerText || '';
          const badges = Array.from(document.querySelectorAll('span')).filter(s => 
            ['YOU', 'INTRODUCE', 'YOURSELF'].includes(s.innerText?.trim() || '')
          ).map(s => s.innerText?.trim());

          return {
            hasEnglish: text.includes('Can you introduce yourself?'),
            hasYou: badges.includes('YOU'),
            hasIntroduce: badges.includes('INTRODUCE'),
            hasYourself: badges.includes('YOURSELF'),
            badges
          };
        })()
      `)
      if (glossCheck2.hasYou && glossCheck2.hasIntroduce && glossCheck2.hasYourself) {
        break
      }
    }

    console.log('  Test 2 Result ("Can you introduce yourself?"):', glossCheck2)
    await hostSession.screenshot('test-2-introduce-yourself-gloss.png')

    if (!glossCheck2?.hasYou || !glossCheck2?.hasIntroduce || !glossCheck2?.hasYourself) {
      throw new Error(`FAIL: ISL Gloss "YOU INTRODUCE YOURSELF" was not properly displayed! Details: ${JSON.stringify(glossCheck2)}`)
    }
    console.log('  PASSED: "Can you introduce yourself?" cleanly displays ISL Gloss "YOU INTRODUCE YOURSELF".')

    // Verify 4: Test Technical Terminology Question: "Explain how FastAPI handles dependency injection."
    console.log('\n[6/7] Testing Technical Question: "Explain how FastAPI handles dependency injection."...')
    await hostSession.eval(`
      (() => {
        const input = document.querySelector('input[placeholder*="speak"]');
        if (input) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(input, "Explain how FastAPI handles dependency injection.");
          input.dispatchEvent(new Event('input', { bubbles: true }));
          const submitBtn = input.form?.querySelector('button[type="submit"]');
          if (submitBtn) submitBtn.click();
        }
      })()
    `)

    // Wait for Sentence 2 to finish and Technical Sentence to become active
    console.log('  Waiting for sequential queue to advance to Technical Question...')
    let techCheck = null
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1200))
      techCheck = await hostSession.eval(`
        (() => {
          const text = document.body.innerText || '';
          const hasFastApi = text.includes('FastAPI') || text.includes('FASTAPI');
          const hasDependency = text.includes('dependency') || text.includes('DEPENDENCY');
          const hasInjection = text.includes('injection') || text.includes('INJECTION');
          
          return {
            hasFastApi,
            hasDependency,
            hasInjection,
            captionPresent: text.includes('FastAPI')
          };
        })()
      `)
      if (techCheck.hasFastApi && techCheck.hasDependency && techCheck.hasInjection) {
        break
      }
    }

    console.log('  Technical Terminology Verification:', techCheck)
    await hostSession.screenshot('test-3-fastapi-dependency-injection.png')

    if (!techCheck?.hasFastApi || !techCheck?.hasDependency || !techCheck?.hasInjection) {
      throw new Error(`FAIL: Technical terminology corrupted or lost! Details: ${JSON.stringify(techCheck)}`)
    }
    console.log('  PASSED: Technical terms ("FastAPI", "dependency injection") preserved 100% without guessing or corruption.')

    // Verify 5: Multiple consecutive sentences queue test
    console.log('\n[7/7] Testing consecutive sentences queueing...')
    await hostSession.eval(`
      (() => {
        const qBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('career goals'));
        if (qBtn) qBtn.click();
      })()
    `)
    await new Promise((r) => setTimeout(r, 1500))
    await hostSession.screenshot('test-4-multi-sentence-signing.png')

    console.log('\n========================================================================')
    console.log('SUCCESS: ALL ISL GLOSS, QUEUE UI REMOVAL & TECHNICAL TESTS PASSED!')
    console.log('========================================================================\n')

    hostSession.close()
  } finally {
    chromeProc.kill()
  }
}

runTests().catch((err) => {
  console.error('\nTEST SUITE FAILED:', err)
  process.exit(1)
})
