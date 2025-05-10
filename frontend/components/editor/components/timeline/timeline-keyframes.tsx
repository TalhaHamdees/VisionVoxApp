"use client"

import React from "react"
import { type Overlay, OverlayType } from "../../types"
import { FPS } from "../../constants"
import { useKeyframes } from "../../hooks/use-keyframes"

/**
 * Props for the TimelineKeyframes component
 */
interface TimelineKeyframesProps {
  /** The overlay object containing video/animation data */
  overlay: Overlay
  /** The current frame number in the timeline */
  currentFrame: number
  /** Scale factor for timeline zoom level */
  zoomScale: number
}

/**
 * TimelineKeyframes component displays a timeline of video frames
 * with preview thumbnails at regular intervals.
 */
export const TimelineKeyframes: React.FC<TimelineKeyframesProps> = ({ overlay, currentFrame, zoomScale }) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const { frames, previewFrames } = useKeyframes({
    overlay,
    containerRef,
    currentFrame,
    zoomScale,
  })

  // Check if overlay has image keyframe data stored
  const hasKeyframes =
    overlay.type === OverlayType.IMAGE &&
    overlay.keyframes &&
    Array.isArray(overlay.keyframes) &&
    overlay.keyframes.length > 0

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden w-full relative">
      <div className="flex h-full w-full">
        {previewFrames.map((previewFrame, index) => {
          const frameIndex = Math.floor(previewFrame / FPS)

          return (
            <div
              key={index}
              className="relative border-r border-slate-700 dark:border-slate-800 last:border-r-0 flex-1"
            >
              {frames[frameIndex] ? (
                <img
                  src={frames[frameIndex] || "/placeholder.svg"}
                  alt={`Frame ${previewFrame}`}
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="sync"
                />
              ) : (
                <div className="h-full w-full bg-slate-100/10 dark:bg-slate-800/30" />
              )}
              <div className="absolute inset-0" />
            </div>
          )
        })}
      </div>

      {/* Render keyframe markers */}
      {hasKeyframes && (
        <div className="absolute inset-0 pointer-events-none">
          {overlay.keyframes!.map((kf: any, index: number) => {
            const position = (kf.frame / overlay.durationInFrames) * 100
            return (
              <div
                key={`kf-${index}`}
                className="absolute top-0 h-full w-0.5 bg-yellow-400 dark:bg-yellow-500"
                style={{
                  left: `${position}%`,
                  opacity: 0.7,
                }}
              >
                <div className="absolute bottom-0 w-2 h-2 bg-yellow-400 dark:bg-yellow-500 rounded-full transform -translate-x-[3px] translate-y-[3px] shadow-sm" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
