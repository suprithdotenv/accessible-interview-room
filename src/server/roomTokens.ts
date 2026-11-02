import crypto from 'crypto'

export type ParticipantRole = 'interviewer' | 'candidate'

export interface RoomTokenPayload {
  roomId: string
  role: ParticipantRole
  participantName: string
  exp: number // Unix timestamp (ms)
}

const TOKEN_SECRET = process.env.ROOM_TOKEN_SECRET || 'accessible-interview-room-secret-key-2026'

/**
 * Creates a cryptographically signed short-lived token for room participants.
 * Default validity: 2 hours.
 */
export function generateParticipantToken(
  roomId: string,
  role: ParticipantRole,
  participantName: string,
  validityMs = 2 * 60 * 60 * 1000
): string {
  const payload: RoomTokenPayload = {
    roomId,
    role,
    participantName,
    exp: Date.now() + validityMs,
  }

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payloadBase64)
    .digest('base64url')

  return `${payloadBase64}.${signature}`
}

/**
 * Validates the participant token signature, expiry, and roomId.
 */
export function verifyParticipantToken(
  token: string,
  expectedRoomId?: string
): { valid: boolean; payload?: RoomTokenPayload; error?: string } {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) {
      return { valid: false, error: 'Malformed token structure' }
    }

    const [payloadBase64, signature] = parts
    const expectedSig = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(payloadBase64)
      .digest('base64url')

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return { valid: false, error: 'Invalid token signature' }
    }

    const payload: RoomTokenPayload = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString('utf-8')
    )

    if (Date.now() > payload.exp) {
      return { valid: false, error: 'Token has expired' }
    }

    if (expectedRoomId && payload.roomId !== expectedRoomId) {
      return { valid: false, error: 'Token is for a different room' }
    }

    return { valid: true, payload }
  } catch (err) {
    return { valid: false, error: `Token verification failed: ${(err as Error).message}` }
  }
}

/**
 * Generates a clean, friendly room ID like "room-acc-8492"
 */
export function generateRoomId(): string {
  const code = Math.floor(1000 + Math.random() * 9000)
  return `room-acc-${code}`
}
