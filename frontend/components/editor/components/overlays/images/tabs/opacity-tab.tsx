"use client"

import React, { useState, useEffect } from "react"
import { ImageOffIcon as OpacityIcon, RotateCcw, ChevronRight, ChevronDown, Clock, Plus, X, Minus, RefreshCw, Trash2, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ImageOverlay } from "../../../../types"
import { TabBaseProps, OpacityKeyframe } from "../image-transform-types"
import { OpacityKeyframeTimeline } from "./opacity-keyframe-timeline"

interface OpacityTabProps extends TabBaseProps {
  localOverlay: ImageOverlay
  handleStyleChange: (updates: Partial<ImageOverlay["styles"]>) => void
  totalFrames?: number
  currentFrame?: number
  onKeyframeChange?: (keyframes: OpacityKeyframe[]) => void
}

export const OpacityTab: React.FC<OpacityTabProps> = ({
  localOverlay,
  handleStyleChange,
  expanded,
  setExpanded,
  totalFrames = 0,
  currentFrame = 0,
  onKeyframeChange,
}) => {
  // Local controlled state
  const [opacityValue, setOpacityValue] = useState<number>(localOverlay.styles.opacity ?? 1)
  
  // Frame interpolation settings for opacity
  const [useFrameInterpolation, setUseFrameInterpolation] = useState<boolean>(false)
  
  // Store keyframes for opacity
  const [opacityKeyframes, setOpacityKeyframes] = useState<OpacityKeyframe[]>([])
  
  // Keep track of the last interpolated opacity to avoid unnecessary updates
  const [lastInterpolatedOpacity, setLastInterpolatedOpacity] = useState<number>(opacityValue)
  
  // Handle dragging keyframes in timeline
  const [draggedKeyframeFrame, setDraggedKeyframeFrame] = useState<number | null>(null)
  const [dragStartX, setDragStartX] = useState<number>(0)
  const [activeKeyframe, setActiveKeyframe] = useState<number | null>(null)
  const [dragPreviewValue, setDragPreviewValue] = useState<number | null>(null)
  
  // Add additional states for keyframe interaction
  const [timelineDragActive, setTimelineDragActive] = useState<boolean>(false)
  const [showCurvePreview, setShowCurvePreview] = useState<boolean>(false)
  
  // Timeline scrubbing state
  const [scrubPosition, setScrubPosition] = useState<number | null>(null)

  // Basic linear interpolation function
  const interpolate = (frame: number, inputRange: number[], outputRange: number[]) => {
    if (frame <= inputRange[0]) return outputRange[0]
    if (frame >= inputRange[inputRange.length - 1]) return outputRange[outputRange.length - 1]

    for (let i = 0; i < inputRange.length - 1; i++) {
      if (frame >= inputRange[i] && frame <= inputRange[i + 1]) {
        const t = (frame - inputRange[i]) / (inputRange[i + 1] - inputRange[i])
        return outputRange[i] + t * (outputRange[i + 1] - outputRange[i])
      }
    }
    return outputRange[0]
  }

  // Get opacity value at a specific frame by interpolating between keyframes
  const getInterpolatedOpacity = (frame: number) => {
    if (!useFrameInterpolation || opacityKeyframes.length < 2) return opacityValue

    // Sort keyframes by frame number
    const sortedKeyframes = [...opacityKeyframes].sort((a, b) => a.frame - b.frame)

    // Extract frame numbers and opacity values for interpolation
    const frames = sortedKeyframes.map((kf) => kf.frame)
    const values = sortedKeyframes.map((kf) => kf.value)

    // Interpolate based on current frame
    return interpolate(frame, frames, values)
  }
  
  // Generate unique ID for keyframes
  const generateKeyframeId = () => `kf_${Date.now()}_${Math.floor(Math.random() * 1000)}`
  
  // Update function to add keyframe with ID
  const addKeyframeAtCurrentFrame = () => {
    if (currentFrame === undefined) return

    // Convert global timeline frame to local overlay frame
    const relativeFrame = currentFrame - localOverlay.from
    
    // Don't add keyframe if outside overlay bounds
    if (relativeFrame < 0 || relativeFrame > localOverlay.durationInFrames) return

    // Check if a keyframe already exists at this position
    const existingKeyframeIndex = opacityKeyframes.findIndex((kf) => kf.frame === relativeFrame)

    if (existingKeyframeIndex >= 0) {
      // Update existing keyframe
      const updatedKeyframes = [...opacityKeyframes]
      updatedKeyframes[existingKeyframeIndex].value = opacityValue
      setOpacityKeyframes(updatedKeyframes)

      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(updatedKeyframes)
      }
    } else {
      // Add new keyframe with ID
      const newKeyframe = {
        frame: relativeFrame,
        value: opacityValue,
        id: generateKeyframeId(),
      }

      const newKeyframes = [...opacityKeyframes, newKeyframe]
      setOpacityKeyframes(newKeyframes)

      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(newKeyframes)
      }
    }

    // Apply the current opacity immediately
    setLastInterpolatedOpacity(opacityValue)
    handleStyleChange({ opacity: opacityValue })
  }
  
  // Update function to update a specific keyframe's opacity
  const updateKeyframeOpacity = (frame: number, newOpacity: number) => {
    const keyframeIndex = opacityKeyframes.findIndex((kf) => kf.frame === frame)

    if (keyframeIndex >= 0) {
      // Convert from percentage (0-100) to decimal (0-1)
      const normalizedOpacity = newOpacity / 100

      // Update the keyframe
      const updatedKeyframes = [...opacityKeyframes]
      updatedKeyframes[keyframeIndex].value = normalizedOpacity
      setOpacityKeyframes(updatedKeyframes)

      // Apply the change if we're at that keyframe
      if (currentFrame === frame) {
        setOpacityValue(normalizedOpacity)
        setLastInterpolatedOpacity(normalizedOpacity)
        handleStyleChange({ opacity: normalizedOpacity })
      } else {
        // Update the interpolated value at current frame
        const interpolatedValue = getInterpolatedOpacity(currentFrame || 0)
        setLastInterpolatedOpacity(interpolatedValue)
        handleStyleChange({ opacity: interpolatedValue })
      }

      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(updatedKeyframes)
      }
    }
  }
  
  // Remove a keyframe
  const removeKeyframe = (frame: number) => {
    // Don't remove if it would leave less than 2 keyframes
    if (opacityKeyframes.length <= 2) {
      return
    }

    const updatedKeyframes = opacityKeyframes.filter((kf) => kf.frame !== frame)
    
    // Update local state
    setOpacityKeyframes(updatedKeyframes)
    
    // Update overlay
    handleStyleChange({
      keyframes: [...updatedKeyframes]
    } as any)
    
    // Notify parent if needed
    if (onKeyframeChange) {
      onKeyframeChange(updatedKeyframes)
    }
    
    // If the current frame had a keyframe, update the interpolated opacity
    if (currentFrame === frame) {
      const interpolatedValue = getInterpolatedOpacity(currentFrame)
      setLastInterpolatedOpacity(interpolatedValue)
      handleStyleChange({ opacity: interpolatedValue })
    }
  }
  
  // Update keyframe position (frame) when dragged
  const updateKeyframePosition = (originalFrame: number, newFrame: number) => {
    if (newFrame < 0 || newFrame > localOverlay.durationInFrames) return
    
    const keyframeIndex = opacityKeyframes.findIndex(kf => kf.frame === originalFrame)
    if (keyframeIndex >= 0) {
      // Check if there's already a keyframe at the target position
      const existingKeyframeAtTarget = opacityKeyframes.find(kf => kf.frame === newFrame && kf.frame !== originalFrame)
      if (existingKeyframeAtTarget) {
        // If there's a keyframe at the target, don't move
        return
      }
      
      // Create updated keyframes with the moved keyframe
      const updatedKeyframes = [...opacityKeyframes]
      updatedKeyframes[keyframeIndex] = {
        ...updatedKeyframes[keyframeIndex],
        frame: newFrame
      }
      
      // Update keyframes
      setOpacityKeyframes(updatedKeyframes)
      
      // Notify parent component
      if (onKeyframeChange) {
        onKeyframeChange(updatedKeyframes)
      }
    }
  }

  // Initialize keyframes on first load or when interpolation is enabled
  useEffect(() => {
    if (useFrameInterpolation && opacityKeyframes.length === 0) {
      // If overlay has keyframes, use them
      if (localOverlay.keyframes && localOverlay.keyframes.length >= 2) {
        setOpacityKeyframes([...localOverlay.keyframes])
      } else {
        // Create default keyframes if none exist
        setOpacityKeyframes([
          { frame: 0, value: opacityValue, id: generateKeyframeId() }, // First frame
          { frame: localOverlay.durationInFrames, value: opacityValue, id: generateKeyframeId() }, // Last frame
        ])
      }
    }
  }, [useFrameInterpolation])

  // Save keyframes to overlay when they change
  useEffect(() => {
    if (useFrameInterpolation && opacityKeyframes.length >= 2) {
      // Update overlay with keyframes
      handleStyleChange({
        keyframes: [...opacityKeyframes]
      } as any) // Type cast needed due to keyframes being added to styles
    }
  }, [opacityKeyframes, useFrameInterpolation])

  // Update interpolated opacity when current frame or keyframes change
  useEffect(() => {
    if (useFrameInterpolation && currentFrame !== undefined && opacityKeyframes.length >= 2) {
      const interpolatedValue = getInterpolatedOpacity(currentFrame)

      // Only update if the value has changed significantly
      if (Math.abs(interpolatedValue - lastInterpolatedOpacity) > 0.01) {
        setLastInterpolatedOpacity(interpolatedValue)
        handleStyleChange({ opacity: interpolatedValue })
      }
    } else if (!useFrameInterpolation && lastInterpolatedOpacity !== opacityValue) {
      // If interpolation is turned off, reset to the base opacity
      setLastInterpolatedOpacity(opacityValue)
      handleStyleChange({ opacity: opacityValue })
    }
  }, [currentFrame, useFrameInterpolation, opacityKeyframes, opacityValue])

  // Sync with overlay on change
  useEffect(() => {
    // Only update opacity value from localOverlay if not using frame interpolation
    if (!useFrameInterpolation) {
      setOpacityValue(localOverlay.styles.opacity ?? 1)
    }
  }, [localOverlay.styles.opacity, useFrameInterpolation])

  // When frame interpolation is toggled on/off, update opacity accordingly
  useEffect(() => {
    if (useFrameInterpolation && currentFrame !== undefined) {
      // When turning on, immediately apply the interpolated value
      const interpolatedValue = getInterpolatedOpacity(currentFrame)
      setLastInterpolatedOpacity(interpolatedValue)
      handleStyleChange({ opacity: interpolatedValue })
    } else if (!useFrameInterpolation) {
      // When turning off, reset to the base opacity
      setLastInterpolatedOpacity(opacityValue)
      handleStyleChange({ opacity: opacityValue })
    }
  }, [useFrameInterpolation])

  // Opacity update handler
  const updateOpacity = (percent: number) => {
    const o = percent / 100
    setOpacityValue(o)

    // If frame interpolation is off, apply opacity directly
    if (!useFrameInterpolation) {
      setLastInterpolatedOpacity(o)
      handleStyleChange({ opacity: o })
    } else if (currentFrame !== undefined) {
      // If at a keyframe position, update that keyframe
      const keyframeIndex = opacityKeyframes.findIndex((kf) => kf.frame === currentFrame)
      if (keyframeIndex >= 0) {
        // Update the keyframe and apply the change
        const updatedKeyframes = [...opacityKeyframes]
        updatedKeyframes[keyframeIndex].value = o
        setOpacityKeyframes(updatedKeyframes)
      }

      // Apply the interpolated opacity value
      const interpolatedValue = getInterpolatedOpacity(currentFrame)
      setLastInterpolatedOpacity(interpolatedValue)
      handleStyleChange({ opacity: interpolatedValue })
    }
  }

  // Reset opacity
  const resetOpacity = () => updateOpacity(100)
  
  // Toggle curve preview visibility
  const toggleCurvePreview = () => {
    setShowCurvePreview(prev => !prev)
  }
  
  // Add keyboard shortcut handlers
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Skip if in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }
      
      if (useFrameInterpolation) {
        // Next keyframe: Right arrow
        if (e.key === 'ArrowRight' && e.altKey) {
          e.preventDefault()
          navigateToNextKeyframe()
        }
        
        // Previous keyframe: Left arrow
        if (e.key === 'ArrowLeft' && e.altKey) {
          e.preventDefault()
          navigateToPrevKeyframe()
        }
        
        // Add keyframe: K key
        if (e.key === 'k' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault()
          addKeyframeAtCurrentFrame()
        }
        
        // Delete active keyframe: Delete key
        if ((e.key === 'Delete' || e.key === 'Backspace') && activeKeyframe !== null) {
          e.preventDefault()
          removeKeyframe(activeKeyframe)
          setActiveKeyframe(null)
        }
      }
      
      // Toggle curve view: V key
      if (e.key === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        toggleCurvePreview()
      }
    }
    
    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [useFrameInterpolation, activeKeyframe, currentFrame, opacityKeyframes])

  // Select a keyframe as active
  const selectKeyframe = (frame: number) => {
    setActiveKeyframe(frame)
    
    // Find this keyframe in the list
    const keyframe = opacityKeyframes.find(kf => kf.frame === frame)
    if (keyframe && currentFrame !== undefined) {
      // Navigate to this keyframe
      navigateToRelativeFrame(frame)
      
      // Set the opacity value to match this keyframe
      const newOpacity = keyframe.value * 100
      updateOpacity(newOpacity)
    }
  }
  
  // Edit a keyframe's value directly
  const editKeyframeValue = (frame: number, newValue: number) => {
    const normalizedValue = Math.max(0, Math.min(100, newValue)) / 100
    updateKeyframeOpacity(frame, normalizedValue * 100)
  }
  
  // Frame navigation function
  const navigateToRelativeFrame = (frameOffset: number) => {
    // Calculate the new position in global timeline coordinates
    const targetFrame = localOverlay.from + frameOffset
    
    // This would typically update the global timeline position
    console.log(`Navigate to frame: ${targetFrame} (${frameOffset} in clip)`)
    
    // For demo purposes, we can just log this
    // In a real implementation, this would update the player's current frame
  }
  
  // Jump to next or previous keyframe
  const navigateToNextKeyframe = () => {
    if (!useFrameInterpolation || opacityKeyframes.length < 2 || currentFrame === undefined) return
    
    // Convert current position to relative frame
    const relativeFrame = currentFrame - localOverlay.from
    
    // Find the next keyframe after current position
    const sortedFrames = [...opacityKeyframes].sort((a, b) => a.frame - b.frame)
    const nextKeyframe = sortedFrames.find(kf => kf.frame > relativeFrame)
    
    if (nextKeyframe) {
      navigateToRelativeFrame(nextKeyframe.frame)
      setActiveKeyframe(nextKeyframe.frame)
    }
  }

  const navigateToPrevKeyframe = () => {
    if (!useFrameInterpolation || opacityKeyframes.length < 2 || currentFrame === undefined) return
    
    // Convert current position to relative frame
    const relativeFrame = currentFrame - localOverlay.from
    
    // Find the previous keyframe before current position
    const sortedFrames = [...opacityKeyframes].sort((a, b) => a.frame - b.frame)
    const prevKeyframes = sortedFrames.filter(kf => kf.frame < relativeFrame)
    
    if (prevKeyframes.length > 0) {
      const prevKeyframe = prevKeyframes[prevKeyframes.length - 1]
      navigateToRelativeFrame(prevKeyframe.frame)
      setActiveKeyframe(prevKeyframe.frame)
    }
  }
  
  // Check if current frame has a keyframe
  const hasKeyframeAtCurrentFrame =
    currentFrame !== undefined && opacityKeyframes.some((kf) => kf.frame === (currentFrame - localOverlay.from))
  
  // Function wrapper
  const addKeyframeAtCurrentTime = () => {
    addKeyframeAtCurrentFrame()
  }
  
  // Sort keyframes for display
  const sortedKeyframes = [...opacityKeyframes].sort((a, b) => a.frame - b.frame)

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black shadow-sm overflow-hidden">
      <div 
        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {expanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} />}
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-800">
            <OpacityIcon size={10} className="text-gray-700 dark:text-gray-300" />
          </div>
          <span>Opacity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded min-w-[50px] text-center">
            {(opacityValue * 100).toFixed(0)}%
            {useFrameInterpolation && <span className="text-gray-500 text-[8px] ml-0.5">*</span>}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                onClick={(e) => {
                  e.stopPropagation()
                  resetOpacity()
                }}
              >
                <RotateCcw size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Reset opacity</TooltipContent>
          </Tooltip>
        </div>
      </div>
      {expanded && (
        <div className="p-3 space-y-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
            <span>Transparency</span>
            <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {(opacityValue * 100).toFixed(0)}%
              {useFrameInterpolation && currentFrame !== undefined && (
                <span className="text-gray-500 text-[8px] ml-0.5">
                  → {(getInterpolatedOpacity(currentFrame) * 100).toFixed(0)}%
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="h-6 w-6 bg-white dark:bg-gray-900"
                  onClick={() => updateOpacity(Math.max(0, opacityValue * 100 - 5))}
                >
                  <Minus size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Decrease opacity</TooltipContent>
            </Tooltip>
            <Slider
              value={[opacityValue * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={(v) => updateOpacity(v[0])}
              className="flex-1"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="h-6 w-6 bg-white dark:bg-gray-900"
                  onClick={() => updateOpacity(Math.min(100, opacityValue * 100 + 5))}
                >
                  <Plus size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Increase opacity</TooltipContent>
            </Tooltip>
          </div>

          <Separator className="my-2" />

          <div className="grid grid-cols-3 gap-1.5">
            {[25, 50, 100].map((p) => (
              <Tooltip key={p}>
                <TooltipTrigger asChild>
                  <Button
                    variant={Math.abs(opacityValue * 100 - p) < 1 ? "default" : "outline"} 
                    className={cn(
                      "bg-white dark:bg-gray-900 text-xs h-7",
                      Math.abs(opacityValue * 100 - p) < 1 && "bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
                    )}
                    onClick={() => updateOpacity(p)}
                  >
                    {p}%
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{p === 100 ? "Fully visible" : `${p}% opacity`}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Keyframe animation toggle */}
          {totalFrames > 0 && (
            <>
              <Separator className="my-2" />
              
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-medium">Keyframe Animation</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    Animate opacity over time
                  </span>
                </div>
                <Button
                  variant={useFrameInterpolation ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseFrameInterpolation(!useFrameInterpolation)}
                  className="gap-1 h-7 text-xs"
                >
                  {useFrameInterpolation ? (
                    <>
                      <Clock size={12} className="text-white" /> Enabled
                    </>
                  ) : (
                    <>
                      <Clock size={12} /> Enable
                    </>
                  )}
                </Button>
              </div>

              {useFrameInterpolation && (
                <>
                  <Separator className="my-2" />

                  {/* Timeline UI and keyframe editing */}
                  <OpacityKeyframeTimeline
                    localOverlay={localOverlay}
                    currentFrame={currentFrame}
                    opacityKeyframes={opacityKeyframes}
                    activeKeyframe={activeKeyframe}
                    useFrameInterpolation={useFrameInterpolation}
                    showCurvePreview={showCurvePreview}
                    draggedKeyframeFrame={draggedKeyframeFrame}
                    dragPreviewValue={dragPreviewValue}
                    dragStartX={dragStartX}
                    opacityValue={opacityValue}
                    hasKeyframeAtCurrentFrame={hasKeyframeAtCurrentFrame}
                    getInterpolatedOpacity={getInterpolatedOpacity}
                    toggleCurvePreview={toggleCurvePreview}
                    addKeyframeAtCurrentTime={addKeyframeAtCurrentTime}
                    selectKeyframe={selectKeyframe}
                    updateKeyframePosition={updateKeyframePosition}
                    removeKeyframe={removeKeyframe}
                    navigateToNextKeyframe={navigateToNextKeyframe}
                    navigateToPrevKeyframe={navigateToPrevKeyframe}
                    navigateToRelativeFrame={navigateToRelativeFrame}
                    updateOpacity={updateOpacity}
                    setActiveKeyframe={setActiveKeyframe}
                    updateKeyframeOpacity={updateKeyframeOpacity}
                    editKeyframeValue={editKeyframeValue}
                    setDraggedKeyframeFrame={setDraggedKeyframeFrame}
                    setDragStartX={setDragStartX}
                    setDragPreviewValue={setDragPreviewValue}
                    sortedKeyframes={sortedKeyframes}
                  />
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
} 