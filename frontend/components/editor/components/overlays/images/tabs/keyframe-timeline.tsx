"use client"

import React, { useState, useCallback, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { RefreshCw, ChevronLeft, ChevronRight, Clock, Trash2 } from "lucide-react"
import { Slider } from "@/components/ui/slider"

// Generic keyframe interface with a value field that can be a number, array, or object
export interface Keyframe<T = any> {
  frame: number
  value: T
  id?: string
}

// Props for the generic KeyframeTimeline component
export interface KeyframeTimelineProps<T = any> {
  // Overlay information
  overlayFrom: number
  durationInFrames: number
  
  // Current frame and timeline info
  currentFrame: number
  
  // Keyframe data
  keyframes: Keyframe<T>[]
  activeKeyframe: number | null
  
  // Timeline settings
  useFrameInterpolation: boolean
  showCurvePreview: boolean
  
  // Dragging state
  draggedKeyframeFrame: number | null
  dragPreviewValue: T | null
  dragStartX: number
  
  // Current property value
  propertyValue: T
  
  // Keyframe status
  hasKeyframeAtCurrentFrame: boolean
  
  // Property-specific configuration
  propertyLabel: string
  valueFormatter: (value: T) => string
  curveColor?: string
  getInterpolatedValue?: (frame: number) => T
  generateCurvePoints?: () => string
  
  // Callbacks
  toggleCurvePreview: () => void
  addKeyframeAtCurrentTime: () => void
  selectKeyframe: (frame: number) => void
  updateKeyframePosition: (oldFrame: number, newFrame: number) => void
  removeKeyframe: (frame: number) => void
  navigateToNextKeyframe: () => void
  navigateToPrevKeyframe: () => void
  navigateToRelativeFrame: (frame: number) => void
  updatePropertyValue: (value: T) => void
  setActiveKeyframe: (frame: number | null) => void
  updateKeyframeValue: (frame: number, value: T) => void
  editKeyframeValue: (frame: number, value: T) => void
  setDraggedKeyframeFrame: (frame: number | null) => void
  setDragStartX: (x: number) => void
  setDragPreviewValue: (value: T | null) => void
  
  // Sorted keyframes for display
  sortedKeyframes: Keyframe<T>[]
}

export const KeyframeTimeline = <T extends any>({
  overlayFrom,
  durationInFrames,
  currentFrame = 0,
  keyframes,
  activeKeyframe,
  useFrameInterpolation,
  showCurvePreview,
  draggedKeyframeFrame,
  dragPreviewValue,
  dragStartX,
  propertyValue,
  hasKeyframeAtCurrentFrame,
  propertyLabel,
  valueFormatter,
  curveColor = "yellow",
  getInterpolatedValue,
  generateCurvePoints,
  toggleCurvePreview,
  addKeyframeAtCurrentTime,
  selectKeyframe,
  updateKeyframePosition,
  removeKeyframe,
  navigateToNextKeyframe,
  navigateToPrevKeyframe,
  navigateToRelativeFrame,
  updatePropertyValue,
  setActiveKeyframe,
  updateKeyframeValue,
  editKeyframeValue,
  setDraggedKeyframeFrame,
  setDragStartX,
  setDragPreviewValue,
  sortedKeyframes,
}: KeyframeTimelineProps<T>) => {
  // Timeline scrubbing state
  const [scrubPosition, setScrubPosition] = useState<number | null>(null)
  const [timelineDragActive, setTimelineDragActive] = useState<boolean>(false)
  
  // Effect to enable curve preview by default when there are multiple keyframes
  useEffect(() => {
    if (!showCurvePreview && keyframes.length >= 2 && generateCurvePoints) {
      toggleCurvePreview()
    }
  }, [keyframes.length, showCurvePreview, generateCurvePoints, toggleCurvePreview])
  
  // Start dragging a keyframe
  const handleKeyframeDragStart = (frame: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setDraggedKeyframeFrame(frame)
    setDragStartX(e.clientX)
    setActiveKeyframe(frame)
    
    // Find the keyframe and get its current value
    const keyframe = keyframes.find(kf => kf.frame === frame)
    if (keyframe) {
      setDragPreviewValue(keyframe.value)
    }
  }
  
  // Handle keyframe dragging
  const handleKeyframeDrag = useCallback((e: MouseEvent) => {
    if (draggedKeyframeFrame === null) return
    
    // Calculate how many frames to move based on drag distance
    const timelineEl = document.querySelector('.keyframe-timeline')
    if (!timelineEl) return
    
    const timelineWidth = timelineEl.getBoundingClientRect().width
    const pixelsPerFrame = timelineWidth / durationInFrames
    const deltaX = e.clientX - dragStartX
    const frameDelta = Math.round(deltaX / pixelsPerFrame)
    
    if (frameDelta !== 0) {
      const targetFrame = Math.max(0, Math.min(durationInFrames, draggedKeyframeFrame + frameDelta))
      
      // Update preview value during drag
      if (dragPreviewValue !== null) {
        setDragPreviewValue(dragPreviewValue)
      }
      
      // Move keyframe
      updateKeyframePosition(draggedKeyframeFrame, targetFrame)
      setDraggedKeyframeFrame(targetFrame)
      setDragStartX(e.clientX)
    }
  }, [draggedKeyframeFrame, durationInFrames, dragStartX, dragPreviewValue, updateKeyframePosition, setDraggedKeyframeFrame, setDragStartX, setDragPreviewValue])
  
  // End dragging
  const handleKeyframeDragEnd = useCallback(() => {
    setDraggedKeyframeFrame(null)
    setDragPreviewValue(null)
  }, [setDraggedKeyframeFrame, setDragPreviewValue])

  // Enhanced handleTimelineHover to include drag interaction
  const handleTimelineHover = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const hoverPos = (e.clientX - rect.left) / rect.width
    const hoverFrame = Math.round(hoverPos * durationInFrames)
    setScrubPosition(hoverFrame)
  }
  
  // Find the closest keyframe to a given frame
  const findClosestKeyframe = (frame: number) => {
    if (!useFrameInterpolation || keyframes.length < 2) return null
    
    // Convert to relative frame position
    const relativeFrame = frame
    
    // Find nearest keyframe
    let closestKeyframe = null
    let minDistance = Number.MAX_VALUE
    
    for (const keyframe of keyframes) {
      const distance = Math.abs(keyframe.frame - relativeFrame)
      if (distance < minDistance) {
        minDistance = distance
        closestKeyframe = keyframe
      }
    }
    
    return closestKeyframe
  }

  // Snap to the closest keyframe when holding Alt key while clicking timeline
  const handleTimelineClickWithSnap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickPos = (e.clientX - rect.left) / rect.width
    const frameOffset = Math.round(clickPos * durationInFrames)
    
    // Check if Alt key is pressed for snapping to keyframes
    if (e.altKey && useFrameInterpolation) {
      const closestKeyframe = findClosestKeyframe(frameOffset)
      if (closestKeyframe) {
        // Navigate to the closest keyframe
        navigateToRelativeFrame(closestKeyframe.frame)
        setActiveKeyframe(closestKeyframe.frame)
        return
      }
    }
    
    // Normal timeline navigation
    navigateToRelativeFrame(frameOffset)
  }

  // Start dragging timeline scrubber
  const handleTimelineScrubStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setTimelineDragActive(true)
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickPos = (e.clientX - rect.left) / rect.width
    const frameOffset = Math.round(clickPos * durationInFrames)
    
    // Set the scrub position
    setScrubPosition(frameOffset)
    
    // Add event listeners for drag
    window.addEventListener('mousemove', handleTimelineScrubMove)
    window.addEventListener('mouseup', handleTimelineScrubEnd)
  }

  // Handle timeline scrubber dragging
  const handleTimelineScrubMove = useCallback((e: MouseEvent) => {
    if (!timelineDragActive) return
    
    // Find timeline element
    const timelineEl = document.querySelector('.keyframe-timeline')
    if (!timelineEl) return
    
    const rect = timelineEl.getBoundingClientRect()
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const frameOffset = Math.round(pos * durationInFrames)
    
    // Update scrub position
    setScrubPosition(frameOffset)
    
    // Navigate to this frame (this would update the player position)
    navigateToRelativeFrame(frameOffset)
  }, [timelineDragActive, durationInFrames, navigateToRelativeFrame])

  // End timeline scrubber dragging
  const handleTimelineScrubEnd = useCallback(() => {
    setTimelineDragActive(false)
    
    // Remove event listeners
    window.removeEventListener('mousemove', handleTimelineScrubMove)
    window.removeEventListener('mouseup', handleTimelineScrubEnd)
  }, [handleTimelineScrubMove])

  // Helper function to create a smooth bezier curve path from points
  const generateSmoothCurvePath = (pointsStr: string): string => {
    if (!pointsStr) return 'M0,50 L100,50'
    
    const points = pointsStr.split(' ').map(p => {
      const [x, y] = p.split(',')
      return { x: parseFloat(x), y: parseFloat(y) }
    })
    
    if (points.length < 2) return 'M0,50 L100,50'
    
    // Start with the first point
    let path = `M${points[0].x},${points[0].y}`
    
    // Add curve segments - using Cubic bezier curves for smoothness
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i]
      const next = points[i + 1]
      
      // Calculate control points for smooth curve
      // Simple method: 1/3 distance between points
      const cpDist = (next.x - curr.x) / 3
      
      // Control points
      const cp1x = curr.x + cpDist
      const cp1y = curr.y
      const cp2x = next.x - cpDist
      const cp2y = next.y
      
      // Add cubic bezier curve segment: C cp1x,cp1y cp2x,cp2y end.x,end.y
      path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`
    }
    
    return path
  }

  // Add/update global event listeners
  useEffect(() => {
    if (draggedKeyframeFrame !== null) {
      window.addEventListener('mousemove', handleKeyframeDrag)
      window.addEventListener('mouseup', handleKeyframeDragEnd)
    }
    
    return () => {
      window.removeEventListener('mousemove', handleKeyframeDrag)
      window.removeEventListener('mouseup', handleKeyframeDragEnd)
    }
  }, [draggedKeyframeFrame, handleKeyframeDrag, handleKeyframeDragEnd])

  // Hotkey handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't respond to hotkeys when focused on input elements
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      // Navigate between keyframes with Alt+Left/Right
      if (e.altKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          navigateToPrevKeyframe()
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          navigateToNextKeyframe()
        }
      }
      
      // Add keyframe at current time with K
      if (e.key === 'k' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        addKeyframeAtCurrentTime()
      }
      
      // Toggle curve preview with V
      if (e.key === 'v' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        toggleCurvePreview()
      }
      
      // Delete keyframe with Delete/Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeKeyframe !== null) {
        e.preventDefault()
        removeKeyframe(activeKeyframe)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeKeyframe, addKeyframeAtCurrentTime, navigateToNextKeyframe, navigateToPrevKeyframe, removeKeyframe, toggleCurvePreview])

  // Set default curve preview to true
  useEffect(() => {
    if (!showCurvePreview && keyframes.length >= 2) {
      toggleCurvePreview()
    }
  }, [keyframes.length, showCurvePreview])

  return (
    <div className="space-y-2">
      {/* Timeline header */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium flex items-center gap-1.5">
          <Clock size={12} className="text-gray-500" />
          <span>{propertyLabel} Timeline</span>
          <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1.5 h-4">
            {durationInFrames} frames
          </Badge>
          
          {/* Toggle curve view button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={showCurvePreview ? "default" : "outline"} 
                size="icon" 
                className="h-5 w-5 ml-1"
                onClick={toggleCurvePreview}
              >
                <RefreshCw size={10} className={showCurvePreview ? "text-white" : ""} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Toggle curve view (V)</TooltipContent>
          </Tooltip>
        </div>
        <div className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded flex items-center gap-1">
          <span className="text-gray-500 dark:text-gray-400">Frame:</span>
          <span className="font-mono text-gray-700 dark:text-gray-300">{currentFrame - overlayFrom}</span>
          <span className="text-gray-400 dark:text-gray-500">/</span>
          <span className="font-mono">{durationInFrames}</span>
        </div>
      </div>

      {/* Timeline metadata */}
      <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800 flex justify-between text-[10px]">
        <div className="flex flex-col">
          <div className="text-gray-500 dark:text-gray-400 mb-0.5">Timeline Position</div>
          <div className="font-medium flex items-center">
            <span className="text-gray-700 dark:text-gray-300 font-mono">{overlayFrom}</span>
            <span className="mx-1 text-gray-400 dark:text-gray-500">→</span>
            <span className="text-gray-700 dark:text-gray-300 font-mono">{overlayFrom + durationInFrames}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-gray-500 dark:text-gray-400 mb-0.5">Duration</div>
          <div className="font-medium">
            <span className="font-mono text-gray-700 dark:text-gray-300">{durationInFrames}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-0.5">frames</span>
            <span className="text-gray-400 dark:text-gray-500 mx-1">·</span>
            <span className="font-mono text-gray-700 dark:text-gray-300">{(durationInFrames / 30).toFixed(1)}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-0.5">sec</span>
          </div>
        </div>
      </div>

      {/* Keyframe shortcut reference */}
      <div className="flex items-center justify-between text-[10px] px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded shadow-sm text-gray-800 dark:text-gray-200 mr-1">K</kbd>
            Add keyframe
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="flex items-center">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded shadow-sm text-gray-800 dark:text-gray-200 mr-1">Del</kbd>
            Remove
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded shadow-sm text-gray-800 dark:text-gray-200 mr-1">Alt+←→</kbd>
            Navigate
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="flex items-center">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded shadow-sm text-gray-800 dark:text-gray-200 mr-1">V</kbd>
            View curve
          </span>
        </div>
      </div>

      {/* Property value slider */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800">
        <div className="text-xs font-normal text-muted-foreground w-14">
          {propertyLabel}
        </div>
        {propertyValue !== null && typeof propertyValue === 'number' ? (
          <div className="flex items-center flex-1">
            <Slider
              min={propertyLabel.toLowerCase() === 'opacity' ? 0 : propertyLabel.toLowerCase() === 'scale' ? 0.01 : -1000}
              max={propertyLabel.toLowerCase() === 'opacity' ? 1 : propertyLabel.toLowerCase() === 'scale' ? 5 : 1000}
              step={propertyLabel.toLowerCase() === 'opacity' ? 0.01 : propertyLabel.toLowerCase() === 'scale' ? 0.01 : 1}
              value={[propertyValue as number]}
              onValueChange={([value]) => updatePropertyValue(value as T)}
              aria-label={`${propertyLabel} Value`}
              className="flex-1 mx-2"
            />
            <div className="flex items-center gap-1">
              <span className={`w-${propertyLabel.toLowerCase() === 'scale' ? '12' : '10'} text-xs tabular-nums text-muted-foreground`}>
                {valueFormatter(propertyValue)}
              </span>
              {propertyLabel.toLowerCase() === 'scale' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => {
                    const val = propertyValue as number;
                    const currentPercent = Math.round(val * 100);
                    const newValueInput = prompt(`Enter scale percentage (1-1000):`, currentPercent.toString());
                    if (newValueInput !== null) {
                      const parsed = parseInt(newValueInput, 10);
                      if (!isNaN(parsed) && parsed >= 1 && parsed <= 1000) {
                        updatePropertyValue((parsed / 100) as unknown as T);
                      }
                    }
                  }}
                >
                  <span className="text-xs">✏️</span>
                </Button>
              )}
            </div>
          </div>
        ) : propertyValue !== null && typeof propertyValue === 'object' && 'x' in propertyValue && 'y' in propertyValue ? (
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="flex items-center">
              <span className="text-[10px] text-muted-foreground w-4">X</span>
              <Slider
                min={-1000}
                max={1000}
                step={1}
                value={[(propertyValue as any).x]}
                onValueChange={([value]) => updatePropertyValue({ ...(propertyValue as any), x: value } as T)}
                aria-label="X Value"
                className="flex-1 mx-2"
              />
              <span className="w-10 text-xs tabular-nums text-muted-foreground">
                {(propertyValue as any).x}px
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-[10px] text-muted-foreground w-4">Y</span>
              <Slider
                min={-1000}
                max={1000}
                step={1}
                value={[(propertyValue as any).y]}
                onValueChange={([value]) => updatePropertyValue({ ...(propertyValue as any), y: value } as T)}
                aria-label="Y Value"
                className="flex-1 mx-2"
              />
              <span className="w-10 text-xs tabular-nums text-muted-foreground">
                {(propertyValue as any).y}px
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1 text-xs">
            {valueFormatter(propertyValue)}
          </div>
        )}
      </div>

      {/* Keyframe navigation controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-1.5 text-xs"
            onClick={navigateToPrevKeyframe}
            disabled={keyframes.length === 0}
          >
            <ChevronLeft size={12} />
            <span className="sr-only">Previous Keyframe</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-1.5 text-xs"
            onClick={navigateToNextKeyframe}
            disabled={keyframes.length === 0}
          >
            <ChevronRight size={12} />
            <span className="sr-only">Next Keyframe</span>
          </Button>
          
          {/* Delete selected keyframe button */}
          {activeKeyframe !== null && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-xs bg-red-50 hover:bg-red-100 border-red-200 text-red-600 dark:bg-red-950 dark:hover:bg-red-900 dark:border-red-800 dark:text-red-400"
              onClick={() => removeKeyframe(activeKeyframe)}
              title="Delete selected keyframe"
            >
              <Trash2 size={12} />
              <span className="sr-only">Delete Keyframe</span>
            </Button>
          )}
        </div>
        <Button
          variant={hasKeyframeAtCurrentFrame ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-6 px-2 text-xs",
            hasKeyframeAtCurrentFrame ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""
          )}
          onClick={() => {
            if (hasKeyframeAtCurrentFrame) {
              // Update existing keyframe after confirming
              const currentValue = valueFormatter(propertyValue);
              const newValueInput = prompt(`Update ${propertyLabel.toLowerCase()} value:`, currentValue);
              if (newValueInput !== null) {
                // Try to parse the input value if it's a string
                try {
                  // Handle different property types
                  if (typeof propertyValue === 'number') {
                    // For numerical values like opacity and rotation
                    const numValue = parseFloat(newValueInput);
                    if (!isNaN(numValue)) {
                      // Convert percentage input (0-100) to decimal (0-1) for opacity
                      if (propertyLabel.toLowerCase() === 'opacity') {
                        updatePropertyValue(numValue / 100 as unknown as T);
                      } else {
                        updatePropertyValue(numValue as unknown as T);
                      }
                    }
                  } else if (typeof propertyValue === 'object') {
                    // For position and scale (objects with x,y)
                    // In a real implementation, you'd use a custom dialog/form rather than a prompt
                    // This is just a simple demonstration
                    try {
                      const obj = JSON.parse(newValueInput);
                      if (obj && typeof obj === 'object') {
                        updatePropertyValue(obj);
                      }
                    } catch (e) {
                      // If not valid JSON, do nothing
                      console.error("Invalid input format for object property");
                    }
                  }
                  
                  // Now add the keyframe with updated property value
                  addKeyframeAtCurrentTime();
                } catch (e) {
                  console.error("Error parsing input value", e);
                }
              }
            } else {
              // Add new keyframe after getting value input
              const currentValue = valueFormatter(propertyValue);
              const newValueInput = prompt(`Set ${propertyLabel.toLowerCase()} value for new keyframe:`, currentValue);
              if (newValueInput !== null) {
                // Try to parse the input value if it's a string
                try {
                  // Handle different property types
                  if (typeof propertyValue === 'number') {
                    // For numerical values like opacity and rotation
                    const numValue = parseFloat(newValueInput);
                    if (!isNaN(numValue)) {
                      // Convert percentage input (0-100) to decimal (0-1) for opacity
                      if (propertyLabel.toLowerCase() === 'opacity') {
                        updatePropertyValue(numValue / 100 as unknown as T);
                      } else {
                        updatePropertyValue(numValue as unknown as T);
                      }
                    }
                  } else if (typeof propertyValue === 'object') {
                    // For position and scale (objects with x,y)
                    // In a real implementation, you'd use a custom dialog/form rather than a prompt
                    // This is just a simple demonstration
                    try {
                      const obj = JSON.parse(newValueInput);
                      if (obj && typeof obj === 'object') {
                        updatePropertyValue(obj);
                      }
                    } catch (e) {
                      // If not valid JSON, do nothing
                      console.error("Invalid input format for object property");
                    }
                  }
                  
                  // Now add the keyframe with updated property value
                  addKeyframeAtCurrentTime();
                } catch (e) {
                  console.error("Error parsing input value", e);
                }
              }
            }
          }}
          disabled={currentFrame < overlayFrom || currentFrame >= overlayFrom + durationInFrames}
        >
          {hasKeyframeAtCurrentFrame ? "Update Keyframe" : "Add Keyframe"}
        </Button>
      </div>

      {/* Timeline scrubbing area */}
      <div className="relative h-16 bg-white dark:bg-black rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden keyframe-timeline">
        {/* Frame grid */}
        <div className="absolute inset-0">
          {/* Major frame markers */}
          {Array.from({ length: Math.min(Math.ceil(durationInFrames / 10) + 1, 20) }).map((_, i) => {
            const framePos = i * 10; // Every 10 frames
            const position = (framePos / durationInFrames) * 100;
            if (framePos <= durationInFrames) {
              return (
                <div 
                  key={`major-${i}`} 
                  className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700"
                  style={{ left: `${position}%` }}
                >
                  <div className="absolute bottom-1 transform -translate-x-1/2 text-[8px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {framePos}
                  </div>
                </div>
              );
            }
            return null;
          })}
          
          {/* Minor frame markers - every 5 frames */}
          {Array.from({ length: Math.ceil(durationInFrames / 5) + 1 }).map((_, i) => {
            const framePos = i * 5; // Every 5 frames
            const position = (framePos / durationInFrames) * 100;
            const isMajorMarker = framePos % 10 === 0;
            
            if (!isMajorMarker && framePos <= durationInFrames) {
              return (
                <div 
                  key={`minor-${i}`} 
                  className="absolute top-0 h-1 w-px bg-gray-200 dark:bg-gray-700"
                  style={{ 
                    left: `${position}%`,
                    top: '16px' 
                  }}
                />
              );
            }
            return null;
          })}

          {/* Background track */}
          <div className="absolute bottom-0 left-0 right-0 h-2.5 bg-gray-100 dark:bg-gray-800 rounded-b-sm"></div>

          {/* Duration track */}
          <div className="absolute bottom-0 left-0 h-2.5 bg-gray-300 dark:bg-gray-700 rounded-sm"
                style={{ width: '100%' }}></div>
           
          {/* Property curve visualization */}
          {showCurvePreview && (
            <div className="absolute inset-x-0 bottom-0 h-10 top-4">
              <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 100 100" 
                preserveAspectRatio="none"
                className="opacity-70"
              >
                {/* Area under curve */}
                <path
                  d={keyframes.length >= 2 && generateCurvePoints 
                    ? `${generateSmoothCurvePath(generateCurvePoints())} L100,100 L0,100 Z`
                    : 'M0,50 L100,50 L100,100 L0,100 Z'}
                  fill={`url(#${curveColor}-gradient)`}
                  className="opacity-30"
                />
                
                {/* Smooth curve line */}
                <path
                  d={keyframes.length >= 2 && generateCurvePoints 
                    ? generateSmoothCurvePath(generateCurvePoints())
                    : 'M0,50 L100,50'}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`text-${curveColor}-500 dark:text-${curveColor}-400`}
                />
                
                {/* Gradient definition */}
                <defs>
                  <linearGradient id={`${curveColor}-gradient`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={`rgb(${curveColor === 'yellow' ? '250, 204, 21' : '147, 51, 234'})`} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={`rgb(${curveColor === 'yellow' ? '250, 204, 21' : '147, 51, 234'})`} stopOpacity="0.05" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}
               
          {/* Keyframe markers */}
          {sortedKeyframes.map((keyframe, index) => {
            const position = (keyframe.frame / durationInFrames) * 100;
            const isActive = activeKeyframe === keyframe.frame;
            const isDragging = draggedKeyframeFrame === keyframe.frame;
            const formattedValue = valueFormatter(keyframe.value);
            
            return (
              <div
                key={keyframe.id || `keyframe-${index}`}
                className={`absolute bottom-0 w-2.5 h-2.5 transform -translate-x-1/2 cursor-pointer z-10 ${isDragging ? 'animate-pulse' : ''}`}
                style={{ left: `${position}%`, bottom: '0px' }}
                onMouseDown={(e) => handleKeyframeDragStart(keyframe.frame, e)}
                onClick={(e) => {
                  e.stopPropagation();
                  selectKeyframe(keyframe.frame);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  // This is a placeholder for property-specific editing UI
                  // The implementation would vary based on property type
                  const newValueInput = prompt(`Enter ${propertyLabel.toLowerCase()} value:`, formattedValue);
                  if (newValueInput !== null) {
                    // This is a simplified approach - in a real implementation,
                    // you would use a proper modal with appropriate controls for the value type
                    editKeyframeValue(keyframe.frame, parseFloat(newValueInput) as unknown as T);
                  }
                }}
              >
                <div 
                  className={`w-2.5 h-2.5 rounded-full border-2 shadow-sm transition-all duration-150 
                    ${isActive 
                      ? `bg-${curveColor}-500 dark:bg-${curveColor}-400 border-white dark:border-black scale-125` 
                      : 'bg-gray-700 dark:bg-gray-300 border-white dark:border-black'
                    }
                    ${isDragging ? `scale-125 ring-2 ring-${curveColor}-400 dark:ring-${curveColor}-500` : ''}
                  `} 
                />
                
                {/* Display vertical line from keyframe to curve if showing curve */}
                {showCurvePreview && (
                  <div 
                    className={`absolute bottom-2.5 w-px h-10 bg-${curveColor}-500/30 dark:bg-${curveColor}-400/30 pointer-events-none`}
                    style={{ left: '50%' }}
                  />
                )}
                
                {/* Value tooltip on hover/active/dragging */}
                {(isActive || isDragging) && (
                  <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-[8px] font-medium px-1 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none z-20">
                    {isDragging && dragPreviewValue !== null 
                      ? valueFormatter(dragPreviewValue)
                      : formattedValue}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Current frame indicator */}
        {currentFrame !== undefined && 
          currentFrame >= overlayFrom && 
          currentFrame < overlayFrom + durationInFrames && (
          <div 
            className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none z-20"
            style={{
              left: `${((currentFrame - overlayFrom) / durationInFrames) * 100}%`,
            }}
          >
            <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-gray-700 dark:border-t-gray-300"></div>
            <div className="w-0.5 h-full bg-gray-700 dark:bg-gray-300"></div>
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 text-[8px] font-medium text-gray-700 dark:text-gray-300 px-1 py-0.5 bg-white/90 dark:bg-black/90 rounded border border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-sm">
              {currentFrame - overlayFrom}
            </div>
          </div>
        )}

        {/* Timeline scrubber */}
        <div 
          className="absolute inset-0 cursor-pointer"
          onMouseMove={handleTimelineHover}
          onMouseLeave={() => setScrubPosition(null)}
          onClick={handleTimelineClickWithSnap}
          onMouseDown={handleTimelineScrubStart}
        />

        {/* Hover/scrub indicator */}
        {scrubPosition !== null && !timelineDragActive && (
          <div 
            className="absolute top-0 bottom-0 w-px bg-blue-400 dark:bg-blue-500 opacity-70 pointer-events-none"
            style={{ left: `${(scrubPosition / durationInFrames) * 100}%` }}
          >
            <div className="absolute top-0 px-1 py-0.5 bg-blue-400 dark:bg-blue-500 text-white text-[8px] font-semibold rounded-sm transform -translate-x-1/2 shadow-sm">
              {scrubPosition}
            </div>
          </div>
        )}
      </div>

      {/* Keyframes list */}
      {sortedKeyframes.length > 0 && (
        <div className="mt-2 space-y-1.5 max-h-20 overflow-y-auto pr-1 pb-1">
          {sortedKeyframes.map((keyframe, index) => {
            const isActive = keyframe.frame === activeKeyframe;
            const isAtCurrentFrame = keyframe.frame === (currentFrame - overlayFrom);
            
            return (
              <div 
                key={keyframe.id || `kf-item-${index}`}
                className={cn(
                  "flex items-center justify-between p-1.5 rounded-md border transition-colors relative",
                  isActive 
                    ? `bg-${curveColor}-50 dark:bg-${curveColor}-950 border-${curveColor}-200 dark:border-${curveColor}-800 ring-2 ring-${curveColor}-400/30 dark:ring-${curveColor}-400/20` 
                    : isAtCurrentFrame
                      ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
                      : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                onClick={() => selectKeyframe(keyframe.frame)}
              >
                <div className="flex items-center gap-1.5">
                  <div 
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isActive
                        ? `bg-${curveColor}-500 dark:bg-${curveColor}-400`
                        : isAtCurrentFrame
                          ? "bg-gray-700 dark:bg-gray-300"
                          : "bg-gray-500 dark:bg-gray-500"
                    )}
                  />
                  <span className={cn(
                    "text-[10px]",
                    isActive ? `font-medium text-${curveColor}-800 dark:text-${curveColor}-300` : "font-medium"
                  )}>
                    Frame {keyframe.frame}
                  </span>
                </div>
                <div className="text-[10px] font-mono flex items-center gap-1">
                  <span className={isActive ? `text-${curveColor}-700 dark:text-${curveColor}-300` : ""}>
                    {valueFormatter(keyframe.value)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 opacity-50 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeKeyframe(keyframe.frame);
                    }}
                  >
                    <span className="text-[10px]">×</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
} 