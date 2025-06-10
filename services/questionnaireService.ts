/**

 * Service to handle questionnaire file processing

 * Using mock data instead of API calls

 */

import { FileWithBase64 } from '../types/report';

import * as domainListModule from '../data/domain_list.json';

const domain_list = domainListModule as unknown as DomainData[];



/**

 * Processes the questionnaire file and extracts questions

 * Works with either File objects or FileWithBase64 objects

 * @param questionnaireFile The uploaded questionnaire file or base64 representation

 * @returns JSON array with id, question, and prompt

 */

import * as XLSX from 'xlsx';



interface QuestionData {

  'Questionnaire Name': string;

  'Category Nme': string;

  'Question': string;

  'Question Description': string;

  'Data Type': string;

  'Choices': string;

  'Vendor Answers': string;

  'Inernal Comments': string;

  'Attachement Reference': string;

}



interface QuestionPrompt {

  id: string;

  question: string;

  prompt: string;

}



//wrfunction to fetch the domain_list from domain_list.json file  

/**

 * Interface for domain data structure

 */

interface DomainData {

  Domain_Id: string;

  Domain_name: string;

  Sub_Domain_Name: string;

  Question: string;

  Question_Description: string;

  Assessor_Guidelines: string;

}



/**

 * Fetches domain list from the domain_list.json file in the data folder

 * @returns Promise resolving to an array of DomainData objects

 */

const loadDomainList = async (): Promise<DomainData[]> => {

 try {

  console.log("Debug: Inside loadDomainList function");

   

  // Check if domain_list is defined

  if (typeof domain_list === 'undefined') {

   //console.error("Error: domain_list is undefined. Import failed.");

   return [];

  }

   

  console.log("Debug: domain_list type:", typeof domain_list);

   

  // Case 1: domain_list is already an array

  if (Array.isArray(domain_list)) {

   //console.log(`Debug: domain_list is an array with ${domain_list.length} items`);

    

   // Map each item to ensure all required properties are present

   const mappedData = domain_list.map((item, index) => {

    // Create a properly typed DomainData object with all required fields

    const domainItem: DomainData = {

     Domain_Id: item.Domain_Id || '',

     Domain_name: item.Domain_name || '',

     Sub_Domain_Name: item.Sub_Domain_Name || '',

     Question: item.Question || '',

     Question_Description: item.Question_Description || '',

     Assessor_Guidelines: item.Assessor_Guidelines || ''

    };

     

    return domainItem;

   });

    

   return mappedData;

  }

   

  // Case 2: domain_list is an object (common in ES modules)

  if (typeof domain_list === 'object' && domain_list !== null) {

   console.log("Debug: domain_list is an object. Checking for any array properties.");

    

   try {

    // Log available keys to help with debugging

    const domainKeys = Object.keys(domain_list);

    console.log("Debug: domain_list object keys:", domainKeys);

     

    // Try each property to find an array

    for (const key of domainKeys) {

     try {

      if (domain_list[key] && Array.isArray(domain_list[key])) {

       console.log(`Debug: Found array in domain_list.${key} `);

        

       // Map the array to DomainData objects

       return (domain_list[key] as unknown as DomainData[]).map(item => {

        const safeItem = item || {}; // Handle null/undefined items

        return {

         Domain_Id: safeItem.Domain_Id || '',

         Domain_name: safeItem.Domain_name || '',

         Sub_Domain_Name: safeItem.Sub_Domain_Name || '',

         Question: safeItem.Question || '',

         Question_Description: safeItem.Question_Description || '',

         Assessor_Guidelines: safeItem.Assessor_Guidelines || ''

        };

       });

      }

     } catch (keyError) {

      console.error(`Error accessing domain_list[${key}]:`, keyError);

     }

    }

   } catch (keysError) {

    console.error("Error getting object keys:", keysError);

   }

  }

   

  // If we got here, we couldn't find a valid array

  //console.error("Error: Could not find domain list array in the imported data");

  return [];

 } catch (error) {

  console.error("Error loading domain list:", error);

  return [];

 }

};

