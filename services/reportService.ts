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

/**
 * Service to handle report generation
 */
export class ReportService {
  /**
   * Generate a report based on questionnaire and evidence
   * @param questionnaireFile The uploaded questionnaire file
   * @param evidenceFiles Array of uploaded evidence files
   * @returns Promise containing the generated report
   */
  static async generateReport(questionnaireFile: File, evidenceFiles: File[]): Promise<{ data: ReportItem[] }> {
    try {
      // Step 1: Process the questionnaire to extract questions
      const questions = await processQuestionnaire(questionnaireFile);

      // Step 2: Create form data for the report generation
      const formData = new FormData();
      
      // Add all evidence files
      evidenceFiles.forEach((file, index) => {
        formData.append(`evidence-${index}`, file);
      });
      
      formData.append('questions', JSON.stringify(questions));
      formData.append('evidenceCount', evidenceFiles.length.toString());

      // Step 3: Call the API to generate the report using LLM
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        body: formData,
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