import type { Plugin, ViteDevServer } from 'vite'
import { generateRoomId, generateParticipantToken, verifyParticipantToken } from './roomTokens.ts'
import { createLiveKitToken, isLiveKitConfigured } from './livekitService.ts'
import { setupRoomSignaling } from './roomSignaling.ts'

export function roomSignalingPlugin(): Plugin {
  return {
    name: 'room-signaling-plugin',
    configureServer(server: ViteDevServer) {
      if (server.httpServer) {
        setupRoomSignaling(server.httpServer as any)
      }

      // REST Endpoints Middleware
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)

        // 1. Create Room API
        if (req.method === 'POST' && url.pathname === '/api/rooms/create') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const data = body ? JSON.parse(body) : {}
              const hostName = data.hostName || 'Interviewer'
              const roomId = generateRoomId()

              // Generate short-lived tokens (2 hours)
              const hostToken = generateParticipantToken(roomId, 'interviewer', hostName)
              const candidateToken = generateParticipantToken(roomId, 'candidate', 'Candidate')

              const forwardedProto = req.headers['x-forwarded-proto'] as string | undefined
              const forwardedHost = req.headers['x-forwarded-host'] as string | undefined
              const host = forwardedHost || req.headers.host || 'localhost:5173'
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
                  isLiveKitAvailable: isLiveKitConfigured(),
                })
              )
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: (err as Error).message }))
            }
          })
          return
        }

        // 2. Validate Room Token API
        if (req.method === 'POST' && url.pathname === '/api/rooms/validate') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', () => {
            try {
              const { roomId, token } = JSON.parse(body || '{}')
              if (!roomId || !token) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ valid: false, error: 'Missing roomId or token' }))
                return
              }

              const result = verifyParticipantToken(token, roomId)
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify({
                  valid: result.valid,
                  role: result.payload?.role,
                  participantName: result.payload?.participantName,
                  error: result.error,
                })
              )
            } catch (err) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ valid: false, error: 'Invalid request payload' }))
            }
          })
          return
        }

        // 3. LiveKit Token API (Optional Cloud Fallback)
        if (req.method === 'GET' && url.pathname === '/api/livekit/token') {
          const room = url.searchParams.get('room') || 'default'
          const identity = url.searchParams.get('identity') || 'user'
          const name = url.searchParams.get('name') || identity
          const isHost = url.searchParams.get('isHost') === 'true'

          createLiveKitToken({
            roomName: room,
            participantIdentity: identity,
            participantName: name,
            isHost,
          })
            .then((token) => {
              res.setHeader('Content-Type', 'application/json')
              if (!token) {
                res.end(JSON.stringify({ available: false, token: null }))
              } else {
                res.end(JSON.stringify({ available: true, token, url: process.env.LIVEKIT_URL }))
              }
            })
            .catch((err) => {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            })
          return
        }

        next()
      })
    },
  }
}
