import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as words from './animations/words.js'
import * as alphabets from './animations/alphabets.js'
import { NUMBER_ANIMATIONS } from './animations/numbers.js'
import { defaultPose } from './animations/defaultPose.js'
import { createFaceLayer } from './humanLayer.js'
import {
  advanceFrame,
  appendSignFrames,
  stepForElapsed,
  type SignRuntimeLike,
} from './signQueue'
import type { SentenceQueueItem } from '../hooks/useSentenceQueue'

export type AvatarState = 'loading' | 'ready' | 'signing' | 'error'

/** One queued sign: its gloss token and how many of its frames are still to play. */
type SignSegment = { token: string; frames: number }
type SignRuntime = SignRuntimeLike & {
  segments: SignSegment[]
  avatar?: THREE.Object3D
}

type BoneUserData = {
  restQuaternion?: THREE.Quaternion
  gestureRestQuaternion?: THREE.Quaternion
  restPosition?: THREE.Vector3
  restScale?: THREE.Vector3
  delta?: { x: number; y: number; z: number }
}

export type AvatarPlayerProps = {
  currentSentence: SentenceQueueItem | null
  model?: 'default' | 'human'
  stopId?: number
  resetId?: number
  speed?: number
  cameraView?: 'standard' | 'closeup' | 'wide'
  onSentenceComplete?: (sentenceId: string) => void
  onStateChange?: (state: AvatarState) => void
  onCurrentSignChange?: (currentSign: string | null, remainingQueue: number) => void
}

const wordAnimations = words as unknown as Record<string, (runtime: SignRuntimeLike) => void>
const alphabetAnimations = alphabets as unknown as Record<string, (runtime: SignRuntimeLike) => void>
const numberAnimations = NUMBER_ANIMATIONS as unknown as Record<string, (runtime: SignRuntimeLike) => void>

// Module-level cache for GLTF Scene using SkeletonUtils.clone for proper SkinnedMesh bone cloning
let rawGltfScene: THREE.Group | null = null
let gltfPromise: Promise<THREE.Group> | null = null

function loadAvatarRig(): Promise<THREE.Group> {
  if (rawGltfScene) {
    return Promise.resolve(SkeletonUtils.clone(rawGltfScene) as THREE.Group)
  }
  if (!gltfPromise) {
    const loader = new GLTFLoader()
    gltfPromise = new Promise((resolve, reject) => {
      loader.load(
        '/models/ybot.glb',
        (gltf) => {
          rawGltfScene = gltf.scene
          resolve(SkeletonUtils.clone(gltf.scene) as THREE.Group)
        },
        undefined,
        (err) => {
          gltfPromise = null
          reject(err)
        }
      )
    })
  }
  return gltfPromise.then((scene) => SkeletonUtils.clone(scene) as THREE.Group)
}

