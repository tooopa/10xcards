/**
 * Prompt engineering for flashcard generation
 *
 * This module contains the system and user prompts used for generating
 * high-quality flashcards from source text using AI models.
 */

/**
 * System message that defines the AI's role and behavior
 */
export const FLASHCARD_SYSTEM_PROMPT = `You are an expert educator and learning specialist who creates high-quality flashcards for effective studying.

Your goal is to transform provided text into clear, concise, and pedagogically sound flashcards that:
- Focus on key concepts, definitions, facts, and relationships
- Use clear and unambiguous language
- Are appropriately scoped (not too broad, not too narrow)
- Follow best practices for spaced repetition learning
- Avoid redundancy and overlap between cards

Guidelines for creating flashcards:
1. Each flashcard should test ONE specific piece of knowledge
2. Front side: Clear question or prompt (max 200 characters)
3. Back side: Concise answer or explanation (max 500 characters)
4. Prioritize important information over trivial details
5. Use examples where appropriate to clarify concepts
6. Create 8-15 flashcards depending on content richness

Output Format:
Return a JSON object with a "flashcards" array. Each flashcard must have:
- "front": string (the question or prompt)
- "back": string (the answer or explanation)`;

/**
 * Builds the user prompt with source text
 *
 * @param sourceText - The text to generate flashcards from
 * @returns Formatted user prompt
 */
export function buildFlashcardPrompt(sourceText: string): string {
  return `Generate flashcards from the following text. Create 8-15 high-quality flashcards that capture the most important concepts and information.

Source text:
"""
${sourceText}
"""

Remember:
- Focus on key concepts, definitions, and important facts
- Each flashcard should be clear and test specific knowledge
- Front: max 200 characters (question/prompt)
- Back: max 500 characters (answer/explanation)
- Output valid JSON in the format: {"flashcards": [{"front": "...", "back": "..."}]}`;
}

/**
 * JSON schema for structured output from AI models
 * This ensures consistent formatting of responses
 */
export const FLASHCARD_RESPONSE_SCHEMA = {
  name: "flashcards",
  schema: {
    type: "object" as const,
    properties: {
      flashcards: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            front: {
              type: "string" as const,
              description: "The question or prompt for the flashcard (max 200 characters)",
              maxLength: 200,
            },
            back: {
              type: "string" as const,
              description: "The answer or explanation for the flashcard (max 500 characters)",
              maxLength: 500,
            },
          },
          required: ["front", "back"],
        },
        minItems: 3,
        maxItems: 20,
      },
    },
    required: ["flashcards"],
  },
};

/**
 * Example flashcards for few-shot learning (optional)
 * Can be included in prompts to show the AI desired format
 */
export const EXAMPLE_FLASHCARDS = [
  {
    front: "What is photosynthesis?",
    back: "The process by which plants use sunlight, water, and carbon dioxide to produce oxygen and energy in the form of sugar.",
  },
  {
    front: "What are the main stages of photosynthesis?",
    back: "Light-dependent reactions (occur in thylakoids) and light-independent reactions or Calvin cycle (occur in stroma).",
  },
  {
    front: "Where does photosynthesis take place in plant cells?",
    back: "In chloroplasts, specifically in the thylakoid membranes (light reactions) and stroma (Calvin cycle).",
  },
];
