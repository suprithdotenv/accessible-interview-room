import type { Server as HttpServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { verifyParticipantToken, type ParticipantRole } from './roomTokens.ts'

interface ParticipantInfo {
  ws: WebSocket
  role: ParticipantRole
  name: string
  isMicOn: boolean
  isCameraOn: boolean
}

interface RoomState {
  roomId: string
  createdAt: number
  participants: Map<string, ParticipantInfo> // key: role ('interviewer' | 'candidate')
}

const activeRooms = new Map<string, RoomState>()

export function setupRoomSignaling(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`)
    if (url.pathname === '/ws/room') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req)
      })
    }
  })

  wss.on('connection', (ws: WebSocket) => {
    let currentRoomId: string | null = null
    let currentRole: ParticipantRole | null = null

    ws.on('message', (data: string) => {
      try {
        const msg = JSON.parse(data.toString())

        switch (msg.type) {
          case 'join': {
            const { roomId, token, name } = msg
            if (!roomId || !token) {
              ws.send(JSON.stringify({ type: 'error', message: 'Missing roomId or token' }))
              return
            }

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

            // Register this participant
            room.participants.set(role, {
              ws,
              role,
              name: name || verification.payload.participantName || (role === 'interviewer' ? 'Interviewer' : 'Candidate'),
              isMicOn: true,
              isCameraOn: true,
            })

            // Acknowledge join
            ws.send(JSON.stringify({
              type: 'joined',
              roomId,
              role,
              name: room.participants.get(role)!.name,
              participantCount: room.participants.size,
            }))

            // Check if remote peer is already in room
            const otherRole: ParticipantRole = role === 'interviewer' ? 'candidate' : 'interviewer'
            const peer = room.participants.get(otherRole)
            if (peer && peer.ws.readyState === WebSocket.OPEN) {
              // Notify both participants that their peer is ready
              peer.ws.send(JSON.stringify({
                type: 'peer-joined',
                peerRole: role,
                peerName: room.participants.get(role)!.name,
              }))
              ws.send(JSON.stringify({
                type: 'peer-joined',
                peerRole: otherRole,
                peerName: peer.name,
              }))
            }
            break
          }

          case 'offer':
          case 'answer':
          case 'ice-candidate':
          case 'caption-broadcast':
          case 'media-state': {
            if (!currentRoomId || !currentRole) return
            const room = activeRooms.get(currentRoomId)
            if (!room) return

            const otherRole: ParticipantRole = currentRole === 'interviewer' ? 'candidate' : 'interviewer'
            const peer = room.participants.get(otherRole)
            if (peer && peer.ws.readyState === WebSocket.OPEN) {
              peer.ws.send(JSON.stringify({
                ...msg,
                fromRole: currentRole,
              }))
            }
            break
          }

          case 'end-meeting': {
            if (!currentRoomId) return
            const room = activeRooms.get(currentRoomId)
            if (!room) return

            // Broadcast end meeting to all participants
            room.participants.forEach((p) => {
              if (p.ws.readyState === WebSocket.OPEN) {
                p.ws.send(JSON.stringify({ type: 'meeting-ended' }))
              }
            })
            activeRooms.delete(currentRoomId)
            break
          }
        }
      } catch (err) {
        console.error('[Signaling] message error:', err)
      }
    })

    ws.on('close', () => {
      if (!currentRoomId || !currentRole) return
      const room = activeRooms.get(currentRoomId)
      if (!room) return

      room.participants.delete(currentRole)

      // Notify the remaining peer
      const otherRole: ParticipantRole = currentRole === 'interviewer' ? 'candidate' : 'interviewer'
      const peer = room.participants.get(otherRole)
      if (peer && peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(JSON.stringify({
          type: 'peer-left',
          peerRole: currentRole,
        }))
      }

      if (room.participants.size === 0) {
        activeRooms.delete(currentRoomId)
      }
    })
  })

  console.log('[RoomSignaling] WebSocket signaling attached to /ws/room')
}
