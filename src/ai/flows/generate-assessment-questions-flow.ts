
'use server';
/**
 * @fileOverview A dedicated flow to generate a full 30-question assessment in a single AI call.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Zod schema for a single generated question
const GeneratedQuestionSchema = z.object({
  questionText: z.string(),
  type: z.enum(['mcq', 'short', 'coding']),
  options: z.array(z.string()).optional().describe("For 'mcq' type, provide exactly 4 options."),
  correctAnswer: z.string().optional().describe("For 'mcq', this MUST be the full text of the correct option. For 'short', the ideal answer. Not needed for 'coding'."),
  testCases: z.array(z.object({ input: z.string(), expectedOutput: z.string() })).optional().describe("For 'coding' type, provide 3-5 test cases. Not needed for other types."),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  timeLimit: z.number().describe('Time limit in seconds'),
  skill: z.string().describe("The specific sub-skill this question targets, or 'combined' for cross-skill questions."),
});

// Zod schema for the full list of 30 questions
const FullAssessmentQuestionsSchema = z.array(GeneratedQuestionSchema).length(30);

// Input schema for the flow
const GenerateQuestionsInputSchema = z.object({
  roleName: z.string(),
  subSkills: z.array(z.string()),
});
type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;


const generateAssessmentQuestionsFlow = ai.defineFlow(
  {
    name: 'generateAssessmentQuestionsFlow',
    inputSchema: GenerateQuestionsInputSchema,
    outputSchema: FullAssessmentQuestionsSchema,
  },
  async ({ roleName, subSkills }) => {
    console.log(`Generating 30 questions in a single call for role: ${roleName}`);
    
    const { output } = await ai.generate({
      prompt: `You are an expert technical interviewer creating a 30-question assessment for the "${roleName}" role.
      The role has the following sub-skills: ${subSkills.join(', ')}.

      **INSTRUCTIONS:**
      Your task is to generate EXACTLY 30 questions in total. Your response MUST be a single valid JSON array containing 30 question objects.

      **Distribution:**
      - For each of the ${subSkills.length} sub-skills, generate exactly 5 questions.
        - Set the 'skill' field for these questions to the corresponding sub-skill name.
        - Difficulty mix per skill: 2 Easy, 2 Medium, 1 Hard.
      - Generate 5 additional complex, scenario-based questions that integrate knowledge across MULTIPLE sub-skills.
        - Set the 'skill' field for these to "combined".
        - Difficulty mix for combined: 2 Easy, 2 Medium, 1 Hard.

      **Question Content Rules:**
      - For 'mcq' questions: Create scenario-based questions, not simple definitions. Provide exactly 4 string options. The 'correctAnswer' field MUST contain the full text of the correct option.
      - For 'short' questions: Ask for one-line code fixes or brief conceptual comparisons. The 'correctAnswer' field should be the ideal one-sentence answer.
      - For 'coding' questions: Provide a clear problem statement. 'correctAnswer' is not needed. Provide 3-5 relevant 'testCases', each with an 'input' and 'expectedOutput'.
      - Ensure all fields in the schema are present for each question, using empty arrays or null where appropriate (e.g., 'options: []' for non-mcq, 'testCases: []' for non-coding).
      
      Adhere strictly to the JSON output schema.`,
      output: { schema: FullAssessmentQuestionsSchema },
      config: { temperature: 0.6 }
    });

    if (!output) {
      throw new Error("AI failed to generate any questions in the batch call.");
    }
    if (output.length !== 30) {
        throw new Error(`AI generated ${output.length} questions instead of the required 30.`);
    }

    // Add tags to the generated questions before returning
    const questionsWithTags = output.map(q => ({
      ...q,
      tags: q.skill === 'combined' ? [roleName, ...subSkills] : [roleName, q.skill],
    }));

    return questionsWithTags;
  }
);

export async function generateAssessmentQuestions(input: GenerateQuestionsInput) {
  return await generateAssessmentQuestionsFlow(input);
}
