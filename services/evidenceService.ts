// 
/**
* @file evidenceService.ts
* @description 
* @author Damodar Perumalla
* @created July 22, 2025
*/

import axios from 'axios';
import { getToken } from './getToken';
import mammoth from 'mammoth';
import jsPDF from 'jspdf';

const baseURL = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';
const appURL = baseURL.includes('localhost') || baseURL.includes('clvrw99a1065') ? '' : '/tprss';

export interface EvidencePayload {
    controlId: string;
    designElementId: string;
    prompt: string;
    question: string;
    subQuestion: string;
    evidences: string[]; // Array of base64 encoded files
}

export interface LLMEvidenceResult {
    controlId: string;
    designElementId: string;
    prompt: string;
    question: string;
    subQuestion: string;
    answer: string;
    status: 'success' | 'error';
    error?: string;
}

export interface ProcessedEvidenceResult {
    results: LLMEvidenceResult[];
    totalProcessed: number;
    successCount: number;
    errorCount: number;
    errors: string[];
}

export interface DesignElementPrompt {
    id: string;
    prompt: string;
    question: string;
    subQuestion: string;
    designElement?: string;
}

export interface DesignElementResult {
    controlId: string;
    designElementId: string;
    prompt: string;
    question: string;
    subQuestion: string;
    designElement?: string;
    answer?: string;
    status: 'success' | 'error';
}

export interface LLMPayload {
    controlId: string;
    designElementId: string;
    prompt: string;
    question: string;
    subQuestion: string;
    designElement?: string;
    evidences: string[];
}

export interface ApiResponse {
    status: 'success' | 'error';
    answer?: string;
    error?: string;
}

// Progress tracking interface
export interface ProcessingProgress {
    totalControls: number;
    completedControls: number;
    currentControl: string;
    status: 'processing' | 'completed' | 'error';
    results: Record<string, DesignElementResult[]>;
    errors: string[];
}

// Progress callback type
export type ProgressCallback = (progress: ProcessingProgress) => void;

/**
 * Converts a blob or file to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64Data = reader.result as string;
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Extracts base64 content from data URL
 */
function extractBase64Content(dataUrl: string): string {
    return dataUrl.split(',')[1];
}

/**
 * Converts a single file to base64 string with DOCX to PDF conversion (no compression)
 */
async function fileToBase64(file: File): Promise<string> {
    try {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (fileExtension === 'docx' || fileExtension === 'doc') {
            // Convert DOCX to PDF
            const arrayBuffer = await file.arrayBuffer();
            const { value: text } = await mammoth.extractRawText({ arrayBuffer });
            // Create PDF from the extracted text
            const pdf = new jsPDF();
            pdf.text(text, 10, 10);
            const pdfBlob = pdf.output('blob');
            // Convert PDF blob to base64
            const base64Data = await blobToBase64(pdfBlob);
            return base64Data;
        } else {
            // Handle PDF and other files
            const base64Data = await blobToBase64(file);
            return base64Data;
        }
    } catch (error) {
        console.error('Error processing file:', error);
        throw error;
    }
}

async function fileToBase64WithFileName(file: File): Promise<{ name: string; base64: string }> {
    try {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (fileExtension === 'docx' || fileExtension === 'doc') {
            // Convert DOCX to PDF
            const arrayBuffer = await file.arrayBuffer();
            const { value: text } = await mammoth.extractRawText({ arrayBuffer });
            // Create PDF from the extracted text
            const pdf = new jsPDF();
            pdf.text(text, 10, 10);
            const pdfBlob = pdf.output('blob');
            // Convert PDF blob to base64
            const base64Data = await blobToBase64(pdfBlob);
            return { name: file.name, base64: base64Data };
        } else {
            // Handle PDF and other files
            const base64Data = await blobToBase64(file);
            return { name: file.name, base64: base64Data };
        }
    } catch (error) {
        console.error('Error processing file:', error);
        throw error;
    }
}

/**
 * Converts multiple files to base64 strings
 */
async function convertFilesToBase64(files: File[]): Promise<string[]> {
    try {
        return await Promise.all(files.map(fileToBase64));
    } catch (error) {
        console.error('Error converting files to base64:', error);
        throw new Error('Failed to convert files to base64');
    }
}

