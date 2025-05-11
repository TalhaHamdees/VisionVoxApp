"use client"

import type React from "react"
import { useState } from "react"
import type { CaptionOverlay, CaptionStyles } from "../../../types"
import { captionTemplates } from "../../../templates/caption-templates"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlignCenter, AlignLeft, AlignRight, Paintbrush, Palette, Type } from "lucide-react"

/**
 * Props for the CaptionStylePanel component
 * @interface CaptionStylePanelProps
 * @property {CaptionOverlay} localOverlay - Current caption overlay being styled
 * @property {Function} setLocalOverlay - Function to update the caption overlay
 */
interface CaptionStylePanelProps {
  localOverlay: CaptionOverlay
  setLocalOverlay: (overlay: CaptionOverlay) => void
}

/**
 * CaptionStylePanel Component
 *
 * @component
 * @description
 * Provides a visual interface for selecting and customizing caption styles.
 * Features include:
 * - Pre-defined style templates
 * - Live preview of styles
 * - Color palette visualization
 * - Active state indication
 * - Custom styling controls for font, color, alignment, etc.
 *
 * Each template includes:
 * - Preview text with highlight example
 * - Template name and status
 * - Color scheme visualization
 *
 * @example
 * \`\`\`tsx
 * <CaptionStylePanel
 *   localOverlay={captionOverlay}
 *   setLocalOverlay={handleStyleUpdate}
 * />
 * \`\`\`
 */
