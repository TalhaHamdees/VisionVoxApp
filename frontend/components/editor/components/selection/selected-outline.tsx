import React, { useCallback, useMemo } from "react";
import { useCurrentScale } from "remotion";
import { ResizeHandle } from "./resize-handle";
import { Overlay, OverlayType } from "../../types";
import { RotateHandle } from "./rotate-handle";
import { MAX_ROWS } from "../../constants";
import { useEditorContext } from "../../contexts/editor-context";

/**
 * SelectionOutline is a component that renders a draggable, resizable outline around selected overlays.
 * It provides visual feedback and interaction handles for manipulating overlay elements.
 *
 * @component
 * @param {Object} props
 * @param {Overlay} props.overlay - The overlay object containing position, size, and other properties
 * @param {Function} props.changeOverlay - Callback to update overlay properties
 * @param {Function} props.setSelectedOverlayId - Function to update the currently selected overlay
 * @param {number|null} props.selectedOverlayId - ID of the currently selected overlay
 * @param {boolean} props.isDragging - Whether the overlay is currently being dragged
 */
export const SelectionOutline: React.FC<{
  overlay: Overlay;
  changeOverlay: (
    overlayId: number,
    updater: (overlay: Overlay) => Overlay
  ) => void;
  setSelectedOverlayId: React.Dispatch<React.SetStateAction<number | null>>;
  selectedOverlayId: number | null;
  isDragging: boolean;
}> = ({
  overlay,
  changeOverlay,
  setSelectedOverlayId,
  selectedOverlayId,
  isDragging,
}) => {
  const scale = useCurrentScale();
  const scaledBorder = Math.ceil(1 / scale);
  const { getAspectRatioDimensions } = useEditorContext();
  
  // Get the full canvas dimensions to match outline to canvas
  const canvasDimensions = getAspectRatioDimensions();

  const [hovered, setHovered] = React.useState(false);

  const onMouseEnter = useCallback(() => {
    setHovered(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);

  const isSelected = overlay.id === selectedOverlayId;

  const style: React.CSSProperties = useMemo(() => {
    // Make selected items have highest z-index
    const baseZIndex = (MAX_ROWS - (overlay.row || 0)) * 10;
    const selectionBoost = isSelected ? 10000 : 1000;
    const zIndex = baseZIndex + selectionBoost;

    // If we're showing the outline, make it fill the entire canvas
    // while preserving the original position and size of the overlay itself
    const outlineWidth = isSelected ? canvasDimensions.width : overlay.width;
    const outlineHeight = isSelected ? canvasDimensions.height : overlay.height;
    
    // When the outline is showing, position it at 0,0 to fill the canvas
    // Otherwise, use the overlay's actual position
    const outlineLeft = isSelected ? 0 : overlay.left;
    const outlineTop = isSelected ? 0 : overlay.top;

    return {
      width: outlineWidth,
      height: outlineHeight,
      left: outlineLeft,
      top: outlineTop,
      position: "absolute",
      outline:
        (hovered && !isDragging) || isSelected
          ? `${scaledBorder}px solid #3B8BF2`
          : undefined,
      transform: `rotate(${overlay.rotation || 0}deg)`,
      transformOrigin: "center center",
      userSelect: "none",
      touchAction: "none",
      zIndex,
      pointerEvents: "all",
    };
  }, [overlay, hovered, isDragging, isSelected, scaledBorder, overlay.row, canvasDimensions]);

  const startDragging = useCallback(
    (e: PointerEvent | React.MouseEvent) => {
      const initialX = e.clientX;
      const initialY = e.clientY;

      const onPointerMove = (pointerMoveEvent: PointerEvent) => {
        const offsetX = (pointerMoveEvent.clientX - initialX) / scale;
        const offsetY = (pointerMoveEvent.clientY - initialY) / scale;
        
        // Calculate new position
        const newLeft = Math.round(overlay.left + offsetX);
        const newTop = Math.round(overlay.top + offsetY);
        
        // Constrain the overlay to remain within the canvas boundaries
        const maxLeft = canvasDimensions.width - overlay.width;
        const maxTop = canvasDimensions.height - overlay.height;
        
        const constrainedLeft = Math.max(0, Math.min(newLeft, maxLeft));
        const constrainedTop = Math.max(0, Math.min(newTop, maxTop));
        
        changeOverlay(overlay.id, (o) => {
          return {
            ...o,
            left: constrainedLeft,
            top: constrainedTop,
            isDragging: true,
          };
        });
      };

      const onPointerUp = () => {
        changeOverlay(overlay.id, (o) => {
          return {
            ...o,
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
    [overlay, scale, changeOverlay, canvasDimensions]
  );

  const onPointerDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.button !== 0) {
        return;
      }

      setSelectedOverlayId(overlay.id);
      startDragging(e);
    },
    [overlay.id, setSelectedOverlayId, startDragging]
  );

  if (overlay.type === OverlayType.SOUND) {
    return null;
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerEnter={onMouseEnter}
      onPointerLeave={onMouseLeave}
      style={style}
    >
      {isSelected ? (
        <>
          <ResizeHandle
            overlay={overlay}
            setOverlay={changeOverlay}
            type="top-left"
            canvasDimensions={canvasDimensions}
          />
          <ResizeHandle
            overlay={overlay}
            setOverlay={changeOverlay}
            type="top-right"
            canvasDimensions={canvasDimensions}
          />
          <ResizeHandle
            overlay={overlay}
            setOverlay={changeOverlay}
            type="bottom-left"
            canvasDimensions={canvasDimensions}
          />
          <ResizeHandle
            overlay={overlay}
            setOverlay={changeOverlay}
            type="bottom-right"
            canvasDimensions={canvasDimensions}
          />
          <RotateHandle
            overlay={overlay}
            setOverlay={changeOverlay}
            scale={scale}
          />
        </>
      ) : null}
    </div>
  );
};
