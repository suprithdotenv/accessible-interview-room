import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import { WebSocketServer, WebSocket } from 'ws'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 5173
const DIST_DIR = path.join(__dirname, 'dist')
const SECRET = process.env.ROOM_TOKEN_SECRET || 'accessible-room-secret-prod-2026'

// --- Token Utilities ---
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return Buffer.from(str, 'base64').toString()
}

function generateParticipantToken(roomId, role, participantName) {
  const payload = {
    roomId,
    role,
    participantName,
    exp: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
  }
  const payloadStr = JSON.stringify(payload)
  const encodedPayload = base64UrlEncode(payloadStr)
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(encodedPayload)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `${encodedPayload}.${signature}`
}

function verifyParticipantToken(token, expectedRoomId) {
  try {
    const [encodedPayload, signature] = token.split('.')
    if (!encodedPayload || !signature) return { valid: false, error: 'Malformed token' }

    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(encodedPayload)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

    if (signature !== expectedSignature) return { valid: false, error: 'Invalid signature' }

    const payload = JSON.parse(base64UrlDecode(encodedPayload))
    if (payload.exp < Date.now()) return { valid: false, error: 'Token has expired' }
    if (expectedRoomId && payload.roomId !== expectedRoomId) return { valid: false, error: 'Room mismatch' }

    return { valid: true, payload }
  } catch (err) {
    return { valid: false, error: 'Token verification exception' }
  }
}

// --- MIME Types ---
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

// --- Active Rooms State for WebRTC Signaling ---
const activeRooms = new Map()

// --- HTTP Server ---
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

  // API 1: Create Room
  if (req.method === 'POST' && url.pathname === '/api/rooms/create') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {}
        const hostName = data.hostName || 'Interviewer'
        const roomId = `room-acc-${Math.floor(1000 + Math.random() * 9000)}`

        const hostToken = generateParticipantToken(roomId, 'interviewer', hostName)
        const candidateToken = generateParticipantToken(roomId, 'candidate', 'Candidate')

        const forwardedProto = req.headers['x-forwarded-proto']
        const forwardedHost = req.headers['x-forwarded-host']
        const host = forwardedHost || req.headers.host || `localhost:${PORT}`
        const proto = forwardedProto || (host.includes('localhost') ? 'http' : 'https')
        const detectedOrigin = `${proto}://${host}`
        const origin = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || detectedOrigin

        const inviteLink = `${origin}/?room=${roomId}&token=${candidateToken}&role=candidate`

        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            success: true,
            roomId,
            hostName,
            hostToken,
            candidateToken,
            inviteLink,
          })
        )
      } catch (err) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  // API 2: Validate Room Token
  if (req.method === 'POST' && url.pathname === '/api/rooms/validate') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {}
        const { roomId, token } = data
        const verification = verifyParticipantToken(token, roomId)

        res.setHeader('Content-Type', 'application/json')
        if (verification.valid && verification.payload) {
          res.end(
            JSON.stringify({
              valid: true,
              role: verification.payload.role,
              participantName: verification.payload.participantName,
              roomId: verification.payload.roomId,
            })
          )
        } else {
          res.statusCode = 401
          res.end(JSON.stringify({ valid: false, error: verification.error }))
        }
      } catch (err) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  // Static File Serving from dist/
  let filePath = path.join(DIST_DIR, url.pathname === '/' ? 'index.html' : url.pathname)

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // SPA Fallback: return dist/index.html
    filePath = path.join(DIST_DIR, 'index.html')
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    res.setHeader('Content-Type', contentType)
    fs.createReadStream(filePath).pipe(res)
  } else {
    res.statusCode = 404
    res.end('Not Found. Run `npm run build` before starting production server.')
  }
})

// --- WebSocket Signaling Server ---
const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  if (url.pathname === '/ws/room') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req)
    })
  } else {
    socket.destroy()
  }
})

