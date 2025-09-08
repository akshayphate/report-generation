import { GridFSBucket, ObjectId } from 'mongodb';
import { mongo } from '@ctip/toolkit';

export interface FileMetadata {
  userId?: string;
  jobId?: string;
  originalName: string;
  contentType: string;
  size: number;
}

export interface StoredFile {
  fileId: ObjectId;
  filename: string;
  metadata: FileMetadata;
}

/**
 * Upload a file to MongoDB GridFS
 */
export const uploadFileToGridFS = async (
  fileBuffer: Buffer,
  filename: string,
  metadata: FileMetadata
): Promise<ObjectId> => {
  const bucket = new GridFSBucket(mongo.db);
  const uploadStream = bucket.openUploadStream(filename, { metadata });
  
  return new Promise((resolve, reject) => {
    uploadStream.on('finish', () => resolve(uploadStream.id));
    uploadStream.on('error', reject);
    uploadStream.end(fileBuffer);
  });
};

/**
 * Download a file from MongoDB GridFS
 */
export const downloadFileFromGridFS = async (
  fileId: ObjectId
): Promise<Buffer> => {
  const bucket = new GridFSBucket(mongo.db);
  const downloadStream = bucket.openDownloadStream(fileId);
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    downloadStream.on('data', chunk => chunks.push(chunk));
    downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
    downloadStream.on('error', reject);
  });
};

/**
 * Delete a file from MongoDB GridFS
 */
export const deleteFileFromGridFS = async (
  fileId: ObjectId
): Promise<void> => {
  const bucket = new GridFSBucket(mongo.db);
  await bucket.delete(fileId);
};

/**
 * Get file metadata from GridFS
 */
export const getFileMetadata = async (
  fileId: ObjectId
): Promise<FileMetadata | null> => {
  const bucket = new GridFSBucket(mongo.db);
  const files = bucket.find({ _id: fileId });
  const file = await files.next();
  
  return file ? file.metadata as FileMetadata : null;
};
