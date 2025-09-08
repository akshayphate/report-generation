# Asynchronous Job Processing Implementation

This document describes the refactoring of the vendor assessment workflow to support asynchronous job processing with MongoDB.

## Overview

The application has been refactored to:
1. Submit ZIP files for asynchronous processing
2. Track job status in MongoDB
3. Allow users to view their job history and results
4. Support multi-user access with proper data isolation

## New Features

### Backend Changes

#### 1. MongoDB Integration
- **Library**: `@ctip/toolkit` (existing)
- **Purpose**: Uses existing CTIP MongoDB connection
- **Collection**: `mongo.collection('jobs')`

#### 2. Job Schema
- **File**: `types/job.ts`
- **Structure**:
  ```typescript
  interface Job {
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
  ```

#### 3. API Endpoints

##### `/api/processZip` (POST)
- **Purpose**: Submit ZIP file for asynchronous processing
- **Input**: `{ userId, userName, zipFile (base64), zipFileName, zipFileSize }`
- **Output**: `{ jobUUID, status }`
- **Process**: Creates job record and starts background processing

##### `/api/jobs` (GET)
- **Purpose**: Fetch all jobs for a user
- **Query**: `?userId=user@example.com`
- **Output**: `{ jobs: JobResponse[], total: number }`

##### `/api/jobs/[uuid]` (GET)
- **Purpose**: Fetch specific job status and result
- **Query**: `?userId=user@example.com`
- **Output**: `JobResponse`

### Frontend Changes

#### 1. Refactored Assessment Page (`pages/assess.tsx`)
- **Removed**: All ZIP processing logic
- **Added**: Job submission functionality
- **Features**: 
  - File upload validation
  - Job submission with progress feedback
  - Success confirmation with job UUID

#### 2. New Jobs Page (`pages/jobs.tsx`)
- **Purpose**: Job tracking and management
- **Features**:
  - List all user jobs with status
  - Refresh job status
  - View completed reports
  - Download CSV reports
  - Error handling and display

#### 3. Updated Navigation (`pages/index.tsx`)
- **Added**: "My Assessment Jobs" option
- **Updated**: Assessment description

## Setup Instructions

### 1. Dependencies
No additional dependencies required. The implementation uses the existing `@ctip/toolkit` library that's already configured in your application.

### 2. MongoDB Setup
MongoDB is already configured through the CTIP library. The jobs will be stored in the `jobs` collection in your existing MongoDB database.

## User Workflow

### 1. Submit Assessment
1. Navigate to "Full Vendor Assessment"
2. Upload ZIP file
3. Click "Submit for Assessment"
4. Receive job UUID confirmation

### 2. Track Jobs
1. Navigate to "My Assessment Jobs"
2. View all submitted jobs with status
3. Click "Fetch Status" to refresh job status
4. For completed jobs:
   - Click "View Report" to see results
   - Click "Download CSV" to export data

### 3. Job Statuses
- **Pending**: Job created, waiting to start processing
- **Processing**: ZIP file is being analyzed
- **Completed**: Processing finished successfully
- **Failed**: Processing encountered an error

## Security Features

### Multi-User Support
- Users can only see their own jobs
- Job access is validated by userId
- No cross-user data leakage

### Data Isolation
- Each job is associated with a specific user
- API endpoints validate user ownership
- MongoDB queries filter by userId

## Error Handling

### Backend
- Comprehensive error catching in job processing
- Failed jobs are marked with error details
- Database connection error handling

### Frontend
- User-friendly error messages
- Loading states for all operations
- Graceful handling of network errors

## Performance Considerations

### Asynchronous Processing
- ZIP processing happens in background
- Users can submit multiple jobs
- No blocking of UI during processing

### Database Optimization
- Indexed queries on userId and UUID
- Efficient job status updates
- Minimal data transfer (no ZIP files stored)

## Future Enhancements

### Potential Improvements
1. **Real-time Updates**: WebSocket integration for live status updates
2. **Job Queuing**: Redis-based job queue for better scalability
3. **File Storage**: S3/Azure Blob integration for large files
4. **Notifications**: Email/SMS notifications for job completion
5. **Batch Processing**: Multiple ZIP files in single job
6. **Progress Tracking**: Real-time progress updates during processing

### Monitoring
1. **Job Metrics**: Processing time, success rates
2. **Error Tracking**: Detailed error logging and monitoring
3. **Performance**: Database query optimization
4. **User Analytics**: Job submission patterns

## Migration Notes

### Breaking Changes
- ZIP processing logic removed from frontend
- Report generation is now asynchronous
- New database dependency (MongoDB)

### Backward Compatibility
- Existing API endpoints remain unchanged
- Report format is identical
- UI components reused where possible

## Troubleshooting

### Common Issues

#### 1. CTIP Library Connection
```bash
Error: CTIP toolkit not available
```
**Solution**: Ensure `@ctip/toolkit` is properly configured in your application

#### 2. Job Not Found
```bash
Error: Job not found or access denied
```
**Solution**: Ensure userId matches job owner

#### 3. Processing Failures
- Check CTIP MongoDB connection
- Verify ZIP file format
- Review server logs for detailed errors

### Debug Mode
Enable detailed logging by setting:
```bash
NODE_ENV=development
```

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify MongoDB connection and permissions
3. Ensure all environment variables are set
4. Review job status in database for failed jobs
