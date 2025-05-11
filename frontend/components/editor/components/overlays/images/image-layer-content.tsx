import React, { useState, useEffect } from "react";
import { useCurrentFrame } from "remotion";
import { ImageOverlay } from "../../../types";
import { animationTemplates } from "../../../templates/animation-templates";
import { Img } from "remotion";
import { useEditorContext } from "../../../contexts/editor-context";

/**
 * Props for the ImageLayerContent component
 * @interface ImageLayerContentProps
 * @property {ImageOverlay} overlay - The image overlay object containing source and style information
 */
interface ImageLayerContentProps {
  overlay: ImageOverlay;
}

/**
 * ImageLayerContent Component
 *
 * @component
 * @description
 * Renders an image layer in the video editor with animation support.
 * Features include:
 * - Enter/exit animations
 * - Style customization (fit, position, opacity)
 * - Transform effects
 * - Visual effects (filters, shadows, borders)
 *
 * The component handles both the visual presentation and animation
 * timing for image overlays.
 *
 * @example
 * ```tsx
 * <ImageLayerContent
 *   overlay={{
 *     src: "path/to/image.jpg",
 *     styles: {
 *       objectFit: "cover",
 *       animation: {
 *         enter: "fadeIn",
 *         exit: "fadeOut"
 *       }
 *     }
 *   }}
 * />
 * ```
 */
export const ImageLayerContent: React.FC<ImageLayerContentProps> = ({
  overlay,
}) => {
  const frame = useCurrentFrame();
  const isExitPhase = frame >= overlay.durationInFrames - 30;
  const { getAspectRatioDimensions } = useEditorContext();
  const [imageError, setImageError] = useState(false);
  const [imageSource, setImageSource] = useState(overlay.src);
  
  // Handle blob URLs that might be invalid
  useEffect(() => {
    // If the source is a blob URL, try to convert it to a data URL
    if (imageSource.startsWith('blob:')) {
      const convertBlobToDataUrl = async () => {
        try {
          const response = await fetch(imageSource);
          if (!response.ok) {
            throw new Error('Failed to fetch blob URL');
          }
          
          const blob = await response.blob();
          const reader = new FileReader();
          
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            setImageSource(dataUrl);
          };
          
          reader.onerror = () => {
            console.error('Failed to convert blob to data URL');
            setImageError(true);
          };
          
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('Error converting blob URL:', error);
          setImageError(true);
        }
      };
      
      convertBlobToDataUrl();
    }
  }, [imageSource]);
  
  // Reset error state if src changes
  useEffect(() => {
    setImageError(false);
    setImageSource(overlay.src);
  }, [overlay.src]);
  
  // Get the canvas dimensions for proper positioning and constraints
  const canvasDimensions = getAspectRatioDimensions();

  /**
   * Apply enter animation only during entry phase
   */
  const enterAnimation =
    !isExitPhase && overlay.styles.animation?.enter
      ? animationTemplates[overlay.styles.animation.enter]?.enter(
          frame,
          overlay.durationInFrames
        )
      : {};

  /**
   * Apply exit animation only during exit phase
   */
  const exitAnimation =
    isExitPhase && overlay.styles.animation?.exit
      ? animationTemplates[overlay.styles.animation.exit]?.exit(
          frame,
          overlay.durationInFrames
        )
      : {};

  /**
   * Container style for proper centering of the image
   */
  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible", // Allow content to overflow for scaling beyond container
    ...(isExitPhase ? exitAnimation : enterAnimation),
    position: "relative", // Ensure proper positioning context
  };

  // Extract scale from transform if it exists
  const scaleMatch = overlay.styles.transform?.match(/scale\(([0-9.]+)\)/);
  const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
  
  // Extract rotation from transform if it exists
  const rotationMatch = overlay.styles.transform?.match(/rotate\(([0-9.-]+)deg\)/);
  const rotation = rotationMatch ? parseFloat(rotationMatch[1]) : overlay.rotation || 0;

  /**
   * Combine base styles with current animation phase for the image
   */
  const imageStyle: React.CSSProperties = {
    width: "100%", // Use width/height instead of maxWidth/maxHeight for better scaling
    height: "100%",
    objectFit: overlay.styles.objectFit || "cover", // Default to cover to fill space better
    objectPosition: overlay.styles.objectPosition || "center",
    opacity: overlay.styles.opacity !== undefined ? overlay.styles.opacity : 1,
    filter: overlay.styles.filter || "none",
    borderRadius: overlay.styles.borderRadius || "0px",
    boxShadow: overlay.styles.boxShadow || "none",
    border: overlay.styles.border || "none",
    transform: `rotate(${rotation}deg) scale(${scale})`,
    transformOrigin: 'center',
    position: "absolute", // Allow independent positioning
  };

  // Fallback styles for the placeholder when image fails to load
  const placeholderStyle: React.CSSProperties = {
    ...imageStyle,
    backgroundColor: "#CCCCCC",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#666666",
    fontSize: "14px",
    overflow: "hidden",
  };

  return (
    <div style={containerStyle}>
      {imageError ? (
        <div style={placeholderStyle}>
          <div style={{ padding: "20px", textAlign: "center" }}>
            Unable to load image
          </div>
        </div>
      ) : (
        <Img 
          src={imageSource} 
          style={imageStyle} 
          alt="" 
          onError={() => setImageError(true)}
        />
      )}
    </div>
  );
};
