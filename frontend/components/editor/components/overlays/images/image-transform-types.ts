// Define shared types for image transformation components

// Base keyframe interface
export interface BaseKeyframe {
  frame: number
  id?: string // Add unique ID for better tracking
  overlayUniqueId?: string // Associate with a specific overlay
}

// Opacity keyframe interface
export interface OpacityKeyframe extends BaseKeyframe {
  value: number // 0-1 range
}

// Position keyframe interface
export interface PositionKeyframe extends BaseKeyframe {
  value: {
    x: number
    y: number
  }
}

// Scale keyframe interface
export interface ScaleKeyframe extends BaseKeyframe {
  value: {
    x: number // Width scale
    y: number // Height scale
    uniform: boolean // Whether scaling is uniform
  }
}

// Rotation keyframe interface
export interface RotationKeyframe extends BaseKeyframe {
  value: number // Degrees
}

// Transform tab types
export type SectionKey = 'position' | 'scale' | 'rotation' | 'opacity'

// Common props for all transform tabs
export interface TabBaseProps {
  localOverlay: any
  expanded: boolean
  setExpanded: (expanded: boolean) => void
  totalFrames?: number
  currentFrame?: number
}

// Helper types for keyframe management
export interface KeyframeInputProps {
  value: number | { x: number; y: number }
  onChange: (value: number | { x: number; y: number }) => void
  addKeyframe: () => void
  hasKeyframe: boolean
  min?: number
  max?: number
  step?: number
  label?: string
  showTimelineButton?: boolean
}

// Keyframe control props
export interface KeyframeControlProps<T> {
  keyframes: Array<{ frame: number; value: T; id?: string }>
  setKeyframes: React.Dispatch<React.SetStateAction<Array<{ frame: number; value: T; id?: string }>>>
  currentFrame: number
  totalFrames: number
  onChange: (value: T) => void
  onKeyframeChange?: (keyframes: Array<{ frame: number; value: T; id?: string }>) => void
}

// Helper function to generate a unique keyframe ID
export function generateKeyframeId(): string {
  return `kf-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`
}

// Helper function for associating keyframes with overlays
export function generateKeyframeWithOverlayId(overlayUniqueId: string): string {
  return `kf-${overlayUniqueId}-${Math.random().toString(36).substring(2, 5)}-${Date.now()}`;
}

// Helper function to interpolate between two values
export function interpolate<T extends number | { [key: string]: any }>(
  frame: number,
  keyframe1: { frame: number; value: T },
  keyframe2: { frame: number; value: T }
): T {
  // Calculate interpolation factor (0-1)
  const t = (frame - keyframe1.frame) / (keyframe2.frame - keyframe1.frame)
  
  // For simple number values
  if (typeof keyframe1.value === 'number' && typeof keyframe2.value === 'number') {
    return (keyframe1.value + t * (keyframe2.value - keyframe1.value)) as T
  }
  
  // For object values (position, scale, etc.)
  if (typeof keyframe1.value === 'object' && typeof keyframe2.value === 'object') {
    const result: any = {}
    
    // Interpolate each property in the object
    for (const key in keyframe1.value) {
      if (typeof keyframe1.value[key] === 'number' && typeof keyframe2.value[key] === 'number') {
        result[key] = keyframe1.value[key] + t * (keyframe2.value[key] - keyframe1.value[key])
      } else {
        // For non-numeric properties, just use the first keyframe's value
        result[key] = keyframe1.value[key]
      }
    }
    
    return result as T
  }
  
  // Default case - return first keyframe value
  return keyframe1.value
}

// Helper function to format values based on property type
export const formatters = {
  opacity: (value: number) => `${Math.round(value * 100)}%`,
  position: (value: { x: number, y: number }) => `X: ${Math.round(value.x)}px, Y: ${Math.round(value.y)}px`,
  scale: (value: { x: number, y: number }) => value.x === value.y 
    ? `${Math.round(value.x * 100)}%` 
    : `X: ${Math.round(value.x * 100)}%, Y: ${Math.round(value.y * 100)}%`,
  rotation: (value: number) => `${Math.round(value)}°`
} 