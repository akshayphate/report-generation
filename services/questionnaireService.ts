/**
 * Service to handle questionnaire file processing
 */

export interface Question {
  id: string;
  question: string;
  prompt: string;
}

/**
 * Processes the questionnaire file and extracts questions
 * @param questionnaireFile The uploaded questionnaire file
 * @returns JSON array with id, question, and prompt
 */
export const processQuestionnaire = async (questionnaireFile: File): Promise<Question[]> => {
  try {
    // Create FormData to send the file
    const formData = new FormData();
    formData.append('questionnaire', questionnaireFile);

    // Call the API endpoint to process the questionnaire
    const response = await fetch('/api/process-questionnaire', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error processing questionnaire: ${response.statusText}`);
    }

    const result = await response.json();
    return result.questions; // Array of {id, question, prompt}
  } catch (error) {
    console.error('Error processing questionnaire:', error);
    throw error;
  }
}; 