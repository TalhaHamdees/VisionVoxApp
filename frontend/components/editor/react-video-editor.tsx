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
import { Overlay } from "./types";
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

  // Load project on initial render if projectId is in URL
  useEffect(() => {
    const projectId = searchParams.get('projectId');
    if (projectId) {
      const project = loadProject(projectId);
      if (project) {
        // Apply loaded project state
        setOverlays(project.overlays);
        setCurrentFrame(project.currentFrame);
        setAspectRatio(project.aspectRatio);
        setCurrentProjectName(project.name);
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
