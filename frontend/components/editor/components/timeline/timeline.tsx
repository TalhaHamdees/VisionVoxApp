/**
 * Timeline Component
 *
 * A complex timeline interface that allows users to manage video overlays through
 * drag-and-drop interactions, splitting, duplicating, and deletion operations.
 * The timeline visualizes overlay positions and durations across video frames.
 */

"use client"

import type React from "react"
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { useTimeline } from "../../contexts/timeline-context"
import { useTimelineDragAndDrop } from "../../hooks/use-timeline-drag-and-drop"
import { useTimelineEventHandlers } from "../../hooks/use-timeline-event-handlers"
import { useTimelineState } from "../../hooks/use-timeline-state"
import type { Overlay, SelectedItems } from "../../types"
import GhostMarker from "./ghost-marker"
import TimelineGrid from "./timeline-grid"
import TimelineMarker from "./timeline-marker"
import TimeMarkers from "./timeline-markers"

interface TimelineProps {
  /** Array of overlay objects to be displayed on the timeline */
  overlays: Overlay[]
  /** Total duration of the video in frames */
  durationInFrames: number
  /** ID of the currently selected overlay */
  selectedOverlayId: number | null
  /** Callback to update the selected overlay */
  setSelectedOverlayId: (id: number | null) => void
  /** Set of IDs for selected overlays */
  selectedOverlayIds?: SelectedItems
  /** Callback to update multiple selected overlays */
  setSelectedOverlayIds?: (ids: SelectedItems) => void
  /** Add an overlay to the selection */
  addToSelection?: (id: number) => void
  /** Remove an overlay from selection */
  removeFromSelection?: (id: number) => void
  /** Clear all selections */
  clearSelection?: () => void
  /** Check if an overlay is selected */
  isSelected?: (id: number) => boolean
  /** Toggle selection state of an overlay */
  toggleSelection?: (id: number) => void
  /** Select all overlays */
  selectAll?: () => void
  /** Delete all selected overlays */
  deleteSelected?: () => void
  /** Current playhead position in frames */
  currentFrame: number
  /** Callback when an overlay is modified */
  onOverlayChange: (updatedOverlay: Overlay) => void
  /** Callback to update the current frame position */
  setCurrentFrame: (frame: number) => void
  /** Callback for timeline click events */
  onTimelineClick: (e: React.MouseEvent<HTMLDivElement>) => void
  /** Callback to delete an overlay */
  onOverlayDelete: (id: number) => void
  /** Callback to duplicate an overlay */
  onOverlayDuplicate: (id: number) => void
  /** Callback to split an overlay at a specific position */
  onSplitOverlay: (id: number, splitPosition: number) => void
}

