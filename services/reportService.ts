import { QuestionAnswer, FileData, GenerateReportResponse } from '../types/report';

export class ReportService {
  static async generateReport(
    questionnaire: FileData,
    evidence: FileData[]
  ): Promise<GenerateReportResponse> {
    try {
      const formData = new FormData();
      formData.append('questionnaire', questionnaire.file);
      evidence.forEach(file => {
        formData.append('evidence', file.file);
      });

      const response = await fetch('/api/generate-report', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error in report service:', error);
      throw error;
    }
  }
} 