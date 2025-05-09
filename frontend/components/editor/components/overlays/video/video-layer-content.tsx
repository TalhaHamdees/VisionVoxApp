import { OffthreadVideo, useCurrentFrame } from "remotion";
import { ClipOverlay } from "../../../types";
import { animationTemplates } from "../../../templates/animation-templates";

/**
 * Interface defining the props for the VideoLayerContent component
 */
interface VideoLayerContentProps {
  /** The overlay configuration object containing video properties and styles */
  overlay: ClipOverlay;
}

/**
 * VideoLayerContent component renders a video layer with animations and styling
 *
 * This component handles:
 * - Video playback using Remotion's OffthreadVideo
 * - Enter/exit animations based on the current frame
 * - Styling including transform, opacity, border radius, etc.
 * - Video timing and volume controls
 *
 * @param props.overlay - Configuration object for the video overlay including:
 *   - src: Video source URL
 *   - videoStartTime: Start time offset for the video
 *   - durationInFrames: Total duration of the overlay
 *   - styles: Object containing visual styling properties and animations
 */
export const VideoLayerContent: React.FC<VideoLayerContentProps> = ({
  overlay,
}) => {
  const frame = useCurrentFrame();

  // Calculate if we're in the exit phase (last 30 frames)
  const isExitPhase = frame >= overlay.durationInFrames - 30;

  // Apply enter animation only during entry phase
  const enterAnimation =
    !isExitPhase && overlay.styles.animation?.enter
      ? animationTemplates[overlay.styles.animation.enter]?.enter(
          frame,
          overlay.durationInFrames
        )
      : {};

  // Apply exit animation only during exit phase
  const exitAnimation =
    isExitPhase && overlay.styles.animation?.exit
      ? animationTemplates[overlay.styles.animation.exit]?.exit(
          frame,
          overlay.durationInFrames
        )
      : {};

  /**
   * Container style for proper centering of the video
   */
  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...(isExitPhase ? exitAnimation : enterAnimation),
  };

  /**
   * Video-specific styling with animation phase
   */
  const videoStyle: React.CSSProperties = {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: overlay.styles.objectFit || "cover",
    objectPosition: overlay.styles.objectPosition || "center",
    opacity: overlay.styles.opacity !== undefined ? overlay.styles.opacity : 1,
    borderRadius: overlay.styles.borderRadius || "0px",
    filter: overlay.styles.filter || "none",
    boxShadow: overlay.styles.boxShadow || "none",
    border: overlay.styles.border || "none",
  };

  return (
    <div style={containerStyle}>
      <OffthreadVideo
        src={overlay.src}
        startFrom={overlay.videoStartTime || 0}
        style={videoStyle}
        volume={overlay.styles.volume ?? 1}
      />
    </div>
  );
};
