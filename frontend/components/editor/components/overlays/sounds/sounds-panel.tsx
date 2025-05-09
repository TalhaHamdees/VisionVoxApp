"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Upload, Trash2, Volume2, VolumeX, ChevronDown, ChevronUp } from "lucide-react"
import { type LocalSound, OverlayType, type SoundOverlay } from "../../../types"
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning"
import { useEditorContext } from "../../../contexts/editor-context"
import { useTimeline } from "../../../contexts/timeline-context"
import { SoundDetails } from "./sound-details"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { getAllAudioFiles, getAudioFileById, deleteAudioFile } from "@/lib/indexed-db"

/**
 * SoundsPanel Component
 *
 * A panel component that manages sound overlays in the editor with tabs for:
 * - Upload Audio: For uploading custom audio files
 * - Voiceovers: For AI-generated audio from the audio generator
 *
 * The component also shows sound details when a sound overlay is selected.
 *
 * @component
 */
const SoundsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("voiceovers") // Default to Voiceovers tab
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)
  const [uploadedSounds, setUploadedSounds] = useState<LocalSound[]>([])
  const [audioVolumes, setAudioVolumes] = useState<{ [key: string]: number }>({})
  const [expandedAudio, setExpandedAudio] = useState<string | null>(null)

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { addOverlay, overlays, durationInFrames, selectedOverlayId, changeOverlay } = useEditorContext()

  const { findNextAvailablePosition } = useTimelinePositioning()
  const { visibleRows } = useTimeline()
  const [localOverlay, setLocalOverlay] = useState<SoundOverlay | null>(null)

  // VisionVox audio files state
  const [visionVoxAudio, setVisionVoxAudio] = useState<
    Array<{
      id: string
      name: string
      url: string
      type: string
      size: number
      duration: number
      createdAt: string
      persistent?: boolean
    }>
  >([])

  // Load VisionVox audio files from localStorage
  useEffect(() => {
    const loadVisionVoxAudio = async () => {
      try {
        const audioFolder = localStorage.getItem("visionvox_audio_folder")
        if (audioFolder) {
          let audioFiles = JSON.parse(audioFolder)
          
          // Process persistent audio files - replace temporary URLs with ones from IndexedDB
          const persistentFiles = audioFiles.filter((file: any) => file.persistent)
          
          // Load all persistent files from IndexedDB
          if (persistentFiles.length > 0) {
            const dbAudioFiles = await getAllAudioFiles()
            
            // Update audio files with blob URLs from IndexedDB
            audioFiles = audioFiles.map((file: any) => {
              if (file.persistent) {
                const dbFile = dbAudioFiles.find(dbFile => dbFile.id === file.id)
                if (dbFile) {
                  // Create a new blob URL for this session
                  const newUrl = URL.createObjectURL(dbFile.blob)
                  return {
                    ...file,
                    url: newUrl
                  }
                }
              }
              return file
            })
            
            // Update localStorage with the new URLs
            localStorage.setItem('visionvox_audio_folder', JSON.stringify(audioFiles))
          }
          
          setVisionVoxAudio(audioFiles)

          // Initialize volume settings for each file
          audioFiles.forEach((file: any) => {
            if (audioVolumes[file.id] === undefined) {
              setAudioVolumes((prev) => ({
                ...prev,
                [file.id]: 1.0,
              }))
            }
          })
        }
      } catch (error) {
        console.error("Error loading VisionVox audio files:", error)
      }
    }

    loadVisionVoxAudio()

    // Add event listener to refresh audio files when localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "visionvox_audio_folder") {
        loadVisionVoxAudio()
      }
    }

    // Custom event for direct communication between components
    const handleAudioUpdate = () => {
      loadVisionVoxAudio()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("visionvox_audio_updated", handleAudioUpdate)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("visionvox_audio_updated", handleAudioUpdate)
    }
  }, [audioVolumes])

  useEffect(() => {
    if (selectedOverlayId === null) {
      setLocalOverlay(null)
      return
    }

    const selectedOverlay = overlays.find((overlay) => overlay.id === selectedOverlayId)

    if (selectedOverlay?.type === OverlayType.SOUND) {
      setLocalOverlay(selectedOverlay)
    }
  }, [selectedOverlayId, overlays])

  /**
   * Updates the local overlay state and propagates changes to the editor context
   * @param {SoundOverlay} updatedOverlay - The modified sound overlay
   */
  const handleUpdateOverlay = (updatedOverlay: SoundOverlay) => {
    setLocalOverlay(updatedOverlay)
    changeOverlay(updatedOverlay.id, updatedOverlay)
  }

  /**
   * Initialize audio elements for each sound and handle cleanup
   */
  useEffect(() => {
    // Initialize audio elements for local sounds
    uploadedSounds.forEach((sound) => {
      if (!audioRefs.current[sound.id]) {
        audioRefs.current[sound.id] = new Audio(sound.file)
      }
    })

    // Initialize audio elements for VisionVox audio
    visionVoxAudio.forEach((file) => {
      if (!audioRefs.current[file.id]) {
        const audio = new Audio(file.url)

        // Set initial volume
        audio.volume = audioVolumes[file.id] || 1.0

        audioRefs.current[file.id] = audio
      }
    })

    return () => {
      Object.values(audioRefs.current).forEach((audio) => {
        audio.pause()
        audio.currentTime = 0
      })
    }
  }, [uploadedSounds, visionVoxAudio, audioVolumes])

  /**
   * Toggles play/pause state for a sound track
   * Ensures only one track plays at a time
   *
   * @param soundId - Unique identifier of the sound to toggle
   * @param audioUrl - Optional URL for the audio if not already loaded
   */
  const togglePlay = (soundId: string, audioUrl?: string) => {
    // If audio element doesn't exist yet but we have a URL, create it
    if (!audioRefs.current[soundId] && audioUrl) {
      const audio = new Audio(audioUrl)
      audio.volume = audioVolumes[soundId] || 1.0
      audioRefs.current[soundId] = audio
    }

    const audio = audioRefs.current[soundId]
    if (!audio) return

    if (playingTrack === soundId) {
      audio.pause()
      setPlayingTrack(null)
    } else {
      if (playingTrack && audioRefs.current[playingTrack]) {
        audioRefs.current[playingTrack].pause()
      }
      audio.play().catch((error) => console.error("Error playing audio:", error))
      setPlayingTrack(soundId)
    }
  }

  /**
   * Adds a sound overlay to the timeline at the next available position
   * Calculates duration based on the sound length (30fps)
   *
   * @param {LocalSound} sound - The sound track to add to the timeline
   */
  const handleAddToTimeline = (sound: LocalSound) => {
    // Find the next available position on the timeline
    const { from, row } = findNextAvailablePosition(overlays, visibleRows, durationInFrames)

    // Create the sound overlay configuration
    const newSoundOverlay: SoundOverlay = {
      id: Date.now(),
      type: OverlayType.SOUND,
      content: sound.title,
      src: sound.file,
      from,
      row,
      // Layout properties
      left: 0,
      top: 0,
      width: 1920,
      height: 100,
      rotation: 0,
      isDragging: false,
      durationInFrames: sound.duration * 30, // 30fps
      styles: {
        opacity: 1,
      },
    }

    addOverlay(newSoundOverlay)
  }

  /**
   * Handles file upload for audio files
   */
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      // Create a URL for the file
      const fileUrl = URL.createObjectURL(file)

      // Create a temporary audio element to get the duration
      const audio = new Audio(fileUrl)
      audio.addEventListener("loadedmetadata", () => {
        const newSound: LocalSound = {
          id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
          artist: "Uploaded Audio",
          file: fileUrl,
          duration: audio.duration,
        }

        setUploadedSounds((prev) => [...prev, newSound])

        // Initialize volume
        setAudioVolumes((prev) => ({
          ...prev,
          [newSound.id]: 1.0,
        }))

        // Add to audioRefs
        audioRefs.current[newSound.id] = audio
      })
    })

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  /**
   * Removes a sound from the uploaded or voiceovers sounds list
   */
  const handleRemoveSound = async (soundId: string, type: "upload" | "voiceovers") => {
    if (type === "upload") {
      setUploadedSounds((prev) => prev.filter((sound) => sound.id !== soundId))
    } else {
      // Find the file to check if it's persistent
      const fileToRemove = visionVoxAudio.find(file => file.id === soundId)
      
      // Remove from visionVoxAudio state
      setVisionVoxAudio((prev) => prev.filter((file) => file.id !== soundId))

      // Also remove from localStorage
      try {
        const audioFolder = localStorage.getItem("visionvox_audio_folder")
        if (audioFolder) {
          const audioFiles = JSON.parse(audioFolder).filter((item: any) => item.id !== soundId)
          localStorage.setItem("visionvox_audio_folder", JSON.stringify(audioFiles))

          // If it's a persistent file, also remove it from IndexedDB
          if (fileToRemove?.persistent) {
            await deleteAudioFile(soundId)
          }

          // Dispatch event to notify other components
          window.dispatchEvent(new Event("visionvox_audio_updated"))
        }
      } catch (error) {
        console.error("Error updating audio folder in localStorage:", error)
      }
    }

    // Remove from expanded state if it was expanded
    if (expandedAudio === soundId) {
      setExpandedAudio(null)
    }

    // Remove volume setting
    setAudioVolumes((prev) => {
      const newVolumes = { ...prev }
      delete newVolumes[soundId]
      delete newVolumes[`${soundId}_previous`]
      return newVolumes
    })

    // Clean up audio reference
    if (audioRefs.current[soundId]) {
      audioRefs.current[soundId].pause()
      delete audioRefs.current[soundId]
    }

    // Stop playing if this was the playing track
    if (playingTrack === soundId) {
      setPlayingTrack(null)
    }
  }

  /**
   * Toggles the expanded state of an audio card
   */
  const toggleExpandAudio = (soundId: string) => {
    setExpandedAudio((prev) => (prev === soundId ? null : soundId))
  }

  /**
   * Updates the volume for an audio track
   */
  const handleVolumeChange = (soundId: string, value: number[]) => {
    const volume = value[0]

    // Update volume state
    setAudioVolumes((prev) => ({
      ...prev,
      [soundId]: volume,
    }))

    // Update audio element volume
    if (audioRefs.current[soundId]) {
      audioRefs.current[soundId].volume = volume
    }
  }

  /**
   * Toggles mute state for an audio track
   */
  const toggleMute = (soundId: string) => {
    const currentVolume = audioVolumes[soundId] || 1.0

    if (currentVolume > 0) {
      // Store the current volume before muting
      setAudioVolumes((prev) => ({
        ...prev,
        [`${soundId}_previous`]: currentVolume,
        [soundId]: 0,
      }))

      if (audioRefs.current[soundId]) {
        audioRefs.current[soundId].volume = 0
      }
    } else {
      // Restore the previous volume
      const previousVolume = audioVolumes[`${soundId}_previous`] || 1.0

      setAudioVolumes((prev) => {
        const newVolumes = { ...prev }
        newVolumes[soundId] = previousVolume
        delete newVolumes[`${soundId}_previous`]
        return newVolumes
      })

      if (audioRefs.current[soundId]) {
        audioRefs.current[soundId].volume = previousVolume
      }
    }
  }

  /**
   * Adds a VisionVox audio file to the timeline
   * @param file - The VisionVox audio file to add
   */
  const handleAddVisionVoxAudio = useCallback((file: any) => {
    // Get the total number of rows and place audio on the second-to-last row
    // This ensures consistency for voiceovers from the audio generator
    const { from } = findNextAvailablePosition(
      overlays,
      visibleRows,
      durationInFrames
    );
    
    // Always place voiceovers on the second-to-last row if possible
    // Default to row 3 (the 4th row) if there are 5 or more rows
    // Or use the second-to-last row if there are fewer rows
    const targetRow = Math.max(0, visibleRows > 1 ? visibleRows - 2 : 0);
    
    // Create the sound overlay configuration
    const newSoundOverlay: SoundOverlay = {
      id: Date.now(),
      type: OverlayType.SOUND,
      content: file.name,
      src: file.url,
      from,
      row: targetRow,
      // Layout properties
      left: 0,
      top: 0,
      width: 1920,
      height: 100,
      rotation: 0,
      isDragging: false,
      durationInFrames: Math.round(file.duration * 30) || 300, // 30fps, ensure integer value
      styles: {
        opacity: 1,
      },
    };

    addOverlay(newSoundOverlay);
  }, [addOverlay, findNextAvailablePosition, overlays, visibleRows, durationInFrames]);

  /**
   * Formats a date string to a more readable format
   */
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (e) {
      return "Unknown date"
    }
  }

  /**
   * Renders an individual sound card with play controls and metadata
   * Clicking the card adds the sound to the timeline
   * Clicking the play button toggles sound preview
   *
   * @param {LocalSound} sound - The sound track data to render
   * @param {'upload' | 'voiceovers'} type - The type of sound (uploaded or Vision Vox)
   * @returns {JSX.Element} A sound card component
   */
  const renderSoundCard = (sound: LocalSound, type: "upload" | "voiceovers") => {
    const isExpanded = expandedAudio === sound.id
    const volume = audioVolumes[sound.id] || 1.0
    const isMuted = volume === 0

    return (
      <div key={sound.id} className="mb-2">
        {/* Main audio item - always visible */}
        <div
          className={`flex items-center w-full bg-white dark:bg-gray-800 rounded-md border ${
            isExpanded ? "border-primary" : "border-border"
          } p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer`}
          onClick={() => toggleExpandAudio(sound.id)}
        >
          {/* Play/Pause button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              togglePlay(sound.id)
            }}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mr-2"
          >
            {playingTrack === sound.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </button>

          {/* Title and duration */}
          <div className="flex-1 min-w-0 mr-1">
            <div className="text-xs font-medium truncate">{sound.title}</div>
            <div className="text-[10px] text-muted-foreground">{Math.round(sound.duration)}s</div>
          </div>

          {/* Expand/collapse indicator */}
          <button className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Expanded controls - only visible when expanded */}
        {isExpanded && (
          <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-border">
            {/* Volume controls */}
            <div className="flex items-center mb-2">
              <button
                onClick={() => toggleMute(sound.id)}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mr-2"
              >
                {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </button>

              <div className="flex-1">
                <Slider
                  value={[volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={(value) => handleVolumeChange(sound.id, value)}
                  className="h-1.5"
                />
              </div>

              <div className="ml-2 text-[10px] w-7 text-right">{Math.round(volume * 100)}%</div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  handleAddToTimeline(sound)
                }}
              >
                Add to Timeline
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveSound(sound.id, type)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  /**
   * Renders a VisionVox audio file card
   */
  const renderVisionVoxAudioCard = (file: any) => {
    const isExpanded = expandedAudio === file.id
    const volume = audioVolumes[file.id] || 1.0
    const isMuted = volume === 0

    return (
      <div key={file.id} className="mb-2">
        {/* Main audio item - always visible */}
        <div
          className={`flex items-center w-full bg-white dark:bg-gray-800 rounded-md border ${
            isExpanded ? "border-primary" : "border-border"
          } p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer`}
          onClick={() => toggleExpandAudio(file.id)}
        >
          {/* Play/Pause button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              togglePlay(file.id, file.url)
            }}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mr-2"
          >
            {playingTrack === file.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </button>

          {/* Title and duration */}
          <div className="flex-1 min-w-0 mr-1">
            <div className="text-xs font-medium truncate">{file.name}</div>
            <div className="text-[10px] text-muted-foreground flex items-center">
              <span>{Math.round(file.duration)}s</span>
              <span className="mx-1">•</span>
              <span className="truncate">{formatDate(file.createdAt)}</span>
            </div>
          </div>

          {/* Expand/collapse indicator */}
          <button className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Expanded controls - only visible when expanded */}
        {isExpanded && (
          <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-border">
            {/* Volume controls */}
            <div className="flex items-center mb-2">
              <button
                onClick={() => toggleMute(file.id)}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mr-2"
              >
                {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </button>

              <div className="flex-1">
                <Slider
                  value={[volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={(value) => handleVolumeChange(file.id, value)}
                  className="h-1.5"
                />
              </div>

              <div className="ml-2 text-[10px] w-7 text-right">{Math.round(volume * 100)}%</div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  handleAddVisionVoxAudio(file)
                }}
              >
                Add to Timeline
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveSound(file.id, "voiceovers")
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // If a sound overlay is selected, show its details
  if (localOverlay) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-900/40 h-full">
        <SoundDetails 
          localOverlay={localOverlay} 
          setLocalOverlay={handleUpdateOverlay}
          onBack={() => setLocalOverlay(null)}
        />
      </div>
    )
  }

  // Otherwise, show the tabbed interface
  return (
    <div className="bg-gray-50 dark:bg-gray-900/40 h-full flex flex-col">
      <div className="px-4 pt-4">
        <div className="flex w-full rounded-md bg-muted p-1">
          <button
            className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium ${
              activeTab === "upload"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50"
            }`}
            onClick={() => setActiveTab("upload")}
          >
            Upload Audio
          </button>
          <button
            className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium ${
              activeTab === "voiceovers"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50"
            }`}
            onClick={() => setActiveTab("voiceovers")}
          >
            Voiceovers
          </button>
        </div>
      </div>

      {activeTab === "upload" && (
        <div className="flex-1 flex flex-col p-4 pt-2 overflow-hidden">
          <div className="flex gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
              multiple
            />
            <Button onClick={() => fileInputRef.current?.click()} className="w-full" variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Upload Audio
            </Button>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            {uploadedSounds.length === 0 ? (
              <div className="text-center py-8">
                <p>No audio files uploaded yet</p>
                <p className="text-xs mt-1">Click the button above to upload</p>
              </div>
            ) : (
              <p className="mb-2">
                {uploadedSounds.length} audio file{uploadedSounds.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <ScrollArea className="flex-1 mt-2">
            <div className="pr-3">{uploadedSounds.map((sound) => renderSoundCard(sound, "upload"))}</div>
          </ScrollArea>
        </div>
      )}

      {activeTab === "voiceovers" && (
        <div className="flex-1 flex flex-col p-4 pt-2 overflow-hidden">
          <div className="flex flex-col flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {visionVoxAudio.length > 0 ? (
                <p>
                  {visionVoxAudio.length} voiceover{visionVoxAudio.length !== 1 ? "s" : ""} from audio generator
                </p>
              ) : (
                <p>No voiceovers available</p>
              )}
            </div>

            {visionVoxAudio.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
                <div>
                  <p>No voiceovers yet</p>
                  <p className="text-xs mt-1">Generate audio in the Audio Generator and send it to the Video Editor</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="pr-3">{visionVoxAudio.map(renderVisionVoxAudioCard)}</div>
              </ScrollArea>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SoundsPanel
