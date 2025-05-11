"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ImageOverlay } from "../../../../types"
import { PositionKeyframe, generateKeyframeId, formatters, generateKeyframeWithOverlayId } from "../image-transform-types"
import { KeyframeTimeline } from "./keyframe-timeline"
import { Button } from "@/components/ui/button"

export interface PositionTabProps {
  localOverlay: ImageOverlay
  handlePositionChange: (updates: Partial<Pick<ImageOverlay, "left" | "top">>) => void
  expanded: boolean
  setExpanded: (expanded: boolean) => void
  totalFrames?: number
  currentFrame?: number
  onKeyframeChange?: (keyframes: PositionKeyframe[]) => void
}

export const PositionTab: React.FC<PositionTabProps> = ({
  localOverlay,
  handlePositionChange,
  expanded,
  setExpanded,
  totalFrames = 0,
  currentFrame = 0,
  onKeyframeChange,
}) => {
  // Position state
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: localOverlay.left ?? 0,
    y: localOverlay.top ?? 0,
  })
  
  // Frame interpolation settings for position
  const [useFrameInterpolation, setUseFrameInterpolation] = useState<boolean>(false)
  
  // Store keyframes for position
  const [positionKeyframes, setPositionKeyframes] = useState<PositionKeyframe[]>([])
  
  // Keep track of the last interpolated position to avoid unnecessary updates
  const [lastInterpolatedPosition, setLastInterpolatedPosition] = useState<{ x: number; y: number }>(position)
  
  // Handle dragging keyframes in timeline
  const [draggedKeyframeFrame, setDraggedKeyframeFrame] = useState<number | null>(null)
  const [dragStartX, setDragStartX] = useState<number>(0)
  const [activeKeyframe, setActiveKeyframe] = useState<number | null>(null)
  const [dragPreviewValue, setDragPreviewValue] = useState<{ x: number; y: number } | null>(null)
  
  // Add additional states for keyframe interaction
  const [showCurvePreview, setShowCurvePreview] = useState<boolean>(false)

  // Sort keyframes by frame number for display
  const sortedKeyframes = useMemo(() => {
    return [...positionKeyframes].sort((a, b) => a.frame - b.frame)
  }, [positionKeyframes])

  // Check if there's a keyframe at the current frame
  const hasKeyframeAtCurrentFrame = useMemo(() => {
    if (currentFrame === undefined) return false
    const relativeFrame = currentFrame - localOverlay.from
    return positionKeyframes.some(kf => kf.frame === relativeFrame)
  }, [currentFrame, localOverlay.from, positionKeyframes])

  // Add a keyframe at the current time
  const addKeyframeAtCurrentTime = () => {
    if (currentFrame === undefined) return

    // Convert global timeline frame to local overlay frame
    const relativeFrame = currentFrame - localOverlay.from
    
    // Don't add keyframe if outside overlay bounds
    if (relativeFrame < 0 || relativeFrame > localOverlay.durationInFrames) return

    // Check if a keyframe already exists at this position
    const existingKeyframeIndex = positionKeyframes.findIndex((kf) => kf.frame === relativeFrame)

    if (existingKeyframeIndex >= 0) {
      // Update existing keyframe
      const updatedKeyframes = [...positionKeyframes]
      updatedKeyframes[existingKeyframeIndex].value = { ...position }
      setPositionKeyframes(updatedKeyframes)

      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(updatedKeyframes)
      }
    } else {
      // Add new keyframe with ID tied to this overlay
      const newKeyframe = {
        frame: relativeFrame,
        value: { ...position },
        id: generateKeyframeWithOverlayId(localOverlay.uniqueId),
        overlayUniqueId: localOverlay.uniqueId, // Store overlay association
      }

      const newKeyframes = [...positionKeyframes, newKeyframe]
      setPositionKeyframes(newKeyframes)

      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(newKeyframes)
      }
    }

    // Apply the current position immediately
    setLastInterpolatedPosition({ ...position })
    handlePositionChange({ left: position.x, top: position.y })
  }

  // Update position and handle keyframe updates
  const updatePosition = (newPosition: { x: number; y: number }) => {
    setPosition(newPosition)
    
    // If there's a keyframe at the current time, update it
    if (hasKeyframeAtCurrentFrame && currentFrame !== undefined) {
      const relativeFrame = currentFrame - localOverlay.from
      updateKeyframeValue(relativeFrame, newPosition)
    } else {
      // Otherwise, just update the style
      setLastInterpolatedPosition(newPosition)
      handlePositionChange({ left: newPosition.x, top: newPosition.y })
    }
  }

  // Update position X coordinate
  const updateX = (x: number) => {
    updatePosition({ ...position, x })
  }

  // Update position Y coordinate
  const updateY = (y: number) => {
    updatePosition({ ...position, y })
  }

  // Update the value of a specific keyframe
  const updateKeyframeValue = (frame: number, value: { x: number; y: number }) => {
    const updatedKeyframes = positionKeyframes.map(kf => 
      kf.frame === frame ? { ...kf, value } : kf
    )
    
    setPositionKeyframes(updatedKeyframes)
    
    // Notify parent if needed
    if (onKeyframeChange) {
      onKeyframeChange(updatedKeyframes)
    }
    
    // Update the local position value
    setPosition(value)
    setLastInterpolatedPosition(value)
    handlePositionChange({ left: value.x, top: value.y })
  }

  // Edit a keyframe value directly
  const editKeyframeValue = (frame: number, newValue: number | { x: number; y: number }) => {
    const keyframe = positionKeyframes.find(kf => kf.frame === frame)
    if (!keyframe) return
    
    // If we received a direct object value, use it
    if (typeof newValue !== 'number' && newValue !== null) {
      updateKeyframeValue(frame, newValue)
      return
    }
    
    // Otherwise, let's show proper UI for X and Y coordinates
    const xValueInput = prompt(`Enter X position value:`, keyframe.value.x.toString())
    if (xValueInput === null) return // User cancelled
    
    const parsedX = parseFloat(xValueInput)
    if (isNaN(parsedX)) return // Invalid input
    
    const yValueInput = prompt(`Enter Y position value:`, keyframe.value.y.toString())
    if (yValueInput === null) return // User cancelled
    
    const parsedY = parseFloat(yValueInput)
    if (isNaN(parsedY)) return // Invalid input
    
    // Update with both values
    updateKeyframeValue(frame, { 
      x: parsedX, 
      y: parsedY 
    })
  }

  // Select a keyframe to highlight it
  const selectKeyframe = (frame: number) => {
    setActiveKeyframe(frame)
    
    // Find the keyframe
    const keyframe = positionKeyframes.find(kf => kf.frame === frame)
    if (keyframe) {
      // Update the local position value to match the keyframe
      setPosition(keyframe.value)
      setLastInterpolatedPosition(keyframe.value)
      handlePositionChange({ left: keyframe.value.x, top: keyframe.value.y })
      
      // Move playhead to this frame
      navigateToRelativeFrame(frame)
    }
  }

  // Remove a keyframe at a specific frame
  const removeKeyframe = (frame: number) => {
    const updatedKeyframes = positionKeyframes.filter(kf => kf.frame !== frame)
    setPositionKeyframes(updatedKeyframes)
    
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
    const existingKeyframeAtTarget = positionKeyframes.find(kf => kf.frame === newFrame)
    
    if (existingKeyframeAtTarget && oldFrame !== newFrame) {
      // If there's already a keyframe at the target position, we need to handle conflict
      // For now, we'll just overwrite the target keyframe
      const keyframeToMove = positionKeyframes.find(kf => kf.frame === oldFrame)
      if (!keyframeToMove) return
      
      const updatedKeyframes = positionKeyframes
        .filter(kf => kf.frame !== oldFrame && kf.frame !== newFrame)
        .concat([{ ...keyframeToMove, frame: newFrame }])
      
      setPositionKeyframes(updatedKeyframes)
      setActiveKeyframe(newFrame)
      
      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(updatedKeyframes)
      }
    } else {
      // If there's no keyframe at the target position, just move it
      const updatedKeyframes = positionKeyframes.map(kf => 
        kf.frame === oldFrame ? { ...kf, frame: newFrame } : kf
      )
      
      setPositionKeyframes(updatedKeyframes)
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
    if (positionKeyframes.length === 0) return
    
    // Sort keyframes by frame position
    const sortedFrames = [...positionKeyframes].sort((a, b) => a.frame - b.frame).map(kf => kf.frame)
    
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
    if (positionKeyframes.length === 0) return
    
    // Sort keyframes by frame position
    const sortedFrames = [...positionKeyframes].sort((a, b) => a.frame - b.frame).map(kf => kf.frame)
    
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
    if (positionKeyframes.length < 2) return ''
    
    const sortedFrames = [...positionKeyframes].sort((a, b) => a.frame - b.frame)
    
    // Function to interpolate between points for smoother curves
    const interpolatePoints = (p1: { frame: number, x: number, y: number }, 
                              p2: { frame: number, x: number, y: number }, 
                              numPoints: number) => {
      const points = []
      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints
        const frame = p1.frame + t * (p2.frame - p1.frame)
        const framePercent = (frame / localOverlay.durationInFrames) * 100
        
        // Smooth easing function for natural movement
        const smoothT = t * t * (3 - 2 * t) // Smoothstep interpolation
        const x = p1.x + smoothT * (p2.x - p1.x)
        
        // Scale x position to curve visualization range
        const maxPosition = 1000
        const yPos = 100 - ((x + maxPosition) / (maxPosition * 2)) * 100
        
        points.push(`${framePercent},${yPos}`)
      }
      return points
    }
    
    // Create smooth curve with interpolated points
    let allPoints: string[] = []
    
    for (let i = 0; i < sortedFrames.length - 1; i++) {
      const current = sortedFrames[i]
      const next = sortedFrames[i + 1]
      
      // Calculate how many interpolation points based on frame distance
      const frameDist = next.frame - current.frame
      const numInterpPoints = Math.max(4, Math.min(16, Math.floor(frameDist / 2)))
      
      // Only add the first point if we're at the beginning, otherwise it would be duplicated
      if (i === 0) {
        const x = (current.frame / localOverlay.durationInFrames) * 100
        const maxPosition = 1000
        const y = 100 - ((current.value.x + maxPosition) / (maxPosition * 2)) * 100
        allPoints.push(`${x},${y}`)
      }
      
      // Add interpolated points between keyframes
      const interpPoints = interpolatePoints(
        { frame: current.frame, x: current.value.x, y: current.value.y },
        { frame: next.frame, x: next.value.x, y: next.value.y },
        numInterpPoints
      )
      
      // Skip the first interpolated point as it's the same as the current frame
      allPoints = allPoints.concat(interpPoints.slice(1))
    }
    
    return allPoints.join(' ')
  }

  // Get interpolated position at any frame
  const getInterpolatedPosition = (frame: number) => {
    if (positionKeyframes.length === 0) return position
    if (positionKeyframes.length === 1) return positionKeyframes[0].value
    
    // Get sorted keyframes
    const sortedFrames = [...positionKeyframes].sort((a, b) => a.frame - b.frame)
    
    // Check if before first keyframe or after last keyframe
    if (frame <= sortedFrames[0].frame) return sortedFrames[0].value
    if (frame >= sortedFrames[sortedFrames.length - 1].frame) return sortedFrames[sortedFrames.length - 1].value
    
    // Find the two keyframes to interpolate between
    for (let i = 0; i < sortedFrames.length - 1; i++) {
      if (frame >= sortedFrames[i].frame && frame <= sortedFrames[i + 1].frame) {
        // Linear interpolation between keyframes
        const t = (frame - sortedFrames[i].frame) / (sortedFrames[i + 1].frame - sortedFrames[i].frame)
        return {
          x: sortedFrames[i].value.x + t * (sortedFrames[i + 1].value.x - sortedFrames[i].value.x),
          y: sortedFrames[i].value.y + t * (sortedFrames[i + 1].value.y - sortedFrames[i].value.y)
        }
      }
    }
    
    // Fallback
    return position
  }

  // Effect to update position when current frame changes (for keyframe interpolation)
  useEffect(() => {
    if (!useFrameInterpolation || currentFrame === undefined || positionKeyframes.length < 2) return
    
    // Convert to relative frame
    const relativeFrame = currentFrame - localOverlay.from
    
    // Get interpolated position for the current frame
    const interpolatedPosition = getInterpolatedPosition(relativeFrame)
    
    // Only update if it has changed significantly (to avoid too many updates)
    if (
      Math.abs(interpolatedPosition.x - lastInterpolatedPosition.x) > 0.5 ||
      Math.abs(interpolatedPosition.y - lastInterpolatedPosition.y) > 0.5
    ) {
      setPosition(interpolatedPosition)
      setLastInterpolatedPosition(interpolatedPosition)
      handlePositionChange({ left: interpolatedPosition.x, top: interpolatedPosition.y })
    }
  }, [currentFrame, useFrameInterpolation, positionKeyframes, lastInterpolatedPosition, localOverlay.from])

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
          <span>Position</span>
        </div>
        <div className="mr-2 text-xs text-muted-foreground">
          X: {Math.round(position.x)}px Y: {Math.round(position.y)}px
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pb-2 pt-1">
        <div className="space-y-4">
          {/* Animation settings */}
          <div className="flex items-center justify-between px-2">
            <Label htmlFor="enable-position-keyframes" className="text-xs font-normal cursor-pointer">
              Enable keyframe animation
            </Label>
            <Switch
              id="enable-position-keyframes"
              checked={useFrameInterpolation}
              onCheckedChange={setUseFrameInterpolation}
            />
          </div>
          
          {/* Only show regular position controls when keyframing is disabled */}
          {!useFrameInterpolation && (
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="position-x" className="text-xs font-normal text-muted-foreground w-8">
                  X
                </Label>
                <Slider
                  id="position-x"
                  min={-1000}
                  max={1000}
                  step={1}
                  value={[position.x]}
                  onValueChange={([value]) => updateX(value)}
                  aria-label="X Position"
                  className="flex-1 mx-2"
                />
                <Input
                  id="position-x-input"
                  type="number"
                  value={Math.round(position.x)}
                  onChange={(e) => updateX(Number(e.target.value))}
                  className="w-16 h-8 text-xs"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="position-y" className="text-xs font-normal text-muted-foreground w-8">
                  Y
                </Label>
                <Slider
                  id="position-y"
                  min={-1000}
                  max={1000}
                  step={1}
                  value={[position.y]}
                  onValueChange={([value]) => updateY(value)}
                  aria-label="Y Position"
                  className="flex-1 mx-2"
                />
                <Input
                  id="position-y-input"
                  type="number"
                  value={Math.round(position.y)}
                  onChange={(e) => updateY(Number(e.target.value))}
                  className="w-16 h-8 text-xs"
                />
              </div>
            </div>
          )}
          
          {/* Show keyframe controls when animation is enabled */}
          {useFrameInterpolation && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Current Position</span>
                  <span className="text-xs font-medium">X: {Math.round(position.x)}, Y: {Math.round(position.y)}</span>
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

              {/* Position controls for keyframe animation */}
              <div className="flex flex-col space-y-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Label htmlFor="position-kf-x" className="text-xs font-normal text-muted-foreground w-8">
                    X
                  </Label>
                  <Slider
                    id="position-kf-x"
                    min={-1000}
                    max={1000}
                    step={1}
                    value={[position.x]}
                    onValueChange={([value]) => updateX(value)}
                    aria-label="X Position"
                    className="flex-1 mx-2"
                  />
                  <Input
                    id="position-kf-x-input"
                    type="number"
                    value={Math.round(position.x)}
                    onChange={(e) => updateX(Number(e.target.value))}
                    className="w-16 h-7 text-xs"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="position-kf-y" className="text-xs font-normal text-muted-foreground w-8">
                    Y
                  </Label>
                  <Slider
                    id="position-kf-y"
                    min={-1000}
                    max={1000}
                    step={1}
                    value={[position.y]}
                    onValueChange={([value]) => updateY(value)}
                    aria-label="Y Position"
                    className="flex-1 mx-2"
                  />
                  <Input
                    id="position-kf-y-input"
                    type="number"
                    value={Math.round(position.y)}
                    onChange={(e) => updateY(Number(e.target.value))}
                    className="w-16 h-7 text-xs"
                  />
                </div>
              </div>
              
              {/* Use KeyframeTimeline for visual editing */}
              <KeyframeTimeline
                overlayFrom={localOverlay.from}
                durationInFrames={localOverlay.durationInFrames}
                currentFrame={currentFrame}
                keyframes={positionKeyframes}
                activeKeyframe={activeKeyframe}
                useFrameInterpolation={useFrameInterpolation}
                showCurvePreview={showCurvePreview}
                draggedKeyframeFrame={draggedKeyframeFrame}
                dragPreviewValue={dragPreviewValue}
                dragStartX={dragStartX}
                propertyValue={position}
                hasKeyframeAtCurrentFrame={hasKeyframeAtCurrentFrame}
                propertyLabel="Position"
                valueFormatter={(value) => `X: ${Math.round((value as any).x)}px, Y: ${Math.round((value as any).y)}px`}
                curveColor="green"
                getInterpolatedValue={getInterpolatedPosition}
                generateCurvePoints={generateCurvePoints}
                toggleCurvePreview={toggleCurvePreview}
                addKeyframeAtCurrentTime={addKeyframeAtCurrentTime}
                selectKeyframe={selectKeyframe}
                updateKeyframePosition={updateKeyframePosition}
                removeKeyframe={removeKeyframe}
                navigateToNextKeyframe={navigateToNextKeyframe}
                navigateToPrevKeyframe={navigateToPrevKeyframe}
                navigateToRelativeFrame={navigateToRelativeFrame}
                updatePropertyValue={(value) => {
                  const pos = value as any;
                  updatePosition({ x: pos.x, y: pos.y });
                }}
                setActiveKeyframe={setActiveKeyframe}
                updateKeyframeValue={updateKeyframeValue}
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