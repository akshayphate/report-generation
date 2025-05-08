import { NextApiRequest, NextApiResponse } from 'next';
import { GenerateReportResponse, ReportItem, FileWithBase64 } from '../../types/report';

interface RequestBody {
  evidenceFiles: FileWithBase64[];
  questions: any[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<GenerateReportResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract data from request body
    const { evidenceFiles, questions } = req.body as RequestBody;
    
    if (!evidenceFiles || !questions) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    if (evidenceFiles.length === 0) {
      return res.status(400).json({ error: 'No evidence files uploaded' });
    }

    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'Invalid questions format' });
    }

    // Extract content from base64 evidence files
    const evidenceContents: string[] = [];
    for (const file of evidenceFiles) {
      try {
        // Extract the base64 content (remove data URL prefix if present)
        // For text files, convert to readable content, for binary files, just use placeholder
        if (file.type.startsWith('text/') || file.type === 'application/json') {
          const base64Data = file.base64.split(',')[1]; // Remove data URL prefix
          const content = Buffer.from(base64Data, 'base64').toString('utf-8');
          evidenceContents.push(content);
        } else {
          // For non-text files like PDF, we'd need a proper parser
          // Here we just add a placeholder
          evidenceContents.push(`[Contents of ${file.name} - ${file.type}]`);
        }
      } catch (error) {
        console.error(`Error processing evidence file ${file.name}:`, error);
        evidenceContents.push(`[Failed to process ${file.name}]`);
      }
    }
    
    // Combine all evidence for processing
    const combinedEvidence = evidenceContents.join('\n\n--- END OF DOCUMENT ---\n\n');
    
    // Call LLM component to generate answers for each question
    const report = await generateLLMResponses(questions, combinedEvidence);
    
    return res.status(200).json({ 
      message: 'Report generated successfully',
      report 
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return res.status(500).json({ 
      message: 'Error generating report',
      error: 'Internal server error'
    });
  }
}

/**
 * Call LLM to generate answers for each question based on the evidence
 * @param questions Array of question objects with id, question, and prompt
 * @param evidenceContent Combined content of all evidence files
 * @returns Promise with array of question and answer objects
 */
async function generateLLMResponses(questions: any[], evidenceContent: string): Promise<ReportItem[]> {
  // This would be replaced with actual LLM API calls
  // For now, we'll simulate the LLM responses
  
  const responses: ReportItem[] = [];
  
  for (const question of questions) {
    // Simulate an API call to LLM
    const answer = await mockLLMCall(question, evidenceContent);
    
    responses.push({
      question: question.question,
      answer: answer.content,
      answerQuality: answer.quality,
      source: answer.source,
      summary: answer.summary,
      reference: answer.reference
    });
  }
  
  return responses;
}

/**
 * Mock function to simulate LLM API call
 * This would be replaced with actual calls to your LLM component
 */
async function mockLLMCall(question: any, evidenceContent: string) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // For demonstration purposes only - updated with the required fields
  const responses = [
    { 
      content: "YES", 
      quality: "ADEQUATE",
      source: "Security Documentation v2.3",
      summary: "The vendor has implemented all required security controls as specified in the compliance framework.",
      reference: "Section 4.2, Page 18"
    },
    { 
      content: "YES", 
      quality: "ADEQUATE",
      source: "Technical Specifications",
      summary: "All encryption requirements are met with AES-256 for data at rest and TLS 1.3 for data in transit.",
      reference: "Security Architecture, Page 27"
    },
    { 
      content: "NO", 
      quality: "INADEQUATE",
      source: "Security Assessment Report",
      summary: "The evidence does not demonstrate sufficient implementation of the required controls.",
      reference: "Risk Assessment Section, Page 12"
    }
  ];
  
  // Randomly select a response
  return responses[Math.floor(Math.random() * responses.length)];
} 