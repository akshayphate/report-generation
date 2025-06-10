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

   console.log("Debug: ReportService.generateReport started");

   console.log(`Debug: Questionnaire file: ${questionnaireFile?.name || 'undefined'}, size: ${questionnaireFile?.size || 0} bytes`);

    

   // Step 1: Process the questionnaire to extract questions

   const questions = await processQuestionnaire(questionnaireFile);



   console.log("Debug: questions generated " ,questions);

   // Step 2: Convert only evidence files to base64

   console.log(`Debug: Converting ${evidenceFiles.length} evidence files to base64`);

   const evidenceBase64 = await Promise.all(evidenceFiles.map(fileToBase64));



   // Create base64 evidence file objects

   const evidenceFilesWithBase64: FileWithBase64[] = evidenceFiles.map((file, index) => ({

    name: file.name,

    type: file.type,

    size: file.size,

    base64: evidenceBase64[index]

   }));

   console.log(`Debug: Created ${evidenceFilesWithBase64.length} base64 evidence file objects`);



   // Step 3: Prepare the payload with questions and base64 evidence data

   const payload = {

    questions: questions,

    evidenceFiles: evidenceFilesWithBase64

   };

   console.log("Debug: Prepared payload for API request", payload);



   // Step 4: Call the API to generate the report

   console.log("Debug: Sending request to /api/generate-report");

   const response = await fetch('/api/generate-report', {

    method: 'POST',

    headers: {

     'Content-Type': 'application/json',

    },

    body: JSON.stringify(payload)

   });

    

   console.log(`Debug: API response status: ${response.status} ${response.statusText}`);

    

   if (!response.ok) {

    let errorMessage = `Server responded with ${response.status}`;

    try {

     const errorData = await response.json();

     errorMessage = errorData.message || errorData.error || errorMessage;

     console.error(`Error: API error response: ${errorMessage}`);

    } catch (parseError) {

     const errorText = await response.text();

     errorMessage = errorText || errorMessage;

     console.error(`Error: API error response (text): ${errorMessage}`);

    }

    throw new Error(`Failed to generate report: ${errorMessage}`);

   }



   // Step 5: Parse and return the response

   console.log("Debug: Parsing API response");

   const result = await response.json();

   console.log("Debug result data :",result)

   console.log(`Debug: Report generated successfully with ${result.report?.length || 0} items`);

    

   return { data: result.report };

  } catch (error: unknown) {

   console.error("Error in ReportService.generateReport:", error);

   throw new Error(`Failed to generate report: ${error instanceof Error ? error.message : String(error)}`);

  } finally {

   console.log("Debug: ReportService.generateReport completed");

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