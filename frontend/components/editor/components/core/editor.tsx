"use client"

import React, { useState } from "react"
import { EditorHeader } from "./editor-header"

import { useEditorContext } from "../../contexts/editor-context"
import { TimelineControls } from "../timeline/timeline-controls"
import { FPS } from "../../constants"
import Timeline from "../timeline/timeline"
import { VideoPlayer } from "./video-player"
import { Overlay } from "../../types"
import AdvancedSettingsPanel from "./advanced-settings-panel"

/**
 * Main Editor Component
 *
 * @component
 * @description
 * The core editor interface that orchestrates the video editing experience.
 * This component manages:
 * - Video playback and controls
 * - Timeline visualization and interaction
 * - Overlay management (selection, modification, deletion)
 * - Responsive behavior for desktop/mobile views
 *
 * The component uses the EditorContext to manage state and actions across
 * its child components. It implements a responsive design that shows a
 * mobile-specific message for smaller screens.
 *
 * Key features:
 * - Video player integration
 * - Timeline controls (play/pause, seeking)
 * - Overlay management (selection, modification)
 * - Frame-based navigation
 * - Mobile detection and fallback UI
 *
 * @example
 * \`\`\`tsx
 * <Editor />
 * \`\`\`
 */
export const Editor: React.FC = () => {
  /** State to track if the current viewport is mobile-sized */
  const [isMobile, setIsMobile] = React.useState(false)
  
  /** State to store copied items */
  const [copiedItems, setCopiedItems] = useState<Overlay[]>([])

  /** State for advanced settings tab selection */
  const [selectedSettingsTab, setSelectedSettingsTab] = useState<"keyframes" | "effects" | "audio">("keyframes")

  /**
   * Effect to handle mobile detection and window resize events
   * Uses 768px as the standard mobile breakpoint
   */
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  /**
   * Destructure values and functions from the editor context
   * These provide core functionality for the editor's features
   */
  const {
    overlays, // Array of current overlay objects
    selectedOverlayId, // ID of the currently selected overlay
    setSelectedOverlayId, // Function to update selected overlay
    selectedOverlayIds, // Set of IDs for selected overlays
    setSelectedOverlayIds, // Function to set selected overlays
    addToSelection, // Add an overlay to the selection
    removeFromSelection, // Remove an overlay from selection
    clearSelection, // Clear all selections
    isSelected, // Check if an overlay is selected
    toggleSelection, // Toggle selection state of an overlay
    selectAll, // Select all overlays
    deleteSelected, // Delete all selected overlays
    isPlaying, // Current playback state
    currentFrame, // Current frame position
    playerRef, // Reference to video player
    togglePlayPause, // Function to toggle play/pause
    formatTime, // Function to format time display
    handleOverlayChange, // Function to handle overlay modifications
    handleTimelineClick, // Function to handle timeline interaction
    deleteOverlay, // Function to remove an overlay
    duplicateOverlay, // Function to clone an overlay
    splitOverlay, // Function to split an overlay at current position
    durationInFrames, // Total duration in frames
    addOverlay, // Function to add a new overlay
  } = useEditorContext()

  /**
   * Handle splitting the selected item at the current time position
   */
  const handleSplitAtCurrentTime = () => {
    // Only proceed if an item is selected
    if (selectedOverlayId !== null) {
      // Find the selected overlay
      const overlay = overlays.find(o => o.id === selectedOverlayId)
      if (overlay) {
        // Check if current frame is within the overlay duration
        if (currentFrame > overlay.from && currentFrame < overlay.from + overlay.durationInFrames) {
          splitOverlay(selectedOverlayId, currentFrame)
        }
      }
    }
  }

  /**
   * Handle copying selected items
   */
  const handleCopySelected = () => {
    // Only copy the single selected item, not multiple selections
    if (selectedOverlayId !== null) {
      const selectedOverlay = overlays.find(o => o.id === selectedOverlayId);
      if (selectedOverlay) {
        setCopiedItems([selectedOverlay]);
        console.log(`Copied item: ${selectedOverlay.id}`);
      }
    }
  }

  /**
   * Handle pasting copied items
   */
  const handlePasteItems = () => {
    if (copiedItems.length === 0) return;
    
    // We're only pasting the first item (should be the only one anyway)
    const itemToPaste = copiedItems[0];
    
    // Check if there are any existing clips at the playhead position that need to be split
    const clipsToSplit = overlays.filter(overlay => {
      // Check if this overlay's row is the same as the one we're pasting to
      const isSameRow = overlay.row === itemToPaste.row;
      
      // Check if the playhead is within the overlay's time range
      const isPlayheadInsideClip = 
        currentFrame > overlay.from && 
        currentFrame < (overlay.from + overlay.durationInFrames);
      
      return isSameRow && isPlayheadInsideClip;
    });
    
    // Split any clips that the playhead is currently over
    // We need to do this before pasting to make space for our pasted clip
    clipsToSplit.forEach(clip => {
      splitOverlay(clip.id, currentFrame);
    });
    
    // Now check for any clips that start exactly at the playhead position
    // We need to move these clips out of the way
    const clipsStartingAtPlayhead = overlays.filter(overlay => {
      return overlay.row === itemToPaste.row && overlay.from === currentFrame;
    });
    
    // We need to move any clips that start at playhead position by the duration of our pasted item
    const pasteShiftDistance = itemToPaste.durationInFrames;
    
    // Move all clips that start at the playhead position
    clipsStartingAtPlayhead.forEach(clip => {
      handleOverlayChange({
        ...clip,
        from: clip.from + pasteShiftDistance // Push the clip forward
      });
    });
    
    // Now duplicate our item to be pasted
    duplicateOverlay(itemToPaste.id);
    
    // Get the ID of the newly created item (should be the highest ID)
    const newItemId = Math.max(...overlays.map(o => o.id));
    
    // Position the pasted item at the playhead
    if (newItemId) {
      const newItem = overlays.find(o => o.id === newItemId);
      if (newItem) {
        handleOverlayChange({
          ...newItem,
          from: currentFrame // Place exactly at playhead position
        });
      }
    }
    
    console.log(`Pasted item at frame ${currentFrame}, after splitting existing clips`);
  }

  /**
   * Mobile fallback UI
   * Displays a message when accessed on mobile devices
   */
  if (isMobile) {
    return (
      <div className="flex items-center justify-center h-screen bg-black dark:bg-black p-6">
        <div className="text-center text-white dark:text-white">
          <h2 className="text-xl font-bold mb-3">React Video Editor</h2>
          <p className="text-sm text-gray-300 dark:text-gray-300 font-light mb-4">
            VisionVox Editor is designed as a full-screen desktop experience.
          </p>
        </div>
      </div>
    )
  }

  /**
   * Main editor layout
   * Organized in a column layout with the following sections:
   * 1. Editor header (controls and options)
   * 2. Main content area (video player on right, settings on left)
   * 3. Timeline controls
   * 4. Timeline visualization
   */
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black">
      <EditorHeader />
      <div className="flex-grow flex flex-row overflow-hidden">
        {/* Left side panel area (red outline in the screenshot) */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black overflow-y-auto">
          <div className="h-full flex flex-col">
            {/* Tab navigation for the advanced settings */}
            <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-800 p-2 bg-white dark:bg-black">
              <button 
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedSettingsTab === "keyframes" 
                    ? "bg-gray-200 text-black dark:bg-gray-800 dark:text-white" 
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                }`}
                onClick={() => setSelectedSettingsTab("keyframes")}
              >
                Keyframes
              </button>
              <button 
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedSettingsTab === "effects" 
                    ? "bg-gray-200 text-black dark:bg-gray-800 dark:text-white" 
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                }`}
                onClick={() => setSelectedSettingsTab("effects")}
              >
                Effects
              </button>
              <button 
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedSettingsTab === "audio" 
                    ? "bg-gray-200 text-black dark:bg-gray-800 dark:text-white" 
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                }`}
                onClick={() => setSelectedSettingsTab("audio")}
              >
                Audio
              </button>
            </div>
            
            {/* Content area for the advanced settings */}
            <div className="flex-1 overflow-y-auto">
              <AdvancedSettingsPanel 
                selectedTab={selectedSettingsTab}
                selectedOverlay={overlays.find(o => o.id === selectedOverlayId) || null}
                selectedOverlayId={selectedOverlayId}
                selectedOverlayIds={selectedOverlayIds}
                overlays={overlays}
                handleOverlayChange={handleOverlayChange}
                currentFrame={currentFrame}
                durationInFrames={durationInFrames}
              />
            </div>
          </div>
        </div>
        
        {/* Right side video player (green outline in the screenshot) */}
        <div className="w-1/2">
          <VideoPlayer playerRef={playerRef} />
        </div>
      </div>

      <TimelineControls
        isPlaying={isPlaying}
        togglePlayPause={togglePlayPause}
        currentFrame={currentFrame}
        totalDuration={durationInFrames}
        formatTime={formatTime}
        selectAll={selectAll}
        deleteSelected={deleteSelected}
        splitAtCurrentTime={handleSplitAtCurrentTime}
        copySelected={handleCopySelected}
        pasteItems={handlePasteItems}
      />

      <Timeline
        currentFrame={currentFrame}
        overlays={overlays}
        durationInFrames={durationInFrames}
        selectedOverlayId={selectedOverlayId}
        setSelectedOverlayId={setSelectedOverlayId}
        selectedOverlayIds={selectedOverlayIds}
        setSelectedOverlayIds={setSelectedOverlayIds}
        addToSelection={addToSelection}
        removeFromSelection={removeFromSelection}
        clearSelection={clearSelection}
        isSelected={isSelected}
        toggleSelection={toggleSelection}
        selectAll={selectAll}
        deleteSelected={deleteSelected}
        onOverlayChange={handleOverlayChange}
        onOverlayDelete={deleteOverlay}
        onOverlayDuplicate={duplicateOverlay}
        onSplitOverlay={splitOverlay}
        setCurrentFrame={(frame) => {
          if (playerRef.current) {
            playerRef.current.seekTo(frame / FPS)
          }
        }}
        onTimelineClick={handleTimelineClick}
      />
    </div>
  )
}