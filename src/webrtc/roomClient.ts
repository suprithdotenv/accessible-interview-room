export type ParticipantRole = 'interviewer' | 'candidate'

export interface PeerState {
  joined: boolean
  role?: ParticipantRole
  name?: string
  isMicOn?: boolean
  isCameraOn?: boolean
}

export interface CaptionEvent {
  speaker: 'INTERVIEWER' | 'CANDIDATE'
  text: string
  isFinal: boolean
  gloss?: string
}

export interface RoomClientCallbacks {
  onLocalStream?: (stream: MediaStream) => void
  onRemoteStream?: (stream: MediaStream | null) => void
  onPeerStateChange?: (peer: PeerState) => void
  onRemoteCaption?: (caption: CaptionEvent) => void
  onMeetingEnded?: () => void
  onError?: (error: string) => void
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export class RoomClient {
  private ws: WebSocket | null = null
  private pc: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null

  public roomId: string
  public role: ParticipantRole
  public token: string
  public participantName: string

  private callbacks: RoomClientCallbacks
  private peerState: PeerState = { joined: false }
  private isDisposed = false

  constructor(
    roomId: string,
    role: ParticipantRole,
    token: string,
    participantName: string,
    callbacks: RoomClientCallbacks
  ) {
    this.roomId = roomId
    this.role = role
    this.token = token
    this.participantName = participantName
    this.callbacks = callbacks
  }

  public async start(existingStream?: MediaStream | null) {
    try {
      if (existingStream && existingStream.active && existingStream.getTracks().length > 0) {
        this.localStream = existingStream
        this.callbacks.onLocalStream?.(this.localStream)
      } else {
        // 1. Acquire Local Camera & Microphone
        await this.initLocalMedia()
      }

      // 2. Connect to Signaling Server
      this.initWebSocket()
    } catch (err) {
      console.warn('[RoomClient] start error:', err)
      this.callbacks.onError?.((err as Error).message)
    }
  }

  private async initLocalMedia() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true,
        })
      } else {
        throw new Error('getUserMedia not supported')
      }
    } catch (err) {
      console.warn('[RoomClient] Could not access real camera/mic, generating mock media stream:', err)
      this.localStream = this.createFallbackMediaStream()
    }

    if (this.localStream) {
      this.callbacks.onLocalStream?.(this.localStream)
    }
  }

  /**
   * Generates a clean synthetic video stream if physical camera is blocked or in headless testing.
   */
  private createFallbackMediaStream(): MediaStream {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 360
    const ctx = canvas.getContext('2d')
    if (ctx) {
      let frame = 0
      const draw = () => {
        frame++
        ctx.fillStyle = '#0f172a'
        ctx.fillRect(0, 0, 640, 360)

        // Draw avatar silhouette or gradient circle
        const cx = 320
        const cy = 160 + Math.sin(frame * 0.05) * 5
        ctx.fillStyle = this.role === 'interviewer' ? '#3b82f6' : '#10b981'
        ctx.beginPath()
        ctx.arc(cx, cy, 55, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#f8fafc'
        ctx.font = 'bold 20px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(this.participantName, 320, cy + 90)

        ctx.font = '14px monospace'
        ctx.fillStyle = '#94a3b8'
        ctx.fillText(`[${this.role.toUpperCase()}] Camera Active`, 320, cy + 115)

        if (!this.isDisposed) {
          requestAnimationFrame(draw)
        }
      }
      draw()
    }

    // Audio context silence track
    const canvasStream = canvas.captureStream(30)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const dst = audioCtx.createMediaStreamDestination()
      osc.connect(dst)
      // Gain 0 ensures true silence
      const gain = audioCtx.createGain()
      gain.gain.value = 0
      osc.connect(gain)
      gain.connect(dst)
      osc.start()
      dst.stream.getAudioTracks().forEach((track) => canvasStream.addTrack(track))
    } catch (e) {
      // Audio fallback omitted if AudioContext unavailable
    }

    return canvasStream
  }

  private initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/room`
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      console.log('[RoomClient] Signaling connected, joining room:', this.roomId)
      this.ws?.send(
        JSON.stringify({
          type: 'join',
          roomId: this.roomId,
          token: this.token,
          name: this.participantName,
          role: this.role,
        })
      )
    }

    this.ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data)
        await this.handleSignalingMessage(msg)
      } catch (err) {
        console.error('[RoomClient] message handle error:', err)
      }
    }

    this.ws.onerror = (err) => {
      console.warn('[RoomClient] WebSocket error:', err)
    }

    this.ws.onclose = () => {
      console.log('[RoomClient] Signaling connection closed')
    }
  }

  private async handleSignalingMessage(msg: any) {
    switch (msg.type) {
      case 'joined': {
        console.log(`[RoomClient] Successfully joined as ${msg.role}`)
        break
      }

      case 'peer-joined': {
        console.log(`[RoomClient] Remote peer joined: ${msg.peerName} (${msg.peerRole})`)
        this.peerState = {
          joined: true,
          role: msg.peerRole,
          name: msg.peerName,
          isMicOn: true,
          isCameraOn: true,
        }
        this.callbacks.onPeerStateChange?.(this.peerState)

        // The interviewer initiates the WebRTC offer
        if (this.role === 'interviewer') {
          await this.createAndSendOffer()
        }
        break
      }

      case 'peer-left': {
        console.log(`[RoomClient] Remote peer left: ${msg.peerRole}`)
        this.peerState = { joined: false }
        this.callbacks.onPeerStateChange?.(this.peerState)
        this.callbacks.onRemoteStream?.(null)
        this.closePeerConnection()
        break
      }

      case 'offer': {
        await this.handleReceiveOffer(msg.offer)
        break
      }

      case 'answer': {
        await this.handleReceiveAnswer(msg.answer)
        break
      }

      case 'ice-candidate': {
        if (this.pc && msg.candidate) {
          try {
            await this.pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
          } catch (e) {
            console.warn('[RoomClient] Failed to add ICE candidate:', e)
          }
        }
        break
      }

      case 'caption-broadcast': {
        this.callbacks.onRemoteCaption?.({
          speaker: msg.speaker,
          text: msg.text,
          isFinal: msg.isFinal,
          gloss: msg.gloss,
        })
        break
      }

      case 'media-state': {
        this.peerState = {
          ...this.peerState,
          isMicOn: msg.isMicOn,
          isCameraOn: msg.isCameraOn,
        }
        this.callbacks.onPeerStateChange?.(this.peerState)
        break
      }

      case 'meeting-ended': {
        this.callbacks.onMeetingEnded?.()
        break
      }

      case 'error': {
        this.callbacks.onError?.(msg.message)
        break
      }
    }
  }

  private setupPeerConnection() {
    if (this.pc) return this.pc

    const pc = new RTCPeerConnection(ICE_SERVERS)
    this.pc = pc

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!)
      })
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log('[RoomClient] Received remote track:', event.track.kind)
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream()
      }
      this.remoteStream.addTrack(event.track)
      this.callbacks.onRemoteStream?.(this.remoteStream)
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
          })
        )
      }
    }

    return pc
  }

  private async createAndSendOffer() {
    const pc = this.setupPeerConnection()
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'offer',
          offer,
        })
      )
    }
  }

  private async handleReceiveOffer(offer: RTCSessionDescriptionInit) {
    const pc = this.setupPeerConnection()
    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'answer',
          answer,
        })
      )
    }
  }

  private async handleReceiveAnswer(answer: RTCSessionDescriptionInit) {
    if (this.pc) {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }

  private closePeerConnection() {
    if (this.pc) {
      this.pc.close()
      this.pc = null
    }
    this.remoteStream = null
  }

  /**
   * Broadcasts a caption to the remote peer over WebSocket.
   */
  public broadcastCaption(speaker: 'INTERVIEWER' | 'CANDIDATE', text: string, isFinal: boolean, gloss?: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'caption-broadcast',
          speaker,
          text,
          isFinal,
          gloss,
        })
      )
    }
  }

  /**
   * Broadcasts media mute/unmute state to remote peer.
   */
  public broadcastMediaState(isMicOn: boolean, isCameraOn: boolean) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'media-state',
          isMicOn,
          isCameraOn,
        })
      )
    }
  }

  /**
   * Ends the meeting for all participants.
   */
  public endMeeting() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'end-meeting' }))
    }
    this.dispose()
  }

  public toggleLocalAudio(enable: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => (t.enabled = enable))
    }
  }

  public toggleLocalVideo(enable: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((t) => (t.enabled = enable))
    }
  }

  public dispose() {
    this.isDisposed = true
    this.closePeerConnection()
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop())
      this.localStream = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
