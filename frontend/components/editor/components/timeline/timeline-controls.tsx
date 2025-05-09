"use client"

import React, { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Plus, Minus, Settings, Undo2, Redo2, ZoomIn, ZoomOut, Trash2, Scissors, Copy, ClipboardPaste } from "lucide-react"
import { useEditorContext } from "../../contexts/editor-context"
import { useTimeline } from "../../contexts/timeline-context"
import { MAX_ROWS, INITIAL_ROWS, ZOOM_CONSTRAINTS } from "../../constants"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTimelineShortcuts } from "../../hooks/use-timeline-shortcuts"

// Types
type AspectRatioOption = "16:9" | "9:16" | "1:1" | "4:5"

/**
 * Props for the TimelineControls component.
 * @interface TimelineControlsProps
 */
interface TimelineControlsProps {
  /** Indicates whether the timeline is currently playing */
  isPlaying: boolean
  /** Function to toggle between play and pause states */
  togglePlayPause: () => void
  /** The current frame number in the timeline */
  currentFrame: number
  /** The total duration of the timeline in frames */
  totalDuration: number
  /** Function to format frame numbers into a time string */
  formatTime: (frames: number) => string
  /** Function to select all timeline items */
  selectAll?: () => void
  /** Function to delete all selected timeline items */
  deleteSelected?: () => void
  /** Function to split timeline item at current time */
  splitAtCurrentTime?: () => void
  /** Function to copy selected timeline items */
  copySelected?: () => void
  /** Function to paste copied items */
  pasteItems?: () => void
}

/**
 * TimelineControls component provides video playback controls and aspect ratio selection.
 * It displays:
 * - Play/Pause button
 * - Current time / Total duration
 * - Aspect ratio selector (hidden on mobile)
 *
 * @component
 * @param {TimelineControlsProps} props - Component props
 * @returns {React.ReactElement} Rendered TimelineControls component
 *
 * @example
 * ```tsx
 * <TimelineControls
 *   isPlaying={isPlaying}
 *   togglePlayPause={handlePlayPause}
 *   currentFrame={currentFrame}
 *   totalDuration={duration}
 *   formatTime={formatTimeFunction}
 * />
 * ```
 */
