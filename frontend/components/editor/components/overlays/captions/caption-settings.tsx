"use client"

import type React from "react"
import { useState } from "react"
import type { CaptionOverlay, CaptionStyles, Caption } from "../../../types"

import { AlignLeft, PaintBucket, Wand2, Clock } from "lucide-react"

import { CaptionStylePanel } from "./caption-style-panel"
import { CaptionTimeline } from "./caption-timeline"
import { CaptionGenerator } from "./caption-generator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

/**
 * Props for the CaptionSettings component
 * @interface CaptionSettingsProps
 * @property {CaptionOverlay} localOverlay - Current caption overlay being edited
 * @property {Function} setLocalOverlay - Function to update the caption overlay
 * @property {number} currentFrame - Current frame position in the video
 * @property {number} startFrame - Starting frame of the caption overlay
 * @property {Caption[]} captions - Array of caption objects
 */
interface CaptionSettingsProps {
  localOverlay: CaptionOverlay
  setLocalOverlay: (overlay: CaptionOverlay) => void
  currentFrame: number
  startFrame: number
  captions: Caption[]
}

/**
 * Default styling configuration for captions
 * Defines the base appearance for all captions including font, size, colors, and highlight effects
 */
export const defaultCaptionStyles: CaptionStyles = {
  fontFamily: "Inter, sans-serif",
  fontSize: "2.5rem",
  lineHeight: 1.4,
  textAlign: "center",
  color: "#FFFFFF",
  textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
  padding: "24px",
  highlightStyle: {
    backgroundColor: "rgba(20, 184, 166, 0.95)",
    scale: 1.1,
    fontWeight: 600,
    textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
  },
}

/**
 * CaptionSettings Component
 *
 * @component
 * @description
 * Provides a tabbed interface for managing caption settings including:
 * - Caption text and timing management
 * - Visual style customization
 *
 * The component uses a tab-based layout to organize different aspects of caption
 * configuration, making it easier for users to focus on specific settings.
 *
 * @example
 * \`\`\`tsx
 * <CaptionSettings
 *   localOverlay={captionOverlay}
 *   setLocalOverlay={handleOverlayUpdate}
 *   currentFrame={30}
 *   startFrame={0}
 *   captions={[...]}
 * />
 * \`\`\`
 */
export const CaptionSettings: React.FC<CaptionSettingsProps> = ({ localOverlay, setLocalOverlay, currentFrame }) => {
  const currentMs = (currentFrame / 30) * 1000

  return (
    <Tabs defaultValue="captions" className="w-full">
      {/* Tab Navigation */}
      <TabsList className="w-full grid grid-cols-3 bg-gradient-to-b from-gray-50 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur-sm rounded-md border border-gray-200 dark:border-gray-700 shadow-sm p-1 gap-1">
        {/* Captions Tab */}
        <TabsTrigger
          value="captions"
          className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 
      data-[state=active]:shadow-sm data-[state=active]:border-gray-200/50 dark:data-[state=active]:border-gray-700/50
      rounded-md transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 
      hover:bg-white/80 dark:hover:bg-gray-800/80 py-2"
        >
          <span className="flex items-center gap-2 text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            Timeline
          </span>
        </TabsTrigger>

        {/* Generate Tab */}
        <TabsTrigger
          value="generate"
          className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 
      data-[state=active]:shadow-sm data-[state=active]:border-gray-200/50 dark:data-[state=active]:border-gray-700/50
      rounded-md transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 
      hover:bg-white/80 dark:hover:bg-gray-800/80 py-2"
        >
          <span className="flex items-center gap-2 text-xs font-medium">
            <Wand2 className="w-3.5 h-3.5" />
            Generate
          </span>
        </TabsTrigger>

        {/* Display Tab */}
        <TabsTrigger
          value="display"
          className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 
      data-[state=active]:shadow-sm data-[state=active]:border-gray-200/50 dark:data-[state=active]:border-gray-700/50
      rounded-md transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 
      hover:bg-white/80 dark:hover:bg-gray-800/80 py-2"
        >
          <span className="flex items-center gap-2 text-xs font-medium">
            <PaintBucket className="w-3.5 h-3.5" />
            Style
          </span>
        </TabsTrigger>
      </TabsList>

      {/* Caption Timeline Tab Content */}
      <TabsContent
        value="captions"
        className="space-y-5 mt-5 focus-visible:outline-none animate-in fade-in-50 duration-200"
      >
        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
            <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 p-1.5 rounded-md mr-2">
              <Clock className="w-3.5 h-3.5" />
            </span>
            Caption Timeline
          </h4>
        </div>

        {/* Caption Timeline Editor */}
        <div>
          <CaptionTimeline localOverlay={localOverlay} setLocalOverlay={setLocalOverlay} currentMs={currentMs} />
        </div>
      </TabsContent>

      {/* Caption Generator Tab Content */}
      <TabsContent
        value="generate"
        className="space-y-5 mt-5 focus-visible:outline-none animate-in fade-in-50 duration-200"
      >
        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
            <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 p-1.5 rounded-md mr-2">
              <Wand2 className="w-3.5 h-3.5" />
            </span>
            Generate Captions
          </h4>
        </div>
        <CaptionGenerator localOverlay={localOverlay} setLocalOverlay={setLocalOverlay} />
      </TabsContent>

      {/* Style Tab Content */}
      <TabsContent
        value="display"
        className="space-y-5 mt-5 focus-visible:outline-none animate-in fade-in-50 duration-200"
      >
        <CaptionStylePanel localOverlay={localOverlay} setLocalOverlay={setLocalOverlay} />
      </TabsContent>
    </Tabs>
  )
}
