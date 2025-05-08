/**
 * Service to handle questionnaire file processing
 * Using mock data instead of API calls
 */

/**
 * Processes the questionnaire file and extracts questions
 * @param questionnaireFile The uploaded questionnaire file
 * @returns JSON array with id, question, and prompt
 */
export const processQuestionnaire = async (questionnaireFile: File): Promise<any[]> => {
  try {
    console.log(`Processing questionnaire file: ${questionnaireFile.name}`);
    
    // Return mock data instead of making API call
    // This simulates the structure we expect from the API
    const mockQuestions = [
      {
        id: "q1",
        question: "What security certifications does the vendor maintain?",
        prompt: "List all security certifications and their validity period"
      },
      {
        id: "q2", 
        question: "How is sensitive data protected in the application?",
        prompt: "Describe encryption methods and data protection policies"
      },
      {
        id: "q3",
        question: "What is the vendor's incident response procedure?",
        prompt: "Detail steps, response times, and notification protocols"
      },
      {
        id: "q4",
        question: "How often are penetration tests conducted?",
        prompt: "Specify frequency, scope, and remediation timeframes"
      },
      {
        id: "q5",
        question: "What access controls are implemented?",
        prompt: "Describe authentication mechanisms and privilege management"
      }
    ];
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return mockQuestions;
  } catch (error) {
    console.error('Error processing questionnaire:', error);
    throw error;
  }
}; 