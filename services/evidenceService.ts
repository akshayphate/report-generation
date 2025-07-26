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
// import {compressAndConvertPDF} from "../services/pdfCompression"



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
    designElement?: string;  // Added the new field
}


export interface DesignElementResult {
    controlId: string;
    designElementId: string;
    prompt: string;
    question: string;
    subQuestion: string;
    designElement?: string;  // Added the new field
    answer?: string;
    status: 'success' | 'error';
}


export interface LLMPayload {
    controlId: string;
    designElementId: string;
    prompt: string;
    question: string;
    subQuestion: string;
    designElement?: string;  // Added the new field
    evidences: string[];
}


export interface ApiResponse {
    status: 'success' | 'error';
    answer?: string;
    error?: string;
}


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
// async function convertFilesToBase64(files: File[]): Promise<string[]> {
//     try {
//         return await Promise.all(files.map(fileToBase64));
//     } catch (error) {
//         console.error('Error converting files to base64:', error);
//         throw new Error('Failed to convert files to base64');
//     }
// }



/**
 * Processes multiple control IDs in parallel, validating all their design elements
 * @param controlPrompts Array of control prompts with their associated files
 * @returns Object mapping controlIds to their validation results
 */
export async function getLLMEvidenceBatchParallel(
    controlPrompts: Array<{
        controlId: string;
        prompts: Array<{ id: string; prompt: string; question: string; subQuestion: string; designElement?: string }>;
        files: File[];
    }>
): Promise<Record<string, DesignElementResult[]>> {
    const token = await getToken();
    console.log('🚀 Starting batch parallel processing with new logic...');


    const controlPromises = controlPrompts.map(async ({ controlId, prompts, files }) => {
        console.log(`📦 Processing control ${controlId} with ${files.length} files.`);
        
        const evidences = await Promise.all(files.map(fileToBase64WithFileName));
        console.log(`✅ Converted ${files.length} files to base64 for control ${controlId}.`);


        const promptPromises = prompts.map(async ({ id: designElementId, prompt, question, subQuestion, designElement }) => {
            try {
                const payload = { 
                    controlId, 
                    designElementId, 
                    prompt, 
                    question, 
                    subQuestion, 
                    designElement,  // Pass the new designElement field
                    evidences 
                };
                console.log(`📤 Sending payload for ${designElementId}:`, { 
                    controlId, 
                    designElementId, 
                    question, 
                    subQuestion,
                    designElement  // Log the new designElement field
                });


                const { data } = await axios.post<Omit<DesignElementResult, 'status'>>(
                    `${appURL}/api/validateDesignElementsVendors`,
                    payload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );


                console.log(`📥 Response received for ${designElementId} , ${controlId}.`);
                return { 
                    ...data, 
                    subQuestion, 
                    designElement, // Include designElement in response
                    designElementId,  // Ensure we have designElementId
                    status: 'success' as const 
                };
            } catch (error) {
                console.error(`❌ Error validating element ${designElementId}:`, error);
                return {
                    controlId,
                    designElementId,
                    prompt,
                    question,
                    subQuestion,
                    designElement, // Include designElement in error case too
                    answer: '',
                    status: 'error' as const,
                };
            }
        });


        const results = await Promise.all(promptPromises);
        return { controlId, results };
    });


    const settledControlResults = await Promise.all(controlPromises);


    const finalResults = settledControlResults.reduce((acc, result) => {
        acc[result.controlId] = result.results;
        return acc;
    }, {} as Record<string, DesignElementResult[]>);


    console.log('✨ Batch parallel processing complete.');
    return finalResults;
}


// Export the type from promptService
// export type { QuestionPrompt } from './promptServiceForVendor';