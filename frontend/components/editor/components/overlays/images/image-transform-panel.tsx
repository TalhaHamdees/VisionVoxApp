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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

interface ImageTransformPanelProps {
  localOverlay: ImageOverlay
  handleStyleChange: (updates: Partial<ImageOverlay["styles"]>) => void
  handlePositionChange: (updates: Partial<Pick<ImageOverlay, "left" | "top" | "rotation">>) => void
  totalFrames?: number
  currentFrame?: number
}

type SectionKey = "position" | "scale" | "rotation" | "opacity" | "frames"

export const ImageTransformPanel: React.FC<ImageTransformPanelProps> = ({
  localOverlay,
  handleStyleChange,
  handlePositionChange,
  totalFrames = 0,
  currentFrame = 0,
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
  const [fadeInStart, setFadeInStart] = useState<number>(0)
  const [fadeInEnd, setFadeInEnd] = useState<number>(20)
  const [fadeOutStart, setFadeOutStart] = useState<number>(totalFrames > 50 ? totalFrames - 20 : 80)
  const [fadeOutEnd, setFadeOutEnd] = useState<number>(totalFrames || 100)
  
  // Keep track of the last interpolated opacity to avoid unnecessary updates
  const [lastInterpolatedOpacity, setLastInterpolatedOpacity] = useState<number>(opacityValue)

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

  // Derived opacity value based on interpolation
  const getInterpolatedOpacity = (frame: number) => {
    if (!useFrameInterpolation) return opacityValue
    
    // Apply the base opacity as a multiplier to the interpolated value
    return interpolate(
      frame,
      [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd],
      [0, 1, 1, 0]
    ) * opacityValue
  }
  
  // Update interpolated opacity when current frame changes
  useEffect(() => {
    if (useFrameInterpolation && currentFrame !== undefined) {
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
  }, [currentFrame, useFrameInterpolation, fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd, opacityValue])

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
      // If frame interpolation is on, we need to update the interpolated opacity
      // while keeping the base opacity value updated
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

  const sectionClass = "mb-3 bg-background rounded-lg border border-border shadow-sm transition-all"
  const headerClass =
    "flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors"
  const labelClass = "flex items-center gap-2 text-sm font-medium"
  const valueClass = "text-xs font-mono bg-background/50 px-2 py-1 rounded min-w-[60px] text-center"
  const controlsClass = "p-4 space-y-4 border-t border-border/50"
  const sliderLabelClass = "flex justify-between text-xs text-muted-foreground mb-1.5"
  
  // Generate preview frames
  const opacityPreview = generateOpacityPreview()

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
                      <div>
                        <div className={sliderLabelClass}>
                          <span className="flex items-center gap-1">Fade In Start</span>
                          <span className={valueClass}>Frame {fadeInStart}</span>
                        </div>
                        <Slider
                          value={[fadeInStart]}
                          min={0}
                          max={fadeInEnd}
                          step={1}
                          onValueChange={(v) => setFadeInStart(v[0])}
                          className="flex-1"
                          disabled={fadeInStart === fadeInEnd}
                        />
                      </div>
                      
                      <div>
                        <div className={sliderLabelClass}>
                          <span className="flex items-center gap-1">Fade In End</span>
                          <span className={valueClass}>Frame {fadeInEnd}</span>
                        </div>
                        <Slider
                          value={[fadeInEnd]}
                          min={fadeInStart}
                          max={fadeOutStart}
                          step={1}
                          onValueChange={(v) => setFadeInEnd(v[0])}
                          className="flex-1"
                        />
                      </div>
                      
                      <Separator className="my-2" />
                      
                      <div>
                        <div className={sliderLabelClass}>
                          <span className="flex items-center gap-1">Fade Out Start</span>
                          <span className={valueClass}>Frame {fadeOutStart}</span>
                        </div>
                        <Slider
                          value={[fadeOutStart]}
                          min={fadeInEnd}
                          max={fadeOutEnd}
                          step={1}
                          onValueChange={(v) => setFadeOutStart(v[0])}
                          className="flex-1"
                        />
                      </div>
                      
                      <div>
                        <div className={sliderLabelClass}>
                          <span className="flex items-center gap-1">Fade Out End</span>
                          <span className={valueClass}>Frame {fadeOutEnd}</span>
                        </div>
                        <Slider
                          value={[fadeOutEnd]}
                          min={fadeOutStart}
                          max={totalFrames || 100}
                          step={1}
                          onValueChange={(v) => setFadeOutEnd(v[0])}
                          className="flex-1"
                          disabled={fadeOutStart === fadeOutEnd}
                        />
                      </div>
                      
                      <div className="p-3 bg-muted/20 rounded-md border border-border/50">
                        <div className="text-xs text-muted-foreground mb-2">
                          Opacity Preview: {currentFrame !== undefined && (
                            <span className="text-primary font-medium">
                              Frame {currentFrame}: {(getInterpolatedOpacity(currentFrame) * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="h-8 w-full bg-background rounded-sm overflow-hidden relative">
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
                          
                          <div className="flex justify-between mt-1">
                            <div className="text-xs">0</div>
                            <div className="text-xs">{totalFrames || 100}</div>
                          </div>
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