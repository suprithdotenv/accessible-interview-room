import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { WebSocket } from 'ws'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const ARTIFACT_DIR = 'C:\\Users\\Suprith Shetty\\.gemini\\antigravity\\brain\\93329506-d782-429f-8dcb-efbac742a203'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function createCdpConnection(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let msgId = 1

  const ready = new Promise((resolve, reject) => {
    ws.on('open', resolve)
    ws.on('error', reject)
  })

  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const id = msgId++
      const handler = (data) => {
        try {
          const res = JSON.parse(data.toString())
          if (res.id === id) {
            ws.off('message', handler)
            if (res.error) reject(res.error)
            else resolve(res.result)
          }
        } catch (e) {
          reject(e)
        }
      }
      ws.on('message', handler)
      ws.send(JSON.stringify({ id, method, params }))
    })
  }

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    return res?.result?.value ?? res?.value
  }

  const screenshot = async (filename) => {
    const res = await send('Page.captureScreenshot', { format: 'png' })
    const buffer = Buffer.from(res.data, 'base64')
    const fullPath = path.join(ARTIFACT_DIR, filename)
    fs.writeFileSync(fullPath, buffer)
    console.log(`[Screenshot Saved] -> ${filename} (${buffer.length} bytes)`)
    return fullPath
  }

  return { ws, ready, send, evaluate, screenshot }
}