export const CaptionStylePanel: React.FC<CaptionStylePanelProps> = ({ localOverlay, setLocalOverlay }) => {
  const [activeTab, setActiveTab] = useState<string>("templates")

  const currentStyles = localOverlay?.styles || captionTemplates.classic.styles
  const fontSize = Number.parseInt(currentStyles.fontSize as string) || 36

  const updateStyle = (styleUpdates: Partial<CaptionStyles>) => {
    const updatedOverlay = {
      ...localOverlay,
      styles: {
        ...currentStyles,
        ...styleUpdates,
      },
    }
    setLocalOverlay(updatedOverlay)
  }

  const handleFontSizeChange = (value: number[]) => {
    updateStyle({
      fontSize: `${value[0]}px`,
    })
  }

  const handleAlignmentChange = (value: string) => {
    if (value === "left" || value === "center" || value === "right") {
      updateStyle({
        textAlign: value,
      })
    }
  }

  const handleColorChange = (color: string) => {
    updateStyle({
      color,
    })
  }

  const handleHighlightColorChange = (color: string) => {
    updateStyle({
      highlightStyle: {
        ...currentStyles.highlightStyle,
        backgroundColor: color,
      },
    })
  }

  return (
    <Tabs defaultValue="templates" value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-2 mb-5 bg-gradient-to-b from-gray-50 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur-sm rounded-md border border-gray-200 dark:border-gray-700 shadow-sm p-1 gap-1">
        <TabsTrigger
          value="templates"
          className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 
            data-[state=active]:shadow-sm data-[state=active]:border-gray-200/50 dark:data-[state=active]:border-gray-700/50
            rounded-md transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 
            hover:bg-white/80 dark:hover:bg-gray-800/80 py-2"
        >
          <Palette className="w-3.5 h-3.5" />
          <span className="font-medium">Templates</span>
        </TabsTrigger>
        <TabsTrigger
          value="custom"
          className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 
            data-[state=active]:shadow-sm data-[state=active]:border-gray-200/50 dark:data-[state=active]:border-gray-700/50
            rounded-md transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 
            hover:bg-white/80 dark:hover:bg-gray-800/80 py-2"
        >
          <Paintbrush className="w-3.5 h-3.5" />
          <span className="font-medium">Customize</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="templates" className="space-y-4">
        {/* Templates Grid */}
        <div className="grid grid-cols-1 gap-3">
          {Object.entries(captionTemplates).map(([key, template]) => (
            <button
              key={key}
              onClick={() => {
                const updatedOverlay = {
                  ...localOverlay,
                  template: key,
                  styles: template.styles,
                }
                setLocalOverlay(updatedOverlay)
              }}
              className={`group relative overflow-hidden rounded-lg border transition-all duration-200 shadow-sm hover:shadow
              ${
                localOverlay?.template === key
                  ? "border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20 ring-2 ring-blue-500/30 dark:ring-blue-400/30 transform scale-[1.02]"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/30 hover:from-gray-100/80 hover:to-gray-50/80 dark:hover:from-gray-800/70 dark:hover:to-gray-800/40"
              }`}
            >
              {/* Preview Area with demo text */}
              <div className="relative aspect-[16/7] w-full overflow-hidden bg-gray-900/90 dark:from-black/40 dark:to-gray-900/40">
                <div className="absolute inset-0 flex items-center justify-center p-10">
                  <span
                    style={{
                      ...template.styles,
                      fontSize: "1.2rem",
                      lineHeight: "1.2",
                    }}
                  >
                    Let&apos;s{" "}
                    <span
                      style={{
                        ...template.styles.highlightStyle,
                        transform: `scale(${template.styles.highlightStyle?.scale || 1})`,
                      }}
                    >
                      start
                    </span>{" "}
                    with a demo of your caption.
                  </span>
                </div>
              </div>

              {/* Template Info and Color Palette */}
              <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-900/40 backdrop-blur-sm">
                {/* Template Name and Status */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{template.name}</span>
                  {localOverlay?.template === key && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-500/20 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>

                {/* Color Palette Preview */}
                <div className="flex items-center gap-1.5">
                  {[template.styles.color, template.styles.highlightStyle?.backgroundColor].map((color, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full ring-1 ring-black/5 dark:ring-white/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="custom" className="space-y-5">
        {/* Custom Style Controls */}

        {/* Font Size Control */}
        <div className="space-y-3 bg-gray-50/80 dark:bg-gray-800/30 p-3 rounded-lg border border-gray-200/80 dark:border-gray-700/80">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <div className="bg-blue-100 dark:bg-blue-900/40 p-1 rounded-md">
                <Type className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              Font Size
            </Label>
            <span className="text-xs font-mono bg-white dark:bg-gray-900/50 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium">
              {fontSize}px
            </span>
          </div>
          <Slider value={[fontSize]} min={16} max={72} step={1} onValueChange={handleFontSizeChange} className="py-2" />
        </div>

        {/* Text Alignment Control */}
        <div className="space-y-3 bg-gray-50/80 dark:bg-gray-800/30 p-3 rounded-lg border border-gray-200/80 dark:border-gray-700/80">
          <Label className="text-xs font-medium flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
            <div className="bg-blue-100 dark:bg-blue-900/40 p-1 rounded-md">
              <AlignCenter className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            Text Alignment
          </Label>
          <ToggleGroup
            type="single"
            defaultValue={currentStyles.textAlign || "center"}
            onValueChange={handleAlignmentChange}
            className="flex items-center gap-2 bg-white dark:bg-gray-900/50 p-1 rounded-md border border-gray-200 dark:border-gray-700"
          >
            <ToggleGroupItem
              value="left"
              className="h-9 flex-1 data-[state=on]:bg-blue-100 dark:data-[state=on]:bg-blue-900/40 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400 data-[state=on]:border-blue-200 dark:data-[state=on]:border-blue-800 data-[state=on]:shadow-sm"
            >
              <AlignLeft className="h-4 w-4" />
            </ToggleGroupItem>

            <ToggleGroupItem
              value="center"
              className="h-9 flex-1 data-[state=on]:bg-blue-100 dark:data-[state=on]:bg-blue-900/40 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400 data-[state=on]:border-blue-200 dark:data-[state=on]:border-blue-800 data-[state=on]:shadow-sm"
            >
              <AlignCenter className="h-4 w-4" />
            </ToggleGroupItem>

            <ToggleGroupItem
              value="right"
              className="h-9 flex-1 data-[state=on]:bg-blue-100 dark:data-[state=on]:bg-blue-900/40 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400 data-[state=on]:border-blue-200 dark:data-[state=on]:border-blue-800 data-[state=on]:shadow-sm"
            >
              <AlignRight className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Color Controls */}
        <div className="space-y-4">
          <div className="space-y-3 bg-gray-50/80 dark:bg-gray-800/30 p-3 rounded-lg border border-gray-200/80 dark:border-gray-700/80">
            <Label className="text-xs font-medium flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
              <div className="bg-blue-100 dark:bg-blue-900/40 p-1 rounded-md">
                <Palette className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              Text Color
            </Label>
            <div className="grid grid-cols-6 gap-2 mt-2 bg-white dark:bg-gray-900/50 p-2 rounded-md border border-gray-200 dark:border-gray-700">
              {["#FFFFFF", "#F8FAFC", "#94A3B8", "#0EA5E9", "#10B981", "#F59E0B"].map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`h-8 w-full rounded-md border transition-all duration-150 transform ${
                    currentStyles.color === color
                      ? "ring-2 ring-blue-500 border-transparent scale-110 shadow-md"
                      : "border-gray-200 dark:border-gray-700 hover:scale-105 hover:shadow-sm"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 bg-white dark:bg-gray-900/50 p-2 rounded-md border border-gray-200 dark:border-gray-700">
              <Label className="text-xs font-medium w-20 text-gray-700 dark:text-gray-300">Custom Color</Label>
              <Input
                type="color"
                value={currentStyles.color as string}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-8 w-10 p-0 overflow-hidden border border-gray-300 dark:border-gray-600 rounded-md"
              />
              <Input
                type="text"
                value={currentStyles.color as string}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-8 text-xs flex-1 border-gray-300 dark:border-gray-600 focus:ring-blue-500/30 focus:border-blue-400"
                placeholder="#FFFFFF"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Highlight Color</Label>
            <div className="grid grid-cols-6 gap-2 mt-1">
              {[
                "rgba(59, 130, 246, 0.92)",
                "rgba(34, 197, 94, 0.95)",
                "rgba(245, 158, 11, 0.9)",
                "rgba(139, 92, 246, 0.9)",
                "#FF3B3B",
                "rgba(0,0,0,0.8)",
              ].map((color) => (
                <button
                  key={color}
                  onClick={() => handleHighlightColorChange(color)}
                  className={`h-6 w-full rounded-md border ${
                    currentStyles.highlightStyle?.backgroundColor === color
                      ? "ring-2 ring-blue-500 border-transparent"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Label className="text-xs font-medium w-20">Custom Color</Label>
              <Input
                type="color"
                value={(currentStyles.highlightStyle?.backgroundColor as string) || "rgba(59, 130, 246, 0.92)"}
                onChange={(e) => handleHighlightColorChange(e.target.value)}
                className="h-7 w-10 p-0 overflow-hidden border border-gray-200 dark:border-gray-700"
              />
              <Input
                type="text"
                value={(currentStyles.highlightStyle?.backgroundColor as string) || "rgba(59, 130, 246, 0.92)"}
                onChange={(e) => handleHighlightColorChange(e.target.value)}
                className="h-7 text-xs flex-1"
                placeholder="rgba(59, 130, 246, 0.92)"
              />
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex justify-end mt-5">
          <Button
            size="sm"
            variant="outline"
            className="text-xs font-medium border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            onClick={() => {
              // Reset to the active template or classic if none
              const templateKey = localOverlay?.template || "classic"
              setLocalOverlay({
                ...localOverlay,
                styles: captionTemplates[templateKey].styles,
              })
              setActiveTab("templates")
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1.5"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
            Reset to Template
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  )
}
