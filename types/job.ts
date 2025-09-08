import { ObjectId } from 'mongodb';

export interface Job {
  _id?: ObjectId;
  jobId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // File storage
  zipFile: {
    gridfsId: ObjectId;
    filename: string;
    size: number;
    contentType: string;
    uploadedAt: Date;
  };
  
  // Processing metadata
  extractedFiles?: ExtractedFile[];
  results?: JobResult;
  error?: string;
  metadata: {
    totalFiles: number;
    totalControls: number;
    currentStep: string;
  };
}

export interface ExtractedFile {
  name: string;
  size: number;
  gridfsId?: ObjectId;
  content?: Buffer;
  contentType: string;
}

export interface JobResult {
  controls: ControlEvidence[];
  report: ReportItem[];
  summary: string;
}

// Reusing existing types from your codebase
export interface ControlEvidence {
  cid: string;
  controlName: string;
  domainIds: string[];
  evidences: File[];
}

export interface ReportItem {
  question: string;
  answer: string;
  answerQuality: string;
  source: string;
  summary: string;
  reference: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: Job['status'];
  progress: number;
  currentStep: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
