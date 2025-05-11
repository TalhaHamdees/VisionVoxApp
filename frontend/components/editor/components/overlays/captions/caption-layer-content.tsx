"use client"

import type React from "react"
import { useCurrentFrame } from "remotion"
import type { Caption, CaptionOverlay } from "../../../types"
import { defaultCaptionStyles } from "./caption-settings"

/**
 * Props for the CaptionLayerContent component
 * @interface CaptionLayerContentProps
 * @property {CaptionOverlay} overlay - The caption overlay object containing timing and style information
 */
interface CaptionLayerContentProps {
  overlay: CaptionOverlay
}

/**
 * CaptionLayerContent Component
 *
 * @component
 * @description
 * Renders animated captions in the video editor with word-by-word highlighting.
 * Features include:
 * - Word-by-word timing and animation
 * - Customizable text styles and animations
 * - Smooth transitions between words
 * - Dynamic highlighting based on current frame
 *
 * The component calculates timing for each word and applies appropriate
 * styling and animations based on the current playback position.
 *
 * @example
 * \`\`\`tsx
 * <CaptionLayerContent
 *   overlay={{
 *     captions: [...],
 *     styles: {...},
 *     // other overlay properties
 *   }}
 * />
 * \`\`\`
 */
export const CaptionLayerContent: React.FC<CaptionLayerContentProps> = ({ overlay }) => {
  const frame = useCurrentFrame()
  const frameMs = (frame / 30) * 1000
  const styles = overlay.styles || defaultCaptionStyles

  /**
   * Finds the current caption based on the frame timestamp
   */
  const currentCaption = overlay.captions.find(
    (caption) => frameMs >= caption.startMs && frameMs <= caption.endMs,
  )

  if (!currentCaption) return null

  /**
   * Renders individual words with highlight animations
   * @param caption - The current caption object containing words and timing
   */
  const renderWords = (caption: Caption) => {
    return caption?.words?.map((word, index) => {
      const isHighlighted = frameMs >= word.startMs && frameMs <= word.endMs
      // Calculate progress for smoother animation
      const progress = isHighlighted ? Math.min((frameMs - word.startMs) / 300, 1) : 0
      // Calculate fade-in/out for smoother transitions
      const fadeIn = isHighlighted ? Math.min((frameMs - word.startMs) / 150, 1) : 0
      const fadeOut = isHighlighted ? Math.max(1 - (frameMs - word.endMs + 150) / 150, 0) : 0
      const opacity = isHighlighted ? Math.min(fadeIn, fadeOut) * 0.15 + 0.85 : 0.85

      const highlightStyle = styles.highlightStyle || defaultCaptionStyles.highlightStyle

      // Calculate scale with easing for smoother animation
      const easeInOutScale = (t: number) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      }

      const scaleAmount = isHighlighted
        ? 1 +
          (highlightStyle?.scale
            ? (highlightStyle.scale - 1) * easeInOutScale(progress)
            : 0.08 * easeInOutScale(progress))
        : 1

      return (
        <span
          key={`${word.word}-${index}`}
          className="inline-block transition-all duration-200"
          style={{
            color: isHighlighted ? highlightStyle?.color : styles.color,
            backgroundColor: isHighlighted
              ? highlightStyle?.backgroundColor
              : "transparent",
            opacity,
            transform: `scale(${scaleAmount})`,
            fontWeight: isHighlighted ? highlightStyle?.fontWeight || 600 : styles.fontWeight || 400,
            textShadow: isHighlighted ? highlightStyle?.textShadow : styles.textShadow,
            padding: highlightStyle?.padding || "4px 8px",
            borderRadius: highlightStyle?.borderRadius || "4px",
            margin: "0 2px",
            // Add subtle transition for smoother animation
            transition: isHighlighted
              ? "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease"
              : "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.25s ease, color 0.25s ease, opacity 0.25s ease",
          }}
        >
          {word.word}
        </span>
      )
    })
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center p-4 overflow-hidden"
      style={{
        ...styles,
        width: "100%",
        height: "100%",
      }}
    >
      <div
        className="leading-relaxed tracking-wide"
        style={{
          whiteSpace: "pre-wrap",
          width: "100%",
          textAlign: "center",
          wordBreak: "break-word",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "2px",
        }}
      >
        {renderWords(currentCaption)}
      </div>
    </div>
  )
}
