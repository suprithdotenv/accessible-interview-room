import { AccessToken } from 'livekit-server-sdk'

export interface LiveKitTokenParams {
  roomName: string
  participantIdentity: string
  participantName: string
  isHost?: boolean
}

/**
 * Generates an official LiveKit Access Token if environment variables are configured.
 * Returns null if LiveKit is not configured.
 */
export async function createLiveKitToken(params: LiveKitTokenParams): Promise<string | null> {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const livekitUrl = process.env.LIVEKIT_URL

  if (!apiKey || !apiSecret || !livekitUrl) {
    return null
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: params.participantIdentity,
    name: params.participantName,
    ttl: '2h',
  })

  at.addGrant({
    roomJoin: true,
    room: params.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: Boolean(params.isHost),
  })

  return await at.toJwt()
}

export function isLiveKitConfigured(): boolean {
  return Boolean(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.LIVEKIT_URL)
}
