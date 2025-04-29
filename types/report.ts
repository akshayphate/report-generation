export interface QuestionAnswer {
  question: string;
  answer: string;
}

export interface FileData {
  name: string;
  file: File;
}

export interface GenerateReportResponse {
  message: string;
  data: QuestionAnswer[];
  error?: string;
} 