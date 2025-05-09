import React, { useCallback, useMemo } from "react";
import { useCurrentScale } from "remotion";
import { Overlay, OverlayType } from "../../types";
import { MAX_ROWS } from "../../constants";

const HANDLE_SIZE = 12;

/**
 * ResizeHandle component renders a draggable handle for resizing overlays in the editor.
 * It appears as a small white square with a blue border at the corners of a selected overlay.
 *
 * @component
 * @param {Object} props
 * @param {'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'} props.type - Position of the handle
 * @param {Function} props.setOverlay - Callback to update the overlay's properties
 * @param {Overlay} props.overlay - The overlay object being resized
 * @param {Object} props.canvasDimensions - Width and height of the canvas
 *
 * Features:
 * - Scales appropriately with zoom level using Remotion's useCurrentScale
 * - Maintains correct z-index based on overlay row position
 * - Supports dragging to resize from any corner
 * - Prevents resizing below minimum dimensions
 * - Updates overlay dimensions and position in real-time while dragging
 * - Not displayed for sound-type overlays
 * - Allows scaling beyond canvas boundaries
 */
export const ResizeHandle: React.FC<{
  type: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  setOverlay: (
    overlayId: number,
    updater: (overlay: Overlay) => Overlay
  ) => void;
  overlay: Overlay;
  canvasDimensions?: { width: number; height: number };
}> = ({ type, setOverlay, overlay, canvasDimensions }) => {
  const scale = useCurrentScale();
  const size = Math.round(HANDLE_SIZE / scale);
  const borderSize = 1 / scale;

  const sizeStyle: React.CSSProperties = useMemo(() => {
    const zIndex = (MAX_ROWS - (overlay.row || 0)) * 10 + 20000;
    return {
      position: "absolute",
      height: size,
      width: size,
      backgroundColor: "white",
      border: `${borderSize}px solid #3B8BF2`,
      zIndex,
      pointerEvents: "all",
    };
  }, [borderSize, size, overlay.row]);

  const margin = -size / 2 - borderSize;

  // If we have canvas dimensions, position the handles at the corners of the canvas
  // rather than at the corners of the overlay
  const useCanvasPositioning = !!canvasDimensions;
  const canvasWidth = canvasDimensions?.width || 0;
  const canvasHeight = canvasDimensions?.height || 0;

  const style: React.CSSProperties = useMemo(() => {
    if (type === "top-left") {
      return {
        ...sizeStyle,
        marginLeft: margin,
        marginTop: margin,
        left: useCanvasPositioning ? 0 : undefined,
        top: useCanvasPositioning ? 0 : undefined,
        cursor: "nwse-resize",
      };
    }

    if (type === "top-right") {
      return {
        ...sizeStyle,
        marginTop: margin,
        marginRight: margin,
        right: 0,
        top: useCanvasPositioning ? 0 : undefined,
        cursor: "nesw-resize",
      };
    }

    if (type === "bottom-left") {
      return {
        ...sizeStyle,
        marginBottom: margin,
        marginLeft: margin,
        left: useCanvasPositioning ? 0 : undefined,
        bottom: 0,
        cursor: "nesw-resize",
      };
    }

    if (type === "bottom-right") {
      return {
        ...sizeStyle,
        marginBottom: margin,
        marginRight: margin,
        right: 0,
        bottom: 0,
        cursor: "nwse-resize",
      };
    }

    throw new Error("Unknown type: " + JSON.stringify(type));
  }, [margin, sizeStyle, type, useCanvasPositioning]);

  const onPointerDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.button !== 0) {
        return;
      }

      const initialX = e.clientX;
      const initialY = e.clientY;
      
      // Save initial overlay state
      const initialOverlay = { ...overlay };

      const onPointerMove = (pointerMoveEvent: PointerEvent) => {
        const offsetX = (pointerMoveEvent.clientX - initialX) / scale;
        const offsetY = (pointerMoveEvent.clientY - initialY) / scale;

        const isLeft = type === "top-left" || type === "bottom-left";
        const isTop = type === "top-left" || type === "top-right";

        setOverlay(overlay.id, (i) => {
          // Calculate raw dimensions and position based on drag direction
          let newWidth, newHeight, newLeft, newTop;
          
          // Handle horizontal resizing
          if (isLeft) {
            // Left side handles
            newLeft = initialOverlay.left + offsetX;
            newWidth = initialOverlay.width - offsetX;
          } else {
            // Right side handles
            newLeft = initialOverlay.left;
            newWidth = initialOverlay.width + offsetX;
          }
          
          // Handle vertical resizing
          if (isTop) {
            // Top handles
            newTop = initialOverlay.top + offsetY;
            newHeight = initialOverlay.height - offsetY;
          } else {
            // Bottom handles
            newTop = initialOverlay.top;
            newHeight = initialOverlay.height + offsetY;
          }
          
          // Minimum dimensions
          const MIN_SIZE = 20;
          
          // Don't let width/height go below minimum
          if (newWidth < MIN_SIZE) {
            if (isLeft) {
              // Adjust left position to maintain minimum width
              newLeft = initialOverlay.left + initialOverlay.width - MIN_SIZE;
            }
            newWidth = MIN_SIZE;
          }
          
          if (newHeight < MIN_SIZE) {
            if (isTop) {
              // Adjust top position to maintain minimum height
              newTop = initialOverlay.top + initialOverlay.height - MIN_SIZE;
            }
            newHeight = MIN_SIZE;
          }
          
          // No constraints on maximum size - allow scaling beyond canvas boundaries

          return {
            ...i,
            width: Math.round(newWidth),
            height: Math.round(newHeight),
            left: Math.round(newLeft),
            top: Math.round(newTop),
            isDragging: true,
          };
        });
      };

      const onPointerUp = () => {
        setOverlay(overlay.id, (i) => {
          return {
            ...i,
            isDragging: false,
          };
        });
        window.removeEventListener("pointermove", onPointerMove);
      };

      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerup", onPointerUp, {
        once: true,
      });
    },
    [overlay, scale, setOverlay, type]
  );

  if (overlay.type === OverlayType.SOUND) {
    return null;
  }

  return <div onPointerDown={onPointerDown} style={style} />;
};
