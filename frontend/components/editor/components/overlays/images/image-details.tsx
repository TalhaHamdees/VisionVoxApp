import React from "react";
import { ImageOverlay } from "../../../types";
import { PaintBucket, Settings, ArrowLeft, Move } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../ui/tabs";
import { ImageStylePanel } from "./image-style-panel";
import { ImageSettingsPanel } from "./image-settings-panel";
import { ImageTransformPanel } from "./image-transform-panel";
import { Button } from "@/components/ui/button";
import { useEditorContext } from "../../../contexts/editor-context";

/**
 * Props for the ImageDetails component
 * @interface ImageDetailsProps
 * @property {ImageOverlay} localOverlay - Current image overlay being edited
 * @property {Function} setLocalOverlay - Function to update the image overlay
 * @property {Function} onBack - Optional callback to go back to image selection view
 */
interface ImageDetailsProps {
  localOverlay: ImageOverlay;
  setLocalOverlay: (overlay: ImageOverlay) => void;
  onBack?: () => void;
}

/**
 * ImageDetails Component
 *
 * @component
 * @description
 * Provides a tabbed interface for managing image settings and styles.
 * Features include:
 * - Image preview
 * - Style customization panel
 * - Settings configuration panel
 * - Transform panel for adjusting position, scale, rotation and opacity
 * - Real-time updates
 *
 * The component serves as the main configuration interface
 * for image overlays in the editor.
 *
 * @example
 * ```tsx
 * <ImageDetails
 *   localOverlay={imageOverlay}
 *   setLocalOverlay={handleOverlayUpdate}
 * />
 * ```
 */
export const ImageDetails: React.FC<ImageDetailsProps> = ({
  localOverlay,
  setLocalOverlay,
  onBack
}) => {
  // Get current frame and total duration from editor context
  const { currentFrame, durationInFrames } = useEditorContext();

  // Handle style updates (opacity, filter, etc.)
  const handleStyleChange = (updates: Partial<ImageOverlay["styles"]>) => {
    const updatedOverlay = {
      ...localOverlay,
      styles: {
        ...localOverlay.styles,
        ...updates,
      },
    };
    setLocalOverlay(updatedOverlay);
  };

  // Handle position/size/rotation updates
  const handlePositionChange = (updates: Partial<Pick<ImageOverlay, "left" | "top" | "width" | "height" | "rotation">>) => {
    const updatedOverlay = {
      ...localOverlay,
      ...updates,
    };
    setLocalOverlay(updatedOverlay);
  };

  return (
    <div className="space-y-4">
      {/* Back button */}
      {onBack && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="mb-2 hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to image selection
        </Button>
      )}

      {/* Preview */}
      <div className="relative aspect-[16/7] w-full overflow-hidden rounded-sm border border-border bg-muted/40">
        <img
          src={localOverlay.src}
          alt="Image preview"
          className="h-full w-full"
          style={{
            opacity: localOverlay.styles.opacity ?? 1,
            objectFit: localOverlay.styles.objectFit || "contain"
          }}
        />
      </div>

      <Tabs defaultValue="transform" className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-sm border border-gray-200 dark:border-gray-700 gap-1">
          <TabsTrigger
            value="transform"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white 
            rounded-sm transition-all duration-200 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
          >
            <span className="flex items-center gap-2 text-xs">
              <Move className="w-3 h-3" />
              Transform
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="style"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white 
            rounded-sm transition-all duration-200 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
          >
            <span className="flex items-center gap-2 text-xs">
              <PaintBucket className="w-3 h-3" />
              Style
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white 
            rounded-sm transition-all duration-200 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
          >
            <span className="flex items-center gap-2 text-xs">
              <Settings className="w-3 h-3" />
              Settings
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transform" className="space-y-4 mt-4">
          <ImageTransformPanel
            localOverlay={localOverlay}
            handleStyleChange={handleStyleChange}
            handlePositionChange={handlePositionChange}
            totalFrames={durationInFrames}
            currentFrame={currentFrame}
          />
        </TabsContent>

        <TabsContent value="style" className="space-y-4 mt-4">
          <ImageStylePanel
            localOverlay={localOverlay}
            handleStyleChange={handleStyleChange}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <ImageSettingsPanel
            localOverlay={localOverlay}
            handleStyleChange={handleStyleChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
