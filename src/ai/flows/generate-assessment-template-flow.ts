
'use server';
/**
 * @fileOverview A flow to generate a complete Assessment Template, including questions, for an admin.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Question, AssessmentTemplate } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// Zod schema for a single generated question
const GeneratedQuestionSchema = z.object({
  questionText: z.string(),
  type: z.enum(['mcq', 'short', 'coding']),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  testCases: z.array(z.object({ input: z.string(), expectedOutput: z.string() })).optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  skill: z.string().describe("The specific sub-skill this question relates to."),
  starterCode: z.string().optional(),
});

// Zod schema for the entire batch of questions.
const QuestionsSchema = z.array(GeneratedQuestionSchema);

// Input schema for the flow
const GenerateTemplateInputSchema = z.object({
    roleName: z.string(),
    roleId: z.string(),
    assessmentName: z.string(),
    subSkills: z.array(z.string()),
    questionCount: z.number(),
    duration: z.number(),
    difficultyMix: z.object({
        easy: z.number(),
        medium: z.number(),
        hard: z.number(),
    })
});

// We are defining a new output schema that includes the questions themselves
const TemplateWithQuestionsSchema = z.custom<AssessmentTemplate & { questions: Question[] }>();


export const generateAssessmentTemplateFlow = ai.defineFlow(
  {
    name: 'generateAssessmentTemplateFlow',
    inputSchema: GenerateTemplateInputSchema,
    outputSchema: TemplateWithQuestionsSchema,
  },
  async (input) => {
    const { roleName, roleId, assessmentName, subSkills, questionCount, duration, difficultyMix } = input;
    
    // Calculate number of questions for each difficulty
    const easyCount = Math.round(questionCount * (difficultyMix.easy / 100));
    const mediumCount = Math.round(questionCount * (difficultyMix.medium / 100));
    const hardCount = questionCount - easyCount - mediumCount;

    const { output: generatedQuestions } = await ai.generate({
        prompt: `You are an expert technical interviewer creating a formal assessment template for the "${roleName}" role.
        The core sub-skills for this role are: ${subSkills.join(', ')}.
        
        Your task is to generate exactly ${questionCount} high-quality assessment questions based on the following specifications.

        **INSTRUCTIONS:**
        - **Total Questions:** ${questionCount}
        - **Skill Distribution:** Generate a balanced number of questions across all sub-skills.
        - **Difficulty Mix:**
          - ${easyCount} Easy
          - ${mediumCount} Medium
          - ${hardCount} Hard
        - **Question Types:** Create a diverse mix of 'mcq', 'short', and 'coding' questions.
        - **For MCQs:** Create scenario-based questions, not simple definitions. Provide 4 options. 'correctAnswer' must be the full text of the correct option.
        - **For Short Answer:** Ask for one-line code fixes, brief conceptual comparisons, or command examples. 'correctAnswer' should be the ideal answer.
        - **For Coding:** Provide a clear problem statement, 3-5 test cases, and optional 'starterCode'. The 'correctAnswer' field is not needed.
        - **Mandatory Fields:** Ensure the 'skill' field for each question correctly identifies which sub-skill it targets. All fields in the schema must be present for each question, even if optional (e.g., use 'options: []' for non-mcq).

        Adhere strictly to the JSON output schema, which is an array of exactly ${questionCount} question objects. Your response MUST be a valid JSON array.`,
        output: { schema: QuestionsSchema },
        config: { temperature: 0.5 }
    });

    if (!generatedQuestions || generatedQuestions.length === 0) {
      throw new Error(`AI failed to generate questions for role ${roleName}.`);
    }

    const questionIds = generatedQuestions.map(() => uuidv4());
    const fullQuestions = generatedQuestions.map((q, i) => ({
        ...q,
        id: questionIds[i],
        tags: [roleName, q.skill],
        // The AI doesn't provide a time limit, so we assign a default
        timeLimit: q.type === 'coding' ? 300 : (q.type === 'short' ? 120 : 60),
    }));

    const assessmentTemplate: AssessmentTemplate & { questions: Question[] } = {
        id: uuidv4(),
        name: assessmentName,
        role: roleName,
        roleId: roleId,
        skills: subSkills,
        questionCount: questionCount,
        duration: duration,
        difficultyMix: difficultyMix,
        questionIds: questionIds, // Keep IDs for reference
        questions: fullQuestions, // Embed the full questions
        status: 'active',
        version: '1.0',
        createdBy: 'Admin', // In a real app, this would be the current user's ID
        createdAt: Date.now(),
    };
    
    return assessmentTemplate;
  }
);

export async function generateAssessmentTemplate(input: z.infer<typeof GenerateTemplateInputSchema>): Promise<AssessmentTemplate & { questions: Question[] }> {
  return await generateAssessmentTemplateFlow(input);
}
