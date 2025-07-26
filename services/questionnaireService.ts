// 
/**
* @file questionnaireService.ts
* @description 
* @author Damodar Perumalla
* @created July 22, 2025
*/


import * as XLSX from 'xlsx';


// Keep these interfaces for type checking even if not all are directly used
interface DomainData {
    Domain_Id: number;
    Domain_Code: string;
    Question_Description: string;
    Question: string;
}


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


interface FileWithBase64 {
    name: string;
    type: string;
    size: number;
    base64: string;
}


interface QuestionPrompt {
    id: string;
    question: string;
    prompt: string;
}


function extractDomainCode(questionnaireName: string): string {
    if (!questionnaireName || !questionnaireName.includes('-')) return '';
    const normalized = questionnaireName.trim();
    const parts = normalized.split('-');
    console.log("extract domain code : ", parts[0]?.trim());
    return parts[0]?.trim() || '';
}


// Keep these utility functions even if not directly used in this file
function getFileExtension(reference: string): string {
    if (!reference) return '';
    const parts = reference.split('.');
    return parts.length > 1 ? parts.pop()?.toUpperCase() || '' : '';
}


async function readExcelFile(file: File | FileWithBase64): Promise<any[]> {
    let workbook: XLSX.WorkBook;
    if ('base64' in file) {
        // FileWithBase64
        const binary = atob(file.base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        workbook = XLSX.read(bytes, { type: 'array' });
    } else {
        // File
        const buffer = await file.arrayBuffer();
        workbook = XLSX.read(buffer, { type: 'buffer' });
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet);
}


const loadDomainList = async (): Promise<DomainData[]> => {
    const response = await fetch('/domain_list.json');
    if (!response.ok) throw new Error('Failed to load domain list');
    return response.json();
};


export const processQuestionnaire = async (
    questionnaireFile: File | FileWithBase64 | any
): Promise<QuestionPrompt[]> => {
    try {
        const [domainList, questions] = await Promise.all([
            loadDomainList(),
            readExcelFile(questionnaireFile)
        ]);
        const domainMap = new Map<string, DomainData>();
        domainList.forEach((domain: DomainData) => domainMap.set(domain.Domain_Code, domain));


        const result: QuestionPrompt[] = [];
        questions.forEach((question: QuestionData, idx: number) => {
            const domainCode = extractDomainCode(question['Questionnaire Name']);
            const fileExtension = getFileExtension(question['Attachement Reference']);
            console.log(`[${idx}] domainCode:`, domainCode, 'fileExtension:', fileExtension);
            if (fileExtension !== 'PDF') return; // Only process PDF files


            const domain = domainMap.get(domainCode);
            console.log(`[${idx}] domain:`, domain);
            if (domain) {
                // Step 1: Split on 'design element:'
                const description = domain.Question_Description || "";
                console.log(`[${idx}] description:`, description);
                const parts = description.split('design element:');
                console.log(`[${idx}] parts:`, parts);
                if (parts.length > 1) {
                    // Step 2: Split the second part on newlines to get subquestions
                    const subQuestions = parts[1]
                        .split(/\r?\n/)
                        .map(line => line.trim())
                        .filter(line => line.length > 0);
                    console.log(`[${idx}] subQuestions:`, subQuestions);
                    // Step 3: For each subquestion, create the output object
                    subQuestions.forEach((subQ) => {
                        result.push({
                            id: domain.Domain_Code,
                            question: subQ,
                            prompt: `${domain.Question} with the following policy features ${subQ}`
                        });
                    });
                }
            }
        });
        console.log('Final result:', result);
        return result;
    } catch (error) {
        console.error('Error processing questionnaire:', error);
        throw error;
    }
};


/**
 * Parses an Excel file and extracts all unique Domain_Ids from the second sheet.
 * @param buffer The ArrayBuffer content of the .xlsx or .xls file.
 * @returns A promise that resolves to an array of unique Domain_Id strings.
 */
export const getDomainIdsFromQuestionnaire = async (buffer: ArrayBuffer): Promise<string[]> => {
    try {
        console.log("Buffer type:", typeof buffer);
        console.log("Is ArrayBuffer:", buffer instanceof ArrayBuffer);
        console.log("Buffer length:", buffer.byteLength);


        if (!(buffer instanceof ArrayBuffer) || buffer.byteLength === 0) {
            console.error("Invalid buffer provided to getDomainIdsFromQuestionnaire.");
            return [];
        }


        const workbook = XLSX.read(buffer, { type: 'array' });


        // Identify the target sheet: prefer "Data", fall back to the second sheet.
        const targetSheet = workbook.Sheets['Data'] || workbook.Sheets[workbook.SheetNames[1]];


        if (!targetSheet) {
            console.warn("Excel file does not have a sheet named 'Data' or a second sheet.");
            return [];
        }


        const data = XLSX.utils.sheet_to_json(targetSheet);


        const domainIds = data
            .map((row: any) => {
                // Prioritize Domain_Id column, then parse Questionnaire Name
                if (row['Domain_Id']) {
                    return row['Domain_Id'];
                }
                if (row['Questionnaire Name']) {
                    return extractDomainCode(row['Questionnaire Name']);
                }
                return null;
            })
            .filter(Boolean) as string[]; // Filter out any null/undefined values


        const uniqueDomainIds = Array.from(new Set(domainIds));
        console.log("Extracted domain IDs from Excel:", uniqueDomainIds);


        return uniqueDomainIds;
    } catch (error) {
        console.error('Error extracting Domain IDs from questionnaire:', error);
        throw error;
    }
};

