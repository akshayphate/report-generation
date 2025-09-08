import { useState, useCallback } from 'react';
import { uploadFile as uploadFileService, validateFileForUpload, simulateUploadProgress } from '../services/fileUploadService';
import { UploadResponse } from '../types/upload';

export interface UseFileUploadOptions {
  userId: string;
  onSuccess?: (result: UploadResponse) => void;
  onError?: (error: string) => void;
}

export interface UseFileUploadReturn {
  selectedFile: File | null;
  uploading: boolean;
  uploadProgress: number;
  uploadResult: UploadResponse | null;
  error: string | null;
  validationErrors: string[];
  
  // Actions
  selectFile: (file: File) => void;
  uploadFile: () => Promise<void>;
  resetUpload: () => void;
  clearError: () => void;
}

export const useFileUpload = (options: UseFileUploadOptions): UseFileUploadReturn => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const selectFile = useCallback((file: File) => {
    const errors = validateFileForUpload(file);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setSelectedFile(null);
      setError(null);
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    setValidationErrors([]);
  }, []);

  const uploadFile = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadResult(null);
    setUploadProgress(0);

    try {
      // Start progress simulation
      const stopProgress = simulateUploadProgress((progress) => {
        setUploadProgress(progress);
      });

      // Upload file using service
      const result = await uploadFileService(selectedFile, {
        userId: options.userId,
        onProgress: setUploadProgress,
      });

      // Stop progress simulation and set to 100%
      stopProgress();
      setUploadProgress(100);

      setUploadResult(result);
      setSelectedFile(null);
      
      // Call success callback if provided
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
    } catch (err: any) {
      const errorMessage = err.message || 'Upload failed';
      setError(errorMessage);
      setUploadProgress(0);
      
      // Call error callback if provided
      if (options.onError) {
        options.onError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  }, [selectedFile, options]);

  const resetUpload = useCallback(() => {
    setSelectedFile(null);
    setUploadResult(null);
    setError(null);
    setValidationErrors([]);
    setUploadProgress(0);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    selectedFile,
    uploading,
    uploadProgress,
    uploadResult,
    error,
    validationErrors,
    selectFile,
    uploadFile,
    resetUpload,
    clearError,
  };
};
