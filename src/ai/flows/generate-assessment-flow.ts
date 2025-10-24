'use server';
/**
 * @fileOverview A flow to dynamically generate a 30-question assessment for a given role.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, doc, getDoc, collection, writeBatch, serverTimestamp, getDocs, query, where, limit } from 'firebase/firestore';
import { initializeFirebaseForServer } from '@/firebase/server-init';
import type { Question, Assessment, Role } from '@/lib/types';

const QuestionSchema = z.object({
  questionText: z.string(),
  type: z.enum(['mcq', 'short', 'coding']),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  testCases: z.array(z.object({ input: z.string(), expectedOutput: z.string() })).optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  timeLimit: z.number().describe('Time limit in seconds'),
  starterCode: z.string().optional(),
});

const GeneratedQuestionsSchema = z.object({
    questions: z.array(QuestionSchema),
});

const generateAssessmentFlow = ai.defineFlow(
  {
    name: 'generateAssessmentFlow',
    inputSchema: z.string().describe("The Firestore ID of the role to generate an assessment for."),
    outputSchema: z.custom<Assessment>(),
  },
  async (roleId) => {
    const { firestore } = initializeFirebaseForServer();
    
    // 1. Fetch the role and its sub-skills
    const roleRef = doc(firestore, 'roles', roleId);
    const roleSnap = await getDoc(roleRef);
    if (!roleSnap.exists()) {
      throw new Error(`Role with ID ${roleId} not found.`);
    }
    const roleData = roleSnap.data() as Role;
    const { subSkills } = roleData;

    const allGeneratedQuestions: Question[] = [];
    const questionsCollectionRef = collection(firestore, 'roles', roleId, 'questions');

    // 2. Fetch 5 questions for each sub-skill from the DB
    for (const skill of subSkills) {
      const q = query(questionsCollectionRef, where('skill', '==', skill), limit(5));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        allGeneratedQuestions.push({ id: doc.id, ...doc.data() } as Question);
      });
    }

    // 3. Fetch 5 "combined" cross-skill questions
    const combinedQuery = query(questionsCollectionRef, where('skill', '==', 'combined'), limit(5));
    const combinedSnapshot = await getDocs(combinedQuery);
    combinedSnapshot.forEach((doc) => {
        allGeneratedQuestions.push({ id: doc.id, ...doc.data() } as Question);
    });

    // This is a failsafe in case the question bank isn't fully populated.
    // In a real scenario, you might want more robust logic.
    if (allGeneratedQuestions.length < 30) {
        console.warn(`Warning: Only found ${allGeneratedQuestions.length} questions for role ${roleId}. Assessment may be incomplete.`);
    }


    // 4. Assemble and return the assessment object
    const totalTimeLimit = allGeneratedQuestions.reduce((acc, q) => acc + q.timeLimit, 0);

    const assessment: Assessment = {
        id: `assessment_${roleId}_${Date.now()}`,
        roleId: roleId,
        questions: allGeneratedQuestions,
        totalTimeLimit,
    };
    
    return assessment;
  }
);

export async function generateAssessment(roleId: string): Promise<Assessment> {
  return await generateAssessmentFlow(roleId);
}
