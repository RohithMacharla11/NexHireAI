
'use server';
/**
 * @fileOverview A flow to dynamically generate a 30-question practice assessment for a given role.
 * If questions for the role don't exist, it generates and saves them first.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, doc, getDoc, collection, writeBatch, getDocs, query, limit } from 'firebase/firestore';
import { initializeFirebaseForServer } from '@/firebase/server-init';
import type { Question, Role } from '@/lib/types';
import type { Assessment } from '@/lib/types';


// Zod schema for a single generated question
const GeneratedQuestionSchema = z.object({
  questionText: z.string(),
  type: z.enum(['mcq', 'short', 'coding']),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  testCases: z.array(z.object({ input: z.string(), expectedOutput: z.string() })).optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  timeLimit: z.number().describe('Time limit in seconds'),
  skill: z.string().describe("The specific sub-skill this question relates to."),
  starterCode: z.string().optional(),
});

// Zod schema for the entire batch of questions.
const QuestionsSchema = z.array(GeneratedQuestionSchema);


const generateAssessmentFlow = ai.defineFlow(
  {
    name: 'generateAssessmentFlow',
    inputSchema: z.string().describe("The Firestore ID of the role to generate an assessment for."),
    outputSchema: z.custom<Assessment>(),
  },
  async (roleId) => {
    const { firestore } = initializeFirebaseForServer();
    
    // 1. Fetch the role document
    const roleRef = doc(firestore, 'roles', roleId);
    const roleSnap = await getDoc(roleRef);
    if (!roleSnap.exists()) {
      throw new Error(`Role with ID ${roleId} not found.`);
    }
    const roleData = roleSnap.data() as Role;
    const { subSkills, name: roleName } = roleData;
    const questionsCollectionRef = collection(firestore, 'roles', roleId, 'questions');

    // 2. Check if enough questions already exist for this role
    const existingQuestionsQuery = query(questionsCollectionRef, limit(30));
    const existingQuestionsSnap = await getDocs(existingQuestionsQuery);
    
    let allQuestions: Question[] = [];

    if (existingQuestionsSnap.size >= 30) {
      console.log(`Found existing questions for role: ${roleName}`);
      existingQuestionsSnap.forEach((doc) => {
        allQuestions.push({ id: doc.id, ...doc.data() } as Question);
      });
    } else {
      console.log(`No questions found for role: ${roleName}. Generating 30 new questions...`);
      
      const { output: generatedQuestions } = await ai.generate({
          prompt: `You are an expert technical interviewer creating a practice assessment for the "${roleName}" role.
          The core sub-skills for this role are: ${subSkills.join(', ')}.
          
          Your task is to generate exactly 30 high-quality assessment questions covering these skills.

          **INSTRUCTIONS:**
          - **Total Questions:** 30
          - **Skill Distribution:** Generate roughly an equal number of questions for each sub-skill. For example, if there are 5 sub-skills, create about 6 questions for each. It's okay to have some complex questions that touch on multiple skills; assign them to the most relevant primary skill.
          - **Difficulty Mix (for the total of 30):**
            - 12 Easy
            - 12 Medium
            - 6 Hard
          - **Question Types:** Create a diverse mix of 'mcq', 'short', and 'coding' questions.
          - **For MCQs:** Create scenario-based questions, not simple definitions. Provide 4 options. 'correctAnswer' must be the full text of the correct option.
          - **For Short Answer:** Ask for one-line code fixes, brief conceptual comparisons, or command examples. 'correctAnswer' should be the ideal answer.
          - **For Coding:** Provide a clear problem statement and 3-5 test cases. 'starterCode' is optional. The 'correctAnswer' field is not needed.
          - **Mandatory Fields:** Ensure the 'skill' field for each question correctly identifies which sub-skill it targets. All fields in the schema must be present for each question, even if optional (e.g., use 'options: []' for non-mcq).

          Adhere strictly to the JSON output schema, which is an array of exactly 30 question objects. Your response MUST be a valid JSON array.`,
          output: { schema: QuestionsSchema },
          config: { temperature: 0.6 }
      });
      
      if (!generatedQuestions || generatedQuestions.length === 0) {
        throw new Error(`AI failed to generate questions for role ${roleName}.`);
      }

      const batch = writeBatch(firestore);
      for (const question of generatedQuestions) {
          const questionDocRef = doc(questionsCollectionRef);
          const newQuestion: Omit<Question, 'id'> = {
              tags: [roleName, question.skill],
              ...question,
          };
          batch.set(questionDocRef, newQuestion);
          allQuestions.push({ id: questionDocRef.id, ...newQuestion });
      }
      
      await batch.commit();
      console.log(`Successfully generated and saved ${generatedQuestions.length} questions for role: ${roleName}`);
    }

    // 3. Assemble and return the final assessment object
    const selectedQuestions = allQuestions.slice(0, 30);
    const totalTimeLimit = selectedQuestions.reduce((acc, q) => acc + (q.timeLimit || 60), 0); // Default to 60s if not set

    const assessment: Assessment = {
        id: `assessment_${roleId}_${Date.now()}`,
        roleId: roleId,
        roleName: roleName,
        questions: selectedQuestions,
        totalTimeLimit,
        isTemplate: false,
    };
    
    return assessment;
  }
);

export async function generateAssessment(roleId: string): Promise<Assessment> {
  return await generateAssessmentFlow(roleId);
}
