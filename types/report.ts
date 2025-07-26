export interface QuestionAnswer {
  question: string;
  answer: string;
}


export interface FileData {
  name: string;
  file: File;
}


export interface ReportItem {
  id?: string;
  question: string;
  answer: string;
  answerQuality: string;
  source: string;
  summary: string;
  reference: string;
}


export interface GenerateReportResponse {
  message?: string;
  report?: ReportItem[];
  error?: string;
  data?: any;
}


export interface FileWithBase64 {
  name: string;
  type: string;
  size: number;
  base64: string;
} 