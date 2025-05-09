import { useHotkeys } from "react-hotkeys-hook";
import { ZOOM_CONSTRAINTS } from "../constants";

interface UseTimelineShortcutsProps {
  handlePlayPause: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoomScale: number;
  setZoomScale: (scale: number) => void;
  selectAll?: () => void;
  deleteSelected?: () => void;
  splitAtCurrentTime?: () => void;
  copySelected?: () => void;
  pasteItems?: () => void;
}

/**
 * A custom hook that sets up keyboard shortcuts for timeline controls
 *
 * Keyboard shortcuts:
 * - Space: Play/Pause
 * - Alt + Space: Play/Pause
 * - Cmd/Ctrl + Z: Undo
 * - Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y: Redo
 * - Alt + Plus/=: Zoom in
 * - Alt + Minus/-: Zoom out
 * - Cmd/Ctrl + A: Select all items (handled by Timeline component)
 * - Cmd/Ctrl + Backspace: Delete selected items (handled by Timeline component)
 * - C: Split at current time
 * - Cmd/Ctrl + C: Copy selected items
 * - Cmd/Ctrl + V: Paste items
 *
 * @param {Object} props
 * @param {() => void} props.handlePlayPause - Function to toggle play/pause state
 * @param {() => void} props.undo - Function to handle undo operation
 * @param {() => void} props.redo - Function to handle redo operation
 * @param {boolean} props.canUndo - Whether undo operation is available
 * @param {boolean} props.canRedo - Whether redo operation is available
 * @param {number} props.zoomScale - Current zoom level
 * @param {(scale: number) => void} props.setZoomScale - Function to update zoom level
 * @param {() => void} props.selectAll - Function to select all items
 * @param {() => void} props.deleteSelected - Function to delete all selected items
 * @param {() => void} props.splitAtCurrentTime - Function to split at the current time
 * @param {() => void} props.copySelected - Function to copy selected items
 * @param {() => void} props.pasteItems - Function to paste copied items
 */
export const useTimelineShortcuts = ({
  handlePlayPause,
  undo,
  redo,
  canUndo,
  canRedo,
  zoomScale,
  setZoomScale,
  splitAtCurrentTime,
  copySelected,
  pasteItems,
}: UseTimelineShortcutsProps) => {
  // Space key for play/pause
  useHotkeys(
    "space",
    (e) => {
      e.preventDefault();
      handlePlayPause();
    },
    { enableOnFormTags: true }
  );

  // Keep existing alt+space shortcut
  useHotkeys(
    "alt+space",
    (e) => {
      e.preventDefault();
      handlePlayPause();
    },
    { enableOnFormTags: true }
  );

  useHotkeys("meta+z, ctrl+z", (e) => {
    e.preventDefault();
    if (canUndo) undo();
  });

  useHotkeys("meta+shift+z, ctrl+shift+z, meta+y, ctrl+y", (e) => {
    e.preventDefault();
    if (canRedo) redo();
  });

  useHotkeys("alt+=, alt+plus", (e) => {
    e.preventDefault();
    const newScale = Math.min(
      zoomScale + ZOOM_CONSTRAINTS.step,
      ZOOM_CONSTRAINTS.max
    );
    setZoomScale(newScale);
  });

  useHotkeys(
    "alt+-, alt+minus",
    (e) => {
      e.preventDefault();
      const newScale = Math.max(
        zoomScale - ZOOM_CONSTRAINTS.step,
        ZOOM_CONSTRAINTS.min
      );
      setZoomScale(newScale);
    },
    {
      keydown: true,
      preventDefault: true,
    }
  );

  // Split at current time with 'c' key
  useHotkeys("c", (e) => {
    // Skip if typing in form elements
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLElement && e.target.isContentEditable)
    ) {
      return;
    }
    
    e.preventDefault();
    if (splitAtCurrentTime) {
      splitAtCurrentTime();
    }
  });

  // Copy selected items with Cmd+C
  useHotkeys("meta+c, ctrl+c", (e) => {
    // Allow default behavior in form elements
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLElement && e.target.isContentEditable)
    ) {
      return;
    }
    
    e.preventDefault();
    if (copySelected) {
      copySelected();
    }
  });

  // Paste items with Cmd+V
  useHotkeys("meta+v, ctrl+v", (e) => {
    // Allow default behavior in form elements
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      (e.target instanceof HTMLElement && e.target.isContentEditable)
    ) {
      return;
    }
    
    e.preventDefault();
    if (pasteItems) {
      pasteItems();
    }
  });

  // Note: Select all (Cmd+A) and Delete selected (Cmd+Backspace) are now handled directly in the Timeline component
};
