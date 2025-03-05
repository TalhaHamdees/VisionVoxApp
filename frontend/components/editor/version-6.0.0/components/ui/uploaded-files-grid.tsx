import React from "react";
import { File, Image, Video, Music, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "../../utils/format-duration";

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnail?: string;
  duration?: number;
}

interface UploadedFilesGridProps {
  files: UploadedFile[];
  onFileClick: (file: UploadedFile) => void;
  onRemoveFile?: (fileId: string) => void;
  isLoading?: boolean;
}

/**
 * UploadedFilesGrid Component
 * 
 * Displays a grid of uploaded files with thumbnails and metadata
 */
export const UploadedFilesGrid: React.FC<UploadedFilesGridProps> = ({
  files,
  onFileClick,
  onRemoveFile,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="relative aspect-video bg-gray-200 dark:bg-gray-800 animate-pulse rounded-sm"
          />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400">
        <p>No files uploaded yet</p>
      </div>
    );
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <Image className="h-6 w-6" />;
    } else if (fileType.startsWith("video/")) {
      return <Video className="h-6 w-6" />;
    } else if (fileType.startsWith("audio/")) {
      return <Music className="h-6 w-6" />;
    }
    return <File className="h-6 w-6" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {files.map((file) => (
        <div
          key={file.id}
          className="group relative border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
          onClick={() => onFileClick(file)}
        >
          {/* Thumbnail or icon */}
          <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            {file.type.startsWith("image/") ? (
              <img
                src={file.url}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            ) : file.type.startsWith("video/") && file.thumbnail ? (
              <div className="relative w-full h-full">
                <img
                  src={file.thumbnail}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/50 rounded-full p-2">
                    <Video className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-full">
                {getFileIcon(file.type)}
              </div>
            )}
          </div>

          {/* File info */}
          <div className="p-2 bg-white dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {file.name}
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(file.size)}
              </p>
              {file.duration && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDuration(file.duration)}
                </p>
              )}
            </div>
          </div>

          {/* Remove button */}
          {onRemoveFile && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white rounded-full h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFile(file.id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}; 