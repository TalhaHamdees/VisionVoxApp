"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { ImageOverlay } from "../../../types"
import { Slider } from "@/components/ui/slider"
import {
  MoveHorizontal,
  MoveVertical,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  ImageOffIcon as OpacityIcon,
  RotateCw,
  Maximize2,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Clock,
  Plus,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

// Define a keyframe type to store frame position and opacity value
interface OpacityKeyframe {
  frame: number;
  value: number;
  id?: string; // Add unique ID for better tracking
}

interface ImageTransformPanelProps {
  localOverlay: ImageOverlay
  handleStyleChange: (updates: Partial<ImageOverlay["styles"]>) => void
  handlePositionChange: (updates: Partial<Pick<ImageOverlay, "left" | "top" | "rotation">>) => void
  totalFrames?: number
  currentFrame?: number
  onKeyframeChange?: (keyframes: OpacityKeyframe[]) => void
}

type SectionKey = "position" | "scale" | "rotation" | "opacity" | "frames"

export const ImageTransformPanel: React.FC<ImageTransformPanelProps> = ({
  localOverlay,
  handleStyleChange,
  handlePositionChange,
  totalFrames = 0,
  currentFrame = 0,
  onKeyframeChange,
}) => {
  // Expanded panels state
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    position: true,
    scale: true,
    rotation: false,
    opacity: false,
    frames: false,
  })
  
  // Local controlled state for each value
  const [posX, setPosX] = useState<number>(localOverlay.left)
  const [posY, setPosY] = useState<number>(localOverlay.top)
  const [scaleValue, setScaleValue] = useState<number>(
    Number(localOverlay.styles.transform?.match(/scale\(([^)]+)\)/)?.[1] ?? 1),
  )
  const [rotationValue, setRotationValue] = useState<number>(localOverlay.rotation || 0)
  const [opacityValue, setOpacityValue] = useState<number>(localOverlay.styles.opacity ?? 1)
  
  // Frame interpolation settings for opacity
  const [useFrameInterpolation, setUseFrameInterpolation] = useState<boolean>(false)
  
  // Store keyframes for opacity
  const [opacityKeyframes, setOpacityKeyframes] = useState<OpacityKeyframe[]>([])
  
  // Keep track of the last interpolated opacity to avoid unnecessary updates
  const [lastInterpolatedOpacity, setLastInterpolatedOpacity] = useState<number>(opacityValue)
  
  // Initialize keyframes on first load or when interpolation is enabled
  useEffect(() => {
    if (useFrameInterpolation && opacityKeyframes.length === 0) {
      // Create default keyframes if none exist
      setOpacityKeyframes([
        { frame: 0, value: opacityValue }, // First frame
        { frame: totalFrames || 100, value: opacityValue } // Last frame
      ]);
    }
  }, [useFrameInterpolation]);

  // Basic linear interpolation function
  const interpolate = (
    frame: number,
    inputRange: number[],
    outputRange: number[]
  ) => {
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
    const frames = sortedKeyframes.map(kf => kf.frame)
    const values = sortedKeyframes.map(kf => kf.value)
    
    // Interpolate based on current frame
    return interpolate(frame, frames, values)
  }
  
  // Generate unique ID for keyframes
  const generateKeyframeId = () => `kf_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // Update function to add keyframe with ID
  const addKeyframeAtCurrentFrame = () => {
    if (currentFrame === undefined) return
    
    // Check if a keyframe already exists at this position
    const existingKeyframeIndex = opacityKeyframes.findIndex(kf => kf.frame === currentFrame)
    
    if (existingKeyframeIndex >= 0) {
      // Update existing keyframe
      const updatedKeyframes = [...opacityKeyframes];
      updatedKeyframes[existingKeyframeIndex].value = opacityValue;
      setOpacityKeyframes(updatedKeyframes);
      
      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(updatedKeyframes);
      }
    } else {
      // Add new keyframe with ID
      const newKeyframe = { 
        frame: currentFrame, 
        value: opacityValue,
        id: generateKeyframeId()
      };
      
      const newKeyframes = [...opacityKeyframes, newKeyframe];
      setOpacityKeyframes(newKeyframes);
      
      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(newKeyframes);
      }
    }
    
    // Apply the current opacity immediately
    setLastInterpolatedOpacity(opacityValue);
    handleStyleChange({ opacity: opacityValue });
  }
  
  // Update function to update a specific keyframe's opacity
  const updateKeyframeOpacity = (frame: number, newOpacity: number) => {
    const keyframeIndex = opacityKeyframes.findIndex(kf => kf.frame === frame);
    
    if (keyframeIndex >= 0) {
      // Convert from percentage (0-100) to decimal (0-1)
      const normalizedOpacity = newOpacity / 100;
      
      // Update the keyframe
      const updatedKeyframes = [...opacityKeyframes];
      updatedKeyframes[keyframeIndex].value = normalizedOpacity;
      setOpacityKeyframes(updatedKeyframes);
      
      // Apply the change if we're at that keyframe
      if (currentFrame === frame) {
        setOpacityValue(normalizedOpacity);
        setLastInterpolatedOpacity(normalizedOpacity);
        handleStyleChange({ opacity: normalizedOpacity });
      } else {
        // Update the interpolated value at current frame
        const interpolatedValue = getInterpolatedOpacity(currentFrame || 0);
        setLastInterpolatedOpacity(interpolatedValue);
        handleStyleChange({ opacity: interpolatedValue });
      }
      
      // Notify parent if needed
      if (onKeyframeChange) {
        onKeyframeChange(updatedKeyframes);
      }
    }
  };
  
  // Remove a keyframe
  const removeKeyframe = (frame: number) => {
    // Don't remove if it would leave less than 2 keyframes
    if (opacityKeyframes.length <= 2) {
      return
    }
    
    setOpacityKeyframes(opacityKeyframes.filter(kf => kf.frame !== frame))
  }
  
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
    setPosX(localOverlay.left)
    setPosY(localOverlay.top)
    setRotationValue(localOverlay.rotation || 0)
     
    // Only update opacity value from localOverlay if not using frame interpolation
    if (!useFrameInterpolation) {
      setOpacityValue(localOverlay.styles.opacity ?? 1)
    }
  
    // Extract only the scale from transform
    const match = localOverlay.styles.transform?.match(/scale\(([^)]+)\)/)
    setScaleValue(match ? Number(match[1]) : 1)
  }, [localOverlay, useFrameInterpolation])
  
  // Ensure rotation and transform stay in sync
  useEffect(() => {
    // When rotation changes, make sure transform only contains scale
    const currentScale = scaleValue
  
    // Only update if transform contains rotation or is in wrong format
    const currentTransform = localOverlay.styles.transform || ""
    if (currentTransform.includes("rotate") || !currentTransform.includes("scale")) {
      handleStyleChange({
        transform: `scale(${currentScale})`,
      })
    }
  }, [localOverlay.rotation, scaleValue, handleStyleChange])
  
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
  
  // Handlers: update only relevant property
  const updatePosition = (x?: number, y?: number) => {
    if (x !== undefined) {
      setPosX(x)
      handlePositionChange({ left: x })
    }
    if (y !== undefined) {
      setPosY(y)
      handlePositionChange({ top: y })
    }
  }
  
  const updateScale = (percent: number) => {
    const s = percent / 100
    setScaleValue(s)
  
    // Ensure we're only updating scale in transform, not affecting rotation
    handleStyleChange({ transform: `scale(${s})` })
  }
  
  const updateRotation = (deg: number) => {
    setRotationValue(deg)
  
    // Only update the rotation property, keeping it separate from transform
    handlePositionChange({ rotation: deg })
  }
  
  const updateOpacity = (percent: number) => {
    const o = percent / 100
    setOpacityValue(o)
    
    // If frame interpolation is off, apply opacity directly
    if (!useFrameInterpolation) {
      setLastInterpolatedOpacity(o)
      handleStyleChange({ opacity: o })
    } else if (currentFrame !== undefined) {
      // If at a keyframe position, update that keyframe
      const keyframeIndex = opacityKeyframes.findIndex(kf => kf.frame === currentFrame)
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
  
  const reset = {
    position: () => updatePosition(0, 0),
    scale: () => updateScale(100),
    rotation: () => updateRotation(0),
    opacity: () => updateOpacity(100),
  }
  
  // Visualize the opacity curve for the preview
  const generateOpacityPreview = () => {
    if (!totalFrames) return []
    
    const frames = 50 // Number of preview frames
    const preview = []
    
    for (let i = 0; i < frames; i++) {
      const frame = Math.floor((i / frames) * totalFrames)
      const opacity = useFrameInterpolation
        ? getInterpolatedOpacity(frame)
        : opacityValue
      
      preview.push({
        frame,
        opacity,
        isCurrent: frame === currentFrame
      })
    }
    
    return preview
  }
  
  // Check if current frame has a keyframe
  const hasKeyframeAtCurrentFrame = currentFrame !== undefined && 
    opacityKeyframes.some(kf => kf.frame === currentFrame)
  
  const sectionClass = "mb-3 bg-background rounded-lg border border-border shadow-sm transition-all"
  const headerClass =
    "flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors"
  const labelClass = "flex items-center gap-2 text-sm font-medium"
  const valueClass = "text-xs font-mono bg-background/50 px-2 py-1 rounded min-w-[60px] text-center"
  const controlsClass = "p-4 space-y-4 border-t border-border/50"
  const sliderLabelClass = "flex justify-between text-xs text-muted-foreground mb-1.5"
  
  // Generate preview frames
  const opacityPreview = generateOpacityPreview()
  
  // Sort keyframes for display
  const sortedKeyframes = [...opacityKeyframes].sort((a, b) => a.frame - b.frame)

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-3 p-2">
        <div className="text-sm font-medium text-muted-foreground px-2 mb-1">Image Transform</div>

        {/* Position */}
        <div className={sectionClass}>
          <div className={headerClass} onClick={() => setExpanded((e) => ({ ...e, position: !e.position }))}>
            <div className={labelClass}>
              {expanded.position ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} />}
              <MoveHorizontal size={16} /> Position
            </div>
            <div className="flex items-center gap-2">
              <div className={valueClass}>
                {posX.toFixed(0)}, {posY.toFixed(0)}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation()
                      reset.position()
                    }}
                  >
                    <RotateCcw size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Reset position</TooltipContent>
              </Tooltip>
            </div>
          </div>
          {expanded.position && (
            <div className={controlsClass}>
              {/* X */}
              <div>
                <div className={sliderLabelClass}>
                  <span className="flex items-center gap-1">
                    <MoveHorizontal size={14} /> X Position
                  </span>
                  <span className={valueClass}>{posX.toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updatePosition(posX - 10)}
                      >
                        <ArrowLeft size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Move left</TooltipContent>
                  </Tooltip>
                  <Slider
                    value={[posX]}
                    min={-10000}
                    max={10000}
                    step={10}
                    onValueChange={(v) => updatePosition(v[0])}
                    className="flex-1"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updatePosition(posX + 10)}
                      >
                        <ArrowRight size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Move right</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              {/* Y */}
              <div>
                <div className={sliderLabelClass}>
                  <span className="flex items-center gap-1">
                    <MoveVertical size={14} /> Y Position
                  </span>
                  <span className={valueClass}>{posY.toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updatePosition(undefined, posY - 10)}
                      >
                        <ArrowUp size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Move up</TooltipContent>
                  </Tooltip>
                  <Slider
                    value={[posY]}
                    min={-10000}
                    max={10000}
                    step={10}
                    onValueChange={(v) => updatePosition(undefined, v[0])}
                    className="flex-1"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updatePosition(undefined, posY + 10)}
                      >
                        <ArrowDown size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Move down</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scale */}
        <div className={sectionClass}>
          <div className={headerClass} onClick={() => setExpanded((e) => ({ ...e, scale: !e.scale }))}>
            <div className={labelClass}>
              {expanded.scale ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} />}
              <Maximize2 size={16} /> Scale
            </div>
            <div className="flex items-center gap-2">
              <div className={valueClass}>{(scaleValue * 100).toFixed(0)}%</div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation()
                      reset.scale()
                    }}
                  >
                    <RotateCcw size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Reset scale</TooltipContent>
              </Tooltip>
            </div>
          </div>
          {expanded.scale && (
            <div className={controlsClass}>
              <div className={sliderLabelClass}>
                <span>Scale Factor</span>
                <span className={valueClass}>{(scaleValue * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateScale(Math.max(1, scaleValue * 100 - 5))}
                    >
                      -
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Decrease scale</TooltipContent>
                </Tooltip>
                <Slider
                  value={[scaleValue * 100]}
                  min={1}
                  max={5000}
                  step={5}
                  onValueChange={(v) => updateScale(v[0])}
                  className="flex-1"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateScale(scaleValue * 100 + 5)}
                    >
                      +
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Increase scale</TooltipContent>
                </Tooltip>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between gap-2">
                {[50, 100, 200].map((p) => (
                  <Tooltip key={p}>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="flex-1" onClick={() => updateScale(p)}>
                        {p}%
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{p === 100 ? "Original size" : `Scale to ${p}%`}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rotation */}
        <div className={sectionClass}>
          <div className={headerClass} onClick={() => setExpanded((e) => ({ ...e, rotation: !e.rotation }))}>
            <div className={labelClass}>
              {expanded.rotation ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} />}
              <RotateCw size={16} /> Rotation
            </div>
            <div className="flex items-center gap-2">
              <div className={valueClass}>{rotationValue.toFixed(0)}°</div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation()
                      reset.rotation()
                    }}
                  >
                    <RotateCcw size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Reset rotation</TooltipContent>
              </Tooltip>
            </div>
          </div>
          {expanded.rotation && (
            <div className={controlsClass}>
              <div className={sliderLabelClass}>
                <span>Angle</span>
                <span className={valueClass}>{rotationValue.toFixed(0)}°</span>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => updateRotation((rotationValue - 15 + 360) % 360)}
                    >
                      <RotateCcw size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rotate counterclockwise</TooltipContent>
                </Tooltip>
                <Slider
                  value={[rotationValue]}
                  min={0}
                  max={359}
                  step={1}
                  onValueChange={(v) => updateRotation(v[0])}
                  className="flex-1"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => updateRotation((rotationValue + 15) % 360)}
                    >
                      <RotateCw size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rotate clockwise</TooltipContent>
                </Tooltip>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between gap-2">
                {[0, 90, 180, 270].map((deg) => (
                  <Tooltip key={deg}>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="flex-1" onClick={() => updateRotation(deg)}>
                        {deg}°
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Rotate to {deg}°</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Opacity */}
        <div className={sectionClass}>
          <div className={headerClass} onClick={() => setExpanded((e) => ({ ...e, opacity: !e.opacity }))}>
            <div className={labelClass}>
              {expanded.opacity ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} />}
              <OpacityIcon size={16} /> Opacity
            </div>
            <div className="flex items-center gap-2">
              <div className={valueClass}>
                {(opacityValue * 100).toFixed(0)}%
                {useFrameInterpolation && (
                  <span className="text-primary text-xs ml-1">*</span>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation()
                      reset.opacity()
                    }}
                  >
                    <RotateCcw size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Reset opacity</TooltipContent>
              </Tooltip>
            </div>
          </div>
          {expanded.opacity && (
            <div className={controlsClass}>
              <div className={sliderLabelClass}>
                <span>Transparency</span>
                <span className={valueClass}>
                  {(opacityValue * 100).toFixed(0)}%
                  {useFrameInterpolation && currentFrame !== undefined && (
                    <span className="text-primary text-xs ml-1">
                      → {(getInterpolatedOpacity(currentFrame) * 100).toFixed(0)}%
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => updateOpacity(Math.max(0, opacityValue * 100 - 5))}
                    >
                      -
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
                      className="h-8 w-8"
                      onClick={() => updateOpacity(Math.min(100, opacityValue * 100 + 5))}
                    >
                      +
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Increase opacity</TooltipContent>
                </Tooltip>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between gap-2">
                {[25, 50, 100].map((p) => (
                  <Tooltip key={p}>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="flex-1" onClick={() => updateOpacity(p)}>
                        {p}%
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{p === 100 ? "Fully visible" : `${p}% opacity`}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Frame Interpolation */}
        {totalFrames > 0 && (
          <div className={sectionClass}>
            <div className={headerClass} onClick={() => setExpanded((e) => ({ ...e, frames: !e.frames }))}>
              <div className={labelClass}>
                {expanded.frames ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} />}
                <Clock size={16} /> Frame Animation
              </div>
              <div className="flex items-center gap-2">
                <div className={`${valueClass} ${useFrameInterpolation ? "bg-primary/20" : ""}`}>
                  {useFrameInterpolation ? "Enabled" : "Disabled"}
                </div>
              </div>
            </div>
            {expanded.frames && (
              <div className={controlsClass}>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Enable Frame Interpolation</label>
                  <Button
                    variant={useFrameInterpolation ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUseFrameInterpolation(!useFrameInterpolation)}
                  >
                    {useFrameInterpolation ? "On" : "Off"}
                  </Button>
                </div>
                
                {useFrameInterpolation && (
                  <>
                    <Separator className="my-3" />
                    
                    <div className="space-y-4">
                      {/* Current Playhead Position */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          Current Frame: <span className="font-medium">{currentFrame}</span>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm"
                              variant={hasKeyframeAtCurrentFrame ? "destructive" : "outline"}
                              className="gap-1"
                              onClick={() => hasKeyframeAtCurrentFrame 
                                ? removeKeyframe(currentFrame!) 
                                : addKeyframeAtCurrentFrame()
                              }
                            >
                              {hasKeyframeAtCurrentFrame ? (
                                <>
                                  <X size={14} /> Remove Keyframe
                                </>
                              ) : (
                                <>
                                  <Plus size={14} /> Add Keyframe
                                </>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {hasKeyframeAtCurrentFrame 
                              ? "Remove keyframe at current position" 
                              : "Add a keyframe at the current playhead position"
                            }
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      {/* Keyframes List - with opacity editing */}
                      <div className="border border-border/50 rounded-md p-2 bg-muted/10 mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium">Keyframes</div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs"
                                onClick={() => addKeyframeAtCurrentFrame()}
                              >
                                <Plus size={12} className="mr-1" /> Add Keyframe
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add keyframe at current frame</TooltipContent>
                          </Tooltip>
                        </div>

                        {sortedKeyframes.length > 0 ? (
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {sortedKeyframes.map((keyframe) => (
                              <div 
                                key={keyframe.id || keyframe.frame}
                                className={`
                                  flex items-center justify-between p-2 rounded-sm
                                  ${keyframe.frame === currentFrame ? 'bg-primary/10 border border-primary/30' : 'bg-background/50 hover:bg-muted/30 border border-border/30'}
                                `}
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                                  <span className="text-xs">Frame {keyframe.frame}</span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {/* Mini opacity slider */}
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={(keyframe.value * 100).toFixed(0)}
                                      onChange={(e) => updateKeyframeOpacity(keyframe.frame, parseInt(e.target.value))}
                                      className="w-16 h-1.5"
                                    />
                                    <span className="text-xs font-mono w-8 text-right">
                                      {(keyframe.value * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  
                                  {/* Delete button */}
                                  {opacityKeyframes.length > 2 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 rounded-full hover:bg-muted hover:text-destructive"
                                      onClick={() => removeKeyframe(keyframe.frame)}
                                    >
                                      <X size={12} />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground text-center py-2">
                            No keyframes added yet
                          </div>
                        )}
                      </div>
                      
                      {/* Preview with timeline markers */}
                      <div className="p-3 bg-muted/20 rounded-md border border-border/50">
                        <div className="text-xs text-muted-foreground mb-2 flex justify-between">
                          <span>Opacity Preview:</span>
                          {currentFrame !== undefined && (
                            <span className="text-primary font-medium">
                              Frame {currentFrame}: {(getInterpolatedOpacity(currentFrame) * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        
                        <div className="h-10 w-full bg-background rounded-sm overflow-hidden relative">
                          {/* Timeline grid lines for visual reference */}
                          <div className="absolute inset-0 w-full h-full grid grid-cols-10 pointer-events-none">
                            {Array.from({ length: 10 }).map((_, i) => (
                              <div 
                                key={i} 
                                className="h-full border-l border-primary/5 first:border-l-0"
                              />
                            ))}
                          </div>
                          
                          {/* Visualize the opacity curve */}
                          <div className="absolute inset-0 flex">
                            {opacityPreview.map((item, i) => (
                              <div
                                key={i}
                                className="h-full flex-1 relative"
                                style={{
                                  backgroundColor: item.isCurrent ? "rgba(59, 130, 246, 0.2)" : "transparent",
                                  borderRight: i < opacityPreview.length - 1 ? "1px solid rgba(59, 130, 246, 0.1)" : "none"
                                }}
                              >
                                <div
                                  className="absolute bottom-0 w-full bg-primary/40"
                                  style={{
                                    height: `${item.opacity * 100}%`
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                          
                          {/* Current frame indicator */}
                          {currentFrame !== undefined && (
                            <div 
                              className="absolute top-0 bottom-0 w-px bg-primary/80"
                              style={{
                                left: `${Math.min(100, Math.max(0, (currentFrame / totalFrames) * 100))}%`,
                                boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)'
                              }}
                            />
                          )}
                          
                          {/* Keyframe markers */}
                          {opacityKeyframes.map((kf) => {
                            const position = (kf.frame / totalFrames) * 100;
                            return (
                              <div 
                                key={kf.id || kf.frame}
                                className="absolute bottom-0 w-2.5 h-2.5 bg-primary rounded-full transform -translate-x-1/2 cursor-pointer"
                                style={{
                                  left: `${position}%`,
                                  bottom: `${kf.value * 100}%`,
                                  boxShadow: kf.frame === currentFrame ? '0 0 0 2px rgba(255,255,255,0.5)' : '0 0 1px rgba(0,0,0,0.5)'
                                }}
                                title={`Frame ${kf.frame}: ${(kf.value * 100).toFixed(0)}%`}
                              />
                            );
                          })}
                        </div>

                        <div className="flex justify-between mt-1">
                          <div className="text-xs">0</div>
                          <div className="text-xs">{totalFrames}</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}