export interface UploadResponse {
  message: string;
  job: {
    jobId: string;
    status: string;
    progress: number;
    filename: string;
    size: number;
    createdAt: string;
    currentStep: string;
  };
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface UploadProgress {
  percentage: number;
  status: 'idle' | 'uploading' | 'completed' | 'error';
  message?: string;
}
