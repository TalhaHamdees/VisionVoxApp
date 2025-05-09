import React from "react";
import { ImageOverlay } from "../../../types";

/**
 * Props for the ImageStylePanel component
 */
interface ImageStylePanelProps {
  /** The current state of the image overlay being edited */
  localOverlay: ImageOverlay;
  /** Callback to update the overlay's style properties */
  handleStyleChange: (updates: Partial<ImageOverlay["styles"]>) => void;
}

/**
 * ImageStylePanel Component
 *
 * A panel that allows users to adjust visual appearance settings for an image overlay.
 * Provides controls for various CSS filter properties to modify the image's appearance.
 *
 * Features:
 * - Brightness adjustment (0-200%)
 * - Object fit settings (contain, cover, fill)
 * - Maintains existing filters while updating individual properties
 * - Real-time preview of adjustments
 *
 * Note: The filter string is managed as a space-separated list of CSS filter functions,
 * allowing multiple filters to be applied simultaneously.
 */
export const ImageStylePanel: React.FC<ImageStylePanelProps> = ({
  localOverlay,
  handleStyleChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Appearance Settings */}
      <div className="space-y-4 rounded-md bg-muted/50 p-4 border border-border">
        <h3 className="text-sm font-medium text-foreground">Appearance</h3>

        {/* Object Fit Options */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">
            Fit
          </label>
          <select
            value={localOverlay?.styles?.objectFit ?? "contain"}
            onChange={(e) =>
              handleStyleChange({ objectFit: e.target.value as any })
            }
            className="w-full bg-background border border-border rounded-md text-xs p-2 hover:border-muted-foreground transition-colors text-foreground"
          >
            <option value="contain">Contain (Fit entire image)</option>
            <option value="cover">Cover (Fill frame)</option>
            <option value="fill">Fill (Stretch to frame)</option>
          </select>
          <p className="text-xs text-muted-foreground">
            "Contain" preserves aspect ratio and shows the entire image
          </p>
        </div>

        {/* Brightness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Brightness</label>
            <span className="text-xs text-muted-foreground min-w-[40px] text-right">
              {parseInt(
                localOverlay?.styles?.filter?.match(
                  /brightness\((\d+)%\)/
                )?.[1] ?? "100"
              )}
              %
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="200"
              step="10"
              value={parseInt(
                localOverlay?.styles?.filter?.match(
                  /brightness\((\d+)%\)/
                )?.[1] ?? "100"
              )}
              onChange={(e) => {
                const currentFilter = localOverlay?.styles?.filter || "";
                const newFilter =
                  currentFilter.replace(/brightness\(\d+%\)/, "") +
                  ` brightness(${e.target.value}%)`;
                handleStyleChange({ filter: newFilter.trim() });
              }}
              className="flex-1 accent-primary h-1.5 rounded-full bg-muted"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
