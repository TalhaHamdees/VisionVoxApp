/**
 * VideoDetails Component
 *
 * A component that provides a user interface for configuring video overlay settings and styles.
 * It displays a video preview along with two tabbed panels for adjusting settings and visual styles.
 *
 * Features:
 * - Video preview display
 * - Settings panel for basic video configuration
 * - Style panel for visual customization
 *
 * @component
 */

import React from "react";
import { ClipOverlay } from "../../../types";
import { PaintBucket, Settings, ArrowLeft } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../ui/tabs";
import { VideoStylePanel } from "./video-style-panel";
import { VideoSettingsPanel } from "./video-settings-panel";
import { Button } from "@/components/ui/button";

interface VideoDetailsProps {
  /** The current state of the video overlay */
  localOverlay: ClipOverlay;
  /** Callback function to update the video overlay state */
  setLocalOverlay: (overlay: ClipOverlay) => void;
  /** Callback function to go back to video selection */
  onBack: () => void;
}

/**
 * VideoDetails component for managing video overlay configuration
 *
 * @param {VideoDetailsProps} props - Component props
 * @param {ClipOverlay} props.localOverlay - Current video overlay state
 * @param {Function} props.setLocalOverlay - Function to update overlay state
 * @param {Function} props.onBack - Function to go back to video selection
 */
export const VideoDetails: React.FC<VideoDetailsProps> = ({
  localOverlay,
  setLocalOverlay,
  onBack,
}) => {
  /**
   * Updates the style properties of the video overlay
   *
   * @param {Partial<ClipOverlay["styles"]>} updates - Style properties to update
   */
  const handleStyleChange = (updates: Partial<ClipOverlay["styles"]>) => {
    setLocalOverlay({
      ...localOverlay,
      styles: {
        ...localOverlay.styles,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onBack}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Videos</span>
        </Button>
      </div>

      <div className="relative aspect-video bg-black/10 dark:bg-black/30 rounded-md overflow-hidden mb-4">
        <video
          src={localOverlay.src}
          className="w-full h-full object-contain"
          controls
        />
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="settings" className="flex items-center gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            <span>Settings</span>
          </TabsTrigger>
          <TabsTrigger value="style" className="flex items-center gap-1.5">
            <PaintBucket className="h-3.5 w-3.5" />
            <span>Style</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <VideoSettingsPanel
            localOverlay={localOverlay}
            handleStyleChange={handleStyleChange}
          />
        </TabsContent>

        <TabsContent value="style" className="space-y-4">
          <VideoStylePanel
            localOverlay={localOverlay}
            handleStyleChange={handleStyleChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