wss.on('connection', (ws) => {
  let currentRoomId = null
  let currentRole = null

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())
      switch (msg.type) {
        case 'join': {
          const { roomId, token, name } = msg
          const verification = verifyParticipantToken(token, roomId)
          if (!verification.valid || !verification.payload) {
            ws.send(JSON.stringify({ type: 'error', message: verification.error || 'Unauthorized' }))
            return
          }

          const role = verification.payload.role
          currentRoomId = roomId
          currentRole = role

          let room = activeRooms.get(roomId)
          if (!room) {
            room = { roomId, createdAt: Date.now(), participants: new Map() }
            activeRooms.set(roomId, room)
          }

          room.participants.set(role, {
            ws,
            role,
            name: name || verification.payload.participantName || (role === 'interviewer' ? 'Interviewer' : 'Candidate'),
            isMicOn: true,
            isCameraOn: true,
          })

          ws.send(
            JSON.stringify({
              type: 'joined',
              roomId,
              role,
              name: room.participants.get(role).name,
              participantCount: room.participants.size,
            })
          )

          const otherRole = role === 'interviewer' ? 'candidate' : 'interviewer'
          const peer = room.participants.get(otherRole)
          if (peer && peer.ws.readyState === WebSocket.OPEN) {
            peer.ws.send(
              JSON.stringify({
                type: 'peer-joined',
                peerRole: role,
                peerName: room.participants.get(role).name,
              })
            )
            ws.send(
              JSON.stringify({
                type: 'peer-joined',
                peerRole: otherRole,
                peerName: peer.name,
              })
            )
          }
          break
        }

        case 'signal': {
          if (!currentRoomId || !currentRole) return
          const room = activeRooms.get(currentRoomId)
          if (!room) return

          const otherRole = currentRole === 'interviewer' ? 'candidate' : 'interviewer'
          const peer = room.participants.get(otherRole)
          if (peer && peer.ws.readyState === WebSocket.OPEN) {
            peer.ws.send(
              JSON.stringify({
                type: 'signal',
                signal: msg.signal,
                from: currentRole,
              })
            )
          }
          break
        }

        case 'caption': {
          if (!currentRoomId || !currentRole) return
          const room = activeRooms.get(currentRoomId)
          if (!room) return

          const otherRole = currentRole === 'interviewer' ? 'candidate' : 'interviewer'
          const peer = room.participants.get(otherRole)
          if (peer && peer.ws.readyState === WebSocket.OPEN) {
            peer.ws.send(
              JSON.stringify({
                type: 'caption',
                speaker: msg.speaker,
                text: msg.text,
                isFinal: msg.isFinal,
                gloss: msg.gloss,
              })
            )
          }
          break
        }

        case 'end-meeting': {
          if (!currentRoomId) return
          const room = activeRooms.get(currentRoomId)
          if (!room) return

          room.participants.forEach((p) => {
            if (p.ws.readyState === WebSocket.OPEN) {
              p.ws.send(JSON.stringify({ type: 'meeting-ended' }))
            }
          })
          activeRooms.delete(currentRoomId)
          break
        }
      }
    } catch (e) {
      console.warn('Signaling error:', e)
    }
  })

  ws.on('close', () => {
    if (currentRoomId && currentRole) {
      const room = activeRooms.get(currentRoomId)
      if (room) {
        room.participants.delete(currentRole)
        const otherRole = currentRole === 'interviewer' ? 'candidate' : 'interviewer'
        const peer = room.participants.get(otherRole)
        if (peer && peer.ws.readyState === WebSocket.OPEN) {
          peer.ws.send(JSON.stringify({ type: 'peer-left', peerRole: currentRole }))
        }
        if (room.participants.size === 0) {
          activeRooms.delete(currentRoomId)
        }
      }
    }
  })
})

server.listen(PORT, () => {
  console.log(`[Production Server] Accessible Interview Room listening on port ${PORT}`)
  console.log(`[Production Server] Public URL: ${process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}`)
})
