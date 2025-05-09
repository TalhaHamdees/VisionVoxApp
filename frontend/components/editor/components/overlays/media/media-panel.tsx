import React, { useState, useEffect, useCallback, useRef } from "react";
import { ImageIcon, Film, Sparkles, Info, Plus, Grid, Trash2 } from "lucide-react";
import { useEditorContext } from "../../../contexts/editor-context";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { useTimeline } from "../../../contexts/timeline-context";
import { OverlayType, ImageOverlay, ClipOverlay } from "../../../types";
import { useFileUpload } from "../../../hooks/use-file-upload";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "../../../components/ui/file-upload";
import { UploadedFilesGrid } from "../../../components/ui/uploaded-files-grid";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { storeMediaFile, getAllMediaFiles, deleteMediaFile } from "@/lib/indexed-db";

/**
 * MediaPanel Component
 * 
 * A panel for managing media (images and videos) with automated keyframing functionality.
 * Features:
 * - Media library view showing all images and videos
 * - Image sequence selection for creating keyframe animations
 * - Automatic low-resolution detection and enhancement
 * - ESRGAN upscaling integration
 * - Persistence across sessions using IndexedDB
 * 
 * @component
 */
const MediaPanel: React.FC = () => {
  // File management states
  const [activeTab, setActiveTab] = useState<string>("library");
  const [selectedSequence, setSelectedSequence] = useState<Array<any>>([]);
  const [showInfoDialog, setShowInfoDialog] = useState<boolean>(false);
  const [lastAddedToSequence, setLastAddedToSequence] = useState<string | null>(null);
  const [persistentMediaFiles, setPersistentMediaFiles] = useState<Array<any>>([]);
  const [isLoadingPersistentFiles, setIsLoadingPersistentFiles] = useState<boolean>(true);
  const sequenceNotificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Editor context and hooks
  const { addOverlay, overlays, durationInFrames } = useEditorContext();
  const { findNextAvailablePosition } = useTimelinePositioning();
  const { visibleRows } = useTimeline();
  const { uploadedFiles, handleFileUpload: origHandleFileUpload, isUploading, error: uploadError } = useFileUpload();
  const { toast } = useToast();

  // Combined files from uploads and persisted storage
  const imageFiles = [...persistentMediaFiles.filter(file => file.type.startsWith("image/")), 
                       ...uploadedFiles.filter(file => file.type.startsWith("image/"))];
  const videoFiles = [...persistentMediaFiles.filter(file => file.type.startsWith("video/")),
                      ...uploadedFiles.filter(file => file.type.startsWith("video/"))];

  // Check for duplicate files based on name and size
  const uniqueImageFiles = imageFiles.filter((file, index, self) => 
    index === self.findIndex(f => f.name === file.name && f.size === file.size)
  );
  const uniqueVideoFiles = videoFiles.filter((file, index, self) => 
    index === self.findIndex(f => f.name === file.name && f.size === file.size)
  );

  // Load persisted media files on mount
  useEffect(() => {
    const loadPersistentMediaFiles = async () => {
      try {
        setIsLoadingPersistentFiles(true);
        const mediaFiles = await getAllMediaFiles();
        
        // Create URL objects for blobs
        const processedFiles = mediaFiles.map(file => {
          // If we have a dataUrl, use that directly
          if (file.dataUrl) {
            // Also store in sessionStorage for quicker access
            try {
              sessionStorage.setItem(`media_url_${file.id}`, file.dataUrl);
            } catch (e) {
              console.warn("Failed to store URL in sessionStorage", e);
            }
            
            return {
              ...file,
              url: file.dataUrl
            };
          }
          
          // Otherwise, create a blob URL from the blob
          const url = URL.createObjectURL(file.blob);
          
          // Store URL in sessionStorage to make it persist across page navigation
          try {
            sessionStorage.setItem(`media_url_${file.id}`, url);
          } catch (e) {
            console.warn("Failed to store URL in sessionStorage", e);
          }
          
          return {
            ...file,
            url
          };
        });
        
        setPersistentMediaFiles(processedFiles);
      } catch (error) {
        console.error("Error loading persistent media files:", error);
        toast({
          title: "Error",
          description: "Failed to load saved media files",
          variant: "destructive"
        });
      } finally {
        setIsLoadingPersistentFiles(false);
      }
    };
    
    loadPersistentMediaFiles();
    
    // Clean up blob URLs on unmount
    return () => {
      persistentMediaFiles.forEach(file => {
        // Only revoke object URLs, not data URLs
        if (file.url && file.url.startsWith('blob:')) {
          URL.revokeObjectURL(file.url);
        }
      });
    };
  }, []);

  // Override the handleFileUpload to persist files
  const handleFileUpload = async (files: FileList | null) => {
    // First, let the original handler process the files
    origHandleFileUpload(files);
    
    // Then store the files in IndexedDB
    if (files && files.length > 0) {
      const persistFiles = async () => {
        // Wait a short time to allow useFileUpload to finish processing
        setTimeout(async () => {
          try {
            // Find the newly uploaded files
            const newUploadedFiles = uploadedFiles.filter(file => 
              !persistentMediaFiles.some(pFile => pFile.name === file.name)
            );
            
            for (const file of newUploadedFiles) {
              try {
                // Convert to data URL for more stable storage
                let dataUrl: string | undefined;
                try {
                  dataUrl = await fileUrlToDataUrl(file.url);
                } catch (error) {
                  console.error("Failed to convert to data URL:", error);
                }
                
                // Fetch the actual blob from the URL
                let blobData: Blob;
                try {
                  const response = await fetch(file.url);
                  blobData = await response.blob();
                } catch (error) {
                  console.error("Failed to fetch blob data:", error);
                  // Create a small placeholder blob if fetch fails
                  blobData = new Blob([""], { type: file.type });
                }
                
                // Store in IndexedDB with the same ID as in the uploadedFiles state
                await storeMediaFile({
                  id: file.id,
                  blob: blobData,
                  name: file.name,
                  type: file.type,
                  dataUrl: dataUrl
                });
                
                // Store in sessionStorage for immediate use
                if (dataUrl) {
                  sessionStorage.setItem(`media_url_${file.id}`, dataUrl);
                }
                
                // Add to persistent files state with data URL
                setPersistentMediaFiles(prev => [...prev, {
                  ...file,
                  dataUrl
                }]);
              } catch (error) {
                console.error(`Error persisting media file ${file.name}:`, error);
              }
            }
          } catch (error) {
            console.error("Error in persistence processing:", error);
          }
        }, 500);
      };
      
      // Start the persistence process in the background
      persistFiles();
    }
  };

  // Handle removing a file from the library
  const handleRemoveFile = async (fileId: string) => {
    try {
      // Remove from IndexedDB
      await deleteMediaFile(fileId);
      
      // Update UI state
      setPersistentMediaFiles(prev => {
        // Find the file to get its URL for cleanup
        const fileToRemove = prev.find(file => file.id === fileId);
        if (fileToRemove?.url) {
          URL.revokeObjectURL(fileToRemove.url);
        }
        
        return prev.filter(file => file.id !== fileId);
      });
      
      // Also remove from sequence if it's there
      setSelectedSequence(prev => prev.filter(file => file.id !== fileId));
      
      toast({
        title: "File Removed",
        description: "The media file has been removed from your library.",
      });
    } catch (error) {
      console.error("Error removing media file:", error);
      toast({
        title: "Error",
        description: "Failed to remove the media file.",
        variant: "destructive"
      });
    }
  };

  /**
   * Checks if an image is likely low resolution and might need upscaling
   * @param file - The file object to check
   * @returns Promise<boolean> - Whether the image needs upscaling
   */
  const isLowResolutionImage = async (file: any): Promise<boolean> => {
    // Create a temporary Image object to get dimensions
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Consider an image low resolution if either dimension is less than 800px
        const isLowRes = img.width < 800 || img.height < 800;
        URL.revokeObjectURL(img.src);
        resolve(isLowRes);
      };
      img.onerror = () => resolve(false);
      img.src = file.url;
    });
  };

  /**
   * Enhances a low-resolution image using the image enhancement API
   * @param file - The file object to enhance
   * @returns Promise with the enhanced file information
   */
  const enhanceImage = async (file: any) => {
    try {
      // Fetch the image as a blob
      const response = await fetch(file.url);
      const blob = await response.blob();
      
      // Create a File object
      const imageFile = new File([blob], file.name, { type: file.type });
      
      // Build form data
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("upscale", "true");
      
      // Call enhancement API
      const enhanceResponse = await fetch("/api/image-enhancement?action=enhance", {
        method: "POST",
        body: formData,
      });
      
      if (!enhanceResponse.ok) {
        throw new Error("Failed to enhance image");
      }
      
      const enhancedData = await enhanceResponse.json();
      
      if (enhancedData.success) {
        // Return the enhanced image URL
        return {
          ...file,
          url: enhancedData.enhancedImage,
          enhanced: true
        };
      }
      
      return file;
    } catch (error) {
      console.error("Error enhancing image:", error);
      toast({
        title: "Enhancement Failed",
        description: "Could not enhance the image. Using original.",
        variant: "destructive"
      });
      return file;
    }
  };

  /**
   * Convert a file URL to a data URL
   * This helps with stability and persistence of images
   */
  const fileUrlToDataUrl = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting file to data URL:", error);
      throw error;
    }
  };

  /**
   * Create a stable URL for an image that persists across page reloads
   */
  const createStableImageUrl = async (file: any): Promise<string> => {
    try {
      // First check if the file has a dataUrl property
      if (file.dataUrl) {
        return file.dataUrl;
      }
      
      // Check if we already have a cached URL in sessionStorage
      const cachedUrl = sessionStorage.getItem(`media_url_${file.id}`);
      if (cachedUrl) {
        try {
          // Verify the URL is still valid
          await fetch(cachedUrl, { method: 'HEAD' });
          return cachedUrl;
        } catch (error) {
          console.log("Cached URL is no longer valid, recreating...");
          // Cached URL is invalid, continue to recreate
        }
      }
      
      // If we have a blob, create a new URL
      if (file.blob instanceof Blob) {
        const newUrl = URL.createObjectURL(file.blob);
        sessionStorage.setItem(`media_url_${file.id}`, newUrl);
        return newUrl;
      }
      
      // If it's an existing URL, convert to data URL for better persistence
      if (file.url && !file.url.startsWith('data:')) {
        try {
          const dataUrl = await fileUrlToDataUrl(file.url);
          // Store data URL in sessionStorage for persistence
          sessionStorage.setItem(`media_url_${file.id}`, dataUrl);
          return dataUrl;
        } catch (error) {
          console.error("Failed to convert to data URL:", error);
        }
      }
      
      // Fallback to original URL if everything else fails
      return file.url;
    } catch (error) {
      console.error("Error creating stable URL:", error);
      return file.url; // Return original as fallback
    }
  };

  /**
   * Handle adding a sequence of images to the timeline as keyframes
   */
  const handleAddSequenceToTimeline = async () => {
    if (selectedSequence.length === 0) {
      toast({
        title: "No Images Selected",
        description: "Please select images for the sequence first.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Show processing toast
      toast({
        title: "Processing Images",
        description: `Preparing ${selectedSequence.length} images for the timeline...`,
      });

      // Process images in sequence
      const processedSequence = [];
      for (let i = 0; i < selectedSequence.length; i++) {
        const file = selectedSequence[i];
        
        // Check if image needs upscaling
        const needsUpscaling = await isLowResolutionImage(file);
        
        // Process the image if needed
        let processedFile = file;
        if (needsUpscaling) {
          toast({
            title: "Enhancing Image",
            description: `Upscaling low-resolution image: ${file.name}`,
          });
          processedFile = await enhanceImage(file);
        }
        
        // Create a stable URL for the image
        const stableUrl = await createStableImageUrl(processedFile);
        processedSequence.push({
          ...processedFile,
          stableUrl
        });
      }

      // Calculate the total duration for the sequence
      // Each image will get approximately the same amount of time
      const sequenceDuration = Math.floor(durationInFrames * 0.8); // Use 80% of total timeline
      const frameDuration = Math.floor(sequenceDuration / processedSequence.length);
      
      // Find the next available position for the sequence
      const { row } = findNextAvailablePosition(
        overlays,
        visibleRows,
        durationInFrames
      );

      // Add each image to the timeline sequentially
      for (let i = 0; i < processedSequence.length; i++) {
        const file = processedSequence[i];
        
        // Position this frame at the correct spot in the sequence
        const from = i * frameDuration;
        
        // Create the image overlay using the stable URL
        const newImageOverlay: ImageOverlay = {
          id: Date.now() + i,
          type: OverlayType.IMAGE,
          src: file.stableUrl || file.url,
          content: file.name,
          from,
          durationInFrames: frameDuration,
          row,
          // Layout properties
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          rotation: 0,
          isDragging: false,
          // Default styles
          styles: {
            objectFit: "contain",
            objectPosition: "center",
            borderRadius: "0px",
          },
        };
        
        // Add to timeline
        addOverlay(newImageOverlay);
      }
      
      // Clear the selected sequence
      setSelectedSequence([]);
      
      toast({
        title: "Sequence Added",
        description: `Successfully added ${processedSequence.length} images to the timeline.`,
      });
    } catch (error) {
      console.error("Error adding sequence to timeline:", error);
      toast({
        title: "Error",
        description: "Failed to add image sequence to timeline.",
        variant: "destructive"
      });
    }
  };

  /**
   * Handle adding a single image to the sequence
   */
  const handleAddToSequence = (file: any) => {
    // Check if the file is already in the sequence
    if (selectedSequence.some(item => item.id === file.id)) {
      // Remove from sequence if already selected
      setSelectedSequence(prev => prev.filter(item => item.id !== file.id));
      setLastAddedToSequence(null);
    } else {
      // Add to sequence
      setSelectedSequence(prev => [...prev, file]);
      
      // Set this as the last added file and show notification
      setLastAddedToSequence(file.id);
      
      // Show toast notification
      toast({
        title: "Added to Sequence",
        description: `${file.name} added as #${selectedSequence.length + 1}`,
      });
      
      // Clear previous timeout if exists
      if (sequenceNotificationTimeoutRef.current) {
        clearTimeout(sequenceNotificationTimeoutRef.current);
      }
      
      // Clear notification after 1.5 seconds
      sequenceNotificationTimeoutRef.current = setTimeout(() => {
        setLastAddedToSequence(null);
      }, 1500);
    }
  };

  /**
   * Add image directly to timeline (without sequencing)
   */
  const handleAddImageToTimeline = async (file: any) => {
    try {
      // Find the next available position
      const { from, row } = findNextAvailablePosition(
        overlays,
        visibleRows,
        durationInFrames
      );
      
      // Calculate a reasonable duration for a static image
      const imageDuration = Math.min(300, Math.floor(durationInFrames / 3));
      
      // Create a stable URL for the image
      const imageUrl = await createStableImageUrl(file);
      
      // Create the image overlay
      const newImageOverlay: ImageOverlay = {
        id: Date.now(),
        type: OverlayType.IMAGE,
        src: imageUrl,
        content: file.name,
        from,
        durationInFrames: imageDuration,
        row,
        // Layout properties
        left: 0,
        top: 0,
        width: 1920,
        height: 1080,
        rotation: 0,
        isDragging: false,
        // Default styles
        styles: {
          objectFit: "contain",
          objectPosition: "center",
          borderRadius: "0px",
        },
      };
      
      // Add to timeline
      addOverlay(newImageOverlay);
      
      toast({
        title: "Image Added",
        description: "Image has been added to the timeline.",
      });
    } catch (error) {
      console.error("Error adding image to timeline:", error);
      toast({
        title: "Error",
        description: "Failed to add image to timeline. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeouts
      if (sequenceNotificationTimeoutRef.current) {
        clearTimeout(sequenceNotificationTimeoutRef.current);
      }
      
      // Clean up blob URLs
      [...persistentMediaFiles, ...uploadedFiles].forEach(file => {
        if (file?.url) {
          URL.revokeObjectURL(file.url);
        }
      });
    };
  }, [persistentMediaFiles, uploadedFiles]);

  return (
    <div className="p-2 h-full bg-background">
      <Tabs defaultValue="library" className="h-full flex flex-col" onValueChange={setActiveTab}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="library" className="flex-1">
            <Grid className="mr-2 h-4 w-4" />
            Library
          </TabsTrigger>
          <TabsTrigger value="sequence" className="flex-1">
            <Film className="mr-2 h-4 w-4" />
            Sequence {selectedSequence.length > 0 && `(${selectedSequence.length})`}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="library" className="flex-1 overflow-auto">
          <div className="space-y-4">
            <div className="flex justify-between">
              <h3 className="text-sm font-medium mb-2">Media Library</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInfoDialog(true)}
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
            
            <FileUpload 
              onFilesSelected={handleFileUpload}
              accept="image/*,video/*"
              isUploading={isUploading || isLoadingPersistentFiles}
              error={uploadError}
            />
            
            {(uniqueImageFiles.length > 0 || uniqueVideoFiles.length > 0) ? (
              <>
                {uniqueImageFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium flex items-center">
                      <ImageIcon className="h-3 w-3 mr-1" />
                      Images ({uniqueImageFiles.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {uniqueImageFiles.map((file) => (
                        <div
                          key={file.id}
                          className={`group relative border rounded-md overflow-hidden cursor-pointer transition-colors ${
                            selectedSequence.some(item => item.id === file.id)
                              ? 'border-primary'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                          }`}
                        >
                          <div 
                            className="w-full"
                            onClick={() => handleAddImageToTimeline(file)}
                          >
                            <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <img
                                src={file.url}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            <div className="p-2 bg-white dark:bg-gray-900">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {file.name}
                              </p>
                            </div>
                          </div>
                          
                          {/* Add to sequence button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full h-6 w-6 p-0 flex items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToSequence(file);
                            }}
                            title="Add to sequence"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          
                          {/* Remove file button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 bg-black/50 hover:bg-red-500/70 text-white rounded-full h-6 w-6 p-0 flex items-center justify-center transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(file.id);
                            }}
                            title="Remove file"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          
                          {/* Selected indicator */}
                          {selectedSequence.some(item => item.id === file.id) && (
                            <div className="absolute bottom-2 right-2 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                              {selectedSequence.findIndex(item => item.id === file.id) + 1}
                            </div>
                          )}
                          
                          {/* Just added notification */}
                          {lastAddedToSequence === file.id && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center animate-pulse">
                              <div className="bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                                Added to sequence!
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {uniqueVideoFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium flex items-center">
                      <Film className="h-3 w-3 mr-1" />
                      Videos ({uniqueVideoFiles.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {uniqueVideoFiles.map((file) => (
                        <div
                          key={file.id}
                          className="group relative border rounded-md overflow-hidden cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                          onClick={() => {
                            // Add video to timeline
                            const { from, row } = findNextAvailablePosition(
                              overlays,
                              visibleRows,
                              durationInFrames
                            );
                            
                            // Create the video overlay with correct type
                            const newVideoOverlay: ClipOverlay = {
                              id: Date.now(),
                              type: OverlayType.VIDEO,
                              src: file.url,
                              content: file.name,
                              from,
                              durationInFrames: Math.ceil((file.duration || 3) * 30), // Convert seconds to frames (30fps)
                              row,
                              // Layout properties
                              left: 0,
                              top: 0,
                              width: 1920,
                              height: 1080,
                              rotation: 0,
                              isDragging: false,
                              // Default styles
                              styles: {
                                objectFit: "contain",
                                objectPosition: "center",
                                volume: 1,
                              },
                            };
                            
                            addOverlay(newVideoOverlay);
                            
                            toast({
                              title: "Video Added",
                              description: "Video has been added to the timeline.",
                            });
                          }}
                        >
                          <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative">
                            {file.thumbnail ? (
                              <img
                                src={file.thumbnail}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="bg-gray-300 dark:bg-gray-700 w-full h-full flex items-center justify-center">
                                <Film className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-black/50 rounded-full p-2">
                                <Film className="h-5 w-5 text-white" />
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-2 bg-white dark:bg-gray-900">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {file.name}
                            </p>
                            {file.duration && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {Math.floor(file.duration / 60)}:{(file.duration % 60).toString().padStart(2, '0')}
                              </p>
                            )}
                          </div>
                          
                          {/* Remove file button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 bg-black/50 hover:bg-red-500/70 text-white rounded-full h-6 w-6 p-0 flex items-center justify-center transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(file.id);
                            }}
                            title="Remove file"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-border rounded-md">
                <p className="text-sm text-muted-foreground">
                  {isLoadingPersistentFiles 
                    ? "Loading your media library..." 
                    : "Upload images and videos to add to your project"}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="sequence" className="flex-1 overflow-auto">
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Image Sequence</h3>
              <span className="text-xs text-muted-foreground">
                {selectedSequence.length} images selected
              </span>
            </div>
            
            {selectedSequence.length > 0 ? (
              <>
                <div className="border rounded-md p-2 bg-background">
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {selectedSequence.map((file, index) => (
                      <div 
                        key={file.id} 
                        className="relative group cursor-pointer border rounded-md overflow-hidden"
                        onClick={() => handleAddToSequence(file)}
                      >
                        <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded-md z-10">
                          {index + 1}
                        </div>
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full aspect-video object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddSequenceToTimeline} 
                    className="flex-1"
                  >
                    <Film className="mr-2 h-4 w-4" />
                    Add Sequence to Timeline
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedSequence([])}
                  >
                    Clear
                  </Button>
                </div>
                
                <Alert className="bg-muted/50">
                  <Sparkles className="h-4 w-4" />
                  <AlertTitle>Automatic Enhancement</AlertTitle>
                  <AlertDescription>
                    Low-resolution images will be automatically upscaled using ESRGAN technology.
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-border rounded-md">
                <p className="text-sm text-muted-foreground">
                  Select images from the library tab to create a sequence
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Information Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Info className="mr-2 h-5 w-5" />
              Media Panel
            </DialogTitle>
            <DialogDescription>
              This panel helps you manage media and create keyframe animations.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Library</h3>
              <p className="text-sm text-muted-foreground">
                Upload and manage your images and videos. Click an item to add it directly to the timeline.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Sequence</h3>
              <p className="text-sm text-muted-foreground">
                Create image sequences that transition automatically. Low-resolution images will be enhanced.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center">
                <Sparkles className="mr-2 h-4 w-4 text-primary" />
                ESRGAN Upscaling
              </h3>
              <p className="text-sm text-muted-foreground">
                Automatically enhances low-resolution images using AI super-resolution technology.
              </p>
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground">
              Your media files are automatically saved and will be available when you return.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaPanel; 