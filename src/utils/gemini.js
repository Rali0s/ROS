// LimeOS Gemini AI Integration Utility

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export class GeminiAI {
  constructor() {
    this.apiKey = GEMINI_API_KEY;
    this.baseURL = GEMINI_API_URL;
  }

  async generateResponse(prompt, context = '') {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
    }

    try {
      const response = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${context}\n\n${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Unexpected response format from Gemini API');
      }
    } catch (error) {
      console.error('Gemini AI Error:', error);
      throw error;
    }
  }

  async generateCode(prompt, language = 'javascript') {
    const context = `You are an expert ${language} developer. Generate clean, efficient, and well-documented code.`;
    return this.generateResponse(prompt, context);
  }

  async explainCode(code, language = 'javascript') {
    const prompt = `Explain this ${language} code in detail:\n\n${code}`;
    return this.generateResponse(prompt);
  }

  async debugCode(code, error, language = 'javascript') {
    const prompt = `Debug this ${language} code. The error is: ${error}\n\nCode:\n${code}`;
    return this.generateResponse(prompt);
  }
}

// Export singleton instance
export const geminiAI = new GeminiAI();

// Utility functions
export const generateAIResponse = async (prompt, context = '') => {
  return geminiAI.generateResponse(prompt, context);
};

export const callGemini = generateAIResponse; // Alias for backward compatibility

export const generateCodeSnippet = async (description, language = 'javascript') => {
  const prompt = `Generate a ${language} code snippet for: ${description}`;
  return geminiAI.generateResponse(prompt);
};

export const explainConcept = async (concept) => {
  const prompt = `Explain the concept of ${concept} in simple terms, with examples if applicable.`;
  return geminiAI.generateResponse(prompt);
};