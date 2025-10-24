
'use server';
/**
 * @fileOverview A flow to dynamically generate a 30-question assessment for a given role.
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
  correctAnswer: z.string().optional().describe("For MCQs, this MUST be the full text of the correct option. For 'short' type, the ideal answer. Not needed for 'coding' type."),
  testCases: z.array(z.object({ input: z.string(), expectedOutput: z.string() })).optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  timeLimit: z.number().describe('Time limit in seconds'),
  starterCode: z.string().optional(),
});

// Zod schema for questions for a SINGLE skill
const QuestionsForSkillSchema = z.array(GeneratedQuestionSchema).length(5);


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
      // Questions exist, fetch them
      console.log(`Found existing questions for role: ${roleName}`);
      existingQuestionsSnap.forEach((doc) => {
        allQuestions.push({ id: doc.id, ...doc.data() } as Question);
      });
    } else {
      // Questions do NOT exist, generate and save them in smaller batches
      console.log(`No questions found for role: ${roleName}. Generating new questions...`);
      const batch = writeBatch(firestore);

      const allGeneratedQuestions: Omit<Question, 'id'>[] = [];

      // A. Generate questions for each sub-skill one by one
      for (const skill of subSkills) {
        console.log(`Generating 5 questions for sub-skill: ${skill}`);
        const { output: skillQuestions } = await ai.generate({
          prompt: `You are an expert technical interviewer creating questions for the "${roleName}" role.
          Generate exactly 5 assessment questions specifically for the sub-skill: "${skill}".
          
          **INSTRUCTIONS:**
          - Create a mix of difficulties: 2 Easy, 2 Medium, 1 Hard.
          - For MCQs, create scenario-based questions, not simple definitions. Provide 4 options. 'correctAnswer' must be the full text of the correct option.
          - For Short Answer, ask for one-line code fixes or brief conceptual comparisons. 'correctAnswer' should be the ideal answer.
          - For Coding, provide a clear problem statement and 3-5 test cases. 'starterCode' is optional. The 'correctAnswer' field is not needed for coding questions.
          - Ensure all fields in the schema are present for each question, even if optional (e.g., use 'options: []' for non-mcq).

          Adhere strictly to the JSON output schema, which is an array of 5 question objects. Your response MUST be a valid JSON array.`,
          output: { schema: QuestionsForSkillSchema },
          config: { temperature: 0.7 }
        });

        if (!skillQuestions) throw new Error(`AI failed to generate questions for sub-skill ${skill}`);

        for (const question of skillQuestions) {
            allGeneratedQuestions.push({
                skill: skill,
                tags: [roleName, skill],
                ...question,
            });
        }
      }

      // B. Generate the 5 combined, cross-skill questions
       console.log(`Generating 5 combined cross-skill questions...`);
       const { output: combinedQuestions } = await ai.generate({
          prompt: `You are an expert technical interviewer creating questions for the "${roleName}" role with sub-skills: ${subSkills.join(', ')}.
          Generate exactly 5 complex, scenario-based questions that integrate knowledge across multiple of those sub-skills.
          
          **INSTRUCTIONS:**
          - Create a mix of difficulties: 2 Easy, 2 Medium, 1 Hard.
          - Ensure all fields in the schema are present for each question, even if optional.
          - Adhere strictly to the JSON output schema, which is an array of 5 question objects. Your response MUST be a valid JSON array.`,
          output: { schema: QuestionsForSkillSchema },
          config: { temperature: 0.8 }
      });

      if (!combinedQuestions) throw new Error(`AI failed to generate combined questions.`);
      
      for (const question of combinedQuestions) {
          allGeneratedQuestions.push({
             skill: 'combined',
             tags: [roleName, ...subSkills],
             ...question,
         });
      }
      
      // C. Save all generated questions to Firestore and collect their new IDs
      for (const qData of allGeneratedQuestions) {
        const questionDocRef = doc(questionsCollectionRef);
        batch.set(questionDocRef, qData);
        allQuestions.push({ id: questionDocRef.id, ...qData });
      }

      await batch.commit();
      console.log(`Successfully generated and saved ${allGeneratedQuestions.length} questions for role: ${roleName}`);
    }

    // 3. Assemble and return the final assessment object
    const totalTimeLimit = allQuestions.reduce((acc, q) => acc + q.timeLimit, 0);
    const assessment: Assessment = {
        id: `assessment_${roleId}_${Date.now()}`,
        roleId: roleId,
        roleName: roleName,
        questions: allQuestions,
        totalTimeLimit,
    };
    
    return assessment;
  }
);

export async function generateAssessment(roleId: string): Promise<Assessment> {
  return await generateAssessmentFlow(roleId);
}
