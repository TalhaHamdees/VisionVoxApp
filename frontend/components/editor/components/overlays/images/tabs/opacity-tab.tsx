"use client"

import React, { useState, useEffect, useMemo } from "react"
import { ImageOffIcon as OpacityIcon, RotateCcw, ChevronRight, ChevronDown, Clock, Plus, X, Minus, RefreshCw, Trash2, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ImageOverlay } from "../../../../types"
import { TabBaseProps, OpacityKeyframe, generateKeyframeId, generateKeyframeWithOverlayId, formatters } from "../image-transform-types"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { KeyframeTimeline } from "./keyframe-timeline"

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
  const [showCurvePreview, setShowCurvePreview] = useState<boolean>(false)

  // Sort keyframes by frame number for display
  const sortedKeyframes = useMemo(() => {
    return [...opacityKeyframes].sort((a, b) => a.frame - b.frame)
  }, [opacityKeyframes])

  // Check if there's a keyframe at the current frame
  const hasKeyframeAtCurrentFrame = useMemo(() => {
    if (currentFrame === undefined) return false
    const relativeFrame = currentFrame - localOverlay.from
    return opacityKeyframes.some(kf => kf.frame === relativeFrame)
  }, [currentFrame, localOverlay.from, opacityKeyframes])

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

  // Add a keyframe at the current time
  const addKeyframeAtCurrentTime = () => {
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
      // Add new keyframe with ID tied to this overlay
      const newKeyframe = {
        frame: relativeFrame,
        value: opacityValue,
        id: generateKeyframeWithOverlayId(localOverlay.uniqueId),
        overlayUniqueId: localOverlay.uniqueId,
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

  // Update opacity and handle keyframe updates
  const updateOpacity = (value: number) => {
    setOpacityValue(value)
    
    // If there's a keyframe at the current time, update it
    if (hasKeyframeAtCurrentFrame && currentFrame !== undefined) {
      const relativeFrame = currentFrame - localOverlay.from
      updateKeyframeOpacity(relativeFrame, value)
    } else {
      // Otherwise, just update the style
      setLastInterpolatedOpacity(value)
      handleStyleChange({ opacity: value })
    }
  }

  // Update the value of a specific keyframe
  const updateKeyframeOpacity = (frame: number, value: number) => {
    const updatedKeyframes = opacityKeyframes.map(kf => 
      kf.frame === frame ? { ...kf, value } : kf
    )
    
    setOpacityKeyframes(updatedKeyframes)
    
    // Notify parent if needed
    if (onKeyframeChange) {
      onKeyframeChange(updatedKeyframes)
    }
    
    // Update the local opacity value
    setOpacityValue(value)
    setLastInterpolatedOpacity(value)
    handleStyleChange({ opacity: value })
  }

  // Edit a keyframe value directly
  const editKeyframeValue = (frame: number, newValue: number) => {
    // Ensure value is within valid range (0-100%)
    const clampedValue = Math.max(0, Math.min(1, newValue / 100))
    
    // Update the keyframe
    updateKeyframeOpacity(frame, clampedValue)
  }

  // Select a keyframe to highlight it
  const selectKeyframe = (frame: number) => {
    setActiveKeyframe(frame)
    
    // Find the keyframe
    const keyframe = opacityKeyframes.find(kf => kf.frame === frame)
    if (keyframe) {
      // Update the local opacity value to match the keyframe
      setOpacityValue(keyframe.value)
      setLastInterpolatedOpacity(keyframe.value)
      handleStyleChange({ opacity: keyframe.value })
      
      // Move playhead to this frame
      navigateToRelativeFrame(frame)
    }
  }

  // Remove a keyframe at a specific frame
  const removeKeyframe = (frame: number) => {
    const updatedKeyframes = opacityKeyframes.filter(kf => kf.frame !== frame)
    setOpacityKeyframes(updatedKeyframes)
    
    // Clear active keyframe if it was the one removed
    if (activeKeyframe === frame) {
      setActiveKeyframe(null)
    }
    
    // Notify parent if needed
    if (onKeyframeChange) {
      onKeyframeChange(updatedKeyframes)
    }
  }

  // Move a keyframe from one frame to another
  const updateKeyframePosition = (oldFrame: number, newFrame: number) => {
    // Check if there's already a keyframe at the new position
    const existingKeyframeAtTarget = opacityKeyframes.find(kf => kf.frame === newFrame)
    
    if (existingKeyframeAtTarget && oldFrame !== newFrame) {
      // If there's already a keyframe at the target position, we need to handle conflict
      // For now, we'll just overwrite the target keyframe
      const keyframeToMove = opacityKeyframes.find(kf => kf.frame === oldFrame)
      if (!keyframeToMove) return
      
      const updatedKeyframes = opacityKeyframes
        .filter(kf => kf.frame !== oldFrame && kf.frame !== newFrame)
        .concat([{ ...keyframeToMove, frame: newFrame }])
      
      setOpacityKeyframes(updatedKeyframes)
      setActiveKeyframe(newFrame)
      
      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(updatedKeyframes)
      }
    } else {
      // If there's no keyframe at the target position, just move it
      const updatedKeyframes = opacityKeyframes.map(kf => 
        kf.frame === oldFrame ? { ...kf, frame: newFrame } : kf
      )
      
      setOpacityKeyframes(updatedKeyframes)
      setActiveKeyframe(newFrame)
      
      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(updatedKeyframes)
      }
    }
  }

  // Navigation between keyframes
  const navigateToRelativeFrame = (frame: number) => {
    if (currentFrame === undefined) return
    
    // Convert relative frame to global frame
    const globalFrame = localOverlay.from + frame
    
    // Update the parent component's current frame
    if (onKeyframeChange) {
      // This is a simplification - you'd need to implement a proper callback
      // to update the player position in your actual application
      // For example: props.onSeek(globalFrame)
      console.log('Navigate to frame:', globalFrame)
    }
  }

  // Navigate to the next keyframe
  const navigateToNextKeyframe = () => {
    if (opacityKeyframes.length === 0) return
    
    // Sort keyframes by frame position
    const sortedFrames = [...opacityKeyframes].sort((a, b) => a.frame - b.frame).map(kf => kf.frame)
    
    if (activeKeyframe === null) {
      // If no keyframe is active, go to the first one
      const firstKeyframe = sortedFrames[0]
      navigateToRelativeFrame(firstKeyframe)
      setActiveKeyframe(firstKeyframe)
      return
    }
    
    // Find the index of the active keyframe
    const currentIndex = sortedFrames.indexOf(activeKeyframe)
    
    if (currentIndex === -1) {
      // Active keyframe not found in list, go to first
      const firstKeyframe = sortedFrames[0]
      navigateToRelativeFrame(firstKeyframe)
      setActiveKeyframe(firstKeyframe)
    } else if (currentIndex < sortedFrames.length - 1) {
      // Go to next keyframe
      const nextKeyframe = sortedFrames[currentIndex + 1]
      navigateToRelativeFrame(nextKeyframe)
      setActiveKeyframe(nextKeyframe)
    } else {
      // At last keyframe, loop to first
      const firstKeyframe = sortedFrames[0]
      navigateToRelativeFrame(firstKeyframe)
      setActiveKeyframe(firstKeyframe)
    }
  }

  // Navigate to the previous keyframe
  const navigateToPrevKeyframe = () => {
    if (opacityKeyframes.length === 0) return
    
    // Sort keyframes by frame position
    const sortedFrames = [...opacityKeyframes].sort((a, b) => a.frame - b.frame).map(kf => kf.frame)
    
    if (activeKeyframe === null) {
      // If no keyframe is active, go to the last one
      const lastKeyframe = sortedFrames[sortedFrames.length - 1]
      navigateToRelativeFrame(lastKeyframe)
      setActiveKeyframe(lastKeyframe)
      return
    }
    
    // Find the index of the active keyframe
    const currentIndex = sortedFrames.indexOf(activeKeyframe)
    
    if (currentIndex === -1) {
      // Active keyframe not found in list, go to last
      const lastKeyframe = sortedFrames[sortedFrames.length - 1]
      navigateToRelativeFrame(lastKeyframe)
      setActiveKeyframe(lastKeyframe)
    } else if (currentIndex > 0) {
      // Go to previous keyframe
      const prevKeyframe = sortedFrames[currentIndex - 1]
      navigateToRelativeFrame(prevKeyframe)
      setActiveKeyframe(prevKeyframe)
    } else {
      // At first keyframe, loop to last
      const lastKeyframe = sortedFrames[sortedFrames.length - 1]
      navigateToRelativeFrame(lastKeyframe)
      setActiveKeyframe(lastKeyframe)
    }
  }

  // Toggle curve preview
  const toggleCurvePreview = () => {
    setShowCurvePreview(!showCurvePreview)
  }

  // Generate curve visualization points
  const generateCurvePoints = () => {
    if (opacityKeyframes.length < 2) return ''
    
    const sortedFrames = [...opacityKeyframes].sort((a, b) => a.frame - b.frame)
    
    // Generate path for the curve visualization
    return sortedFrames.map(kf => {
      // Convert frame to X position (0-100) and opacity to Y position (0-100, inverted)
      const x = (kf.frame / localOverlay.durationInFrames) * 100
      const y = (1 - kf.value) * 100 // Inverted so 0 opacity is at bottom
      return `${x},${y}`
    }).join(' ')
  }

  // Get interpolated opacity at any frame
  const getInterpolatedOpacity = (frame: number) => {
    if (opacityKeyframes.length === 0) return opacityValue
    if (opacityKeyframes.length === 1) return opacityKeyframes[0].value
    
    // Get sorted keyframes
    const sortedFrames = [...opacityKeyframes].sort((a, b) => a.frame - b.frame)
    
    // Check if before first keyframe or after last keyframe
    if (frame <= sortedFrames[0].frame) return sortedFrames[0].value
    if (frame >= sortedFrames[sortedFrames.length - 1].frame) return sortedFrames[sortedFrames.length - 1].value
    
    // Find the two keyframes to interpolate between
    for (let i = 0; i < sortedFrames.length - 1; i++) {
      if (frame >= sortedFrames[i].frame && frame <= sortedFrames[i + 1].frame) {
        // Linear interpolation between keyframes
        const t = (frame - sortedFrames[i].frame) / (sortedFrames[i + 1].frame - sortedFrames[i].frame)
        return sortedFrames[i].value + t * (sortedFrames[i + 1].value - sortedFrames[i].value)
      }
    }
    
    // Fallback
    return opacityValue
  }

  // Effect to update opacity when current frame changes (for keyframe interpolation)
  useEffect(() => {
    if (!useFrameInterpolation || currentFrame === undefined || opacityKeyframes.length < 2) return
    
    // Convert to relative frame
    const relativeFrame = currentFrame - localOverlay.from
    
    // Get interpolated opacity for the current frame
    const interpolatedOpacity = getInterpolatedOpacity(relativeFrame)
    
    // Only update if it has changed significantly (to avoid too many updates)
    if (Math.abs(interpolatedOpacity - lastInterpolatedOpacity) > 0.001) {
      setOpacityValue(interpolatedOpacity)
      setLastInterpolatedOpacity(interpolatedOpacity)
      handleStyleChange({ opacity: interpolatedOpacity })
    }
  }, [currentFrame, useFrameInterpolation, opacityKeyframes, lastInterpolatedOpacity, localOverlay.from])

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium">
        <div className="flex items-center gap-2">
          <ChevronRight 
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              expanded ? "rotate-90" : ""
            )} 
          />
          <span>Opacity</span>
        </div>
        <div className="mr-2 text-xs text-muted-foreground">
          {Math.round(opacityValue * 100)}%
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pb-2 pt-1">
        <div className="space-y-4">
          {/* Animation settings */}
          <div className="flex items-center justify-between px-2">
            <Label htmlFor="enable-keyframes" className="text-xs font-normal cursor-pointer">
              Enable keyframe animation
            </Label>
            <Switch
              id="enable-keyframes"
              checked={useFrameInterpolation}
              onCheckedChange={setUseFrameInterpolation}
            />
          </div>
          
          {/* Only show regular opacity slider when keyframing is disabled */}
          {!useFrameInterpolation && (
            <div className="flex items-start justify-between">
              <Label htmlFor="opacity" className="text-xs font-normal text-muted-foreground w-16 mt-1.5">
                Opacity
              </Label>
              <div className="flex-1 space-y-1">
                <div className="flex items-center">
                  <Slider
                    id="opacity"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[opacityValue]}
                    onValueChange={([value]) => updateOpacity(value)}
                    aria-label="Opacity"
                    className="mr-3"
                  />
                  <span className="w-9 text-xs tabular-nums text-muted-foreground">
                    {Math.round(opacityValue * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Show keyframe controls when animation is enabled */}
          {useFrameInterpolation && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Current Value</span>
                  <span className="text-xs font-medium">{Math.round(opacityValue * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={addKeyframeAtCurrentTime}
                    disabled={currentFrame < localOverlay.from || currentFrame >= localOverlay.from + localOverlay.durationInFrames}
                  >
                    {hasKeyframeAtCurrentFrame ? "Update Keyframe" : "Add Keyframe"}
                  </Button>
                </div>
              </div>
              
              <KeyframeTimeline
                overlayFrom={localOverlay.from}
                durationInFrames={localOverlay.durationInFrames}
                currentFrame={currentFrame}
                keyframes={opacityKeyframes}
                activeKeyframe={activeKeyframe}
                useFrameInterpolation={useFrameInterpolation}
                showCurvePreview={showCurvePreview}
                draggedKeyframeFrame={draggedKeyframeFrame}
                dragPreviewValue={dragPreviewValue}
                dragStartX={dragStartX}
                propertyValue={opacityValue}
                hasKeyframeAtCurrentFrame={hasKeyframeAtCurrentFrame}
                propertyLabel="Opacity"
                valueFormatter={formatters.opacity}
                curveColor="yellow"
                getInterpolatedValue={getInterpolatedOpacity}
                generateCurvePoints={generateCurvePoints}
                toggleCurvePreview={toggleCurvePreview}
                addKeyframeAtCurrentTime={addKeyframeAtCurrentTime}
                selectKeyframe={selectKeyframe}
                updateKeyframePosition={updateKeyframePosition}
                removeKeyframe={removeKeyframe}
                navigateToNextKeyframe={navigateToNextKeyframe}
                navigateToPrevKeyframe={navigateToPrevKeyframe}
                navigateToRelativeFrame={navigateToRelativeFrame}
                updatePropertyValue={updateOpacity}
                setActiveKeyframe={setActiveKeyframe}
                updateKeyframeValue={updateKeyframeOpacity}
                editKeyframeValue={editKeyframeValue}
                setDraggedKeyframeFrame={setDraggedKeyframeFrame}
                setDragStartX={setDragStartX}
                setDragPreviewValue={setDragPreviewValue}
                localOverlay={localOverlay}
              />
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
} 