const Timeline: React.FC<TimelineProps> = ({
  overlays,
  durationInFrames,
  selectedOverlayId,
  setSelectedOverlayId,
  selectedOverlayIds = new Set(),
  setSelectedOverlayIds = () => {},
  addToSelection = () => {},
  removeFromSelection = () => {},
  clearSelection = () => {},
  isSelected = () => false,
  toggleSelection = () => {},
  selectAll = () => {},
  deleteSelected = () => {},
  currentFrame,
  onOverlayChange,
  setCurrentFrame,
  onTimelineClick,
  onOverlayDelete,
  onOverlayDuplicate,
  onSplitOverlay,
}) => {
  // State for tracking hover position during split operations
  const [lastKnownHoverInfo, setLastKnownHoverInfo] = useState<{
    itemId: number
    position: number
  } | null>(null)

  // State for tracking drag selection
  const [selectionStart, setSelectionStart] = useState<{ x: number, y: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ x: number, y: number } | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const selectionBoxRef = useRef<HTMLDivElement>(null)

  const { visibleRows, timelineRef, zoomScale, handleWheelZoom } = useTimeline()

  // State for context menu visibility
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)

  // Custom hooks for timeline functionality
  const {
    isDragging,
    draggedItem,
    ghostElement,
    ghostMarkerPosition,
    dragInfo,
    handleDragStart: timelineStateHandleDragStart,
    updateGhostElement,
    resetDragState,
    setGhostMarkerPosition,
  } = useTimelineState(durationInFrames, visibleRows, timelineRef)

  const { handleDragStart, handleDrag, handleDragEnd } = useTimelineDragAndDrop({
    overlays,
    durationInFrames,
    onOverlayChange,
    updateGhostElement,
    resetDragState,
    timelineRef,
    dragInfo,
    maxRows: visibleRows,
  })

  const { handleMouseMove, handleTouchMove, handleTimelineMouseLeave } = useTimelineEventHandlers({
    handleDrag,
    handleDragEnd,
    isDragging,
    timelineRef,
    setGhostMarkerPosition,
  })

  // Event Handlers
  const combinedHandleDragStart = useCallback(
    (overlay: Overlay, clientX: number, clientY: number, action: "move" | "resize-start" | "resize-end") => {
      timelineStateHandleDragStart(overlay, clientX, clientY, action)
      handleDragStart(overlay, clientX, clientY, action)
    },
    [timelineStateHandleDragStart, handleDragStart],
  )

  const handleTimelineClick = useCallback(
    (clickPosition: number) => {
      const newFrame = Math.round(clickPosition * durationInFrames)
      setCurrentFrame(newFrame)
    },
    [durationInFrames, setCurrentFrame],
  )

  const handleDeleteItem = useCallback((id: number) => onOverlayDelete(id), [onOverlayDelete])

  const handleDuplicateItem = useCallback((id: number) => onOverlayDuplicate(id), [onOverlayDuplicate])

  const handleItemHover = useCallback((itemId: number, hoverPosition: number) => {
    setLastKnownHoverInfo({
      itemId,
      position: Math.round(hoverPosition),
    })
  }, [])

  const handleSplitItem = useCallback(
    (id: number) => {
      if (lastKnownHoverInfo?.itemId === id) {
        onSplitOverlay(id, lastKnownHoverInfo.position)
      }
    },
    [lastKnownHoverInfo, onSplitOverlay],
  )

  const handleContextMenuChange = useCallback((isOpen: boolean) => setIsContextMenuOpen(isOpen), [])

  const handleRemoveGap = useCallback(
    (rowIndex: number, gapStart: number) => {
      // Find all items that come after the gap in the same row
      const overlaysToShift = overlays
        .filter((overlay) => overlay.row === rowIndex && overlay.from > gapStart)
        .sort((a, b) => a.from - b.from)

      if (overlaysToShift.length === 0) return

      // Calculate the gap size based on the first overlay after the gap
      const firstOverlayAfterGap = overlaysToShift[0]
      const gapSize = firstOverlayAfterGap.from - gapStart

      // Create all updates at once
      const updates = overlaysToShift.map((overlay) => ({
        ...overlay,
        from: overlay.from - gapSize,
      }))

      // Apply all updates
      updates.forEach((update) => onOverlayChange(update))
    },
    [overlays, onOverlayChange],
  )

  // Mouse handlers for selection box
  const handleSelectionMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start selection if not clicking on an item and using left mouse button
    if (e.target === timelineRef.current && e.button === 0) {
      const rect = timelineRef.current?.getBoundingClientRect()
      if (rect) {
        setSelectionStart({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
        setSelectionEnd({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
        setIsSelecting(true)
        
        // Clear selection if not holding shift
        if (!e.shiftKey) {
          clearSelection()
        }
      }
    }
  }, [timelineRef, clearSelection])

  const handleSelectionMouseMove = useCallback((e: React.MouseEvent) => {
    if (isSelecting && selectionStart) {
      const rect = timelineRef.current?.getBoundingClientRect()
      if (rect) {
        setSelectionEnd({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
    }
  }, [isSelecting, selectionStart, timelineRef])

  const handleSelectionMouseUp = useCallback(() => {
    if (isSelecting) {
      setIsSelecting(false)
      
      // Only proceed if we have valid selection
      if (selectionStart && selectionEnd && selectionBoxRef.current) {
        const selectionRect = selectionBoxRef.current.getBoundingClientRect()
        
        // Find all timeline items that intersect with the selection box
        document.querySelectorAll('[data-overlay-id]').forEach((item) => {
          const itemRect = item.getBoundingClientRect()
          const idAttr = item.getAttribute('data-overlay-id')
          if (!idAttr) return
          
          const itemId = Number(idAttr)
          if (isNaN(itemId)) return
          
          // Check if item intersects with selection box
          if (
            itemRect.left < selectionRect.right &&
            itemRect.right > selectionRect.left &&
            itemRect.top < selectionRect.bottom &&
            itemRect.bottom > selectionRect.top
          ) {
            addToSelection(itemId)
          }
        })
      }
      
      // Reset selection box
      setSelectionStart(null)
      setSelectionEnd(null)
    }
  }, [isSelecting, selectionStart, selectionEnd, selectionBoxRef, addToSelection])

  // Custom keydown handler function
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if typing in form elements
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLElement && e.target.isContentEditable)
    ) {
      return
    }
    
    // Select all (Cmd+A)
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      e.preventDefault()
      if (typeof selectAll === 'function') {
        selectAll()
      }
    }
    
    // Delete selected (Cmd+Backspace)
    if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
      e.preventDefault()
      if (typeof deleteSelected === 'function') {
        deleteSelected()
      }
    }
    
    // Split at current time with 'c' key
    if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      // Only handle the 'c' key alone, not cmd+c or other combinations
      e.preventDefault()
      // Find selected overlay
      if (selectedOverlayId) {
        const overlay = overlays.find(o => o.id === selectedOverlayId)
        if (overlay) {
          // Check if current time is within overlay bounds
          if (currentFrame > overlay.from && currentFrame < (overlay.from + overlay.durationInFrames)) {
            onSplitOverlay(selectedOverlayId, currentFrame)
          }
        }
      }
    }
    
    // Copy with Cmd+C
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      // The TimelineControls will handle this with its copySelected function
    }
    
    // Paste with Cmd+V
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
      // The TimelineControls will handle this with its pasteItems function
    }
  }, [selectAll, deleteSelected, selectedOverlayId, overlays, currentFrame, onSplitOverlay])

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  useEffect(() => {
    const element = timelineRef.current
    if (!element) return

    element.addEventListener("wheel", handleWheelZoom, { passive: false })
    return () => element.removeEventListener("wheel", handleWheelZoom)
  }, [handleWheelZoom])

  // Calculate selection box dimensions
  const selectionBox = useMemo(() => {
    if (!selectionStart || !selectionEnd) return null
    
    const left = Math.min(selectionStart.x, selectionEnd.x)
    const top = Math.min(selectionStart.y, selectionEnd.y)
    const width = Math.abs(selectionEnd.x - selectionStart.x)
    const height = Math.abs(selectionEnd.y - selectionStart.y)
    
    return { left, top, width, height }
  }, [selectionStart, selectionEnd])

  // Render
  return (
    <div className="flex flex-col">
      <div
        className="relative overflow-x-auto scrollbar-hide timeline-container"
        style={{
          width: "100%",
          scrollbarWidth: "none" /* Firefox */,
          msOverflowStyle: "none" /* IE and Edge */,
        }}
        tabIndex={0}
      >
        <div
          ref={timelineRef}
          className="pl-2 pr-2 pb-2 relative bg-white dark:bg-black"
          style={{
            width: `${100 * zoomScale}%`,
            minWidth: "100%",
            willChange: "width, transform",
            transform: `translateZ(0)`,
          }}
          onMouseMove={(e) => {
            handleMouseMove(e)
            handleSelectionMouseMove(e)
          }}
          onTouchMove={handleTouchMove}
          onMouseDown={handleSelectionMouseDown}
          onMouseUp={(e) => {
            handleDragEnd()
            handleSelectionMouseUp()
          }}
          onTouchEnd={handleDragEnd}
          onMouseLeave={() => {
            handleTimelineMouseLeave()
            handleSelectionMouseUp()
          }}
          onClick={onTimelineClick}
        >
          <div className="relative h-full">
            {/* Timeline header with frame markers */}
            <div className="h-[1.3rem]">
              <TimeMarkers
                durationInFrames={durationInFrames}
                handleTimelineClick={handleTimelineClick}
                zoomScale={zoomScale}
              />
            </div>

            {/* Current frame indicator */}
            <TimelineMarker currentFrame={currentFrame} totalDuration={durationInFrames} />

            {/* Drag operation visual feedback */}
            <GhostMarker position={ghostMarkerPosition} isDragging={isDragging} isContextMenuOpen={isContextMenuOpen} />

            {/* Selection box */}
            {isSelecting && selectionBox && (
              <div 
                ref={selectionBoxRef}
                className="absolute pointer-events-none border-2 border-black dark:border-white bg-black/10 dark:bg-white/10 z-40"
                style={{
                  left: `${selectionBox.left}px`,
                  top: `${selectionBox.top}px`,
                  width: `${selectionBox.width}px`,
                  height: `${selectionBox.height}px`,
                }}
              />
            )}

            {/* Main timeline grid with overlays */}
            <TimelineGrid
              overlays={overlays}
              currentFrame={currentFrame}
              isDragging={isDragging}
              draggedItem={draggedItem}
              selectedOverlayId={selectedOverlayId}
              setSelectedOverlayId={setSelectedOverlayId}
              selectedOverlayIds={selectedOverlayIds}
              isSelected={isSelected}
              toggleSelection={toggleSelection}
              handleDragStart={combinedHandleDragStart}
              totalDuration={durationInFrames}
              ghostElement={ghostElement}
              onDeleteItem={handleDeleteItem}
              onDuplicateItem={handleDuplicateItem}
              onSplitItem={handleSplitItem}
              onHover={handleItemHover}
              onContextMenuChange={handleContextMenuChange}
              onRemoveGap={handleRemoveGap}
              zoomScale={zoomScale}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Timeline