/**
 * NEW: Processes controls sequentially with progress tracking
 * @param controlPrompts Array of control prompts with their associated files
 * @param onProgress Callback function to update UI with progress
 * @returns Object mapping controlIds to their validation results
 */
export async function getLLMEvidenceWithProgress(
    controlPrompts: Array<{
        controlId: string;
        prompts: Array<{ id: string; prompt: string; question: string; subQuestion: string; designElement?: string }>;
        files: File[];
    }>,
    onProgress?: ProgressCallback
): Promise<Record<string, DesignElementResult[]>> {
    const token = await getToken();
    console.log('🚀 Starting sequential processing with progress tracking...');

    const totalControls = controlPrompts.length;
    let completedControls = 0;
    const results: Record<string, DesignElementResult[]> = {};
    const errors: string[] = [];

    // Initialize progress
    const initialProgress: ProcessingProgress = {
        totalControls,
        completedControls: 0,
        currentControl: '',
        status: 'processing',
        results,
        errors: []
    };
    onProgress?.(initialProgress);

    // Process controls sequentially for better progress tracking
    for (const { controlId, prompts, files } of controlPrompts) {
        try {
            console.log(`📦 Processing control ${controlId} (${completedControls + 1}/${totalControls})`);
            
            // Update progress - starting new control
            onProgress?.({
                totalControls,
                completedControls,
                currentControl: controlId,
                status: 'processing',
                results,
                errors
            });

            // Convert files to base64
            const evidences = await Promise.all(files.map(fileToBase64WithFileName));
            console.log(`✅ Converted ${files.length} files to base64 for control ${controlId}.`);

            // Prepare batch payload
            const batchPayload = {
                controlId,
                designElements: prompts.map(prompt => ({
                    id: prompt.id,
                    prompt: prompt.prompt,
                    question: prompt.question,
                    subQuestion: prompt.subQuestion,
                    designElement: prompt.designElement
                })),
                evidences
            };

            console.log(`📤 Sending batch payload for control ${controlId} with ${prompts.length} design elements`);

            // Make single API call for all design elements of this control
            const { data } = await axios.post(
                `${appURL}/api/validateControlBatch`,
                batchPayload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log(`📥 Response received for control ${controlId}`);

            // Transform the batch response to match our expected format
            const controlResults: DesignElementResult[] = data.results.map((result: any) => {
                const originalPrompt = prompts.find(p => p.id === result.designElementId);
                return {
                    controlId,
                    designElementId: result.designElementId,
                    prompt: originalPrompt?.prompt || '',
                    question: originalPrompt?.question || '',
                    subQuestion: originalPrompt?.subQuestion || '',
                    designElement: result.designElement,
                    answer: result.answer,
                    status: result.status
                };
            });

            results[controlId] = controlResults;
            completedControls++;

            // Update progress - control completed successfully
            onProgress?.({
                totalControls,
                completedControls,
                currentControl: controlId,
                status: 'processing',
                results,
                errors
            });

        } catch (error) {
            console.error(`❌ Error processing control ${controlId}:`, error);
            errors.push(`Control ${controlId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            
            // Add error results for this control
            results[controlId] = prompts.map(prompt => ({
                controlId,
                designElementId: prompt.id,
                prompt: prompt.prompt,
                question: prompt.question,
                subQuestion: prompt.subQuestion,
                designElement: prompt.designElement,
                answer: '',
                status: 'error' as const
            }));

            completedControls++;

            // Update progress - control failed
            onProgress?.({
                totalControls,
                completedControls,
                currentControl: controlId,
                status: 'processing',
                results,
                errors
            });
        }
    }

    // Final progress update
    const finalProgress: ProcessingProgress = {
        totalControls,
        completedControls,
        currentControl: '',
        status: 'completed',
        results,
        errors
    };
    onProgress?.(finalProgress);

    console.log('✨ Sequential processing complete.');
    return results;
}

// Keep the old function for backward compatibility
export async function getLLMEvidenceBatchParallel(
    controlPrompts: Array<{
        controlId: string;
        prompts: Array<{ id: string; prompt: string; question: string; subQuestion: string; designElement?: string }>;
        files: File[];
    }>
): Promise<Record<string, DesignElementResult[]>> {
    return getLLMEvidenceWithProgress(controlPrompts);
}

// Export the type from promptService
export type { QuestionPrompt } from './promptServiceForVendor';