function extractSubQuestions(description: string): string[] {

  console.log("Debug: Entered extractSubQuestions method.");

  //console.log("Debug: Description input:", description?.substring(0, 100) + (description?.length > 100 ? '...' : ''));

   

  if (!description?.includes('Design elements:')) {

    console.log("Debug: Description does not contain 'Design elements:'. Returning an empty array.");

    return [];

  }



  const [mainPart, elements] = description.split('Design elements:');

  //console.log("Debug: Split description into mainPart and elements.");

  // console.log("Debug: mainPart:", mainPart?.substring(0, 100) + (mainPart?.length > 100 ? '...' : ''));

  // console.log("Debug: elements:", elements?.substring(0, 100) + (elements?.length > 100 ? '...' : ''));



  if (!elements) {

    console.log("Debug: 'elements' is null or undefined. Returning an empty array.");

    return [];

  }

   

  const mainQuestion = mainPart.trim();

  //console.log(`Debug: mainQuestion extracted and trimmed: "${mainQuestion}"`);



  const lines = elements.split(/\r?\n/);

  //console.log(`Debug: Split 'elements' into ${lines.length} lines:`);

  lines.forEach((line, i) => console.log(`Debug: Line ${i}: ${line}`));



  const numberedLines = lines.filter(line => /^\s*\d+\./.test(line));

  //console.log(`Debug: Filtered ${numberedLines.length} numbered lines:`);

  numberedLines.forEach((line, i) => console.log(`Debug: Numbered line ${i}: ${line}`));



  const result = numberedLines

    .map(line => {

      const cleanedLine = line.replace(/^\s*\d+\.\s*/, '').trim();

      console.log(`Debug: Cleaned line: "${cleanedLine}"`);

      return `${mainQuestion} with the following design element: ${cleanedLine}`;

    })

    .filter(q => q.length > 0);



  console.log(`Debug: Final result array with ${result.length} items:`);

  result.forEach((item, i) => console.log(`Debug: Result ${i}: ${item.substring(0, 1000)}...`));

   

  return result;

}



function extractDomainCode(questionnaireName: string): string {

  console.log("Debug: Entered extractDomainCode method.");

  if (!questionnaireName || !questionnaireName.includes('-')) {

    //console.log("Debug: 'questionnaireName' is invalid or does not contain a hyphen. Returning an empty string.");

    return '';

  }



  const normalized = questionnaireName.trim();

  //console.log(`Debug: Normalized questionnaireName: "${normalized}"`);



  const parts = normalized.split('-');

  //console.log("Debug: Split questionnaireName into parts:", parts);



  const domainCode = parts[0]?.trim() || '';

  //console.log(`Debug: Extracted domainCode: "${domainCode}"`);

  return domainCode;

}



function getFileExtension(reference: string): string {

  console.log("Debug: Entered getFileExtension method.");

  if (!reference) {

    console.log("Debug: 'reference' is null or undefined. Returning an empty string.");

    return '';

  }



  const parts = reference.split('.');

  console.log("Debug: Split reference into parts:", parts);



  const extension = parts.length > 1 ? parts.pop()?.toUpperCase() || '' : '';

  console.log(`Debug: Extracted file extension: "${extension}"`);

  return extension;

}



async function readExcelFile(file: File | FileWithBase64): Promise<any[]> {

 console.log("Debug: Entered readExcelFile method");

 let workbook: XLSX.WorkBook;



 try {

  if ('base64' in file) {

   console.log("Debug: File is of type FileWithBase64. Decoding base64 content.");

   const binary = atob(file.base64);

   workbook = XLSX.read(binary, { type: 'binary' });

  } else {

   console.log("Debug: File is of type File. Reading file content.");

   const arrayBuffer = await file.arrayBuffer();

   workbook = XLSX.read(arrayBuffer, { type: 'array' });

  }



  console.log("Debug: Successfully read the Excel workbook.");

  const sheetNames = workbook.SheetNames;

  console.log("Debug: Available sheet names:", sheetNames);



  // Look specifically for the "Data" sheet

  if (!sheetNames.includes('Data')) {

   console.error("Error: Excel file does not contain a 'Data' sheet");

   throw new Error("Excel file must contain a 'Data' sheet");

  }



  // Only process the "Data" sheet

  console.log("Debug: Processing 'Data' sheet");

  const sheet = workbook.Sheets['Data'];

  const sheetData = XLSX.utils.sheet_to_json(sheet);

  console.log(`Debug: Extracted ${sheetData.length} rows from 'Data' sheet`);

   

  return sheetData;

 } catch (error) {

  console.error("Error: An exception occurred while reading the Excel file:", error);

  throw error;

 }

}