export function AvatarPlayer({
  currentSentence,
  model = 'default',
  stopId = 0,
  resetId = 0,
  speed = 1,
  cameraView = 'standard',
  onSentenceComplete,
  onStateChange,
  onCurrentSignChange,
}: AvatarPlayerProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const runtimeRef = useRef<SignRuntime>({ animations: [], segments: [], characters: [], pending: true })
  const readyRef = useRef(false)
  const statusRef = useRef<AvatarState>('loading')
  const needsRenderRef = useRef(true)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Track the ID of the sentence currently playing
  const playingSentenceIdRef = useRef<string | null>(null)

  // Ref-bound callbacks to prevent re-triggering Three.js mount effects
  const onSentenceCompleteRef = useRef(onSentenceComplete)
  useEffect(() => {
    onSentenceCompleteRef.current = onSentenceComplete
  }, [onSentenceComplete])

  const onStateChangeRef = useRef(onStateChange)
  useEffect(() => {
    onStateChangeRef.current = onStateChange
  }, [onStateChange])

  const onCurrentSignChangeRef = useRef(onCurrentSignChange)
  useEffect(() => {
    onCurrentSignChangeRef.current = onCurrentSignChange
  }, [onCurrentSignChange])

  const speedRef = useRef(speed)
  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  const report = (state: AvatarState) => {
    statusRef.current = state
    onStateChangeRef.current?.(state)
  }

  // Handle camera view adjustments centered on upper torso and head with enlarged framing
  useEffect(() => {
    const camera = cameraRef.current
    if (!camera) return
    if (cameraView === 'closeup') {
      camera.position.set(0, 0.44, 1.55)
      camera.lookAt(0, 0.44, 0)
    } else if (cameraView === 'wide') {
      camera.position.set(0, 0.36, 2.2)
      camera.lookAt(0, 0.36, 0)
    } else {
      // Standard framing: waist-up, upper torso, head, and prominent enlarged hands centered
      camera.position.set(0, 0.36, 1.76)
      camera.lookAt(0, 0.36, 0)
    }
    camera.updateProjectionMatrix()
    needsRenderRef.current = true
  }, [cameraView])

  // Sentence-by-Sentence Queue Driver:
  // When currentSentence changes, enqueue all signs for this sentence
  useEffect(() => {
    if (!currentSentence) {
      playingSentenceIdRef.current = null
      return
    }

    if (playingSentenceIdRef.current === currentSentence.id) {
      return
    }

    playingSentenceIdRef.current = currentSentence.id
    const runtime = runtimeRef.current

    if (readyRef.current) {
      console.log(`[AvatarPlayer] Starting sentence: "${currentSentence.sentence}" (${currentSentence.tokens.length} signs)`)
      runtime.animations = []
      runtime.segments = []
      if (runtime.avatar) resetAvatar(runtime)

      enqueueTokens(currentSentence.tokens, runtime)
      needsRenderRef.current = true

      const hasSigns = runtime.animations.length > 0
      report(hasSigns ? 'signing' : 'ready')

      const firstToken = runtime.segments[0]?.token ?? null
      onCurrentSignChangeRef.current?.(firstToken, runtime.segments.length)

      if (!hasSigns) {
        onSentenceCompleteRef.current?.(currentSentence.id)
      }
    }
  }, [currentSentence])

  // Stop animations immediately
  useEffect(() => {
    if (stopId === 0) return
    const runtime = runtimeRef.current
    runtime.animations = []
    runtime.segments = []
    playingSentenceIdRef.current = null
    if (runtime.avatar) {
      resetAvatar(runtime)
      needsRenderRef.current = true
    }
    report('ready')
    onCurrentSignChangeRef.current?.(null, 0)
  }, [stopId])

  // Reset avatar pose and reload
  useEffect(() => {
    if (resetId === 0) return
    const runtime = runtimeRef.current
    runtime.animations = []
    runtime.segments = []
    playingSentenceIdRef.current = null
    if (runtime.avatar) {
      resetAvatar(runtime)
      needsRenderRef.current = true
    }
    report('ready')
    onCurrentSignChangeRef.current?.(null, 0)
  }, [resetId])

  // MOUNT ONCE: Three.js WebGL Scene, Renderer & Model Attachment
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const runtime = runtimeRef.current
    runtime.animations = []
    runtime.segments = []
    runtime.characters = []
    runtime.pending = true
    runtime.avatar = undefined
    readyRef.current = false
    needsRenderRef.current = true
    report('loading')

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false, // Solid background ensures crisp, visible contrast
        powerPreference: 'high-performance',
      })
    } catch (error) {
      console.warn('[AvatarPlayer] WebGL context failed:', error)
      setLoadError('WebGL not supported on this device')
      report('error')
      return
    }

    const scene = new THREE.Scene()
    // Elegant deep charcoal studio stage for dark theme
    scene.background = new THREE.Color('#13151b')

    // Camera setup: 34 deg FOV, waist-up framing with prominent upper body and hands
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 1000)
    camera.position.set(0, 0.36, 1.76)
    camera.lookAt(0, 0.36, 0)
    cameraRef.current = camera

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    mount.appendChild(renderer.domElement)

    // Lighting setup: Professional studio 3-point lighting with high-contrast rim light against dark stage
    scene.add(new THREE.AmbientLight('#ffffff', 1.8))

    const keyLight = new THREE.DirectionalLight('#ffffff', 2.8)
    keyLight.position.set(2.2, 3.8, 3.2)
    keyLight.castShadow = true
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight('#93c5fd', 1.6)
    fillLight.position.set(-2.5, 2.2, 2.5)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight('#60a5fa', 2.6)
    rimLight.position.set(0, 3.2, -2.5)
    scene.add(rimLight)

    const groundBounce = new THREE.DirectionalLight('#475569', 0.8)
    groundBounce.position.set(0, -3.0, 1.5)
    scene.add(groundBounce)

    const resize = () => {
      const width = mount.clientWidth
      const height = mount.clientHeight
      if (!width || !height) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      camera.lookAt(0, 0.36, 0)
      renderer.setSize(width, height, true)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      needsRenderRef.current = true
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)
    resize()

    let disposed = false

    // Load Model using SkeletonUtils.clone
    loadAvatarRig()
      .then((avatar) => {
        if (disposed) {
          disposeObject(avatar)
          return
        }

        avatar.traverse((child) => {
          child.castShadow = true
          child.frustumCulled = false
        })

        runtime.avatar = avatar
        // Position avatar so hips are at Y=0, chest at Y=0.4, head at Y=0.75
        avatar.position.set(0, -0.85, 0)
        scene.add(avatar)

        // Scale hands for prominent, easy-to-read signing movements
        enhanceHandVisibility(avatar)

        // Realistic 3D Humanoid Mannequin Materials (high-contrast on dark theme)
        applyRealisticMannequinMaterials(avatar)

        captureRestQuaternions(avatar)
        resetAvatar(runtime)
        needsRenderRef.current = true
        readyRef.current = true
        report('ready')

        // If a sentence is waiting, enqueue it now
        if (currentSentence && playingSentenceIdRef.current !== currentSentence.id) {
          playingSentenceIdRef.current = currentSentence.id
          enqueueTokens(currentSentence.tokens, runtime)
          report('signing')
          onCurrentSignChangeRef.current?.(runtime.segments[0]?.token ?? null, runtime.segments.length)
        }
      })
      .catch((err) => {
        if (disposed) return
        console.error('[AvatarPlayer] Failed to load 3D model:', err)
        setLoadError('Failed to load 3D avatar model')
        report('error')
      })

    const bones = new Map<string, THREE.Object3D | undefined>()
    const boneFor = (boneName: string) => {
      if (!bones.has(boneName)) bones.set(boneName, runtime.avatar && getAvatarBone(runtime.avatar, boneName))
      return bones.get(boneName)
    }

    const deltaFor = (boneName: string) => {
      const bone = boneFor(boneName)
      if (!bone) return undefined
      const userData = bone.userData as BoneUserData
      return userData.delta ?? (userData.delta = { x: 0, y: 0, z: 0 })
    }

    let animationFrame = 0
    let nextFrameAt = 0
    let lastStepAt = performance.now()
    let wasSigning = false
    let currentReportedToken: string | null = null

    // Main animation loop
    const animate = (now: number) => {
      animationFrame = requestAnimationFrame(animate)
      if (document.hidden) return

      if (!runtime.animations.length && !wasSigning && !needsRenderRef.current) {
        lastStepAt = now
        return
      }

      const elapsed = now - lastStepAt
      lastStepAt = now
      const queue = runtime.animations

      // Subtle human breathing and posture micro-life
      if (runtime.avatar) {
        const spine = boneFor('mixamorigSpine1') || boneFor('mixamorigSpine')
        if (spine) {
          const breath = Math.sin(now * 0.0016) * 0.009
          spine.rotation.x = breath
        }
      }

      if (runtime.avatar && queue.length && now >= nextFrameAt) {
        wasSigning = true
        const moved = new Set<string>()
        const done = advanceFrame(queue[0], deltaFor, stepForElapsed(elapsed, speedRef.current), moved)

        for (const boneName of moved) {
          const bone = boneFor(boneName)
          if (bone) applyBoneDelta(bone)
        }

        const activeToken = runtime.segments[0]?.token ?? null
        if (activeToken !== currentReportedToken) {
          currentReportedToken = activeToken
          onCurrentSignChangeRef.current?.(activeToken, runtime.segments.length)
        }

        if (done) {
          queue.shift()
          const segment = runtime.segments[0]
          if (segment && --segment.frames <= 0) {
            runtime.segments.shift()
            const nextToken = runtime.segments[0]?.token ?? null
            currentReportedToken = nextToken
            onCurrentSignChangeRef.current?.(nextToken, runtime.segments.length)
          }
          nextFrameAt = now + 160 / speedRef.current
        }
      }

      // Detect sentence completion: all frames finished
      if (wasSigning && !queue.length) {
        wasSigning = false
        currentReportedToken = null
        report('ready')
        onCurrentSignChangeRef.current?.(null, 0)

        const finishedSentenceId = playingSentenceIdRef.current
        if (finishedSentenceId) {
          playingSentenceIdRef.current = null
          console.log(`[AvatarPlayer] Sentence completed: ${finishedSentenceId}`)
          onSentenceCompleteRef.current?.(finishedSentenceId)
        }
      }

      renderer.render(scene, camera)
      needsRenderRef.current = false
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      disposed = true
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      if (renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
      renderer.dispose()
      if (runtime.avatar) disposeObject(runtime.avatar)
    }
  }, [])

  return (
    <div className="relative w-full h-full min-h-0 overflow-hidden bg-[#13151b] flex items-center justify-center">
      <div ref={mountRef} className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing" />
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm text-center">
          <div className="max-w-sm p-4 bg-red-950/80 border border-red-800 rounded-xl text-red-200">
            <p className="font-semibold mb-1">Avatar Error</p>
            <p className="text-xs text-red-300">{loadError}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function enhanceHandVisibility(avatar: THREE.Object3D) {
  avatar.traverse((child) => {
    if (child.type === 'Bone') {
      const name = child.name.toLowerCase()
      // Enlarge wrists and hands by 30% for high-visibility signing without breaking rig
      if (
        (name.includes('righthand') || name.includes('lefthand')) &&
        !name.includes('thumb') &&
        !name.includes('index') &&
        !name.includes('middle') &&
        !name.includes('ring') &&
        !name.includes('pinky')
      ) {
        child.scale.set(1.30, 1.30, 1.30)
      }
    }
  })
}

function applyRealisticMannequinMaterials(avatar: THREE.Object3D) {
  // High contrast for dark theme: sleek pearl-slate torso & arms, bright silver-white articulated hands
  const surfaceColor = new THREE.Color('#94a3b8') // Crisp light slate athletic mesh
  const jointColor = new THREE.Color('#f8fafc')   // Ultra-crisp silver-white articulated fingers & joints

  avatar.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    const positions = mesh.geometry.attributes.position
    if (!positions) return

    if (mesh.name === 'Alpha_Surface') {
      const colors = new Float32Array(positions.count * 3)
      for (let i = 0; i < positions.count; i++) {
        colors[i * 3] = surfaceColor.r
        colors[i * 3 + 1] = surfaceColor.g
        colors[i * 3 + 2] = surfaceColor.b
      }
      mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      disposeMaterials(mesh.material)
      mesh.material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.38,
        metalness: 0.15,
      })
    }

    if (mesh.name === 'Alpha_Joints') {
      const colors = new Float32Array(positions.count * 3)
      for (let i = 0; i < positions.count; i++) {
        colors[i * 3] = jointColor.r
        colors[i * 3 + 1] = jointColor.g
        colors[i * 3 + 2] = jointColor.b
      }
      mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      disposeMaterials(mesh.material)
      mesh.material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.22,
        metalness: 0.35,
      })
    }
  })
}

