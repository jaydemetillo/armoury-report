/** Types for the Hero3D module (index.js). The module itself is plain JS so it can move between frameworks. */

export interface Hero3DKeyframe {
  p: number
  azimuth: number
  polar: number
  zoom: number
}

export interface Hero3DStep {
  id: string
  start: number
  end: number
  region: { center: [number, number, number]; size: [number, number, number] }
  kicker?: string
  title?: string
  body?: string
}

export interface Hero3DScrollSection {
  label: string
  height: string
  fallback?: string
}

/** Shape of HERO3D_CONFIG in config.js. Every block is optional in overrides. */
export interface Hero3DConfig {
  MODEL_TRANSFORM: { rotationY: number }
  RENDER_MODE: 'clay' | 'textured'
  CLAY: { color: number; metalness: number; roughness: number }
  CAMERA_SETTINGS: Record<string, unknown>
  CAMERA_KEYFRAMES: Hero3DKeyframe[]
  STEPS: Hero3DStep[]
  MOTION: Record<string, number>
  HIGHLIGHT: Record<string, number>
  POSTFX: Record<string, unknown>
  QUALITY: Record<string, number | boolean>
  MODEL_URL: string
  SCROLL: {
    sections: Hero3DScrollSection[]
    main: { start: string; end: string; scrub: boolean | number }
    takeover: {
      start: string
      end: string
      scrub: boolean | number
      from: Record<string, string | number>
      to: Record<string, string | number>
    }
    renderRootMargin: string
  }
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K] }

export interface Hero3DOptions {
  config?: DeepPartial<Hero3DConfig>
  modelUrl?: string
  modelData?: string
  scroller?: Element | Window
  tuner?: 'auto' | boolean
  tunerHotkey?: boolean
  tunerStorageKey?: string
  onReady?: (handle: Hero3DHandle) => void
  onError?: (error: Error) => void
}

/** Per-instance debug/tuning surface (the repo's window.__scrolly). */
export type Hero3DHandle = Record<string, unknown>

export interface Hero3DInstance {
  root: HTMLElement
  ready: Promise<Hero3DHandle>
  readonly handle: Hero3DHandle | null
  showTuner(): Promise<void>
  hideTuner(): void
  toggleTuner(): Promise<void>
  destroy(): void
}

export function mountHero3D(container: HTMLElement, options?: Hero3DOptions): Hero3DInstance
export const HERO3D_CONFIG: Hero3DConfig
export function resolveConfig(overrides?: DeepPartial<Hero3DConfig>): Hero3DConfig
