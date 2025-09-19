export interface Job {
    _id?: string;
    UUID: string;
    userId: string;
    userName: string;
    status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
    createdAt: Date;
    updatedAt: Date;
    result?: {
      report?: any[];
      error?: string;
      totalFiles?: number;
      totalControls?: number;
      processingTime?: number;
    };
    zipFileName?: string;
    zipFileSize?: number;
  }
  
  export interface CreateJobRequest {
    userId: string;
    userName: string;
    zipFileName: string;
    zipFileSize: number;
  }
  
  // export interface JobResponse {
  //   UUID: string;
  //   status: string;
  //   createdAt: Date;
  //   updatedAt: Date;
  //   result?: any;
  //   zipFileName?: string;
  //   zipFileSize?: number;


  // }


  export interface JobResponse {
    UUID: string;
    zipFileName?: string;
    zipFileSize?: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    result?: {
      report?: any[];
      totalFiles?: number;
      totalControls?: number;
      processingTime?: number;
      error?: string;
    };
    progress?: {
      completedControls: number;
      totalControls: number;
    };
  }
  
  export interface JobsListResponse {
    jobs: JobResponse[];
    total: number;
  }