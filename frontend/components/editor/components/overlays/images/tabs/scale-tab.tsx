"use client"

import React, { useState, useEffect } from "react"
import { Maximize2, RotateCcw, ChevronRight, ChevronDown, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { ImageOverlay } from "../../../../types"
import { TabBaseProps } from "../image-transform-types"

interface ScaleTabProps extends TabBaseProps {
  localOverlay: ImageOverlay
  handleStyleChange: (updates: Partial<ImageOverlay["styles"]>) => void
}

export const ScaleTab: React.FC<ScaleTabProps> = ({
  localOverlay,
  handleStyleChange,
  expanded,
  setExpanded,
}) => {
  // Local controlled state for scale
  const [scaleValue, setScaleValue] = useState<number>(
    Number(localOverlay.styles.transform?.match(/scale\(([^)]+)\)/)?.[1] ?? 1),
  )
  
  // Sync with overlay on change
  useEffect(() => {
    const match = localOverlay.styles.transform?.match(/scale\(([^)]+)\)/)
    setScaleValue(match ? Number(match[1]) : 1)
  }, [localOverlay.styles.transform])

  // Scale update handler
  const updateScale = (percent: number) => {
    const s = percent / 100
    setScaleValue(s)

    // Ensure we're only updating scale in transform, not affecting rotation
    handleStyleChange({ transform: `scale(${s})` })
  }

  // Reset scale
  const resetScale = () => updateScale(100)

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-black shadow-sm overflow-hidden">
      <div 
        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {expanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} />}
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-800">
            <Maximize2 size={10} className="text-gray-700 dark:text-gray-300" />
          </div>
          <span>Scale</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded min-w-[50px] text-center">
            {(scaleValue * 100).toFixed(0)}%
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                onClick={(e) => {
                  e.stopPropagation()
                  resetScale()
                }}
              >
                <RotateCcw size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Reset scale</TooltipContent>
          </Tooltip>
        </div>
      </div>
      {expanded && (
        <div className="p-3 space-y-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
            <span>Scale Factor</span>
            <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {(scaleValue * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
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
          <div className="flex justify-between gap-1.5">
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
    </div>
  )
} 