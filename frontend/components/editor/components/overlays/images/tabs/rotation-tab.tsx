"use client"

import React, { useState, useEffect } from "react"
import { RotateCw, RotateCcw, ChevronRight, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { ImageOverlay } from "../../../../types"
import { TabBaseProps } from "../image-transform-types"

interface RotationTabProps extends TabBaseProps {
  localOverlay: ImageOverlay
  handlePositionChange: (updates: Partial<Pick<ImageOverlay, "left" | "top" | "rotation">>) => void
}

export const RotationTab: React.FC<RotationTabProps> = ({
  localOverlay,
  handlePositionChange,
  expanded,
  setExpanded,
}) => {
  // Local controlled state for rotation
  const [rotationValue, setRotationValue] = useState<number>(localOverlay.rotation || 0)
  
  // Sync with overlay on change
  useEffect(() => {
    setRotationValue(localOverlay.rotation || 0)
  }, [localOverlay.rotation])

  // Rotation update handler
  const updateRotation = (deg: number) => {
    setRotationValue(deg)

    // Only update the rotation property, keeping it separate from transform
    handlePositionChange({ rotation: deg })
  }

  // Reset rotation
  const resetRotation = () => updateRotation(0)

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black shadow-sm overflow-hidden">
      <div 
        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {expanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} />}
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-800">
            <RotateCw size={10} className="text-gray-700 dark:text-gray-300" />
          </div>
          <span>Rotation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded min-w-[50px] text-center">
            {rotationValue.toFixed(0)}°
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                onClick={(e) => {
                  e.stopPropagation()
                  resetRotation()
                }}
              >
                <RotateCcw size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Reset rotation</TooltipContent>
          </Tooltip>
        </div>
      </div>
      {expanded && (
        <div className="p-3 space-y-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
            <span>Angle</span>
            <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {rotationValue.toFixed(0)}°
            </span>
          </div>
          <div className="flex items-center gap-1.5">
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
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 90, 180, 270].map((deg) => (
              <Tooltip key={deg}>
                <TooltipTrigger asChild>
                  <Button 
                    variant={Math.abs(rotationValue - deg) < 1 ? "default" : "outline"} 
                    className={cn(
                      "bg-white dark:bg-gray-900 text-xs h-7",
                      Math.abs(rotationValue - deg) < 1 && "bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
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
    </div>
  )
} 