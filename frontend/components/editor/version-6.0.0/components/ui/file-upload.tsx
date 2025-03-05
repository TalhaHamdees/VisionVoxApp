import React, { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onFilesSelected: (files: FileList | null) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
  isUploading?: boolean;
  error?: string | null;
}

/**
 * FileUpload Component
 * 
 * A reusable component for handling file uploads with drag and drop support
 */
export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  accept = "image/*,video/*,audio/*",
  multiple = true,
  className = "",
  isUploading = false,
  error = null,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilesSelected(e.target.files);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`
          border-2 border-dashed rounded-md p-6 
          transition-colors duration-200 ease-in-out
          flex flex-col items-center justify-center gap-4
          ${isDragging 
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
            : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"}
          ${isUploading ? "opacity-70 pointer-events-none" : ""}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-3">
          <Upload className="h-6 w-6 text-gray-500 dark:text-gray-400" />
        </div>
        
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {isDragging ? "Drop files here" : "Drag and drop files here"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            or
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleButtonClick}
            disabled={isUploading}
            className="mt-2"
          >
            Browse files
          </Button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Supports images, videos, and audio files
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 text-red-500 text-sm">
          <X className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {isUploading && (
        <div className="mt-2 flex items-center gap-2 text-blue-500 text-sm">
          <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span>Uploading files...</span>
        </div>
      )}
    </div>
  );
}; 