/**

 * Process questionnaire file and extract questions

 * @param questionnaireFile Uploaded Excel file

 * @returns Promise containing extracted question prompts

 */

export const processQuestionnaire = async (

  questionnaireFile: File | FileWithBase64

): Promise<QuestionPrompt[]> => {

  console.log("Debug: Entered processQuestionnaire method");

  console.log(`Debug: Processing file: ${('name' in questionnaireFile) ? questionnaireFile.name : 'base64 file'}`);

   

  try {

    // Step 1: Load domain list and read Excel file concurrently

    console.log("Debug: Loading domain list and Excel data");

    const [domainList, questions] = await Promise.all([

      loadDomainList(),

      readExcelFile(questionnaireFile)

    ]);

     

    console.log(`Debug: Domain list has ${domainList.length} items`);

    console.log(`Debug: First domain item:`, domainList.length > 0 ? domainList[0] : 'No domains found');

     

    // Create domain map for quick lookups using Domain_Id as key

    const domainMap = new Map<string, DomainData>();

    for(let i=0;i<domainList.length;i++){

      if (domainList[i] && domainList[i].Domain_Id) {

        //console.log(`Debug: Adding domain to map: ${domainList[i].Domain_Id}`);

        domainMap.set(domainList[i].Domain_Id, domainList[i]);

      } else {

        //console.log("Debug: Skipping invalid domain item:", domainList[i]);

      }

    }

    //console.log(domainMap)



     

    console.log(`Debug: Domain map has ${domainMap.size} entries`);

    console.log(`Debug: Excel data has ${questions.length} rows`);

     

    // Step 4: Process each question from Excel

    const result: QuestionPrompt[] = [];

    questions.forEach((question: QuestionData, idx: number) => {

      // console.log(`Debug: Processing question ${idx}:`, question['Question']);

       

      // Extract domain code from questionnaire name

      const questionnaireName = question['Questionnaire Name'] || '';

      const domainCode = extractDomainCode(questionnaireName);

      console.log(`Debug: Extracted domain code: ${domainCode}`);

       

      // Look up domain by code

      const domain = domainMap.get(domainCode);

      if (!domain) {

        console.log(`Debug: No domain found for code: ${domainCode}`);

        return;

      }

       

      console.log(`Debug: Found matching domain: ${domain.Domain_Id} - ${domain.Domain_name}`);

      console.log(`Debug: Question_Description: ${domain.Question_Description?.substring(0, 50)}...`);

       

      // Extract sub-questions from domain Question_Description

      const subQuestions = extractSubQuestions(domain.Question_Description);

      console.log(`Debug: Extracted ${subQuestions.length} sub-questions`);

       

      // Create prompts for each sub-question

      subQuestions.forEach(subQ => {

        // 1. Remove the question mark from domain.Question if present

        const questionText = domain.Question?.replace(/\?$/, '') || '';

        console.log("Question text : ",questionText)

         

        // 2. Extract only the part after "with the following design element:"

        let cleanSubQ = subQ;

        if (cleanSubQ.includes("with the following design element:")) {

          const parts = cleanSubQ.split("with the following design element:");

          cleanSubQ = parts[1] ? parts[1].trim() : cleanSubQ;

        }

         

        console.log("Debug: Original subQ:", subQ.substring(0, 50) + "...");

        console.log("Debug: Cleaned subQ:", cleanSubQ.substring(0, 50) + "...");

         

        // 3. Format the prompt properly

        const prompt = `${questionText} with the following design element ${cleanSubQ}`;

         

        result.push({

          id: domain.Domain_Id,

          question: questionText,

          prompt: prompt

        });

      });

    });

     

    console.log(`Debug: Generated ${result.length} question prompts`);

    return result;

  } catch (error) {

    console.error("Error processing questionnaire:", error);

    throw error;

  }

};