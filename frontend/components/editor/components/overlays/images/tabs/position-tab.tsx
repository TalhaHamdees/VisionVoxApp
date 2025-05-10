"use client"

import React, { useState, useEffect } from "react"
import { MoveHorizontal, MoveVertical, RotateCcw, ChevronRight, ChevronDown, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Slider } from "@/components/ui/slider"
import type { ImageOverlay } from "../../../../types"
import { TabBaseProps } from "../image-transform-types"

interface PositionTabProps extends TabBaseProps {
  localOverlay: ImageOverlay
  handlePositionChange: (updates: Partial<Pick<ImageOverlay, "left" | "top" | "rotation">>) => void
}

export const PositionTab: React.FC<PositionTabProps> = ({
  localOverlay,
  handlePositionChange,
  expanded,
  setExpanded,
}) => {
  // Local controlled state for position
  const [posX, setPosX] = useState<number>(localOverlay.left)
  const [posY, setPosY] = useState<number>(localOverlay.top)
  
  // Sync with overlay on change
  useEffect(() => {
    setPosX(localOverlay.left)
    setPosY(localOverlay.top)
  }, [localOverlay])

  // Position update handler
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

  // Reset position
  const resetPosition = () => updatePosition(0, 0)

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black shadow-sm overflow-hidden">
      <div 
        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {expanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} />}
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-800">
            <MoveHorizontal size={10} className="text-gray-700 dark:text-gray-300" />
          </div>
          <span>Position</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded min-w-[50px] text-center">
            {posX.toFixed(0)}, {posY.toFixed(0)}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                onClick={(e) => {
                  e.stopPropagation()
                  resetPosition()
                }}
              >
                <RotateCcw size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Reset position</TooltipContent>
          </Tooltip>
        </div>
      </div>
      {expanded && (
        <div className="p-3 space-y-3 border-t border-gray-200 dark:border-gray-800">
          {/* X */}
          <div>
            <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
              <span className="flex items-center gap-1">
                <MoveHorizontal size={12} /> X Position
              </span>
              <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                {posX.toFixed(0)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6 bg-white dark:bg-gray-900"
                    onClick={() => updatePosition(posX - 10)}
                  >
                    <ArrowLeft size={12} />
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
                    className="h-6 w-6 bg-white dark:bg-gray-900"
                    onClick={() => updatePosition(posX + 10)}
                  >
                    <ArrowRight size={12} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Move right</TooltipContent>
              </Tooltip>
            </div>
          </div>
          {/* Y */}
          <div>
            <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
              <span className="flex items-center gap-1">
                <MoveVertical size={12} /> Y Position
              </span>
              <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                {posY.toFixed(0)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6 bg-white dark:bg-gray-900"
                    onClick={() => updatePosition(undefined, posY - 10)}
                  >
                    <ArrowUp size={12} />
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
                    className="h-6 w-6 bg-white dark:bg-gray-900"
                    onClick={() => updatePosition(undefined, posY + 10)}
                  >
                    <ArrowDown size={12} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Move down</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 