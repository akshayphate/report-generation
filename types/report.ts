export interface QuestionAnswer {
  question: string;
  answer: string;
}

export interface FileData {
  name: string;
  file: File;
}

export interface ResponseData {
  Answer: string;
  "Answer Quality": string;
  "Answer Source": string;
  Summary: string;
  Reference: string;
}

export interface ReportItem {
  id: string;
  question: string;
  prompt: string;
  response: ResponseData;
}

export interface GenerateReportResponse {
  message: string;
  data: ReportItem[];
  error?: string;
} 