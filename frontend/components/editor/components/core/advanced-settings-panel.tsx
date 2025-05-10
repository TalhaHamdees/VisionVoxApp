// Update the advanced settings panel to use black and white colors and make it more compact

import { OverlayType } from "../../types"
import { ImageTransformPanel } from "../overlays/images/image-transform-panel"
import type React from "react"

interface AdvancedSettingsPanelProps {
  selectedOverlay: any // Replace 'any' with the actual type of your overlay object
  selectedOverlayId: number | null
  selectedOverlayIds: Set<number>
  overlays: any[] // Replace 'any' with the actual type of your overlays array
  handleOverlayChange: (overlay: any) => void // Replace 'any' with the actual type of your overlay object
  currentFrame: number
  durationInFrames: number
  selectedTab: string
}

const AdvancedSettingsPanel: React.FC<AdvancedSettingsPanelProps> = ({
  selectedOverlay,
  selectedOverlayId,
  selectedOverlayIds,
  overlays,
  handleOverlayChange,
  currentFrame,
  durationInFrames,
  selectedTab,
}) => {
  // Update the no selection message
  const noSelectionMessage = (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div className="text-gray-400 dark:text-gray-500 mb-2">
        <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">No Element Selected</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Click on an element in the timeline or preview area to select it and view advanced properties
      </p>
      <div className="mt-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md p-2 text-xs text-gray-700 dark:text-gray-300">
        <p className="font-medium">Troubleshooting Selection</p>
        <ul className="mt-1 list-disc list-inside text-[10px]">
          <li>Click directly on an item in the timeline</li>
          <li>Try clicking the element in the preview area</li>
          <li>If selection isn't working, try refreshing the page</li>
        </ul>
      </div>
      {/* Debug info - only visible in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-900 text-[10px] text-left w-full rounded border border-gray-200 dark:border-gray-800">
          <p>Debug Selection State:</p>
          <p>selectedOverlayId: {selectedOverlayId === null ? "null" : selectedOverlayId}</p>
          <p>selectedOverlayIds.size: {selectedOverlayIds.size}</p>
          <p>Available overlays: {overlays.length}</p>
          <p>IDs: {overlays.map((o) => o.id).join(", ")}</p>
        </div>
      )}
    </div>
  )

  // Update the content rendering
  const renderContent = () => {
    if (selectedTab === "keyframes") {
      // Different keyframe panels based on overlay type
      if (selectedOverlay && selectedOverlay.type) {
        switch (selectedOverlay.type) {
          case OverlayType.IMAGE:
            // For image overlays, use our ImageTransformPanel with keyframe support
            return (
              <div>
                <div className="border border-gray-200 dark:border-gray-800 rounded-md p-3 bg-white dark:bg-black shadow-sm">
                  <ImageTransformPanel
                    localOverlay={selectedOverlay}
                    handleStyleChange={(updates) => {
                      handleOverlayChange({
                        ...selectedOverlay,
                        styles: { ...selectedOverlay.styles, ...updates },
                      })
                    }}
                    handlePositionChange={(updates) => {
                      handleOverlayChange({ ...selectedOverlay, ...updates })
                    }}
                    currentFrame={currentFrame}
                    totalFrames={durationInFrames}
                    onKeyframeChange={(keyframes) => {
                      // You can optionally store keyframes in the overlay if needed
                      console.log("Keyframes updated:", keyframes)
                    }}
                  />
                </div>
              </div>
            )
          // Add cases for other overlay types as needed
          default:
            return (
              <div className="text-center p-3 text-gray-500 text-sm">
                Keyframe editing not available for this element type
              </div>
            )
        }
      } else {
        return (
          <div className="text-center p-3 text-gray-500 text-sm">No overlay selected or overlay type is undefined.</div>
        )
      }
    } else if (selectedTab === "effects") {
      return <div className="text-center p-3 text-gray-500 text-sm">Effects settings coming soon</div>
    } else if (selectedTab === "audio") {
      return <div className="text-center p-3 text-gray-500 text-sm">Audio settings coming soon</div>
    }

    return null
  }

  // Replace the no selection message
  if (!selectedOverlay) {
    return noSelectionMessage
  }

  // Update the renderContent function
  return renderContent()
}

export default AdvancedSettingsPanel
