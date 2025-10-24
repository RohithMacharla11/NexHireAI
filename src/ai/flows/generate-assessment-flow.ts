'use server';
/**
 * @fileOverview A flow to dynamically generate a 30-question assessment for a given role.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, doc, getDoc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
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
    const { firestore } = initializeFirebase();
    
    // 1. Fetch the role and its sub-skills
    const roleRef = doc(firestore, 'roles', roleId);
    const roleSnap = await getDoc(roleRef);
    if (!roleSnap.exists()) {
      throw new Error(`Role with ID ${roleId} not found.`);
    }
    const roleData = roleSnap.data() as Role;
    const { subSkills } = roleData;

    const allGeneratedQuestions: Question[] = [];
    const batch = writeBatch(firestore);
    const questionsCollectionRef = collection(firestore, `roles/${roleId}/questions`);

    // 2. Generate 5 questions for each sub-skill
    for (const skill of subSkills) {
      const { output } = await ai.generate({
        prompt: `Generate 5 assessment questions for the skill "${skill}" within the context of a "${roleData.name}" role. Include a mix of difficulties (Easy, Medium, Hard) and types (mcq, short, coding). For MCQs, provide 4 options. For coding questions, provide simple test cases.`,
        output: { schema: GeneratedQuestionsSchema },
        config: { temperature: 0.7 },
      });

      if (!output || !output.questions) {
        throw new Error(`AI failed to generate questions for skill: ${skill}`);
      }

      output.questions.forEach(q => {
        const questionDocRef = doc(questionsCollectionRef); // auto-gen ID
        const newQuestion: Question = {
            id: questionDocRef.id,
            skill: skill,
            tags: [roleData.name, skill],
            ...q,
        };
        batch.set(questionDocRef, newQuestion);
        allGeneratedQuestions.push(newQuestion);
      });
    }

    // 3. Generate 5 "combined" cross-skill questions
    const { output: combinedOutput } = await ai.generate({
        prompt: `Generate 5 complex, scenario-based assessment questions for a "${roleData.name}" role that integrate and test knowledge across multiple of the following skills: ${subSkills.join(', ')}. Include a mix of difficulties and types (mcq, short, coding).`,
        output: { schema: GeneratedQuestionsSchema },
        config: { temperature: 0.8 },
    });

    if (!combinedOutput || !combinedOutput.questions) {
        throw new Error('AI failed to generate combined questions.');
    }

    combinedOutput.questions.forEach(q => {
        const questionDocRef = doc(questionsCollectionRef); // auto-gen ID
        const newQuestion: Question = {
            id: questionDocRef.id,
            skill: 'combined', // Special skill tag for cross-disciplinary questions
            tags: [roleData.name, ...subSkills],
            ...q,
        };
        batch.set(questionDocRef, newQuestion);
        allGeneratedQuestions.push(newQuestion);
      });

    // 4. Commit all new questions to Firestore
    await batch.commit();

    // 5. Assemble and return the assessment object
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
