"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Maximize2, RotateCcw, ChevronRight, ChevronDown, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { ImageOverlay } from "../../../../types"
import { TabBaseProps, BaseKeyframe, generateKeyframeId, formatters, ScaleKeyframe, generateKeyframeWithOverlayId } from "../image-transform-types"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { KeyframeTimeline } from "./keyframe-timeline"

// Define a simplified version of ScaleKeyframe for this component
interface SimpleScaleKeyframe extends BaseKeyframe {
  value: number // Just a single number for scale
}

interface ScaleTabProps extends TabBaseProps {
  localOverlay: ImageOverlay
  handleStyleChange: (updates: Partial<ImageOverlay["styles"]>) => void
  totalFrames?: number
  currentFrame?: number
  onKeyframeChange?: (keyframes: SimpleScaleKeyframe[]) => void
}

export const ScaleTab: React.FC<ScaleTabProps> = ({
  localOverlay,
  handleStyleChange,
  expanded,
  setExpanded,
  totalFrames = 0,
  currentFrame = 0,
  onKeyframeChange,
}) => {
  // Local controlled state for scale
  const [scaleValue, setScaleValue] = useState<number>(
    Number(localOverlay.styles.transform?.match(/scale\(([^)]+)\)/)?.[1] ?? 1)
  )
  
  // Frame interpolation settings for scale
  const [useFrameInterpolation, setUseFrameInterpolation] = useState<boolean>(false)
  
  // Store keyframes for scale
  const [scaleKeyframes, setScaleKeyframes] = useState<SimpleScaleKeyframe[]>([])
  
  // Keep track of the last interpolated scale to avoid unnecessary updates
  const [lastInterpolatedScale, setLastInterpolatedScale] = useState<number>(scaleValue)
  
  // Handle dragging keyframes in timeline
  const [draggedKeyframeFrame, setDraggedKeyframeFrame] = useState<number | null>(null)
  const [dragStartX, setDragStartX] = useState<number>(0)
  const [activeKeyframe, setActiveKeyframe] = useState<number | null>(null)
  const [dragPreviewValue, setDragPreviewValue] = useState<number | null>(null)
  
  // Add additional states for keyframe interaction
  const [showCurvePreview, setShowCurvePreview] = useState<boolean>(false)

  // Sort keyframes by frame number for display
  const sortedKeyframes = useMemo(() => {
    return [...scaleKeyframes].sort((a, b) => a.frame - b.frame)
  }, [scaleKeyframes])

  // Check if there's a keyframe at the current frame
  const hasKeyframeAtCurrentFrame = useMemo(() => {
    if (currentFrame === undefined) return false
    const relativeFrame = currentFrame - localOverlay.from
    return scaleKeyframes.some(kf => kf.frame === relativeFrame)
  }, [currentFrame, localOverlay.from, scaleKeyframes])
  
  // Sync with overlay on change
  useEffect(() => {
    if (useFrameInterpolation) return // Don't sync when using keyframes
    
    const match = localOverlay.styles.transform?.match(/scale\(([^)]+)\)/)
    const scaleVal = match ? Number(match[1]) : 1
    setScaleValue(scaleVal)
  }, [localOverlay.styles.transform, useFrameInterpolation])

  // Scale update handler - updates the uniform scale
  const updateScale = (percent: number) => {
    // Convert percentage to decimal (e.g., 100 → 1.0, 500 → 5.0)
    const s = percent / 100
    setScaleValue(s)
    
    // If there's a keyframe at the current time, update it
    if (hasKeyframeAtCurrentFrame && currentFrame !== undefined) {
      const relativeFrame = currentFrame - localOverlay.from
      updateKeyframeValue(relativeFrame, s)
    } else {
      // Otherwise, just update the style
      setLastInterpolatedScale(s)
      handleStyleChange({ transform: `scale(${s})` })
    }
  }

  // Reset scale
  const resetScale = () => updateScale(100)
  
  // Add a keyframe at the current time
  const addKeyframeAtCurrentTime = () => {
    if (currentFrame === undefined) return

    // Convert global timeline frame to local overlay frame
    const relativeFrame = currentFrame - localOverlay.from
    
    // Don't add keyframe if outside overlay bounds
    if (relativeFrame < 0 || relativeFrame > localOverlay.durationInFrames) return

    // Check if a keyframe already exists at this position
    const existingKeyframeIndex = scaleKeyframes.findIndex((kf) => kf.frame === relativeFrame)

    if (existingKeyframeIndex >= 0) {
      // Update existing keyframe
      const updatedKeyframes = [...scaleKeyframes]
      updatedKeyframes[existingKeyframeIndex].value = scaleValue
      setScaleKeyframes(updatedKeyframes)

      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(updatedKeyframes)
      }
    } else {
      // Add new keyframe with ID tied to this overlay
      const newKeyframe = {
        frame: relativeFrame,
        value: scaleValue,
        id: generateKeyframeWithOverlayId(localOverlay.uniqueId),
        overlayUniqueId: localOverlay.uniqueId,
      }

      const newKeyframes = [...scaleKeyframes, newKeyframe]
      setScaleKeyframes(newKeyframes)

      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(newKeyframes)
      }
    }

    // Apply the current scale immediately
    setLastInterpolatedScale(scaleValue)
    handleStyleChange({ transform: `scale(${scaleValue})` })
  }
  
  // Update the value of a specific keyframe
  const updateKeyframeValue = (frame: number, value: number) => {
    const updatedKeyframes = scaleKeyframes.map(kf => 
      kf.frame === frame ? { ...kf, value } : kf
    )
    
    setScaleKeyframes(updatedKeyframes)
    
    // Notify parent if needed
    if (onKeyframeChange) {
      onKeyframeChange(updatedKeyframes)
    }
    
    // Update the local scale value
    setScaleValue(value)
    setLastInterpolatedScale(value)
    handleStyleChange({ transform: `scale(${value})` })
  }

  // Edit a keyframe value directly
  const editKeyframeValue = (frame: number, newValue: number) => {
    const keyframe = scaleKeyframes.find(kf => kf.frame === frame)
    if (!keyframe) return
    
    // If we received a direct value, use it
    if (typeof newValue !== 'number' && newValue !== null) {
      updateKeyframeValue(frame, newValue)
      return
    }
    
    // Otherwise, prompt for a percentage value
    const valueInput = prompt(`Enter scale percentage (1-500):`, (keyframe.value * 100).toString())
    if (valueInput === null) return // User cancelled
    
    const parsed = parseFloat(valueInput)
    if (isNaN(parsed) || parsed < 1 || parsed > 500) return // Invalid input
    
    // Update with uniform scaling
    updateKeyframeValue(frame, parsed / 100)
  }

  // Select a keyframe to highlight it
  const selectKeyframe = (frame: number) => {
    setActiveKeyframe(frame)
    
    // Find the keyframe
    const keyframe = scaleKeyframes.find(kf => kf.frame === frame)
    if (keyframe) {
      // Update the local scale value to match the keyframe
      setScaleValue(keyframe.value)
      setLastInterpolatedScale(keyframe.value)
      handleStyleChange({ transform: `scale(${keyframe.value})` })
      
      // Move playhead to this frame
      navigateToRelativeFrame(frame)
    }
  }

  // Remove a keyframe at a specific frame
  const removeKeyframe = (frame: number) => {
    const updatedKeyframes = scaleKeyframes.filter(kf => kf.frame !== frame)
    setScaleKeyframes(updatedKeyframes)
    
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
    const existingKeyframeAtTarget = scaleKeyframes.find(kf => kf.frame === newFrame)
    
    if (existingKeyframeAtTarget && oldFrame !== newFrame) {
      // If there's already a keyframe at the target position, we need to handle conflict
      // For now, we'll just overwrite the target keyframe
      const keyframeToMove = scaleKeyframes.find(kf => kf.frame === oldFrame)
      if (!keyframeToMove) return
      
      const updatedKeyframes = scaleKeyframes
        .filter(kf => kf.frame !== oldFrame && kf.frame !== newFrame)
        .concat([{ ...keyframeToMove, frame: newFrame }])
      
      setScaleKeyframes(updatedKeyframes)
      setActiveKeyframe(newFrame)
      
      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(updatedKeyframes)
      }
    } else {
      // If there's no keyframe at the target position, just move it
      const updatedKeyframes = scaleKeyframes.map(kf => 
        kf.frame === oldFrame ? { ...kf, frame: newFrame } : kf
      )
      
      setScaleKeyframes(updatedKeyframes)
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
    if (scaleKeyframes.length === 0) return
    
    // Sort keyframes by frame position
    const sortedFrames = [...scaleKeyframes].sort((a, b) => a.frame - b.frame).map(kf => kf.frame)
    
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
    if (scaleKeyframes.length === 0) return
    
    // Sort keyframes by frame position
    const sortedFrames = [...scaleKeyframes].sort((a, b) => a.frame - b.frame).map(kf => kf.frame)
    
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
    if (scaleKeyframes.length < 2) return ''
    
    const sortedFrames = [...scaleKeyframes].sort((a, b) => a.frame - b.frame)
    
    // Function to interpolate between points for smoother curves
    const interpolatePoints = (p1: { frame: number, scale: number }, 
                            p2: { frame: number, scale: number }, 
                            numPoints: number) => {
      const points = []
      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints
        const frame = p1.frame + t * (p2.frame - p1.frame)
        const framePercent = (frame / localOverlay.durationInFrames) * 100
        
        // Smooth easing function for natural movement
        const smoothT = t * t * (3 - 2 * t) // Smoothstep interpolation
        const scale = p1.scale + smoothT * (p2.scale - p1.scale)
        
        // Scale to fit curve visualization - normalize to 0-100 range
        // Scale goes from 0 to 5 (0% to 500%)
        const yPos = 100 - ((scale / 5) * 100)
        
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
        const y = 100 - ((current.value / 5) * 100)
        allPoints.push(`${x},${y}`)
      }
      
      // Add interpolated points between keyframes
      const interpPoints = interpolatePoints(
        { frame: current.frame, scale: current.value },
        { frame: next.frame, scale: next.value },
        numInterpPoints
      )
      
      // Skip the first interpolated point as it's the same as the current frame
      allPoints = allPoints.concat(interpPoints.slice(1))
    }
    
    return allPoints.join(' ')
  }

  // Get interpolated scale at any frame
  const getInterpolatedScale = (frame: number) => {
    if (scaleKeyframes.length === 0) return scaleValue
    if (scaleKeyframes.length === 1) return scaleKeyframes[0].value
    
    // Get sorted keyframes
    const sortedFrames = [...scaleKeyframes].sort((a, b) => a.frame - b.frame)
    
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
    return scaleValue
  }

  // Effect to update scale when current frame changes (for keyframe interpolation)
  useEffect(() => {
    if (!useFrameInterpolation || currentFrame === undefined || scaleKeyframes.length < 2) return
    
    // Convert to relative frame
    const relativeFrame = currentFrame - localOverlay.from
    
    // Get interpolated scale for the current frame
    const interpolatedScale = getInterpolatedScale(relativeFrame)
    
    // Only update if it has changed significantly (to avoid too many updates)
    if (
      Math.abs(interpolatedScale - lastInterpolatedScale) > 0.01
    ) {
      setScaleValue(interpolatedScale)
      setLastInterpolatedScale(interpolatedScale)
      handleStyleChange({ transform: `scale(${interpolatedScale})` })
    }
  }, [currentFrame, useFrameInterpolation, scaleKeyframes, lastInterpolatedScale, localOverlay.from])

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
          <span>Scale</span>
        </div>
        <div className="mr-2 text-xs text-muted-foreground">
          {Math.round(scaleValue * 100)}%
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pb-2 pt-1">
        <div className="space-y-4">
          {/* Animation settings */}
          <div className="flex items-center justify-between px-2">
            <Label htmlFor="enable-scale-keyframes" className="text-xs font-normal cursor-pointer">
              Enable keyframe animation
            </Label>
            <Switch
              id="enable-scale-keyframes"
              checked={useFrameInterpolation}
              onCheckedChange={setUseFrameInterpolation}
            />
          </div>
          
          {/* Only show regular scale controls when keyframing is disabled */}
          {!useFrameInterpolation && (
            <div className="space-y-3">
              <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1 px-2">
                <span>Scale Factor</span>
                <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {(scaleValue * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 bg-white dark:bg-gray-900"
                      onClick={() => updateScale(Math.max(1, scaleValue * 100 - 5))}
                    >
                      <Minus size={12} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Decrease scale</TooltipContent>
                </Tooltip>
                <Slider
                  value={[scaleValue * 100]}
                  min={1}
                  max={500}
                  step={1}
                  onValueChange={(v) => updateScale(v[0])}
                  className="flex-1"
                />
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded min-w-[50px] text-center">
                    {(scaleValue * 100).toFixed(0)}%
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                        onClick={() => {
                          const currentPercent = Math.round(scaleValue * 100);
                          const newValueInput = prompt(`Enter scale percentage (1-1000):`, currentPercent.toString());
                          if (newValueInput !== null) {
                            const parsed = parseInt(newValueInput, 10);
                            if (!isNaN(parsed) && parsed >= 1 && parsed <= 1000) {
                              updateScale(parsed);
                            }
                          }
                        }}
                      >
                        <span className="text-xs">✏️</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit scale</TooltipContent>
                  </Tooltip>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 bg-white dark:bg-gray-900"
                      onClick={() => updateScale(scaleValue * 100 + 5)}
                    >
                      <Plus size={12} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Increase scale</TooltipContent>
                </Tooltip>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between gap-1.5 px-2">
                {[50, 100, 200].map((p) => (
                  <Tooltip key={p}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={Math.abs(scaleValue * 100 - p) < 1 ? "default" : "outline"} 
                        className={cn(
                          "flex-1 bg-white dark:bg-gray-900 text-xs h-7",
                          Math.abs(scaleValue * 100 - p) < 1 && "bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
                        )}
                        onClick={() => updateScale(p)}
                      >
                        {p}%
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{p === 100 ? "Original size" : `Scale to ${p}%`}</TooltipContent>
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
                  <span className="text-xs text-muted-foreground">Current Scale</span>
                  <span className="text-xs font-medium">{Math.round(scaleValue * 100)}%</span>
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
              
              {/* Scale control for keyframe animation */}
              <div className="flex flex-col space-y-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Label htmlFor="scale-kf-slider" className="text-xs font-normal text-muted-foreground w-12">
                    Scale
                  </Label>
                  <Slider
                    id="scale-kf-slider"
                    min={1}
                    max={500}
                    step={1}
                    value={[scaleValue * 100]}
                    onValueChange={([value]) => updateScale(value)}
                    aria-label="Scale"
                    className="flex-1 mx-2"
                  />
                  <div className="flex items-center gap-1">
                    <span className="w-12 text-xs tabular-nums text-muted-foreground">
                      {Math.round(scaleValue * 100)}%
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                          onClick={() => {
                            const currentPercent = Math.round(scaleValue * 100);
                            const newValueInput = prompt(`Enter scale percentage (1-1000):`, currentPercent.toString());
                            if (newValueInput !== null) {
                              const parsed = parseInt(newValueInput, 10);
                              if (!isNaN(parsed) && parsed >= 1 && parsed <= 1000) {
                                updateScale(parsed);
                              }
                            }
                          }}
                        >
                          <span className="text-xs">✏️</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit scale</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                
                <div className="flex justify-between gap-1.5">
                  {[50, 100, 200].map((p) => (
                    <Button
                      key={p}
                      variant={Math.abs(scaleValue * 100 - p) < 1 ? "default" : "outline"} 
                      className={cn(
                        "flex-1 text-xs h-6 text-center",
                        Math.abs(scaleValue * 100 - p) < 1 && "bg-purple-600 hover:bg-purple-700"
                      )}
                      onClick={() => updateScale(p)}
                    >
                      {p}%
                    </Button>
                  ))}
                </div>
              </div>
              
              <KeyframeTimeline
                overlayFrom={localOverlay.from}
                durationInFrames={localOverlay.durationInFrames}
                currentFrame={currentFrame}
                keyframes={scaleKeyframes}
                activeKeyframe={activeKeyframe}
                useFrameInterpolation={useFrameInterpolation}
                showCurvePreview={showCurvePreview}
                draggedKeyframeFrame={draggedKeyframeFrame}
                dragPreviewValue={dragPreviewValue}
                dragStartX={dragStartX}
                propertyValue={scaleValue}
                hasKeyframeAtCurrentFrame={hasKeyframeAtCurrentFrame}
                propertyLabel="Scale"
                valueFormatter={(value) => `${Math.round((value as number) * 100)}%`}
                curveColor="purple"
                getInterpolatedValue={getInterpolatedScale}
                generateCurvePoints={generateCurvePoints}
                toggleCurvePreview={toggleCurvePreview}
                addKeyframeAtCurrentTime={addKeyframeAtCurrentTime}
                selectKeyframe={selectKeyframe}
                updateKeyframePosition={updateKeyframePosition}
                removeKeyframe={removeKeyframe}
                navigateToNextKeyframe={navigateToNextKeyframe}
                navigateToPrevKeyframe={navigateToPrevKeyframe}
                navigateToRelativeFrame={navigateToRelativeFrame}
                updatePropertyValue={(value) => updateScale((value as number) * 100)}
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