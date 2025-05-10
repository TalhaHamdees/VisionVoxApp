"use client"

import React, { useState, useEffect } from "react"
import { Clock, Plus, X, RefreshCw, Trash2, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ImageOverlay } from "../../../../types"
import { OpacityKeyframe } from "../image-transform-types"

interface OpacityKeyframeTimelineProps {
  localOverlay: ImageOverlay
  currentFrame?: number
  opacityKeyframes: OpacityKeyframe[]
  activeKeyframe: number | null
  useFrameInterpolation: boolean
  showCurvePreview: boolean
  draggedKeyframeFrame: number | null
  dragPreviewValue: number | null
  dragStartX: number
  opacityValue: number
  hasKeyframeAtCurrentFrame: boolean
  getInterpolatedOpacity: (frame: number) => number
  toggleCurvePreview: () => void
  addKeyframeAtCurrentTime: () => void
  selectKeyframe: (frame: number) => void
  updateKeyframePosition: (originalFrame: number, newFrame: number) => void
  removeKeyframe: (frame: number) => void
  navigateToNextKeyframe: () => void
  navigateToPrevKeyframe: () => void
  navigateToRelativeFrame: (frameOffset: number) => void
  updateOpacity: (percent: number) => void
  setActiveKeyframe: (frame: number | null) => void
  updateKeyframeOpacity: (frame: number, newOpacity: number) => void
  editKeyframeValue: (frame: number, newValue: number) => void
  setDraggedKeyframeFrame: (frame: number | null) => void
  setDragStartX: (x: number) => void
  setDragPreviewValue: (value: number | null) => void
  sortedKeyframes: OpacityKeyframe[]
}