export const TimelineControls: React.FC<TimelineControlsProps> = ({
  isPlaying,
  togglePlayPause,
  currentFrame,
  totalDuration,
  formatTime,
  selectAll,
  deleteSelected,
  splitAtCurrentTime,
  copySelected,
  pasteItems,
}) => {
  // Context
  const { aspectRatio, setAspectRatio, deleteOverlaysByRow, undo, redo, canUndo, canRedo, resetOverlays } =
    useEditorContext()

  const { visibleRows, addRow, removeRow, zoomScale, setZoomScale } = useTimeline()

  // Add this hook to enable shortcuts
  useTimelineShortcuts({
    handlePlayPause: () => {
      togglePlayPause()
    },
    undo,
    redo,
    canUndo,
    canRedo,
    zoomScale,
    setZoomScale,
    selectAll,
    deleteSelected,
    splitAtCurrentTime,
    copySelected,
    pasteItems,
  })

  // Keep track of previous frame to detect resets
  const prevFrameRef = React.useRef(currentFrame)
  const isPlayingRef = React.useRef(isPlaying)

  useEffect(() => {
    // Only update the ref when isPlaying changes
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    // Only run the check if we're actually playing
    if (isPlayingRef.current) {
      // Detect when frame suddenly drops to 0 from near the end
      if (prevFrameRef.current > totalDuration - 2 && currentFrame === 0) {
        togglePlayPause()
      }
    }

    prevFrameRef.current = currentFrame
  }, [currentFrame, totalDuration, togglePlayPause]) // Removed isPlaying from dependencies

  // Handlers
  const handlePlayPause = () => {
    togglePlayPause()
  }

  const handleAspectRatioChange = (value: string) => {
    setAspectRatio(value as AspectRatioOption)
  }

  const handleRemoveRow = () => {
    // Delete overlays on the last row before removing it
    deleteOverlaysByRow(visibleRows - 1)
    removeRow()
  }

  const handleSliderChange = useCallback(
    (value: number[]) => {
      setZoomScale(value[0] / 100)
    },
    [setZoomScale],
  )

  // Add state for dropdown
  const [dropdownOpen, setDropdownOpen] = React.useState(false)

  const handleReset = () => {
    resetOverlays()
    setDropdownOpen(false) // Close dropdown properly
  }

  // Add handlers for zoom in and zoom out buttons with long-press functionality
  const [zoomInterval, setZoomInterval] = useState<NodeJS.Timeout | null>(null)

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(ZOOM_CONSTRAINTS.max, zoomScale + ZOOM_CONSTRAINTS.zoomStep)
    setZoomScale(newZoom)
  }, [zoomScale, setZoomScale])

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(ZOOM_CONSTRAINTS.min, zoomScale - ZOOM_CONSTRAINTS.zoomStep)
    setZoomScale(newZoom)
  }, [zoomScale, setZoomScale])

  // Long press handlers
  const startZoomIn = useCallback(() => {
    handleZoomIn() // Immediate first zoom

    // Clear any existing interval
    if (zoomInterval) {
      clearInterval(zoomInterval)
    }

    // Set up interval for continuous zooming
    const interval = setInterval(() => {
      handleZoomIn()
    }, 150) // Adjust speed as needed

    setZoomInterval(interval)
  }, [handleZoomIn, zoomInterval])

  const startZoomOut = useCallback(() => {
    handleZoomOut() // Immediate first zoom

    // Clear any existing interval
    if (zoomInterval) {
      clearInterval(zoomInterval)
    }

    // Set up interval for continuous zooming
    const interval = setInterval(() => {
      handleZoomOut()
    }, 150) // Adjust speed as needed

    setZoomInterval(interval)
  }, [handleZoomOut, zoomInterval])

  const stopZoom = useCallback(() => {
    if (zoomInterval) {
      clearInterval(zoomInterval)
      setZoomInterval(null)
    }
  }, [zoomInterval])

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return
      }

      if (e.key === "+" || e.key === "=") {
        e.preventDefault()
        handleZoomIn()
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault()
        handleZoomOut()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleZoomIn, handleZoomOut])

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (zoomInterval) {
        clearInterval(zoomInterval)
      }
    }
  }, [zoomInterval])

  return (
    <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-black/95 px-3 py-2.5 backdrop-blur-sm">
      {/* Left section: Undo/Redo, Delete, Split, Copy, Paste */}
      <div className="flex items-center gap-1">
        <TooltipProvider delayDuration={50}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={undo}
                disabled={!canUndo}
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-black dark:text-white hover:text-black dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={5}
              className="bg-white dark:bg-black text-xs px-2 py-1 rounded-md z-[9999] border border-gray-200 dark:border-gray-800"
              align="start"
            >
              <div className="flex items-center gap-1">
                <span className="text-black dark:text-white">Undo</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-black dark:bg-black text-white rounded-md border border-gray-800">
                  ⌘Z
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={redo}
                disabled={!canRedo}
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-black dark:text-white hover:text-black dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={5}
              className="bg-white dark:bg-black text-xs px-2 py-1 rounded-md z-[9999] border border-gray-200 dark:border-gray-800"
              align="start"
            >
              <div className="flex items-center gap-1">
                <span className="text-black dark:text-white">Redo</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-black dark:bg-black text-white rounded-md border border-gray-800">
                  ⌘Y
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>
          
          {/* Delete button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => deleteSelected && deleteSelected()}
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={5}
              className="bg-white dark:bg-black text-xs px-2 py-1 rounded-md z-[9999] border border-gray-200 dark:border-gray-800"
              align="start"
            >
              <div className="flex items-center gap-1">
                <span className="text-black dark:text-white">Delete Selected</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-black dark:bg-black text-white rounded-md border border-gray-800">
                  ⌘⌫
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Split button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => splitAtCurrentTime && splitAtCurrentTime()}
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
              >
                <Scissors className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={5}
              className="bg-white dark:bg-black text-xs px-2 py-1 rounded-md z-[9999] border border-gray-200 dark:border-gray-800"
              align="start"
            >
              <div className="flex items-center gap-1">
                <span className="text-black dark:text-white">Split at Current Time</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-black dark:bg-black text-white rounded-md border border-gray-800">
                  C
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Copy button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => copySelected && copySelected()}
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={5}
              className="bg-white dark:bg-black text-xs px-2 py-1 rounded-md z-[9999] border border-gray-200 dark:border-gray-800"
              align="start"
            >
              <div className="flex items-center gap-1">
                <span className="text-black dark:text-white">Copy Selected</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-black dark:bg-black text-white rounded-md border border-gray-800">
                  ⌘C
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Paste button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => pasteItems && pasteItems()}
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/80"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={5}
              className="bg-white dark:bg-black text-xs px-2 py-1 rounded-md z-[9999] border border-gray-200 dark:border-gray-800"
              align="start"
            >
              <div className="flex items-center gap-1">
                <span className="text-black dark:text-white">Paste Items</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-black dark:bg-black text-white rounded-md border border-gray-800">
                  ⌘V
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {/* Center section: Play/Pause control and time display */}
      <div className="flex items-center space-x-2">
        <TooltipProvider delayDuration={50}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handlePlayPause}
                size="sm"
                variant="default"
                className="h-7 bg-white hover:bg-gray-100 dark:bg-black dark:hover:bg-gray-900"
              >
                {isPlaying ? (
                  <Pause className="h-3 w-3 text-black dark:text-white" />
                ) : (
                  <Play className="h-3 w-3 text-black dark:text-white" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={5}
              className="bg-white dark:bg-black text-xs px-2 py-1 rounded-md z-[9999] border border-gray-200 dark:border-gray-800"
              align="center"
            >
              <div className="flex items-center gap-1">
                <span className="text-black dark:text-white">{isPlaying ? "Pause" : "Play"}</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-black dark:bg-black text-white rounded-md border border-gray-800">
                  Space
                </kbd>
                <span className="text-gray-500 dark:text-gray-400">or</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-black dark:bg-black text-white rounded-md border border-gray-800">
                  ⌥ Space
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="flex items-center space-x-1">
          <span className="text-xs font-medium text-black dark:text-white tabular-nums">
            {formatTime(currentFrame)}
          </span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">/</span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">
            {formatTime(totalDuration)}
          </span>
        </div>
      </div>
      {/* Right section: Zoom controls and Settings menu */}
      <div className="flex items-center gap-1">
        {/* Zoom Out Button */}
        <TooltipProvider delayDuration={50}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleZoomOut}
                onMouseDown={startZoomOut}
                onMouseUp={stopZoom}
                onMouseLeave={stopZoom}
                onTouchStart={startZoomOut}
                onTouchEnd={stopZoom}
                disabled={zoomScale <= ZOOM_CONSTRAINTS.min}
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-black dark:text-white hover:text-black dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-colors rounded-md"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={5}
              className="bg-white dark:bg-black text-xs px-2 py-1 rounded-md z-[9999] border border-gray-200 dark:border-gray-800"
              align="center"
            >
              <div className="flex items-center gap-1">
                <span className="text-black dark:text-white">Zoom Out</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-black dark:bg-black text-white rounded-md border border-gray-800">
                  -
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Zoom In Button */}
        <TooltipProvider delayDuration={50}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleZoomIn}
                onMouseDown={startZoomIn}
                onMouseUp={stopZoom}
                onMouseLeave={stopZoom}
                onTouchStart={startZoomIn}
                onTouchEnd={stopZoom}
                disabled={zoomScale >= ZOOM_CONSTRAINTS.max}
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-black dark:text-white hover:text-black dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-colors rounded-md"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={5}
              className="bg-white dark:bg-black text-xs px-2 py-1 rounded-md z-[9999] border border-gray-200 dark:border-gray-800"
              align="center"
            >
              <div className="flex items-center gap-1">
                <span className="text-black dark:text-white">Zoom In</span>
                <kbd className="px-1 py-0.5 text-[10px] font-mono bg-black dark:bg-black text-white rounded-md border border-gray-800">
                  +
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Settings Menu */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-black dark:text-white hover:text-black dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-colors rounded-md"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-60 bg-white dark:bg-black border border-gray-200 dark:border-gray-800"
            side="top"
            align="end"
            sideOffset={8}
            collisionPadding={16}
            avoidCollisions={false}
          >
            <DropdownMenuLabel className="text-xs text-black dark:text-white">Timeline Settings</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-800" />

            {/* Row Controls */}
            <div className="px-2 py-2 space-y-1">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Rows</Label>
              <div className="flex gap-1 pt-1">
                <Button
                  onClick={handleRemoveRow}
                  disabled={visibleRows <= INITIAL_ROWS}
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 bg-white dark:bg-black border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900"
                >
                  <Minus className="h-4 w-4 text-black dark:text-white" />
                </Button>
                <span className="flex items-center justify-center w-12 text-xs text-gray-500 dark:text-gray-400">
                  {visibleRows}/{MAX_ROWS}
                </span>
                <Button
                  onClick={addRow}
                  disabled={visibleRows >= MAX_ROWS}
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 bg-white dark:bg-black border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900"
                >
                  <Plus className="h-4 w-4 text-black dark:text-white" />
                </Button>
              </div>
            </div>
            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-800" />

            {/* Aspect Ratio */}
            <div className="px-2 py-2 space-y-1">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Aspect Ratio</Label>
              <div className="grid grid-cols-3 gap-1 pt-1">
                {["9:16", "16:9", "4:5"].map((ratio) => (
                  <Button
                    key={ratio}
                    onClick={() => handleAspectRatioChange(ratio)}
                    size="sm"
                    variant={aspectRatio === ratio ? "default" : "outline"}
                    className={`h-8 transition-colors ${
                      aspectRatio === ratio
                        ? "bg-black hover:bg-gray-900 text-white border-0 dark:bg-white dark:hover:bg-gray-200 dark:text-black"
                        : "bg-white dark:bg-black border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 text-black dark:text-white"
                    }`}
                  >
                    {ratio}
                  </Button>
                ))}
              </div>
            </div>

            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-800" />

            {/* Reset Timeline */}
            <div className="px-2 py-2">
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="w-full text-black hover:text-black dark:text-white dark:hover:text-white 
                  bg-white hover:bg-gray-100 dark:bg-black dark:hover:bg-gray-900 
                  border-gray-200 dark:border-gray-800"
              >
                Reset Timeline
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