function disposeMaterials(material: THREE.Material | THREE.Material[] | undefined) {
  for (const entry of Array.isArray(material) ? material : material ? [material] : []) {
    for (const value of Object.values(entry)) if (value instanceof THREE.Texture) value.dispose()
    entry.dispose()
  }
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry?.dispose()
    disposeMaterials(mesh.material)
  })
}

const _scratchEuler = new THREE.Euler()
const _scratchDeltaQ = new THREE.Quaternion()
const _scratchResult = new THREE.Quaternion()

function applyBoneDelta(bone: THREE.Object3D) {
  const userData = bone.userData as BoneUserData
  const delta = userData.delta ?? (userData.delta = { x: 0, y: 0, z: 0 })
  _scratchEuler.set(delta.x, delta.y, delta.z)
  _scratchDeltaQ.setFromEuler(_scratchEuler)
  const gestureRest = userData.gestureRestQuaternion || userData.restQuaternion
  if (gestureRest) {
    _scratchResult.copy(gestureRest).multiply(_scratchDeltaQ)
    bone.quaternion.copy(_scratchResult)
  } else {
    bone.quaternion.copy(_scratchDeltaQ)
  }
}

function getAvatarBone(avatar: THREE.Object3D, boneName: string) {
  const compact = boneName.replace(/^mixamorig:?/, '')
  const candidates = [boneName, `mixamorig:${compact}`, compact]
  for (const candidate of candidates) {
    const bone = avatar.getObjectByName(candidate)
    if (bone) return bone
  }
  let resolved: THREE.Object3D | undefined
  avatar.traverse((child) => {
    if (resolved || child.type !== 'Bone') return
    const normalized = child.name.split('|').pop()?.replace(/^mixamorig:?/, '')
    if (normalized === compact) resolved = child
  })
  return resolved
}

