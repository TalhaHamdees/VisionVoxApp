"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Player, type PlayerRef } from "@remotion/player"
import { Main } from "../../remotion/main"
import { useEditorContext } from "../../contexts/editor-context"
import { FPS } from "../../constants"
import { Button } from "@/components/ui/button"
import { Maximize, Minimize, ZoomIn, ZoomOut, Crosshair, LayoutGrid, Ruler } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Slider } from "@/components/ui/slider"
import { Toggle } from "@/components/ui/toggle"

/**
 * Props for the VideoPlayer component
 * @interface VideoPlayerProps
 * @property {React.RefObject<PlayerRef>} playerRef - Reference to the Remotion player instance
 */
interface VideoPlayerProps {
  playerRef: React.RefObject<PlayerRef>
}

/**
 * VideoPlayer component that renders a responsive video editor with overlay support
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({ playerRef }) => {
  const {
    overlays,
    setSelectedOverlayId,
    changeOverlay,
    selectedOverlayId,
    aspectRatio,
    playerDimensions,
    updatePlayerDimensions,
    getAspectRatioDimensions,
    durationInFrames,
  } = useEditorContext()

  // State for player controls
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [showGrid, setShowGrid] = useState(false)
  const [showRulers, setShowRulers] = useState(false)
  const [showSafeZones, setShowSafeZones] = useState(false)

  /**
   * Updates the player dimensions when the container size or aspect ratio changes
   */
  useEffect(() => {
    const handleDimensionUpdate = () => {
      const videoContainer = document.querySelector(".video-container")
      if (!videoContainer) return

      const { width, height } = videoContainer.getBoundingClientRect()
      updatePlayerDimensions(width, height)
    }

    handleDimensionUpdate() // Initial update
    window.addEventListener("resize", handleDimensionUpdate)

    return () => {
      window.removeEventListener("resize", handleDimensionUpdate)
    }
  }, [aspectRatio, updatePlayerDimensions])

  const { width: compositionWidth, height: compositionHeight } = getAspectRatioDimensions()

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    const container = document.querySelector(".video-container")
    if (!container) return

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Adjust zoom level
  const handleZoomChange = (value: number[]) => {
    setZoomLevel(value[0])
  }

  // Constants for player configuration
  const PLAYER_CONFIG = {
    durationInFrames: durationInFrames,
    fps: FPS,
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-full h-full flex flex-col">
        {/* Player controls */}
        <div className="bg-black border-b border-gray-800 p-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Toggle
              pressed={showGrid}
              onPressedChange={setShowGrid}
              size="sm"
              variant="outline"
              className="h-6 bg-gray-900 border-gray-800 data-[state=on]:bg-gray-800 data-[state=on]:text-white"
            >
              <LayoutGrid className="h-3 w-3" />
            </Toggle>
            <Toggle
              pressed={showRulers}
              onPressedChange={setShowRulers}
              size="sm"
              variant="outline"
              className="h-6 bg-gray-900 border-gray-800 data-[state=on]:bg-gray-800 data-[state=on]:text-white"
            >
              <Ruler className="h-3 w-3" />
            </Toggle>
            <Toggle
              pressed={showSafeZones}
              onPressedChange={setShowSafeZones}
              size="sm"
              variant="outline"
              className="h-6 bg-gray-900 border-gray-800 data-[state=on]:bg-gray-800 data-[state=on]:text-white"
            >
              <Crosshair className="h-3 w-3" />
            </Toggle>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-gray-900 rounded-md px-1.5 py-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-gray-400 hover:text-white hover:bg-gray-800"
                onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <Slider
                value={[zoomLevel]}
                min={25}
                max={200}
                step={25}
                className="w-20"
                onValueChange={handleZoomChange}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-gray-400 hover:text-white hover:bg-gray-800"
                onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
              <span className="text-[10px] text-gray-300 font-mono ml-0.5">{zoomLevel}%</span>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-800"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Video player area */}
        <div className="flex-1 relative">
          <div
            className="z-0 video-container relative w-full h-full
          bg-[linear-gradient(45deg,#111_25%,transparent_25%,transparent_75%,#111_75%,#111),linear-gradient(45deg,#111_25%,transparent_25%,transparent_75%,#111_75%,#111)]
          bg-[length:16px_16px] bg-[position:0_0,8px_8px]
          border-l border-t border-b border-gray-900"
          >
            {/* Player wrapper with centering */}
            <div
              className="z-10 absolute inset-0 flex items-center justify-center"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transition: "transform 0.2s ease-out",
              }}
            >
              <div
                className="relative shadow-2xl"
                style={{
                  width: Math.min(playerDimensions.width, compositionWidth),
                  height: Math.min(playerDimensions.height, compositionHeight),
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
              >
                {/* Grid overlay */}
                {showGrid && (
                  <div className="absolute inset-0 z-20 pointer-events-none">
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage: `
                        linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)
                      `,
                        backgroundSize: "40px 40px",
                      }}
                    />
                  </div>
                )}

                {/* Safe zones */}
                {showSafeZones && (
                  <div className="absolute inset-0 z-20 pointer-events-none">
                    {/* Action safe (90%) */}
                    <div
                      className="absolute border border-gray-500/40 rounded-sm"
                      style={{
                        top: "5%",
                        left: "5%",
                        width: "90%",
                        height: "90%",
                      }}
                    />

                    {/* Title safe (80%) */}
                    <div
                      className="absolute border border-white/30 rounded-sm"
                      style={{
                        top: "10%",
                        left: "10%",
                        width: "80%",
                        height: "80%",
                      }}
                    />

                    {/* Center crosshair */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-px h-8 bg-white/20" />
                      <div className="h-px w-8 bg-white/20" />
                    </div>
                  </div>
                )}

                {/* Rulers */}
                {showRulers && (
                  <>
                    <div
                      className="absolute top-0 left-0 right-0 h-4 bg-black/50 z-20 pointer-events-none"
                      style={{
                        backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px)",
                        backgroundSize: "40px 4px",
                      }}
                    />
                    <div
                      className="absolute top-0 left-0 bottom-0 w-4 bg-black/50 z-20 pointer-events-none"
                      style={{
                        backgroundImage: "linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)",
                        backgroundSize: "4px 40px",
                      }}
                    />
                  </>
                )}

                <Player
                  ref={playerRef}
                  className="w-full h-full"
                  component={Main}
                  compositionWidth={compositionWidth}
                  compositionHeight={compositionHeight}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                  durationInFrames={PLAYER_CONFIG.durationInFrames}
                  fps={PLAYER_CONFIG.fps}
                  inputProps={{
                    overlays,
                    setSelectedOverlayId,
                    changeOverlay,
                    selectedOverlayId,
                    durationInFrames,
                    fps: FPS,
                    width: compositionWidth,
                    height: compositionHeight,
                  }}
                  errorFallback={() => <></>}
                  overflowVisible
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
