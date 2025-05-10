"use client"

import type React from "react"
import { useState, useEffect } from "react"
import type { ImageOverlay } from "../../../types"
import { PositionTab } from "./tabs/position-tab"
import { ScaleTab } from "./tabs/scale-tab"
import { RotationTab } from "./tabs/rotation-tab"
import { OpacityTab } from "./tabs/opacity-tab"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SectionKey, OpacityKeyframe, PositionKeyframe, RotationKeyframe, ScaleKeyframe } from "./image-transform-types"

interface ImageTransformPanelProps {
  localOverlay: ImageOverlay
  handleStyleChange: (updates: Partial<ImageOverlay["styles"]>) => void
  handlePositionChange: (updates: Partial<Pick<ImageOverlay, "left" | "top" | "rotation">>) => void
  totalFrames?: number
  currentFrame?: number
  onKeyframeChange?: {
    opacity?: (keyframes: OpacityKeyframe[]) => void
    position?: (keyframes: PositionKeyframe[]) => void
    rotation?: (keyframes: RotationKeyframe[]) => void
    scale?: (keyframes: ScaleKeyframe[]) => void
  }
}

export const ImageTransformPanel: React.FC<ImageTransformPanelProps> = ({
  localOverlay,
  handleStyleChange,
  handlePositionChange,
  totalFrames = 0,
  currentFrame = 0,
  onKeyframeChange = {},
}) => {
  // Expanded panels state
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    position: true,
    scale: true,
    rotation: false,
    opacity: false,
  })

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
        <PositionTab 
          localOverlay={localOverlay}
          handlePositionChange={handlePositionChange}
          expanded={expanded.position}
          setExpanded={(isExpanded) => setExpanded(prev => ({ ...prev, position: isExpanded }))}
          totalFrames={totalFrames}
          currentFrame={currentFrame}
          onKeyframeChange={onKeyframeChange.position}
        />

        <ScaleTab 
          localOverlay={localOverlay}
          handleStyleChange={handleStyleChange}
          expanded={expanded.scale}
          setExpanded={(isExpanded) => setExpanded(prev => ({ ...prev, scale: isExpanded }))}
          totalFrames={totalFrames}
          currentFrame={currentFrame}
          // TODO: Implement keyframe support for scale
          // onKeyframeChange={onKeyframeChange.scale}
        />

        <RotationTab 
          localOverlay={localOverlay}
          handlePositionChange={handlePositionChange}
          expanded={expanded.rotation}
          setExpanded={(isExpanded) => setExpanded(prev => ({ ...prev, rotation: isExpanded }))}
          totalFrames={totalFrames}
          currentFrame={currentFrame}
          // TODO: Implement keyframe support for rotation
          // onKeyframeChange={onKeyframeChange.rotation}
        />

        <OpacityTab 
          localOverlay={localOverlay}
          handleStyleChange={handleStyleChange}
          expanded={expanded.opacity}
          setExpanded={(isExpanded) => setExpanded(prev => ({ ...prev, opacity: isExpanded }))}
          totalFrames={totalFrames}
          currentFrame={currentFrame}
          onKeyframeChange={onKeyframeChange.opacity}
        />
            </div>
    </TooltipProvider>
  )
}
