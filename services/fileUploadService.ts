import { UploadResponse } from '../types/upload';

export interface FileUploadOptions {
  userId: string;
  onProgress?: (progress: number) => void;
}

export interface UploadError {
  message: string;
  status?: number;
  details?: any;
}

/**
 * Upload a file to the server
 */
export const uploadFile = async (
  file: File,
  options: FileUploadOptions
): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/jobs/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'user-id': options.userId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Upload failed with status: ${response.status}`);
    }

    const result: UploadResponse = await response.json();
    return result;
  } catch (error) {
    // Transform error into consistent format
    const uploadError: UploadError = {
      message: error instanceof Error ? error.message : 'Upload failed',
      details: error,
    };
    throw uploadError;
  }
};

/**
 * Validate file before upload
 */
export const validateFileForUpload = (file: File): string[] => {
  const errors: string[] = [];
  
  // Check file type
  if (!file.name.toLowerCase().endsWith('.zip')) {
    errors.push('File must be a ZIP file');
  }
  
  // Check file size (100MB limit)
  const maxSize = 100 * 1024 * 1024; // 100MB in bytes
  if (file.size > maxSize) {
    errors.push(`File size must be less than 100MB. Current size: ${formatFileSize(file.size)}`);
  }
  
  // Check if file is empty
  if (file.size === 0) {
    errors.push('File cannot be empty');
  }
  
  return errors;
};

/**
 * Format file size in human readable format
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Simulate upload progress (since fetch doesn't provide real progress)
 */
export const simulateUploadProgress = (
  onProgress: (progress: number) => void,
  duration: number = 2000
): (() => void) => {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress >= 90) {
      progress = 90;
      clearInterval(interval);
    }
    onProgress(Math.min(progress, 90));
  }, 100);

  // Return cleanup function
  return () => {
    clearInterval(interval);
  };
};
