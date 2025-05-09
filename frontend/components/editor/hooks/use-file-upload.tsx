import { useState } from "react";
import { OverlayType } from "../types";

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnail?: string;
  duration?: number;
}

/**
 * Hook for handling file uploads in the editor
 * Supports images, videos, and audio files
 */
export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get the appropriate overlay type based on file MIME type
   */
  const getOverlayTypeFromMimeType = (mimeType: string): OverlayType => {
    if (mimeType.startsWith("image/")) {
      return OverlayType.IMAGE;
    } else if (mimeType.startsWith("video/")) {
      return OverlayType.VIDEO;
    } else if (mimeType.startsWith("audio/")) {
      return OverlayType.SOUND;
    }
    throw new Error(`Unsupported file type: ${mimeType}`);
  };

  /**
   * Generate a thumbnail for video files
   */
  const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        // Set current time to 1 second or video duration if shorter
        video.currentTime = Math.min(1, video.duration / 2);
      };
      video.oncanplay = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL("image/jpeg");
        resolve(thumbnail);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  /**
   * Get the duration of an audio or video file
   */
  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const media = file.type.startsWith("video/") 
        ? document.createElement("video") 
        : document.createElement("audio");
      media.preload = "metadata";
      media.onloadedmetadata = () => {
        URL.revokeObjectURL(media.src);
        resolve(media.duration);
      };
      media.src = URL.createObjectURL(file);
    });
  };

  /**
   * Generate a unique ID for a file based on name, size and timestamp
   */
  const generateUniqueFileId = (file: File, index: number): string => {
    // Create a base string using file properties that should be unique in combination
    const baseStr = `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${index}`;
    
    // Create a simple hash function
    let hash = 0;
    for (let i = 0; i < baseStr.length; i++) {
      const char = baseStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Return a consistent ID format
    return `file-${Math.abs(hash).toString(16)}-${Date.now()}`;
  };

  /**
   * Process uploaded files
   */
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      const newFiles: UploadedFile[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileType = file.type;
        
        // Validate file type
        if (!fileType.match(/^(image|video|audio)\//)) {
          throw new Error(`Unsupported file type: ${fileType}`);
        }
        
        // Create object URL for the file
        const url = URL.createObjectURL(file);
        
        // Process file based on type
        let thumbnail = undefined;
        let duration = undefined;
        
        if (fileType.startsWith("video/")) {
          thumbnail = await generateVideoThumbnail(file);
          duration = await getMediaDuration(file);
        } else if (fileType.startsWith("audio/")) {
          duration = await getMediaDuration(file);
        }
        
        newFiles.push({
          id: generateUniqueFileId(file, i),
          name: file.name,
          type: fileType,
          size: file.size,
          url,
          thumbnail,
          duration
        });
      }
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Clear all uploaded files and revoke object URLs
   */
  const clearUploadedFiles = () => {
    uploadedFiles.forEach(file => URL.revokeObjectURL(file.url));
    setUploadedFiles([]);
  };

  return {
    isUploading,
    uploadedFiles,
    error,
    handleFileUpload,
    clearUploadedFiles,
    getOverlayTypeFromMimeType
  };
}; 