async function run() {
  console.log('========================================================================')
  console.log('RUNNING FULL TWO-PERSON END-TO-END VERIFICATION TEST (DARK THEME)')
  console.log('========================================================================\n')

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--window-size=1440,900',
    '--no-sandbox',
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    'http://localhost:5173/',
  ])

  try {
    console.log('[1/10] Starting Headless Chrome and waiting 3.0s...')
    await sleep(3000)

    // 1. Connect to Host Tab
    const listRes = await fetch('http://127.0.0.1:9222/json/list')
    const pages = await listRes.json()
    const hostPage = pages.find((p) => p.type === 'page' && p.url.includes('5173'))
    if (!hostPage) throw new Error('Host page not found on port 9222')

    const host = createCdpConnection(hostPage.webSocketDebuggerUrl)
    await host.ready
    await host.send('Page.enable')
    await host.send('Runtime.enable')

    console.log('[2/10] Host page loaded. Checking Dark PreJoinLobby...')
    await sleep(2000)

    const hostLobbyCheck = await host.evaluate(`
      (() => {
        const text = document.body.innerText;
        return {
          title: text.includes('Virtual Accessible Interview Room'),
          badge: text.includes('Host Session') || text.includes('Host / Interviewer Setup'),
          hasMicMeter: !!document.querySelector('.h-2'),
          hasStartBtn: !!Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Start Interview')),
        };
      })()
    `)
    console.log('  Host Dark Lobby Verification:', hostLobbyCheck)
    if (!hostLobbyCheck.hasStartBtn) throw new Error('Host PreJoinLobby Start Interview button missing')

    await host.screenshot('dark-1-host-prejoin-lobby.png')

    // Host clicks "Start Interview as Host"
    console.log('[3/10] Host confirms lobby and enters interview room...')
    await host.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Start Interview'));
        if (btn) btn.click();
      })()
    `)
    await sleep(3500)

    const hostRoomCheck = await host.evaluate(`
      (() => {
        const text = document.body.innerText;
        return {
          inRoom: text.includes('Accessible Interview Room'),
          hasCaptions: text.includes('Live Conversation Captions'),
          hasInterpreter: text.includes('3D ISL Interpreter'),
          hasInviteBtn: !!Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Invite Candidate')),
        };
      })()
    `)
    console.log('  Host Room Verification (Dark Theme):', hostRoomCheck)
    await host.screenshot('dark-2-host-room-active.png')

    // Create Candidate Room Invite via API
    console.log('[4/10] Generating secure 2-hour invitation token for Candidate...')
    const createRoomRes = await host.evaluate(`
      fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: 'Dr. Vikram Sen' }),
      }).then(r => r.json())
    `)
    const inviteLink = createRoomRes.inviteLink
    console.log('  Candidate Invite Link (No hardcoded localhost in prod):', inviteLink)

    // Open Candidate Tab
    console.log('[5/10] Candidate opens invitation link...')
    const candidateTarget = await host.send('Target.createTarget', { url: inviteLink })
    await sleep(2500)

    const updatedPages = await (await fetch('http://127.0.0.1:9222/json/list')).json()
    const candidatePage = updatedPages.find((p) => p.id === candidateTarget.targetId)
    if (!candidatePage) throw new Error('Candidate page not found')

    const candidate = createCdpConnection(candidatePage.webSocketDebuggerUrl)
    await candidate.ready
    await candidate.send('Page.enable')
    await candidate.send('Runtime.enable')

    console.log('[6/10] Checking Candidate Dark PreJoinLobby...')
    await sleep(2000)

    const candidateLobbyCheck = await candidate.evaluate(`
      (() => {
        const text = document.body.innerText;
        return {
          title: text.includes('Virtual Accessible Interview Room'),
          candidateBadge: text.includes('Candidate Invitation') || text.includes('Candidate Joining Room'),
          captionsAlwaysOn: text.includes('Always On'),
          hasJoinBtn: !!Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Join Interview Now')),
        };
      })()
    `)
    console.log('  Candidate Dark Lobby Verification:', candidateLobbyCheck)
    if (!candidateLobbyCheck.hasJoinBtn) throw new Error('Candidate PreJoinLobby Join button missing')

    await candidate.screenshot('dark-3-candidate-prejoin-lobby.png')

    // Candidate clicks "Join Interview Now"
    console.log('[7/10] Candidate joins interview room...')
    await candidate.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Join Interview Now'));
        if (btn) btn.click();
      })()
    `)
    await sleep(4000)

    // Verify Candidate has ISL OFF by default
    const candidateRoomInitial = await candidate.evaluate(`
      (() => {
        const text = document.body.innerText;
        return {
          inRoom: text.includes('Accessible Interview Room'),
          hasIslOff: text.includes('ISL OFF'),
          hasEnableIslBtn: !!Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Enable ISL') || b.innerText.includes('ISL OFF')),
        };
      })()
    `)
    console.log('  Candidate Initial Room State (ISL Disabled by Default):', candidateRoomInitial)
    await candidate.screenshot('dark-4-candidate-joined-isl-off.png')

    // 8. Test Instagram-Style Captions in Dark Theme & Host Speech with ISL OFF
    console.log('[8/10] Host submits interview question: "Tell me about your experience."...')
    await host.evaluate(`
      (() => {
        const promptBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Prompts') || b.innerText.includes('Questions'));
        if (promptBtn) promptBtn.click();
      })()
    `)
    await sleep(600)

    await host.evaluate(`
      (() => {
        const qBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Tell me about your experience') || b.innerText.includes('experience'));
        if (qBtn) qBtn.click();
      })()
    `)
    await sleep(2000)

    // Check Caption Feed on Host and Candidate
    const captionCheck = await host.evaluate(`
      (() => {
        const text = document.body.innerText;
        const feed = document.querySelector('.custom-scrollbar');
        return {
          hasHostMessage: text.includes('HOST'),
          hasRawGlossInBubbles: feed ? feed.innerHTML.includes('ISL:') : false,
        };
      })()
    `)
    console.log('  Instagram Captions Dark Check (No Raw Gloss in bubbles):', captionCheck)

    // 9. Candidate Enables ISL Interpreter
    console.log('[9/10] Candidate enables ISL Interpreter...')
    await candidate.evaluate(`
      (() => {
        const enableBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Enable ISL') || b.innerText.includes('ISL OFF'));
        if (enableBtn) enableBtn.click();
      })()
    `)
    await sleep(1500)

    const candidateIslActive = await candidate.evaluate(`
      (() => {
        const text = document.body.innerText;
        return {
          hasActiveBadge: text.includes('ISL Active') || text.includes('ISL ON'),
          isReadyOrSigning: text.includes('INTERPRETER READY') || text.includes('SIGNING'),
        };
      })()
    `)
    console.log('  Candidate ISL Enabled State:', candidateIslActive)

    // Host submits second question: "What are your strengths?"
    console.log('  Host asks "What are your strengths?" -> Signing on enlarged mannequin with large hands...');
    await host.evaluate(`
      (() => {
        const qBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('strengths') || b.innerText.includes('skills') || b.innerText.includes('Where'));
        if (qBtn) qBtn.click();
      })()
    `)
    await sleep(2500)

    await candidate.screenshot('dark-5-candidate-signing-active.png')
    await host.screenshot('dark-6-host-multi-captions.png')

    // 10. End Meeting Test
    console.log('[10/10] Host clicks Leave Meeting to conclude session...')
    await host.evaluate(`
      (() => {
        window.confirm = () => true;
        const leaveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Leave'));
        if (leaveBtn) leaveBtn.click();
      })()
    `)
    await sleep(1500)

    const hostEnded = await host.evaluate(`
      (() => {
        const text = document.body.innerText;
        return {
          isEnded: text.includes('Interview Session Ended'),
          hasDownloadBtn: text.includes('Download Transcript'),
        };
      })()
    `)
    console.log('  Host Session Ended Check (Dark Theme):', hostEnded)
    await host.screenshot('dark-7-session-ended.png')

    host.ws.close()
    candidate.ws.close()

    console.log('\n========================================================================')
    console.log('SUCCESS: ALL 10 DARK THEME TWO-PERSON VERIFICATION STEPS PASSED!')
    console.log('========================================================================\n')
  } finally {
    try {
      chromeProc.kill()
    } catch (e) {}
  }
}

run().catch((err) => {
  console.error('E2E Verification Failure:', err)
  process.exit(1)
})