export const OpacityKeyframeTimeline: React.FC<OpacityKeyframeTimelineProps> = ({
  localOverlay,
  currentFrame = 0,
  opacityKeyframes,
  activeKeyframe,
  useFrameInterpolation,
  showCurvePreview,
  draggedKeyframeFrame,
  dragPreviewValue,
  dragStartX,
  opacityValue,
  hasKeyframeAtCurrentFrame,
  getInterpolatedOpacity,
  toggleCurvePreview,
  addKeyframeAtCurrentTime,
  selectKeyframe,
  updateKeyframePosition,
  removeKeyframe,
  navigateToNextKeyframe,
  navigateToPrevKeyframe,
  navigateToRelativeFrame,
  updateOpacity,
  setActiveKeyframe,
  updateKeyframeOpacity,
  editKeyframeValue,
  setDraggedKeyframeFrame,
  setDragStartX,
  setDragPreviewValue,
  sortedKeyframes,
}) => {
  // Timeline scrubbing state
  const [scrubPosition, setScrubPosition] = useState<number | null>(null)
  const [timelineDragActive, setTimelineDragActive] = useState<boolean>(false)
  
  // Start dragging a keyframe
  const handleKeyframeDragStart = (frame: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setDraggedKeyframeFrame(frame)
    setDragStartX(e.clientX)
    setActiveKeyframe(frame)
    
    // Find the keyframe and get its current value
    const keyframe = opacityKeyframes.find(kf => kf.frame === frame)
    if (keyframe) {
      setDragPreviewValue(keyframe.value)
    }
  }
  
  // Handle keyframe dragging
  const handleKeyframeDrag = (e: MouseEvent) => {
    if (draggedKeyframeFrame === null) return
    
    // Calculate how many frames to move based on drag distance
    const timelineEl = document.querySelector('.keyframe-timeline')
    if (!timelineEl) return
    
    const timelineWidth = timelineEl.getBoundingClientRect().width
    const pixelsPerFrame = timelineWidth / localOverlay.durationInFrames
    const deltaX = e.clientX - dragStartX
    const frameDelta = Math.round(deltaX / pixelsPerFrame)
    
    if (frameDelta !== 0) {
      const targetFrame = Math.max(0, Math.min(localOverlay.durationInFrames, draggedKeyframeFrame + frameDelta))
      
      // Update preview value during drag
      if (dragPreviewValue !== null) {
        setDragPreviewValue(dragPreviewValue)
      }
      
      // Move keyframe
      updateKeyframePosition(draggedKeyframeFrame, targetFrame)
      setDraggedKeyframeFrame(targetFrame)
      setDragStartX(e.clientX)
    }
  }
  
  // End dragging
  const handleKeyframeDragEnd = () => {
    setDraggedKeyframeFrame(null)
    setDragPreviewValue(null)
  }

  // Navigate to next/previous frame
  const goToPreviousFrame = () => {
    if (currentFrame > localOverlay.from) {
      navigateToRelativeFrame(Math.max(0, (currentFrame - localOverlay.from) - 1))
    }
  }
  
  const goToNextFrame = () => {
    if (currentFrame < localOverlay.from + localOverlay.durationInFrames - 1) {
      navigateToRelativeFrame(Math.min(localOverlay.durationInFrames - 1, (currentFrame - localOverlay.from) + 1))
    }
  }
  
  // Enhanced handleTimelineHover to include drag interaction
  const handleTimelineHover = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const hoverPos = (e.clientX - rect.left) / rect.width
    const hoverFrame = Math.round(hoverPos * localOverlay.durationInFrames)
    setScrubPosition(hoverFrame)
  }
  
  // Find the closest keyframe to a given frame
  const findClosestKeyframe = (frame: number) => {
    if (!useFrameInterpolation || opacityKeyframes.length < 2) return null
    
    // Convert to relative frame position
    const relativeFrame = frame
    
    // Find nearest keyframe
    let closestKeyframe = null
    let minDistance = Number.MAX_VALUE
    
    for (const keyframe of opacityKeyframes) {
      const distance = Math.abs(keyframe.frame - relativeFrame)
      if (distance < minDistance) {
        minDistance = distance
        closestKeyframe = keyframe
      }
    }
    
    return closestKeyframe
  }

  // Snap to the closest keyframe when holding Alt key while clicking timeline
  const handleTimelineClickWithSnap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickPos = (e.clientX - rect.left) / rect.width
    const frameOffset = Math.round(clickPos * localOverlay.durationInFrames)
    
    // Check if Alt key is pressed for snapping to keyframes
    if (e.altKey && useFrameInterpolation) {
      const closestKeyframe = findClosestKeyframe(frameOffset)
      if (closestKeyframe) {
        // Navigate to the closest keyframe
        navigateToRelativeFrame(closestKeyframe.frame)
        setActiveKeyframe(closestKeyframe.frame)
        return
      }
    }
    
    // Normal timeline navigation
    navigateToRelativeFrame(frameOffset)
  }

  // Start dragging timeline scrubber
  const handleTimelineScrubStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setTimelineDragActive(true)
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickPos = (e.clientX - rect.left) / rect.width
    const frameOffset = Math.round(clickPos * localOverlay.durationInFrames)
    
    // Set the scrub position
    setScrubPosition(frameOffset)
    
    // Add event listeners for drag
    window.addEventListener('mousemove', handleTimelineScrubMove)
    window.addEventListener('mouseup', handleTimelineScrubEnd)
  }

  // Handle timeline scrubber dragging
  const handleTimelineScrubMove = (e: MouseEvent) => {
    if (!timelineDragActive) return
    
    // Find timeline element
    const timelineEl = document.querySelector('.keyframe-timeline')
    if (!timelineEl) return
    
    const rect = timelineEl.getBoundingClientRect()
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const frameOffset = Math.round(pos * localOverlay.durationInFrames)
    
    // Update scrub position
    setScrubPosition(frameOffset)
    
    // Navigate to this frame (this would update the player position)
    navigateToRelativeFrame(frameOffset)
  }

  // End timeline scrubber dragging
  const handleTimelineScrubEnd = () => {
    setTimelineDragActive(false)
    
    // Remove event listeners
    window.removeEventListener('mousemove', handleTimelineScrubMove)
    window.removeEventListener('mouseup', handleTimelineScrubEnd)
  }

  // Generate points for opacity curve visualization
  const generateCurvePoints = () => {
    if (!useFrameInterpolation || opacityKeyframes.length < 2) return ''
    
    // Generate more points for smoother curve representation
    const numPoints = 100
    const points = []
    
    for (let i = 0; i < numPoints; i++) {
      const frame = (i / (numPoints - 1)) * localOverlay.durationInFrames
      const opacity = getInterpolatedOpacity(frame)
      
      // Convert to SVG coordinate space
      // x: 0 to 100% of width
      // y: 0% opacity at bottom, 100% at top (inverted for SVG coordinates)
      const x = (frame / localOverlay.durationInFrames) * 100
      const y = 100 - (opacity * 100) // Invert for SVG coordinates
      
      points.push(`${x},${y}`)
    }
    
    return points.join(' ')
  }

  // Add event listeners for dragging
  useEffect(() => {
    if (draggedKeyframeFrame !== null) {
      window.addEventListener('mousemove', handleKeyframeDrag)
      window.addEventListener('mouseup', handleKeyframeDragEnd)
      
      return () => {
        window.removeEventListener('mousemove', handleKeyframeDrag)
        window.removeEventListener('mouseup', handleKeyframeDragEnd)
      }
    }
  }, [draggedKeyframeFrame])

  return (
    <div className="space-y-2">
      {/* Timeline header */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium flex items-center gap-1.5">
          <Clock size={12} className="text-gray-500" />
          <span>Opacity Timeline</span>
          <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1.5 h-4">
            {localOverlay.durationInFrames} frames
          </Badge>
          
          {/* Toggle curve view button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={showCurvePreview ? "default" : "outline"} 
                size="icon" 
                className="h-5 w-5 ml-1"
                onClick={toggleCurvePreview}
              >
                <RefreshCw size={10} className={showCurvePreview ? "text-white" : ""} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Toggle curve view (V)</TooltipContent>
          </Tooltip>
        </div>
        <div className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded flex items-center gap-1">
          <span className="text-gray-500 dark:text-gray-400">Frame:</span>
          <span className="font-mono text-gray-700 dark:text-gray-300">{currentFrame - localOverlay.from}</span>
          <span className="text-gray-400 dark:text-gray-500">/</span>
          <span className="font-mono">{localOverlay.durationInFrames}</span>
        </div>
      </div>

      {/* Timeline metadata */}
      <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800 flex justify-between text-[10px]">
        <div className="flex flex-col">
          <div className="text-gray-500 dark:text-gray-400 mb-0.5">Timeline Position</div>
          <div className="font-medium flex items-center">
            <span className="text-gray-700 dark:text-gray-300 font-mono">{localOverlay.from}</span>
            <span className="mx-1 text-gray-400 dark:text-gray-500">→</span>
            <span className="text-gray-700 dark:text-gray-300 font-mono">{localOverlay.from + localOverlay.durationInFrames}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-gray-500 dark:text-gray-400 mb-0.5">Duration</div>
          <div className="font-medium">
            <span className="font-mono text-gray-700 dark:text-gray-300">{localOverlay.durationInFrames}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-0.5">frames</span>
            <span className="text-gray-400 dark:text-gray-500 mx-1">·</span>
            <span className="font-mono text-gray-700 dark:text-gray-300">{(localOverlay.durationInFrames / 30).toFixed(1)}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-0.5">sec</span>
          </div>
        </div>
      </div>

      {/* Keyframe shortcut reference */}
      <div className="flex items-center justify-between text-[10px] px-2 py-1 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded shadow-sm text-gray-800 dark:text-gray-200 mr-1">K</kbd>
            Add keyframe
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="flex items-center">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded shadow-sm text-gray-800 dark:text-gray-200 mr-1">Del</kbd>
            Remove
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded shadow-sm text-gray-800 dark:text-gray-200 mr-1">Alt+←→</kbd>
            Navigate
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="flex items-center">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded shadow-sm text-gray-800 dark:text-gray-200 mr-1">V</kbd>
            View curve
          </span>
        </div>
      </div>

      {/* Timeline scrubbing state */}
      <div className="relative h-16 bg-white dark:bg-black rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden keyframe-timeline">
        {/* Frame grid */}
        <div className="absolute inset-0">
          {/* Major frame markers */}
          {Array.from({ length: Math.min(Math.ceil(localOverlay.durationInFrames / 10) + 1, 20) }).map((_, i) => {
            const framePos = i * 10; // Every 10 frames
            const position = (framePos / localOverlay.durationInFrames) * 100;
            if (framePos <= localOverlay.durationInFrames) {
              return (
                <div 
                  key={`major-${i}`} 
                  className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700"
                  style={{ left: `${position}%` }}
                >
                  <div className="absolute bottom-1 transform -translate-x-1/2 text-[8px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {framePos}
                  </div>
                </div>
              );
            }
            return null;
          })}
          
          {/* Minor frame markers - every 5 frames */}
          {Array.from({ length: Math.ceil(localOverlay.durationInFrames / 5) + 1 }).map((_, i) => {
            const framePos = i * 5; // Every 5 frames
            const position = (framePos / localOverlay.durationInFrames) * 100;
            const isMajorMarker = framePos % 10 === 0;
            
            if (!isMajorMarker && framePos <= localOverlay.durationInFrames) {
              return (
                <div 
                  key={`minor-${i}`} 
                  className="absolute top-0 h-1 w-px bg-gray-200 dark:bg-gray-700"
                  style={{ 
                    left: `${position}%`,
                    top: '16px' 
                  }}
                />
              );
            }
            return null;
          })}

          {/* Background track */}
          <div className="absolute bottom-0 left-0 right-0 h-2.5 bg-gray-100 dark:bg-gray-800 rounded-b-sm"></div>

          {/* Duration track */}
          <div className="absolute bottom-0 left-0 h-2.5 bg-gray-300 dark:bg-gray-700 rounded-sm"
                style={{ width: '100%' }}></div>
           
          {/* Opacity curve visualization */}
          {showCurvePreview && opacityKeyframes.length >= 2 && (
            <div className="absolute inset-x-0 bottom-0 h-10 top-4">
              <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 100 100" 
                preserveAspectRatio="none"
                className="opacity-70"
              >
                {/* Area under curve */}
                <polygon
                  points={`0,100 ${generateCurvePoints()} 100,100`}
                  fill="url(#opacity-gradient)"
                  className="opacity-30"
                />
                
                {/* Curve line */}
                <polyline
                  points={generateCurvePoints()}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-yellow-500 dark:text-yellow-400"
                />
                
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="opacity-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(250, 204, 21)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="rgb(250, 204, 21)" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}
               
          {/* Keyframe markers */}
          {sortedKeyframes.map((keyframe, index) => {
            const position = (keyframe.frame / localOverlay.durationInFrames) * 100;
            const isActive = activeKeyframe === keyframe.frame;
            const isDragging = draggedKeyframeFrame === keyframe.frame;
            
            return (
              <div
                key={keyframe.id || `keyframe-${index}`}
                className={`absolute bottom-0 w-2.5 h-2.5 transform -translate-x-1/2 cursor-pointer z-10 ${isDragging ? 'animate-pulse' : ''}`}
                style={{ left: `${position}%`, bottom: '0px' }}
                onMouseDown={(e) => handleKeyframeDragStart(keyframe.frame, e)}
                onClick={(e) => {
                  e.stopPropagation();
                  selectKeyframe(keyframe.frame);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  // Allow editing the keyframe value directly
                  const newValue = prompt('Enter opacity value (0-100):', (keyframe.value * 100).toFixed(0));
                  if (newValue !== null) {
                    const numValue = parseFloat(newValue);
                    if (!isNaN(numValue)) {
                      editKeyframeValue(keyframe.frame, numValue);
                    }
                  }
                }}
              >
                <div 
                  className={`w-2.5 h-2.5 rounded-full border-2 shadow-sm transition-all duration-150 
                    ${isActive 
                      ? 'bg-yellow-500 dark:bg-yellow-400 border-white dark:border-black scale-125' 
                      : 'bg-gray-700 dark:bg-gray-300 border-white dark:border-black'
                    }
                    ${isDragging ? 'scale-125 ring-2 ring-yellow-400 dark:ring-yellow-500' : ''}
                  `} 
                />
                
                {/* Display vertical line from keyframe to curve if showing curve */}
                {showCurvePreview && (
                  <div 
                    className="absolute bottom-2.5 w-px h-10 bg-yellow-500/30 dark:bg-yellow-400/30 pointer-events-none"
                    style={{ left: '50%' }}
                  />
                )}
                
                {/* Value tooltip on hover/active/dragging */}
                {(isActive || isDragging) && (
                  <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-[8px] font-medium px-1 py-0.5 rounded shadow-sm whitespace-nowrap pointer-events-none z-20">
                    {isDragging && dragPreviewValue !== null 
                      ? `${(dragPreviewValue * 100).toFixed(0)}%` 
                      : `${(keyframe.value * 100).toFixed(0)}%`}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Current frame indicator */}
        {currentFrame !== undefined && 
          currentFrame >= localOverlay.from && 
          currentFrame < localOverlay.from + localOverlay.durationInFrames && (
          <div 
            className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none z-20"
            style={{
              left: `${((currentFrame - localOverlay.from) / localOverlay.durationInFrames) * 100}%`,
            }}
          >
            <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-gray-700 dark:border-t-gray-300"></div>
            <div className="w-0.5 h-full bg-gray-700 dark:bg-gray-300"></div>
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 text-[8px] font-medium text-gray-700 dark:text-gray-300 px-1 py-0.5 bg-white/90 dark:bg-black/90 rounded border border-gray-200 dark:border-gray-800 shadow-sm backdrop-blur-sm">
              {currentFrame - localOverlay.from}
            </div>
          </div>
        )}

        {/* Scrub indicator */}
        {scrubPosition !== null && !timelineDragActive && (
          <div 
            className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none z-10"
            style={{
              left: `${(scrubPosition / localOverlay.durationInFrames) * 100}%`,
            }}
          >
            <div className="w-0.5 h-full bg-gray-400/30 dark:bg-gray-500/30"></div>
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 text-[8px] font-medium px-1 py-0.5 rounded border bg-white/70 dark:bg-black/70 text-gray-700 dark:text-gray-300 backdrop-blur-sm">
              {scrubPosition}
            </div>
          </div>
        )}
        
        {/* Scrubber handle */}
        {timelineDragActive && scrubPosition !== null && (
          <div 
            className="absolute top-0 bottom-0 flex flex-col items-center z-30 cursor-grabbing"
            style={{
              left: `${(scrubPosition / localOverlay.durationInFrames) * 100}%`,
            }}
          >
            <div className="w-1 h-full bg-blue-500"></div>
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 text-[8px] font-medium px-1.5 py-0.5 rounded bg-blue-500 text-white shadow-sm">
              {scrubPosition}
            </div>
          </div>
        )}

        {/* Interactive area for scrubbing */}
        <div 
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={handleTimelineClickWithSnap}
          onMouseDown={handleTimelineScrubStart}
          onMouseMove={handleTimelineHover}
          onMouseLeave={() => !timelineDragActive && setScrubPosition(null)}
        />
      </div>

      {/* Keyframe value editor */}
      <div className="mt-3 p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-yellow-500 dark:bg-yellow-400 rounded-full"></div>
            {activeKeyframe !== null ? (
              <span>Edit Keyframe at Frame {activeKeyframe}</span>
            ) : hasKeyframeAtCurrentFrame ? (
              <span>Edit Keyframe at Current Frame</span>
            ) : (
              <span>Set Keyframe Values</span>
            )}
          </div>
          
          {activeKeyframe !== null && activeKeyframe !== (currentFrame - localOverlay.from) && (
            <Badge 
              variant="outline" 
              className="text-[9px] py-0 h-4 px-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => navigateToRelativeFrame(activeKeyframe)}
            >
              Go to frame
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-center">
          <div className="text-[10px] text-gray-500 dark:text-gray-400">Frame:</div>
          <div className="flex items-center gap-1">
            <div className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded min-w-[30px] text-center">
              {activeKeyframe !== null ? 
                activeKeyframe : 
                hasKeyframeAtCurrentFrame ? 
                  (currentFrame - localOverlay.from) : 
                  '–'
              }
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">of {localOverlay.durationInFrames}</span>
          </div>
          
          <div className="text-[10px] text-gray-500 dark:text-gray-400">Opacity:</div>
          <div className="flex items-center gap-1.5">
            <Slider 
              value={[opacityValue * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={(values) => {
                const newOpacity = values[0]
                updateOpacity(newOpacity)
                
                // If we have an active keyframe or are at a keyframe, update its value
                if (activeKeyframe !== null) {
                  updateKeyframeOpacity(activeKeyframe, newOpacity)
                } else if (hasKeyframeAtCurrentFrame) {
                  updateKeyframeOpacity(currentFrame - localOverlay.from, newOpacity)
                }
              }}
              className="flex-1"
            />
            <div 
              className="text-[10px] font-mono bg-white dark:bg-black px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 min-w-[40px] text-center cursor-pointer"
              onClick={() => {
                // Allow direct editing of the opacity value
                const newValue = prompt('Enter opacity value (0-100):', (opacityValue * 100).toFixed(0))
                if (newValue !== null) {
                  const numValue = parseFloat(newValue)
                  if (!isNaN(numValue)) {
                    updateOpacity(numValue)
                    
                    // If we have an active keyframe or are at a keyframe, update its value
                    if (activeKeyframe !== null) {
                      updateKeyframeOpacity(activeKeyframe, numValue)
                    } else if (hasKeyframeAtCurrentFrame) {
                      updateKeyframeOpacity(currentFrame - localOverlay.from, numValue)
                    }
                  }
                }
              }}
            >
              {(opacityValue * 100).toFixed(0)}%
            </div>
          </div>
        </div>
        
        {/* Keyframe controls */}
        <div className="mt-3 flex justify-between items-center">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-6 w-6 bg-white dark:bg-black text-yellow-600 dark:text-yellow-400"
                  title="Previous Keyframe"
                  onClick={() => {
                    if (sortedKeyframes.length === 0) return;
                    
                    // If we have an active keyframe, find its index and go to previous
                    if (activeKeyframe !== null) {
                      const currentIndex = sortedKeyframes.findIndex(kf => kf.frame === activeKeyframe);
                      if (currentIndex > 0) {
                        // Go to previous keyframe
                        const prevKeyframe = sortedKeyframes[currentIndex - 1];
                        navigateToRelativeFrame(prevKeyframe.frame);
                        selectKeyframe(prevKeyframe.frame);
                      } else if (currentIndex === 0) {
                        // At first keyframe, loop to last
                        const lastKeyframe = sortedKeyframes[sortedKeyframes.length - 1];
                        navigateToRelativeFrame(lastKeyframe.frame);
                        selectKeyframe(lastKeyframe.frame);
                      }
                    } else {
                      // No active keyframe, go to the last one
                      const lastKeyframe = sortedKeyframes[sortedKeyframes.length - 1];
                      navigateToRelativeFrame(lastKeyframe.frame);
                      selectKeyframe(lastKeyframe.frame);
                    }
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    <ArrowLeft className="h-3 w-3" />
                    <div className="absolute w-1 h-1 bg-yellow-500 dark:bg-yellow-400 rounded-full" />
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Previous Keyframe</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-6 w-6 bg-white dark:bg-black text-yellow-600 dark:text-yellow-400"
                  title="Next Keyframe"
                  onClick={() => {
                    if (sortedKeyframes.length === 0) return;
                    
                    // If we have an active keyframe, find its index and go to next
                    if (activeKeyframe !== null) {
                      const currentIndex = sortedKeyframes.findIndex(kf => kf.frame === activeKeyframe);
                      if (currentIndex < sortedKeyframes.length - 1) {
                        // Go to next keyframe
                        const nextKeyframe = sortedKeyframes[currentIndex + 1];
                        navigateToRelativeFrame(nextKeyframe.frame);
                        selectKeyframe(nextKeyframe.frame);
                      } else if (currentIndex === sortedKeyframes.length - 1) {
                        // At last keyframe, loop to first
                        const firstKeyframe = sortedKeyframes[0];
                        navigateToRelativeFrame(firstKeyframe.frame);
                        selectKeyframe(firstKeyframe.frame);
                      }
                    } else {
                      // No active keyframe, go to the first one
                      const firstKeyframe = sortedKeyframes[0];
                      navigateToRelativeFrame(firstKeyframe.frame);
                      selectKeyframe(firstKeyframe.frame);
                    }
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    <ArrowRight className="h-3 w-3" />
                    <div className="absolute w-1 h-1 bg-yellow-500 dark:bg-yellow-400 rounded-full" />
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Next Keyframe</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={hasKeyframeAtCurrentFrame ? "destructive" : "default"}
                  className="h-6 px-1.5 text-[10px] flex gap-1 items-center"
                  onClick={hasKeyframeAtCurrentFrame ? 
                    () => removeKeyframe(currentFrame - localOverlay.from) : 
                    addKeyframeAtCurrentTime
                  }
                >
                  {hasKeyframeAtCurrentFrame ? (
                    <>
                      <Trash2 className="h-2.5 w-2.5" /> Remove
                    </>
                  ) : (
                    <>
                      <Plus className="h-2.5 w-2.5" /> Add Keyframe
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {hasKeyframeAtCurrentFrame ? "Remove keyframe (Delete)" : "Add keyframe at current position (K)"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* Quick opacity presets for keyframe */}
        <div className="mt-2.5 flex justify-between gap-1.5">
          {[0, 25, 50, 75, 100].map((percent) => (
            <Button
              key={percent}
              variant={Math.abs(opacityValue * 100 - percent) < 1 ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-6 text-[10px] px-0 flex-1",
                Math.abs(opacityValue * 100 - percent) < 1 
                  ? "bg-gray-800 dark:bg-gray-700 text-white" 
                  : "bg-white dark:bg-black"
              )}
              onClick={() => {
                updateOpacity(percent)
                
                // If we have an active keyframe or are at a keyframe, update its value
                if (activeKeyframe !== null) {
                  updateKeyframeOpacity(activeKeyframe, percent)
                } else if (hasKeyframeAtCurrentFrame) {
                  updateKeyframeOpacity(currentFrame - localOverlay.from, percent)
                }
              }}
            >
              {percent}%
            </Button>
          ))}
        </div>
      </div>
      
      {/* Keyframe list */}
      <div className="mt-3">
        <div className="text-xs font-medium mb-1.5 flex items-center justify-between">
          <div className="flex items-center">
            <span className="mr-1.5">Keyframes</span>
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
              {opacityKeyframes.length}
            </Badge>
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">
            Double-click to edit
          </div>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
          {sortedKeyframes.map((keyframe, index) => {
            const isActive = keyframe.frame === activeKeyframe;
            const isAtCurrentFrame = keyframe.frame === (currentFrame - localOverlay.from);
            return (
              <div 
                key={keyframe.id || `kf-item-${index}`}
                className={cn(
                  "flex items-center justify-between p-1.5 rounded-md border transition-colors relative",
                  isActive 
                    ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 ring-2 ring-yellow-400/30 dark:ring-yellow-400/20" 
                    : isAtCurrentFrame
                      ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700" 
                      : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                onClick={() => selectKeyframe(keyframe.frame)}
                onDoubleClick={() => {
                  // Allow editing the keyframe value directly
                  const newValue = prompt('Enter opacity value (0-100):', (keyframe.value * 100).toFixed(0));
                  if (newValue !== null) {
                    const numValue = parseFloat(newValue);
                    if (!isNaN(numValue)) {
                      editKeyframeValue(keyframe.frame, numValue);
                    }
                  }
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div 
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isActive
                        ? "bg-yellow-500 dark:bg-yellow-400"
                        : isAtCurrentFrame
                          ? "bg-gray-700 dark:bg-gray-300"
                          : "bg-gray-500 dark:bg-gray-500"
                    )}
                  />
                  <span className={cn(
                    "text-[10px]",
                    isActive ? "font-medium text-yellow-800 dark:text-yellow-300" : "font-medium"
                  )}>
                    Frame {keyframe.frame}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "text-[10px] font-mono px-1 py-0.5 rounded border",
                    isActive 
                      ? "bg-yellow-100 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-800" 
                      : "bg-white dark:bg-black border-gray-200 dark:border-gray-800"
                  )}>
                    {(keyframe.value * 100).toFixed(0)}%
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        size="icon"
                        className={cn(
                          "h-5 w-5 rounded-full",
                          isActive 
                            ? "bg-red-500 hover:bg-red-600 text-white" 
                            : "hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeKeyframe(keyframe.frame);
                          if (activeKeyframe === keyframe.frame) {
                            setActiveKeyframe(null);
                          }
                        }}
                        disabled={opacityKeyframes.length <= 2}
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Delete keyframe</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  )
} 