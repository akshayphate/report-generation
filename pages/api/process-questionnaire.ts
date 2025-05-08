import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { NextApiRequest, NextApiResponse } from 'next';
import { ProcessedQuestion } from '../../types/report';

// Disable body parsing, we'll handle the form data manually
export const config = {
  api: {
    bodyParser: false,
  },
};

interface ResponseData {
  questions?: ProcessedQuestion[];
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new formidable.IncomingForm();
    
    const { fields, files } = await new Promise<{fields: formidable.Fields, files: formidable.Files}>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    const questionnaire = files.questionnaire as formidable.File;
    
    // Check if file exists
    if (!questionnaire) {
      return res.status(400).json({ error: 'No questionnaire file uploaded' });
    }

    const filePath = questionnaire.filepath;
    const fileName = questionnaire.originalFilename?.toLowerCase() || '';
    
    let questions: ProcessedQuestion[] = [];
    
    // Process based on file type
    if (fileName.endsWith('.csv')) {
      // Process CSV file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      questions = processCSV(fileContent);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || 
              fileName.endsWith('.xlsm') || fileName.endsWith('.xlsb')) {
      // Process Excel file
      questions = processExcel(filePath);
    } else if (fileName.endsWith('.pdf')) {
      // Mock PDF processing for now
      questions = mockProcessPDF();
    } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      // Mock Word processing for now
      questions = mockProcessWord();
    } else {
      return res.status(400).json({ error: 'Unsupported file format' });
    }

    return res.status(200).json({ questions });
  } catch (error) {
    console.error('Error processing questionnaire:', error);
    return res.status(500).json({ error: 'Error processing questionnaire' });
  }
}

// Helper functions for processing different file formats
function processCSV(fileContent: string): ProcessedQuestion[] {
  const rows = fileContent.split('\n');
  const headers = rows[0].split(',').map(h => h.trim());
  
  const idIndex = headers.findIndex(h => h.toLowerCase() === 'id');
  const questionIndex = headers.findIndex(h => h.toLowerCase() === 'question');
  const promptIndex = headers.findIndex(h => h.toLowerCase() === 'prompt');
  
  if (idIndex === -1 || questionIndex === -1) {
    throw new Error('CSV must contain at least id and question columns');
  }
  
  return rows.slice(1).map((row, index) => {
    const columns = row.split(',').map(c => c.trim());
    return {
      id: columns[idIndex] || `q${index + 1}`,
      question: columns[questionIndex] || '',
      prompt: promptIndex !== -1 ? columns[promptIndex] || '' : ''
    };
  }).filter(q => q.question);
}

function processExcel(filePath: string): ProcessedQuestion[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  return data.map((row: any, index: number) => ({
    id: row.id || row.ID || `q${index + 1}`,
    question: row.question || row.Question || '',
    prompt: row.prompt || row.Prompt || ''
  })).filter((q: ProcessedQuestion) => q.question);
}

// Mock functions for other file types
function mockProcessPDF(): ProcessedQuestion[] {
  // This would be replaced with actual PDF processing
  return [
    { id: 'q1', question: 'What is the main objective?', prompt: 'Describe the primary goal' },
    { id: 'q2', question: 'What are the key requirements?', prompt: 'List all requirements' }
  ];
}

function mockProcessWord(): ProcessedQuestion[] {
  // This would be replaced with actual Word document processing
  return [
    { id: 'q1', question: 'What is the main objective?', prompt: 'Describe the primary goal' },
    { id: 'q2', question: 'What are the key requirements?', prompt: 'List all requirements' }
  ];
} 