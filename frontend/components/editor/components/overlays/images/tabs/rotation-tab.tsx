"use client"

import React, { useState, useEffect, useMemo } from "react"
import { RotateCw, RotateCcw, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { ImageOverlay } from "../../../../types"
import {
  TabBaseProps,
  RotationKeyframe,
  generateKeyframeId,
  formatters,
  generateKeyframeWithOverlayId,
} from "../image-transform-types"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { KeyframeTimeline } from "./keyframe-timeline"

interface RotationTabProps extends TabBaseProps {
  localOverlay: ImageOverlay
  handlePositionChange: (
    updates: Partial<Pick<ImageOverlay, "left" | "top" | "rotation">>,
  ) => void
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
  /* ──────────────── Basic state ──────────────── */
  const [rotationValue, setRotationValue] = useState<number>(
    localOverlay.rotation ?? 0,
  )
  const [useFrameInterpolation, setUseFrameInterpolation] =
    useState<boolean>(false)

  /* ──────────────── Keyframe state ──────────────── */
  const [rotationKeyframes, setRotationKeyframes] =
    useState<RotationKeyframe[]>([])
  const [lastInterpolatedRotation, setLastInterpolatedRotation] =
    useState<number>(rotationValue)
  const [draggedKeyframeFrame, setDraggedKeyframeFrame] =
    useState<number | null>(null)
  const [dragStartX, setDragStartX] = useState<number>(0)
  const [activeKeyframe, setActiveKeyframe] = useState<number | null>(null)
  const [dragPreviewValue, setDragPreviewValue] = useState<number | null>(null)
  const [showCurvePreview, setShowCurvePreview] = useState<boolean>(false)

  /* ──────────────── Helpers ──────────────── */
  const sortedKeyframes = useMemo(
    () => [...rotationKeyframes].sort((a, b) => a.frame - b.frame),
    [rotationKeyframes],
  )

  const hasKeyframeAtCurrentFrame = useMemo(() => {
    if (currentFrame === undefined) return false
    const relativeFrame = currentFrame - localOverlay.from
    return rotationKeyframes.some((kf) => kf.frame === relativeFrame)
  }, [currentFrame, localOverlay.from, rotationKeyframes])

  useEffect(() => {
    if (useFrameInterpolation) return
    setRotationValue(localOverlay.rotation ?? 0)
  }, [localOverlay.rotation, useFrameInterpolation])

  /* ──────────────── Core update ──────────────── */
  const clampDeg = (deg: number) =>
    Math.max(-360, Math.min(360, Number.isFinite(deg) ? deg : 0))

  const updateRotation = (deg: number) => {
    const clamped = clampDeg(deg)
    setRotationValue(clamped)

    if (hasKeyframeAtCurrentFrame && currentFrame !== undefined) {
      const relative = currentFrame - localOverlay.from
      updateKeyframeValue(relative, clamped)
    } else {
      setLastInterpolatedRotation(clamped)
      handlePositionChange({ rotation: clamped })
    }
  }

  const resetRotation = () => updateRotation(0)

  /* ──────────────── Keyframe CRUD ──────────────── */
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
      // Add new keyframe with ID tied to this overlay
      const newKeyframe = {
        frame: relativeFrame,
        value: rotationValue,
        id: generateKeyframeWithOverlayId(localOverlay.uniqueId),
        overlayUniqueId: localOverlay.uniqueId,
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

  const updateKeyframeValue = (frame: number, value: number) => {
    const updated = rotationKeyframes.map((kf) =>
      kf.frame === frame ? { ...kf, value } : kf,
    )
    setRotationKeyframes(updated)
    onKeyframeChange?.(updated)
    setRotationValue(value)
    setLastInterpolatedRotation(value)
    handlePositionChange({ rotation: value })
  }

  const editKeyframeValue = (frame: number, directValue?: number) => {
    const kf = rotationKeyframes.find((k) => k.frame === frame)
    if (!kf) return

    const newVal =
      typeof directValue === "number"
        ? directValue
        : prompt(
            "Enter rotation in degrees (-360 to 360):",
            kf.value.toString(),
          )
    if (newVal === null) return
    const parsed = clampDeg(Number(newVal))
    updateKeyframeValue(frame, parsed)
  }

  const selectKeyframe = (frame: number) => {
    setActiveKeyframe(frame)
    const kf = rotationKeyframes.find((k) => k.frame === frame)
    if (kf) {
      setRotationValue(kf.value)
      setLastInterpolatedRotation(kf.value)
      handlePositionChange({ rotation: kf.value })
      navigateToRelativeFrame(frame)
    }
  }

  const removeKeyframe = (frame: number) => {
    const updated = rotationKeyframes.filter((kf) => kf.frame !== frame)
    setRotationKeyframes(updated)
    onKeyframeChange?.(updated)
    if (activeKeyframe === frame) setActiveKeyframe(null)
  }

  const updateKeyframePosition = (oldF: number, newF: number) => {
    const exists = rotationKeyframes.find((k) => k.frame === newF)
    let updated: RotationKeyframe[]

    if (exists && oldF !== newF) {
      const moving = rotationKeyframes.find((k) => k.frame === oldF)!
      updated = rotationKeyframes
        .filter((k) => k.frame !== oldF && k.frame !== newF)
        .concat([{ ...moving, frame: newF }])
    } else {
      updated = rotationKeyframes.map((k) =>
        k.frame === oldF ? { ...k, frame: newF } : k,
      )
    }

    setRotationKeyframes(updated)
    setActiveKeyframe(newF)
    onKeyframeChange?.(updated)
  }

  /* ──────────────── Navigation helpers ──────────────── */
  const navigateToRelativeFrame = (frame: number) => {
    if (currentFrame === undefined) return
    /* hook into global player here if needed */
  }

  const goToKeyframe = (direction: "next" | "prev") => {
    if (rotationKeyframes.length === 0) return
    const frames = [...rotationKeyframes]
      .sort((a, b) => a.frame - b.frame)
      .map((kf) => kf.frame)

    if (activeKeyframe === null) {
      const target = direction === "next" ? frames[0] : frames[frames.length - 1]
      navigateToRelativeFrame(target)
      setActiveKeyframe(target)
      return
    }

    const idx = frames.indexOf(activeKeyframe)
    if (idx === -1) return

    let target: number
    if (direction === "next") {
      target = idx < frames.length - 1 ? frames[idx + 1] : frames[0]
    } else {
      target = idx > 0 ? frames[idx - 1] : frames[frames.length - 1]
    }

    navigateToRelativeFrame(target)
    setActiveKeyframe(target)
  }

  /* ──────────────── Curve helpers ──────────────── */
  const shortestDistance = (start: number, end: number) => {
    let diff = end - start
    while (diff > 180) diff -= 360
    while (diff < -180) diff += 360
    return diff
  }

  const generateCurvePoints = () => {
    if (rotationKeyframes.length < 2) return ""
    const sorted = [...rotationKeyframes].sort((a, b) => a.frame - b.frame)
    const points: string[] = []

    const interp = (
      p1: { frame: number; rot: number },
      p2: { frame: number; rot: number },
      n: number,
    ) => {
      const pts = []
      const dist = shortestDistance(p1.rot, p2.rot)
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const frame = p1.frame + t * (p2.frame - p1.frame)
        const x = (frame / localOverlay.durationInFrames) * 100
        const smooth = t * t * (3 - 2 * t)
        const rot = p1.rot + smooth * dist
        const y = 100 - ((rot + 360) / 720) * 100 // map −360→360 → 0→100
        pts.push(`${x},${y}`)
      }
      return pts
    }

    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = sorted[i]
      const nxt = sorted[i + 1]
      const segPts = interp(
        { frame: cur.frame, rot: cur.value },
        { frame: nxt.frame, rot: nxt.value },
        Math.max(4, Math.min(16, Math.floor((nxt.frame - cur.frame) / 2))),
      )
      if (i === 0) points.push(segPts[0])
      points.push(...segPts.slice(1))
    }
    return points.join(" ")
  }

  const getInterpolatedRotation = (frame: number) => {
    if (rotationKeyframes.length === 0) return rotationValue
    if (rotationKeyframes.length === 1) return rotationKeyframes[0].value

    const sorted = [...rotationKeyframes].sort((a, b) => a.frame - b.frame)
    if (frame <= sorted[0].frame) return sorted[0].value
    if (frame >= sorted[sorted.length - 1].frame)
      return sorted[sorted.length - 1].value

    for (let i = 0; i < sorted.length - 1; i++) {
      if (frame >= sorted[i].frame && frame <= sorted[i + 1].frame) {
        const t =
          (frame - sorted[i].frame) / (sorted[i + 1].frame - sorted[i].frame)
        const dist = shortestDistance(sorted[i].value, sorted[i + 1].value)
        return sorted[i].value + t * dist
      }
    }
    return rotationValue
  }

  useEffect(() => {
    if (!useFrameInterpolation || currentFrame === undefined) return
    const rel = currentFrame - localOverlay.from
    const interp = getInterpolatedRotation(rel)
    if (Math.abs(interp - lastInterpolatedRotation) > 0.5) {
      setRotationValue(interp)
      setLastInterpolatedRotation(interp)
      handlePositionChange({ rotation: interp })
    }
  }, [
    currentFrame,
    useFrameInterpolation,
    rotationKeyframes,
    lastInterpolatedRotation,
    localOverlay.from,
  ])

  /* ──────────────── UI ──────────────── */
  const quickDegrees = [-180, -90, 0, 90, 180]

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium">
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              expanded && "rotate-90",
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
          {/* Enable keyframe switch */}
          <div className="flex items-center justify-between px-2">
            <Label
              htmlFor="enable-rotation-keyframes"
              className="text-xs font-normal cursor-pointer"
            >
              Enable keyframe animation
            </Label>
            <Switch
              id="enable-rotation-keyframes"
              checked={useFrameInterpolation}
              onCheckedChange={setUseFrameInterpolation}
            />
          </div>

          {/* Normal rotation controls */}
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
                      onClick={() => updateRotation(rotationValue - 15)}
                    >
                      <RotateCcw size={12} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rotate counter-clockwise</TooltipContent>
                </Tooltip>

                <Slider
                  id="rotation-normal-slider"
                  value={[rotationValue]}
                  min={-360}
                  max={360}
                  step={1}
                  onValueChange={([v]) => updateRotation(v)}
                  className="flex-1"
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-6 w-6 bg-white dark:bg-gray-900"
                      onClick={() => updateRotation(rotationValue + 15)}
                    >
                      <RotateCw size={12} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rotate clockwise</TooltipContent>
                </Tooltip>
              </div>

              <Separator className="my-2" />

              <div className="grid grid-cols-5 gap-1.5 px-2">
                {quickDegrees.map((deg) => (
                  <Tooltip key={deg}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={
                          Math.abs(rotationValue - deg) < 1 ? "default" : "outline"
                        }
                        className={cn(
                          "bg-white dark:bg-gray-900 text-xs h-7",
                          Math.abs(rotationValue - deg) < 1 &&
                            "bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600",
                        )}
                        onClick={() => updateRotation(deg)}
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

          {/* Keyframe-enabled controls */}
          {useFrameInterpolation && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Current Rotation
                  </span>
                  <span className="text-xs font-medium">
                    {rotationValue.toFixed(0)}°
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={addKeyframeAtCurrentTime}
                  disabled={
                    currentFrame < localOverlay.from ||
                    currentFrame >=
                      localOverlay.from + localOverlay.durationInFrames
                  }
                >
                  {hasKeyframeAtCurrentFrame ? "Update Keyframe" : "Add Keyframe"}
                </Button>
              </div>

              <div className="flex flex-col space-y-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="rotation-kf-slider"
                    className="text-xs font-normal text-muted-foreground w-12"
                  >
                    Angle
                  </Label>

                  <Slider
                    id="rotation-kf-slider"
                    min={-360}
                    max={360}
                    step={1}
                    value={[rotationValue]}
                    onValueChange={([v]) => updateRotation(v)}
                    aria-label="Rotation"
                    className="flex-1 mx-2"
                  />

                  <div className="flex items-center gap-1">
                    <span className="w-12 text-xs tabular-nums text-muted-foreground text-right">
                      {rotationValue.toFixed(0)}°
                    </span>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                          onClick={() => {
                            const input = prompt(
                              "Enter rotation in degrees (-360 to 360):",
                              rotationValue.toString(),
                            )
                            if (input !== null) {
                              const parsed = clampDeg(Number(input))
                              updateRotation(parsed)
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

                <div className="grid grid-cols-5 gap-1.5">
                  {quickDegrees.map((deg) => (
                    <Button
                      key={deg}
                      variant={
                        Math.abs(rotationValue - deg) < 1 ? "default" : "outline"
                      }
                      className={cn(
                        "text-xs h-6 text-center",
                        Math.abs(rotationValue - deg) < 1 &&
                          "bg-teal-600 hover:bg-teal-700",
                      )}
                      onClick={() => updateRotation(deg)}
                    >
                      {deg}°
                    </Button>
                  ))}
                </div>
              </div>

              {/* Timeline */}
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
                valueFormatter={(v) => `${v}°`}
                curveColor="teal"
                getInterpolatedValue={getInterpolatedRotation}
                generateCurvePoints={generateCurvePoints}
                toggleCurvePreview={() => setShowCurvePreview((s) => !s)}
                addKeyframeAtCurrentTime={addKeyframeAtCurrentTime}
                selectKeyframe={selectKeyframe}
                updateKeyframePosition={updateKeyframePosition}
                removeKeyframe={removeKeyframe}
                navigateToNextKeyframe={() => goToKeyframe("next")}
                navigateToPrevKeyframe={() => goToKeyframe("prev")}
                navigateToRelativeFrame={navigateToRelativeFrame}
                updatePropertyValue={updateRotation}
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
