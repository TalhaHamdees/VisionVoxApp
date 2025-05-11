"use client";

// UI Components
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/sidebar/app-sidebar";
import { Editor } from "./components/core/editor";
import { SidebarProvider as UISidebarProvider } from "@/components/ui/sidebar";
import { SidebarProvider as EditorSidebarProvider } from "./contexts/sidebar-context";

// Context Providers
import { EditorProvider } from "./contexts/editor-context";

// Custom Hooks
import { useOverlays } from "./hooks/use-overlays";
import { useVideoPlayer } from "./hooks/use-video-player";
import { useTimelineClick } from "./hooks/use-timeline-click";
import { useAspectRatio } from "./hooks/use-aspect-ratio";
import { useCompositionDuration } from "./hooks/use-composition-duration";
import { useHistory } from "./hooks/use-history";
import { useProjectPersistence } from "./hooks/use-project-persistence";

// Types
import { Overlay, OverlayType } from "./types";
import { useRendering } from "./hooks/use-rendering";
import { FPS } from "./constants";
import { TimelineProvider } from "./contexts/timeline-context";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ReactVideoEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Overlay management hooks
  const {
    overlays,
    setOverlays,
    selectedOverlayId,
    setSelectedOverlayId,
    selectedOverlayIds,
    setSelectedOverlayIds,
    addToSelection,
    removeFromSelection,
    clearSelection,
    isSelected,
    toggleSelection,
    selectAll,
    deleteSelected,
    changeOverlay,
    addOverlay,
    deleteOverlay,
    duplicateOverlay,
    splitOverlay,
    deleteOverlaysByRow,
    updateOverlayStyles,
    resetOverlays,
  } = useOverlays();

  // Video player controls and state
  const { isPlaying, currentFrame, playerRef, togglePlayPause, formatTime, setCurrentFrame } =
    useVideoPlayer();

  // Composition duration calculations
  const { durationInFrames, durationInSeconds } =
    useCompositionDuration(overlays);

  // Aspect ratio and player dimension management
  const {
    aspectRatio,
    setAspectRatio,
    playerDimensions,
    updatePlayerDimensions,
    getAspectRatioDimensions,
  } = useAspectRatio();

  // Project persistence
  const {
    saveProject,
    loadProject,
    autoSave,
    getRecentProjects,
    currentProjectId,
    currentProjectName,
    setCurrentProjectName,
    isNewProject
  } = useProjectPersistence(overlays, currentFrame, aspectRatio);

  // Listen for forced selection events from timeline
  useEffect(() => {
    const handleForceSelection = (event: Event) => {
      const customEvent = event as CustomEvent<{id: number}>;
      if (customEvent.detail && typeof customEvent.detail.id === 'number') {
        console.log("Force selecting item ID:", customEvent.detail.id);
        
        // Force update both selection mechanisms
        setSelectedOverlayId(customEvent.detail.id);
        setSelectedOverlayIds(new Set([customEvent.detail.id]));
        
        // Log selection state after update
        setTimeout(() => {
          console.log("Selection state after force:", {
            id: customEvent.detail.id,
            selectedOverlayId,
            selectedOverlayIdsSize: selectedOverlayIds.size
          });
        }, 10);
      }
    };

    window.addEventListener('timeline:forceselection', handleForceSelection);
    return () => {
      window.removeEventListener('timeline:forceselection', handleForceSelection);
    };
  }, [setSelectedOverlayId, setSelectedOverlayIds]);

  // Add this function to sanitize blob URLs in overlays
  const sanitizeOverlayUrls = async (overlaysToSanitize: Overlay[]) => {
    const sanitizedOverlays = [...overlaysToSanitize];
    
    for (let i = 0; i < sanitizedOverlays.length; i++) {
      const overlay = sanitizedOverlays[i];
      
      // Only process image and video overlays with blob URLs
      if ((overlay.type === OverlayType.IMAGE || overlay.type === OverlayType.VIDEO) && 
          'src' in overlay && 
          overlay.src.startsWith('blob:')) {
        try {
          // Attempt to fetch the blob and convert to data URL
          const response = await fetch(overlay.src);
          if (!response.ok) {
            console.error(`Failed to fetch blob URL for overlay ${overlay.id}`);
            continue;
          }
          
          const blob = await response.blob();
          const reader = new FileReader();
          
          // Use a promise to handle the async FileReader
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
          // Update the overlay with the data URL
          sanitizedOverlays[i] = {
            ...overlay,
            src: dataUrl
          };
          
          console.log(`Sanitized blob URL for overlay ${overlay.id}`);
        } catch (error) {
          console.error(`Error sanitizing blob URL for overlay ${overlay.id}:`, error);
        }
      }
    }
    
    return sanitizedOverlays;
  };

  // Load project on initial render if projectId is in URL
  useEffect(() => {
    const projectId = searchParams.get('projectId');
    if (projectId) {
      const project = loadProject(projectId);
      if (project) {
        // Sanitize overlays before applying them
        sanitizeOverlayUrls(project.overlays).then(sanitizedOverlays => {
          // Apply loaded project state with sanitized URLs
          setOverlays(sanitizedOverlays);
          setCurrentFrame(project.currentFrame);
          setAspectRatio(project.aspectRatio);
          setCurrentProjectName(project.name);
        });
      }
    }
  }, [searchParams]);

  // Set up beforeunload event to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (overlays.length > 0) {
        // Auto-save before leaving
        autoSave();
        
        // Show confirmation dialog
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [overlays, autoSave]);

  // Event handlers
  const handleOverlayChange = (updatedOverlay: Overlay) => {
    changeOverlay(updatedOverlay.id, () => updatedOverlay);
  };

  const { width: compositionWidth, height: compositionHeight } =
    getAspectRatioDimensions();

  const handleTimelineClick = useTimelineClick(playerRef, durationInFrames);

  const inputProps = {
    overlays,
    durationInFrames,
    fps: FPS,
    width: compositionWidth,
    height: compositionHeight,
    src: "",
  };

  const { renderMedia, state } = useRendering("TestComponent", inputProps);

  // Replace history management code with hook
  const { undo, redo, canUndo, canRedo } = useHistory(overlays, setOverlays);

  // Handle manual save
  const handleSaveProject = (name?: string) => {
    saveProject(name);
  };

  // Handle new project
  const handleNewProject = () => {
    // Confirm if there are unsaved changes
    if (overlays.length > 0) {
      if (confirm('Create a new project? Any unsaved changes will be lost.')) {
        resetOverlays();
        router.push('/editor');
      }
    } else {
      resetOverlays();
      router.push('/editor');
    }
  };

  // Handle open project
  const handleOpenProject = (projectId: string) => {
    // Confirm if there are unsaved changes
    if (overlays.length > 0) {
      if (confirm('Open another project? Any unsaved changes will be lost.')) {
        const project = loadProject(projectId);
        if (project) {
          setOverlays(project.overlays);
          setCurrentFrame(project.currentFrame);
          setAspectRatio(project.aspectRatio);
          router.push(`/editor?projectId=${projectId}`);
        }
      }
    } else {
      const project = loadProject(projectId);
      if (project) {
        setOverlays(project.overlays);
        setCurrentFrame(project.currentFrame);
        setAspectRatio(project.aspectRatio);
        router.push(`/editor?projectId=${projectId}`);
      }
    }
  };

  // Combine all editor context values
  const editorContextValue = {
    // Overlay management
    overlays,
    setOverlays,
    selectedOverlayId,
    setSelectedOverlayId,
    selectedOverlayIds,
    setSelectedOverlayIds,
    addToSelection,
    removeFromSelection,
    clearSelection,
    isSelected,
    toggleSelection,
    selectAll,
    deleteSelected,
    changeOverlay,
    handleOverlayChange,
    addOverlay,
    deleteOverlay,
    duplicateOverlay,
    splitOverlay,
    resetOverlays,

    // Player controls
    isPlaying,
    currentFrame,
    playerRef,
    togglePlayPause,
    formatTime,
    handleTimelineClick,
    setCurrentFrame,

    // Dimensions and duration
    aspectRatio,
    setAspectRatio,
    playerDimensions,
    updatePlayerDimensions,
    getAspectRatioDimensions,
    durationInFrames,
    durationInSeconds,

    // Add rendering related values
    renderMedia,
    state,

    deleteOverlaysByRow,

    // History management
    undo,
    redo,
    canUndo,
    canRedo,

    // New style management
    updateOverlayStyles,
    
    // Project management
    saveProject: handleSaveProject,
    loadProject: handleOpenProject,
    newProject: handleNewProject,
    currentProjectName,
    setCurrentProjectName,
    isNewProject,
    getRecentProjects,
  };

  return (
    <UISidebarProvider>
      <EditorSidebarProvider>
        <TimelineProvider>
          <EditorProvider value={editorContextValue}>
            <AppSidebar />
            <SidebarInset>
              <Editor />
            </SidebarInset>
          </EditorProvider>
        </TimelineProvider>
      </EditorSidebarProvider>
    </UISidebarProvider>
  );
}
