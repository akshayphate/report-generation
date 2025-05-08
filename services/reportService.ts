import { processQuestionnaire } from './questionnaireService';

export interface ReportItem {
  id?: string;
  question: string;
  answer: string;
  answerQuality: string;
  source: string;
  summary: string;
  reference: string;
}

// Interface for file data with base64 content
export interface FileWithBase64 {
  name: string;
  type: string;
  size: number;
  base64: string;
}

/**
 * Service to handle report generation
 */
export class ReportService {
  /**
   * Generate a report based on questionnaire and evidence files
   * @param questionnaireFile The uploaded questionnaire file
   * @param evidenceFiles Array of uploaded evidence files
   * @returns Promise containing the generated report
   */
  static async generateReport(questionnaireFile: File, evidenceFiles: File[]): Promise<{ data: ReportItem[] }> {
    try {
      // Step 1: Process the questionnaire to extract questions
      const questions = await processQuestionnaire(questionnaireFile);

      // Step 2: Convert only evidence files to base64
      const evidenceBase64 = await Promise.all(evidenceFiles.map(fileToBase64));

      // Create base64 evidence file objects
      const evidenceFilesWithBase64: FileWithBase64[] = evidenceFiles.map((file, index) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        base64: evidenceBase64[index]
      }));

      // Step 3: Prepare the payload with questions and base64 evidence data
      const payload = {
        questions: questions,
        evidenceFiles: evidenceFilesWithBase64
      };

      // Step 4: Call the API to generate the report
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.statusText}`);
      }

      const result = await response.json();
      return { data: result.report };
    } catch (error) {
      console.error('Error in report service:', error);
      throw error;
    }
  }
}

/**
 * Convert a file to base64 encoded string
 * @param file File to convert
 * @returns Promise with base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}; 