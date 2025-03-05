import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { LocalSound, OverlayType, SoundOverlay } from "../../../types";
import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { localSounds } from "../../../templates/sound-templates";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { useEditorContext } from "../../../contexts/editor-context";
import { useTimeline } from "../../../contexts/timeline-context";
import { SoundDetails } from "./sound-details";
import { FileUpload } from "../../ui/file-upload";
import { useFileUpload } from "../../../hooks/use-file-upload";
import { UploadedFilesGrid } from "../../ui/uploaded-files-grid";

/**
 * SoundsPanel Component
 *
 * A panel component that manages sound overlays in the editor. It provides functionality for:
 * - Displaying a list of available sound tracks
 * - Uploading custom audio files
 * - Playing/pausing sound previews
 * - Adding sounds to the timeline
 * - Managing selected sound overlays and their properties
 *
 * The component switches between three views:
 * 1. Sound library view: Shows available preset sounds that can be added
 * 2. Upload view: Allows users to upload their own audio files
 * 3. Sound details view: Shows controls for the currently selected sound overlay
 *
 * @component
 */
const SoundsPanel: React.FC = () => {
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const {
    addOverlay,
    overlays,
    durationInFrames,
    selectedOverlayId,
    changeOverlay,
  } = useEditorContext();
  const { findNextAvailablePosition } = useTimelinePositioning();
  const { visibleRows } = useTimeline();
  const [localOverlay, setLocalOverlay] = useState<SoundOverlay | null>(null);
  const [activeTab, setActiveTab] = useState<string>("library");
  
  // File upload state and handlers
  const {
    isUploading,
    uploadedFiles,
    error: uploadError,
    handleFileUpload,
  } = useFileUpload();

  useEffect(() => {
    if (selectedOverlayId === null) {
      setLocalOverlay(null);
      return;
    }

    const selectedOverlay = overlays.find(
      (overlay) => overlay.id === selectedOverlayId
    );

    if (selectedOverlay?.type === OverlayType.SOUND) {
      setLocalOverlay(selectedOverlay);
    }
  }, [selectedOverlayId, overlays]);

  /**
   * Updates the local overlay state and propagates changes to the editor context
   * @param {SoundOverlay} updatedOverlay - The modified sound overlay
   */
  const handleUpdateOverlay = (updatedOverlay: SoundOverlay) => {
    setLocalOverlay(updatedOverlay);
    changeOverlay(updatedOverlay.id, updatedOverlay);
  };

  /**
   * Initialize audio elements for each sound and handle cleanup
   */
  useEffect(() => {
    // Initialize audio elements for local sounds
    localSounds.forEach((sound) => {
      audioRefs.current[sound.id] = new Audio(sound.file);
    });
    
    // Initialize audio elements for uploaded sounds
    uploadedFiles
      .filter(file => file.type.startsWith("audio/"))
      .forEach((file) => {
        audioRefs.current[file.id] = new Audio(file.url);
      });

    return () => {
      Object.values(audioRefs.current).forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, [localSounds, uploadedFiles]);

  /**
   * Toggles play/pause state for a sound track
   * Ensures only one track plays at a time
   *
   * @param soundId - Unique identifier of the sound to toggle
   */
  const togglePlay = (soundId: string) => {
    const audio = audioRefs.current[soundId];
    if (!audio) return;
    
    if (playingTrack === soundId) {
      audio.pause();
      setPlayingTrack(null);
    } else {
      if (playingTrack && audioRefs.current[playingTrack]) {
        audioRefs.current[playingTrack].pause();
      }
      audio
        .play()
        .catch((error) => console.error("Error playing audio:", error));
      setPlayingTrack(soundId);
    }
  };

  /**
   * Adds a sound overlay to the timeline at the next available position
   * Calculates duration based on the sound length (30fps)
   *
   * @param {LocalSound} sound - The sound track to add to the timeline
   */
  const handleAddToTimeline = (sound: LocalSound) => {
    // Find the next available position on the timeline
    const { from, row } = findNextAvailablePosition(
      overlays,
      visibleRows,
      durationInFrames
    );

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
    };

    addOverlay(newSoundOverlay);
  };
  
  /**
   * Adds an uploaded sound to the timeline
   * @param file - The uploaded audio file
   */
  const handleAddUploadedSound = (file: any) => {
    if (!file.type.startsWith("audio/")) return;
    
    // Find the next available position on the timeline
    const { from, row } = findNextAvailablePosition(
      overlays,
      visibleRows,
      durationInFrames
    );
    
    // Create the sound overlay configuration
    const newSoundOverlay: SoundOverlay = {
      id: Date.now(),
      type: OverlayType.SOUND,
      content: file.name,
      src: file.url,
      from,
      row,
      // Layout properties
      left: 0,
      top: 0,
      width: 1920,
      height: 100,
      rotation: 0,
      isDragging: false,
      durationInFrames: file.duration ? Math.floor(file.duration * 30) : 300, // 30fps
      styles: {
        opacity: 1,
      },
    };

    addOverlay(newSoundOverlay);
  };

  /**
   * Renders an individual sound card with play controls and metadata
   * Clicking the card adds the sound to the timeline
   * Clicking the play button toggles sound preview
   *
   * @param {LocalSound} sound - The sound track data to render
   * @returns {JSX.Element} A sound card component
   */
  const renderSoundCard = (sound: LocalSound) => (
    <div
      key={sound.id}
      onClick={() => handleAddToTimeline(sound)}
      className="group flex items-center gap-3 p-2.5 bg-white dark:bg-gray-900 rounded-md 
        border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900
        transition-all duration-150 cursor-pointer"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          togglePlay(sound.id);
        }}
        className="h-8 w-8 rounded-full bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900 
          text-gray-700 dark:text-gray-300"
      >
        {playingTrack === sound.id ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {sound.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {sound.artist}
        </p>
      </div>
    </div>
  );
  
  /**
   * Renders an uploaded sound card with play controls and metadata
   */
  const renderUploadedSoundCard = (file: any) => (
    <div
      key={file.id}
      onClick={() => handleAddUploadedSound(file)}
      className="group flex items-center gap-3 p-2.5 bg-white dark:bg-gray-900 rounded-md 
        border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900
        transition-all duration-150 cursor-pointer"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          togglePlay(file.id);
        }}
        className="h-8 w-8 rounded-full bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900 
          text-gray-700 dark:text-gray-300"
      >
        {playingTrack === file.id ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {file.name}
        </p>
        {file.duration && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {Math.floor(file.duration / 60)}:{Math.floor(file.duration % 60).toString().padStart(2, '0')}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/40 h-full">
      {!localOverlay ? (
        <Tabs defaultValue="library" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="library">Sound Library</TabsTrigger>
            <TabsTrigger value="upload">Upload Audio</TabsTrigger>
          </TabsList>
          
          <TabsContent value="library" className="space-y-4">
            {localSounds.map(renderSoundCard)}
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-4">
            <FileUpload 
              onFilesSelected={handleFileUpload}
              accept="audio/*"
              isUploading={isUploading}
              error={uploadError}
            />
            
            <div className="space-y-2 mt-4">
              {isUploading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2].map((i) => (
                    <div 
                      key={i}
                      className="h-16 bg-gray-200 dark:bg-gray-800 rounded-md"
                    />
                  ))}
                </div>
              ) : uploadedFiles.filter(file => file.type.startsWith("audio/")).length > 0 ? (
                uploadedFiles
                  .filter(file => file.type.startsWith("audio/"))
                  .map(renderUploadedSoundCard)
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <p>No audio files uploaded yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <SoundDetails
          localOverlay={localOverlay}
          setLocalOverlay={handleUpdateOverlay}
        />
      )}
    </div>
  );
};

export default SoundsPanel;