function captureRestQuaternions(avatar: THREE.Object3D) {
  avatar.traverse((child) => {
    if (child.type !== 'Bone') return
    const userData = child.userData as BoneUserData
    userData.restQuaternion = child.quaternion.clone()
    userData.gestureRestQuaternion = userData.restQuaternion.clone()
    userData.restPosition = child.position.clone()
    userData.restScale = child.scale.clone()
  })
}

function resetAvatar(runtime: SignRuntime) {
  const avatar = runtime.avatar
  if (!avatar) return

  runtime.animations = []
  runtime.segments = []
  runtime.characters = []
  avatar.traverse((child) => {
    if (child.type !== 'Bone') return
    const userData = child.userData as BoneUserData
    if (userData.gestureRestQuaternion) child.quaternion.copy(userData.gestureRestQuaternion)
    if (userData.restPosition) child.position.copy(userData.restPosition)
    if (userData.restScale) child.scale.copy(userData.restScale)
    userData.delta = { x: 0, y: 0, z: 0 }
  })

  defaultPose(runtime)
  for (const frame of runtime.animations) {
    for (const [boneName, , axis, target] of frame) {
      const bone = getAvatarBone(avatar, boneName)
      if (!bone) continue
      const userData = bone.userData as BoneUserData
      const delta = userData.delta ?? (userData.delta = { x: 0, y: 0, z: 0 })
      delta[axis] = target
      applyBoneDelta(bone)
    }
  }
  runtime.animations = []
  runtime.characters = []
}

function enqueueTokens(tokens: string[], runtime: SignRuntime) {
  for (const token of tokens) {
    const word = token.toUpperCase()
    const wordAnimation = word.includes('-') ? undefined : wordAnimations[word]
    let added = 0
    if (wordAnimation) {
      added = appendSignFrames(runtime, wordAnimation)
    } else {
      for (const character of word.replace(/-/g, '')) {
        const play = alphabetAnimations[character] ?? numberAnimations[character]
        if (play) added += appendSignFrames(runtime, play)
      }
    }
    if (added > 0) runtime.segments.push({ token: word, frames: added })
  }
}
