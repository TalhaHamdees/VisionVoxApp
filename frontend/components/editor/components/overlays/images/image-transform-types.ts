// Define shared types for image transformation components

export interface OpacityKeyframe {
  frame: number
  value: number
  id?: string // Add unique ID for better tracking
}

export interface TabBaseProps {
  expanded: boolean
  setExpanded: (isExpanded: boolean) => void
} 