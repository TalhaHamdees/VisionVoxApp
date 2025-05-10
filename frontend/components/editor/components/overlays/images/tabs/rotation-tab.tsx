"use client"

import React, { useState, useEffect, useMemo } from "react"
import { RotateCw, RotateCcw, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { ImageOverlay } from "../../../../types"
import { TabBaseProps, RotationKeyframe, generateKeyframeId, formatters } from "../image-transform-types"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { KeyframeTimeline } from "./keyframe-timeline"

interface RotationTabProps extends TabBaseProps {
  localOverlay: ImageOverlay
  handlePositionChange: (updates: Partial<Pick<ImageOverlay, "left" | "top" | "rotation">>) => void
  totalFrames?: number
  currentFrame?: number
  onKeyframeChange?: (keyframes: RotationKeyframe[]) => void
}

export const RotationTab: React.FC<RotationTabProps> = ({
  localOverlay,
  handlePositionChange,
  expanded,
  setExpanded,
  totalFrames = 0,
  currentFrame = 0,
  onKeyframeChange,
}) => {
  // Local controlled state for rotation
  const [rotationValue, setRotationValue] = useState<number>(localOverlay.rotation || 0)
  
  // Frame interpolation settings for rotation
  const [useFrameInterpolation, setUseFrameInterpolation] = useState<boolean>(false)
  
  // Store keyframes for rotation
  const [rotationKeyframes, setRotationKeyframes] = useState<RotationKeyframe[]>([])
  
  // Keep track of the last interpolated rotation to avoid unnecessary updates
  const [lastInterpolatedRotation, setLastInterpolatedRotation] = useState<number>(rotationValue)
  
  // Handle dragging keyframes in timeline
  const [draggedKeyframeFrame, setDraggedKeyframeFrame] = useState<number | null>(null)
  const [dragStartX, setDragStartX] = useState<number>(0)
  const [activeKeyframe, setActiveKeyframe] = useState<number | null>(null)
  const [dragPreviewValue, setDragPreviewValue] = useState<number | null>(null)
  
  // Add additional states for keyframe interaction
  const [showCurvePreview, setShowCurvePreview] = useState<boolean>(false)

  // Sort keyframes by frame number for display
  const sortedKeyframes = useMemo(() => {
    return [...rotationKeyframes].sort((a, b) => a.frame - b.frame)
  }, [rotationKeyframes])

  // Check if there's a keyframe at the current frame
  const hasKeyframeAtCurrentFrame = useMemo(() => {
    if (currentFrame === undefined) return false
    const relativeFrame = currentFrame - localOverlay.from
    return rotationKeyframes.some(kf => kf.frame === relativeFrame)
  }, [currentFrame, localOverlay.from, rotationKeyframes])
  
  // Sync with overlay on change
  useEffect(() => {
    if (useFrameInterpolation) return // Don't sync when using keyframes
    setRotationValue(localOverlay.rotation || 0)
  }, [localOverlay.rotation, useFrameInterpolation])

  // Rotation update handler
  const updateRotation = (deg: number) => {
    // Normalize the rotation to be between 0 and 359
    const normalizedDeg = ((deg % 360) + 360) % 360
    setRotationValue(normalizedDeg)

    // If there's a keyframe at the current time, update it
    if (hasKeyframeAtCurrentFrame && currentFrame !== undefined) {
      const relativeFrame = currentFrame - localOverlay.from
      updateKeyframeValue(relativeFrame, normalizedDeg)
    } else {
      // Otherwise, just update the rotation
      setLastInterpolatedRotation(normalizedDeg)
      handlePositionChange({ rotation: normalizedDeg })
    }
  }

  // Convert internal rotation (0-359) to UI rotation (-360 to 360)
  const toUIRotation = (value: number): number => {
    // Keep the value as is if it's already in a good display range
    // but allow converting values over 180 to negative for more intuitive display
    if (value > 180 && value <= 359) {
      return value - 360;
    }
    return value;
  }

  // Convert UI rotation (-360 to 360) to internal rotation (0-359)
  const toInternalRotation = (value: number): number => {
    // Ensure the value is within the 0-359 range regardless of input
    return ((value % 360) + 360) % 360;
  }

  // Reset rotation
  const resetRotation = () => updateRotation(0)
  
  // Add a keyframe at the current time
  const addKeyframeAtCurrentTime = () => {
    if (currentFrame === undefined) return

    // Convert global timeline frame to local overlay frame
    const relativeFrame = currentFrame - localOverlay.from
    
    // Don't add keyframe if outside overlay bounds
    if (relativeFrame < 0 || relativeFrame > localOverlay.durationInFrames) return

    // Check if a keyframe already exists at this position
    const existingKeyframeIndex = rotationKeyframes.findIndex((kf) => kf.frame === relativeFrame)

    if (existingKeyframeIndex >= 0) {
      // Update existing keyframe
      const updatedKeyframes = [...rotationKeyframes]
      updatedKeyframes[existingKeyframeIndex].value = rotationValue
      setRotationKeyframes(updatedKeyframes)

      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(updatedKeyframes)
      }
    } else {
      // Add new keyframe with ID
      const newKeyframe = {
        frame: relativeFrame,
        value: rotationValue,
        id: generateKeyframeId(),
      }

      const newKeyframes = [...rotationKeyframes, newKeyframe]
      setRotationKeyframes(newKeyframes)

      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(newKeyframes)
      }
    }

    // Apply the current rotation immediately
    setLastInterpolatedRotation(rotationValue)
    handlePositionChange({ rotation: rotationValue })
  }
  
  // Update the value of a specific keyframe
  const updateKeyframeValue = (frame: number, value: number) => {
    // Normalize the rotation value
    const normalizedValue = ((value % 360) + 360) % 360
    
    const updatedKeyframes = rotationKeyframes.map(kf => 
      kf.frame === frame ? { ...kf, value: normalizedValue } : kf
    )
    
    setRotationKeyframes(updatedKeyframes)
    
    // Notify parent if needed
    if (onKeyframeChange) {
      onKeyframeChange(updatedKeyframes)
    }
    
    // Update the local rotation value
    setRotationValue(normalizedValue)
    setLastInterpolatedRotation(normalizedValue)
    handlePositionChange({ rotation: normalizedValue })
  }

  // Edit a keyframe value directly
  const editKeyframeValue = (frame: number, newValue: number) => {
    const keyframe = rotationKeyframes.find(kf => kf.frame === frame)
    if (!keyframe) return
    
    // If we received a direct value, use it (normalized)
    if (typeof newValue === 'number') {
      updateKeyframeValue(frame, newValue)
      return
    }
    
    // Otherwise, prompt for a degree value
    const valueInput = prompt(`Enter rotation in degrees (0-359):`, keyframe.value.toString())
    if (valueInput === null) return // User cancelled
    
    const parsed = parseFloat(valueInput)
    if (isNaN(parsed)) return // Invalid input
    
    // Update rotation with normalization
    updateKeyframeValue(frame, parsed)
  }

  // Select a keyframe to highlight it
  const selectKeyframe = (frame: number) => {
    setActiveKeyframe(frame)
    
    // Find the keyframe
    const keyframe = rotationKeyframes.find(kf => kf.frame === frame)
    if (keyframe) {
      // Update the local rotation value to match the keyframe
      setRotationValue(keyframe.value)
      setLastInterpolatedRotation(keyframe.value)
      handlePositionChange({ rotation: keyframe.value })
      
      // Move playhead to this frame
      navigateToRelativeFrame(frame)
    }
  }

  // Remove a keyframe at a specific frame
  const removeKeyframe = (frame: number) => {
    const updatedKeyframes = rotationKeyframes.filter(kf => kf.frame !== frame)
    setRotationKeyframes(updatedKeyframes)
    
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
    const existingKeyframeAtTarget = rotationKeyframes.find(kf => kf.frame === newFrame)
    
    if (existingKeyframeAtTarget && oldFrame !== newFrame) {
      // If there's already a keyframe at the target position, we need to handle conflict
      // For now, we'll just overwrite the target keyframe
      const keyframeToMove = rotationKeyframes.find(kf => kf.frame === oldFrame)
      if (!keyframeToMove) return
      
      const updatedKeyframes = rotationKeyframes
        .filter(kf => kf.frame !== oldFrame && kf.frame !== newFrame)
        .concat([{ ...keyframeToMove, frame: newFrame }])
      
      setRotationKeyframes(updatedKeyframes)
      setActiveKeyframe(newFrame)
      
      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(updatedKeyframes)
      }
    } else {
      // If there's no keyframe at the target position, just move it
      const updatedKeyframes = rotationKeyframes.map(kf => 
        kf.frame === oldFrame ? { ...kf, frame: newFrame } : kf
      )
      
      setRotationKeyframes(updatedKeyframes)
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
      console.log('Navigate to frame:', globalFrame)
    }
  }

  // Navigate to the next keyframe
  const navigateToNextKeyframe = () => {
    if (rotationKeyframes.length === 0) return
    
    // Sort keyframes by frame position
    const sortedFrames = [...rotationKeyframes].sort((a, b) => a.frame - b.frame).map(kf => kf.frame)
    
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
    if (rotationKeyframes.length === 0) return
    
    // Sort keyframes by frame position
    const sortedFrames = [...rotationKeyframes].sort((a, b) => a.frame - b.frame).map(kf => kf.frame)
    
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
    if (rotationKeyframes.length < 2) return ''
    
    const sortedFrames = [...rotationKeyframes].sort((a, b) => a.frame - b.frame)
    
    // Function to interpolate between points for smoother curves
    const interpolatePoints = (p1: { frame: number, rotation: number }, 
                            p2: { frame: number, rotation: number }, 
                            numPoints: number) => {
      const points = []
      
      // Handle rotation interpolation with special care for angle wrapping
      const shortestDistance = (start: number, end: number) => {
        // Normalize angles to 0-359
        start = ((start % 360) + 360) % 360
        end = ((end % 360) + 360) % 360
        
        // Find shortest angular distance (clockwise or counterclockwise)
        const clockwiseDist = end >= start ? end - start : 360 - start + end
        const counterClockwiseDist = start >= end ? start - end : 360 - end + start
        
        return clockwiseDist <= counterClockwiseDist ? clockwiseDist : -counterClockwiseDist
      }
      
      const distance = shortestDistance(p1.rotation, p2.rotation)
      
      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints
        const frame = p1.frame + t * (p2.frame - p1.frame)
        const framePercent = (frame / localOverlay.durationInFrames) * 100
        
        // Smooth easing function for natural movement
        const smoothT = t * t * (3 - 2 * t) // Smoothstep interpolation
        
        // Calculate rotation with proper angle interpolation
        const rotation = (p1.rotation + smoothT * distance + 360) % 360
        
        // Scale to fit curve visualization - normalize to 0-100 range
        const yPos = 100 - (rotation / 360) * 100
        
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
        const y = 100 - (current.value / 360) * 100
        allPoints.push(`${x},${y}`)
      }
      
      // Add interpolated points between keyframes
      const interpPoints = interpolatePoints(
        { frame: current.frame, rotation: current.value },
        { frame: next.frame, rotation: next.value },
        numInterpPoints
      )
      
      // Skip the first interpolated point as it's the same as the current frame
      allPoints = allPoints.concat(interpPoints.slice(1))
    }
    
    return allPoints.join(' ')
  }

  // Get interpolated rotation at any frame
  const getInterpolatedRotation = (frame: number) => {
    if (rotationKeyframes.length === 0) return rotationValue
    if (rotationKeyframes.length === 1) return rotationKeyframes[0].value
    
    // Get sorted keyframes
    const sortedFrames = [...rotationKeyframes].sort((a, b) => a.frame - b.frame)
    
    // Check if before first keyframe or after last keyframe
    if (frame <= sortedFrames[0].frame) return sortedFrames[0].value
    if (frame >= sortedFrames[sortedFrames.length - 1].frame) return sortedFrames[sortedFrames.length - 1].value
    
    // Find the two keyframes to interpolate between
    for (let i = 0; i < sortedFrames.length - 1; i++) {
      if (frame >= sortedFrames[i].frame && frame <= sortedFrames[i + 1].frame) {
        // Handle rotation interpolation with special care for angle wrapping
        const shortestDistance = (start: number, end: number) => {
          // Normalize angles to 0-359
          start = ((start % 360) + 360) % 360
          end = ((end % 360) + 360) % 360
          
          // Find shortest angular distance (clockwise or counterclockwise)
          const clockwiseDist = end >= start ? end - start : 360 - start + end
          const counterClockwiseDist = start >= end ? start - end : 360 - end + start
          
          return clockwiseDist <= counterClockwiseDist ? clockwiseDist : -counterClockwiseDist
        }
        
        // Calculate interpolation factor
        const t = (frame - sortedFrames[i].frame) / (sortedFrames[i + 1].frame - sortedFrames[i].frame)
        
        // Get the shortest path between angles
        const distance = shortestDistance(sortedFrames[i].value, sortedFrames[i + 1].value)
        
        // Calculate the interpolated value
        return ((sortedFrames[i].value + t * distance) + 360) % 360
      }
    }
    
    // Fallback
    return rotationValue
  }

  // Effect to update rotation when current frame changes (for keyframe interpolation)
  useEffect(() => {
    if (!useFrameInterpolation || currentFrame === undefined || rotationKeyframes.length < 2) return
    
    // Convert to relative frame
    const relativeFrame = currentFrame - localOverlay.from
    
    // Get interpolated rotation for the current frame
    const interpolatedRotation = getInterpolatedRotation(relativeFrame)
    
    // Only update if it has changed significantly (to avoid too many updates)
    if (
      Math.abs(interpolatedRotation - lastInterpolatedRotation) > 0.5
    ) {
      setRotationValue(interpolatedRotation)
      setLastInterpolatedRotation(interpolatedRotation)
      handlePositionChange({ rotation: interpolatedRotation })
    }
  }, [currentFrame, useFrameInterpolation, rotationKeyframes, lastInterpolatedRotation, localOverlay.from])

  // Effect to handle direct slider interaction - needed to handle the -360 to 360 range properly
  useEffect(() => {
    const keyframeSliderElement = document.getElementById('rotation-kf-slider');
    const normalSliderElement = document.getElementById('rotation-normal-slider');
    
    const handleSliderInput = (e: Event) => {
      // Ensure the slider doesn't get stuck at the ends
      const inputTarget = e.target as HTMLInputElement;
      if (inputTarget && inputTarget.value) {
        const value = parseFloat(inputTarget.value);
        // If value approaches max/min bounds, allow it to wrap around
        if (value >= 359) {
          updateRotation(value % 360);
        } else if (value <= -359) {
          updateRotation(360 + (value % 360));
        }
      }
    };

    // Add event listeners to both sliders
    if (keyframeSliderElement) {
      keyframeSliderElement.addEventListener('input', handleSliderInput);
    }
    
    if (normalSliderElement) {
      normalSliderElement.addEventListener('input', handleSliderInput);
    }
    
    // Clean up both event listeners
    return () => {
      if (keyframeSliderElement) {
        keyframeSliderElement.removeEventListener('input', handleSliderInput);
      }
      if (normalSliderElement) {
        normalSliderElement.removeEventListener('input', handleSliderInput);
      }
    };
  }, []);

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
          <span>Rotation</span>
        </div>
        <div className="mr-2 text-xs text-muted-foreground">
          {Math.round(rotationValue)}°
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pb-2 pt-1">
        <div className="space-y-4">
          {/* Animation settings */}
          <div className="flex items-center justify-between px-2">
            <Label htmlFor="enable-rotation-keyframes" className="text-xs font-normal cursor-pointer">
              Enable keyframe animation
            </Label>
            <Switch
              id="enable-rotation-keyframes"
              checked={useFrameInterpolation}
              onCheckedChange={setUseFrameInterpolation}
            />
          </div>
          
          {/* Only show regular rotation controls when keyframing is disabled */}
          {!useFrameInterpolation && (
            <div className="space-y-3">
              <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1 px-2">
                <span>Angle</span>
                <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {rotationValue.toFixed(0)}°
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-6 w-6 bg-white dark:bg-gray-900"
                      onClick={() => updateRotation((rotationValue - 15 + 360) % 360)}
                    >
                      <RotateCcw size={12} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rotate counterclockwise</TooltipContent>
                </Tooltip>
                <Slider
                  id="rotation-normal-slider"
                  value={[toUIRotation(rotationValue)]}
                  min={-360}
                  max={360}
                  step={1}
                  onValueChange={(v) => updateRotation(toInternalRotation(v[0]))}
                  className="flex-1"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-6 w-6 bg-white dark:bg-gray-900"
                      onClick={() => updateRotation((rotationValue + 15) % 360)}
                    >
                      <RotateCw size={12} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rotate clockwise</TooltipContent>
                </Tooltip>
              </div>
              <Separator className="my-2" />
              <div className="grid grid-cols-4 gap-1.5 px-2">
                {[-90, 0, 90, 180].map((deg) => (
                  <Tooltip key={deg}>
                    <TooltipTrigger asChild>
                      <Button 
                        variant={Math.abs(toUIRotation(rotationValue) - deg) < 1 ? "default" : "outline"} 
                        className={cn(
                          "bg-white dark:bg-gray-900 text-xs h-7",
                          Math.abs(toUIRotation(rotationValue) - deg) < 1 && "bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
                        )}
                        onClick={() => updateRotation(toInternalRotation(deg))}
                      >
                        {deg}°
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Rotate to {deg}°</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
          
          {/* Show keyframe controls when animation is enabled */}
          {useFrameInterpolation && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Current Rotation</span>
                  <span className="text-xs font-medium">{toUIRotation(rotationValue).toFixed(0)}°</span>
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
              
              {/* Rotation control for keyframe animation */}
              <div className="flex flex-col space-y-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Label htmlFor="rotation-kf-slider" className="text-xs font-normal text-muted-foreground w-12">
                    Angle
                  </Label>
                  <Slider
                    id="rotation-kf-slider"
                    min={-360}
                    max={360}
                    step={1}
                    value={[toUIRotation(rotationValue)]}
                    onValueChange={([value]) => updateRotation(toInternalRotation(value))}
                    aria-label="Rotation"
                    className="flex-1 mx-2"
                  />
                  <div className="flex items-center gap-1">
                    <span className="w-10 text-xs tabular-nums text-muted-foreground">
                      {toUIRotation(rotationValue).toFixed(0)}°
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                          onClick={() => {
                            const currentDegrees = toUIRotation(rotationValue);
                            const newValueInput = prompt(`Enter rotation in degrees (-360 to 360):`, currentDegrees.toString());
                            if (newValueInput !== null) {
                              const parsed = parseInt(newValueInput, 10);
                              if (!isNaN(parsed)) {
                                updateRotation(toInternalRotation(parsed));
                              }
                            }
                          }}
                        >
                          <span className="text-xs">✏️</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit rotation</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-1.5">
                  {[-90, 0, 90, 180].map((deg) => (
                    <Button
                      key={deg}
                      variant={Math.abs(toUIRotation(rotationValue) - deg) < 1 ? "default" : "outline"} 
                      className={cn(
                        "text-xs h-6 text-center",
                        Math.abs(toUIRotation(rotationValue) - deg) < 1 && "bg-teal-600 hover:bg-teal-700"
                      )}
                      onClick={() => updateRotation(toInternalRotation(deg))}
                    >
                      {deg}°
                    </Button>
                  ))}
                </div>
              </div>
              
              <KeyframeTimeline
                overlayFrom={localOverlay.from}
                durationInFrames={localOverlay.durationInFrames}
                currentFrame={currentFrame}
                keyframes={rotationKeyframes}
                activeKeyframe={activeKeyframe}
                useFrameInterpolation={useFrameInterpolation}
                showCurvePreview={showCurvePreview}
                draggedKeyframeFrame={draggedKeyframeFrame}
                dragPreviewValue={dragPreviewValue}
                dragStartX={dragStartX}
                propertyValue={rotationValue}
                hasKeyframeAtCurrentFrame={hasKeyframeAtCurrentFrame}
                propertyLabel="Rotation"
                valueFormatter={(value) => `${toUIRotation(value as number).toFixed(0)}°`}
                curveColor="teal"
                getInterpolatedValue={getInterpolatedRotation}
                generateCurvePoints={generateCurvePoints}
                toggleCurvePreview={toggleCurvePreview}
                addKeyframeAtCurrentTime={addKeyframeAtCurrentTime}
                selectKeyframe={selectKeyframe}
                updateKeyframePosition={updateKeyframePosition}
                removeKeyframe={removeKeyframe}
                navigateToNextKeyframe={navigateToNextKeyframe}
                navigateToPrevKeyframe={navigateToPrevKeyframe}
                navigateToRelativeFrame={navigateToRelativeFrame}
                updatePropertyValue={updateRotation}
                setActiveKeyframe={setActiveKeyframe}
                updateKeyframeValue={updateKeyframeValue}
                editKeyframeValue={editKeyframeValue}
                setDraggedKeyframeFrame={setDraggedKeyframeFrame}
                setDragStartX={setDragStartX}
                setDragPreviewValue={setDragPreviewValue}
                sortedKeyframes={sortedKeyframes}
              />
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
} 