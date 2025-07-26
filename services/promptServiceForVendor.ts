//promptServiceForVendor.ts
/**
* @file promptServiceForVendor.ts
* @description 
* @author Damodar Perumalla
* @created July 22, 2025
*/


// This file is a specialized version of promptService.ts for the vendor assessment workflow.
// It contains duplicated logic that can be safely modified without affecting other parts of the project.
import * as domainListModule from '../data/domain_list.json';
import * as manualPromptListModule from '../data/override_prompts.json'



// Normalize imported JSON into an array of DomainData
const domain_list = (domainListModule as any).default || domainListModule as unknown as DomainData[];
const manualPromptList = (manualPromptListModule as any).default || manualPromptListModule as unknown as PromptData[];


export interface QuestionPrompt {
  domainId: string;      // Original Domain_Id
  id: string;            // Unique identifier per sub-question
  question: string;      // Base question text
  prompt: string;        // Full prompt including sub-element
  design_element?: string; // Optional design element if applicable
}




export interface DomainData {
    Domain_Id: string;
  Domain_name: string;
  Sub_Domain_Name: string;
    Question: string;
    Question_Description: string;
  Assessor_Guidelines: string;
}


export interface PromptData {
  Questionnaire_Name: string;
  Prompt: string;
  ID: string;
  Final_Prompt: string;
}


/**
 * Load and normalize domain list from JSON.
 */
export const loadDomainList = async (): Promise<DomainData[]> => {
    if (!domain_list) return [];
  // If the JSON import yields an object with a 'data' key, unwrap it
  if (typeof domain_list === 'object' && !Array.isArray(domain_list)) {
    const arrKey = Object.keys(domain_list).find(k => Array.isArray((domain_list as any)[k]));
    if (arrKey) {
      return (domain_list as any)[arrKey] as DomainData[];
    }
    return [];
  }
  return domain_list as DomainData[];
};


export const loadManualPromptList = async (): Promise<PromptData[]> => {
  if (!manualPromptList) return [];
  if (typeof manualPromptList === 'object' && !Array.isArray(manualPromptList)) {
    const arrKey = Object.keys(manualPromptList).find(k => Array.isArray((manualPromptList as any)[k]));
    if (arrKey) {
      return (manualPromptList as any)[arrKey] as PromptData[];
    }
    return [];
  }
  return manualPromptList as PromptData[];
};


/**
 * Extracts numbered sub-questions from the description text.
 */
export const extractSubQuestions = (description: string): string[] => {
  const regex = /(?:Document the following )?design elements:/i;
    const match = description.match(regex);
    // if (!description.includes('Design elements:')) return [];
    if (!match) return [];
  const index = description.toLocaleLowerCase().indexOf(match[0].toLocaleLowerCase());
    if (index === -1) return [];
    const elementsSection = description.slice(index + match[0].length).trim();
    return elementsSection
      .split(/\r?\n+/)         
      .map(line => line.trim())             // split into lines
      .filter(line => /^\d+\./.test(line)) // keep only numbered lines
      .map(line => line.replace(/^\d+\.\s*/, ''));
  };



/**
 * Checks if a given CID exists in the domain list.
 */
export const checkCID = async (cid: string, list: DomainData[]): Promise<boolean> => {
    return list.some(item => item.Domain_Id === cid);
};
export const checkCIDInManualPrompt = (cid: string, id: string, list: PromptData[]): PromptData | null => {
  const match = list.find(item => item.Questionnaire_Name === cid && item.ID === id);
  console.log(cid, id, match)
  return match || null;
};




/**
 * Fetch design element prompts by CID, returning a tuple [valid, prompts].
 * This version is adapted for the vendor assessment to distinguish Main and Sub questions.
 */
export const getDesignElementsByCID = async (
    CID: string
): Promise<[boolean, QuestionPrompt[]]> => {
    console.log(`[Prompt Service] Getting design elements for CID: ${CID}`);
    const domainList = await loadDomainList();
  const manualPromptList = await loadManualPromptList();
    const valid = await checkCID(CID, domainList);
    if (!valid) {
        console.warn(`Invalid Domain_Id: ${CID}`);
        return [false, []];
    }
    const prompts: QuestionPrompt[] = [];
  const domain = domainList.find(item => item.Domain_Id === CID)!;
    const subQuestions = extractSubQuestions(domain.Question_Description);
    console.log(`[Prompt Service] Extracted ${subQuestions.length} sub-questions for ${CID}:`, subQuestions);
    const mainQuestion = domain.Question;


    if (subQuestions.length > 0) {
        subQuestions.forEach((elem, idx) => {
            const domainId = domain.Domain_Id;
      const id = `${idx + 1}`;
      const baseQuestion = domain.Question.replace(/[?]$/, '');
      const manual = checkCIDInManualPrompt(CID, `${idx + 1}`, manualPromptList);
      if (manual) {
        const fullPrompt = manual.Final_Prompt;
        prompts.push({ domainId, id, 
                        question: domain.Question, 
                        prompt: fullPrompt, 
                        design_element: domainId + "." + id + "-" + elem 
         });
      }
      else {
            const fullPrompt = `${baseQuestion} with following policy feature: ${elem}`;
        prompts.push({ domainId, id, 
                        question: domain.Question, 
                        prompt: fullPrompt,
                        design_element: domainId + "." + id + "-" + elem
         });
      }


    });
  }
  else {
    const manual = checkCIDInManualPrompt(CID, `1`, manualPromptList);
    console.log(manual?.Final_Prompt, "Hello World")
    if (manual) {
      const fullPrompt = manual.Final_Prompt;
      prompts.push({ domainId: domain.Domain_Id, id: '1', question: domain.Question, prompt: fullPrompt, design_element: domain.Question });
    }
    else {
        prompts.push({
            domainId: domain.Domain_Id,
        id: '1',
        question: domain.Question,
        prompt: domain.Question,
        design_element: domain.Question
        });
    }
  }
    return [true, prompts];
};

