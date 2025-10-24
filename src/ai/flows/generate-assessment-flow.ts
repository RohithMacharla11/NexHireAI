
'use server';
/**
 * @fileOverview A flow to dynamically generate a 30-question assessment for a given role.
 * If questions for the role don't exist, it generates and saves them first.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, doc, getDoc, collection, writeBatch, getDocs, query, limit } from 'firebase/firestore';
import { initializeFirebaseForServer } from '@/firebase/server-init';
import type { Question, Assessment, Role } from '@/lib/types';

// Zod schema for a single generated question
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

// Zod schema for questions grouped by a sub-skill
const SubSkillQuestionsSchema = z.object({
  skill: z.string(),
  questions: z.array(QuestionSchema).length(5),
});

// Zod schema for the entire set of questions for a role
const GeneratedRoleQuestionsSchema = z.object({
  skillQuestions: z.array(SubSkillQuestionsSchema).length(5).describe("Array of 5 objects, one for each sub-skill."),
  combinedQuestions: z.array(QuestionSchema).length(5).describe("Array of 5 complex cross-skill questions."),
});


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

    // 2. Check if questions already exist for this role
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
      // Questions do NOT exist, generate and save them
      console.log(`No questions found for role: ${roleName}. Generating new questions...`);
      
      const { output: generatedData } = await ai.generate({
        prompt: `You are an expert technical interviewer tasked with creating a high-quality assessment for the professional role: "${roleName}".
        The role has the following 5 sub-skills: ${subSkills.join(', ')}.

        Your output must be a single JSON object containing two main properties:
        1. 'skillQuestions': An array of 5 objects. Each object must correspond to one of the sub-skills and contain:
            - 'skill': The name of the sub-skill.
            - 'questions': An array of exactly 5 assessment questions for that specific sub-skill.
        2. 'combinedQuestions': An array of exactly 5 complex, scenario-based questions that integrate knowledge across multiple of the role's sub-skills.
        
        For every single question, ensure it has the properties: 'questionText', 'type', 'difficulty', 'timeLimit', and other relevant fields.

        **IMPORTANT QUESTION DESIGN INSTRUCTIONS:**
        - **MCQs**: Do not ask simple definitions. Instead, create scenario-based questions, code-output prediction questions, or "Which of the following is NOT..." questions to test deeper understanding.
        - **Short Answer**: Ask for one-line code fixes, brief conceptual comparisons (e.g., "Explain the main difference between X and Y"), or have the user fill in a missing piece of a code block.
        - **Coding**: Create a clear problem statement. For 'Easy' questions, provide simple starter code. For 'Medium' and 'Hard', the starter code can be more of a basic boilerplate. Include 3-5 diverse test cases.
        - **Difficulty Mix**: For each set of 5 questions per skill, ensure a mix of difficulties: 2 Easy, 2 Medium, 1 Hard.

        Adhere strictly to the JSON output schema.`,
        output: { schema: GeneratedRoleQuestionsSchema },
        config: { temperature: 0.7 }
      });
      
      if (!generatedData) {
        throw new Error(`AI failed to generate questions for role ${roleName}.`);
      }

      const batch = writeBatch(firestore);

      // Save sub-skill questions
      for (const skillGroup of generatedData.skillQuestions) {
        for (const question of skillGroup.questions) {
          const questionDocRef = doc(questionsCollectionRef);
          const newQuestion: Omit<Question, 'id'> = {
              skill: skillGroup.skill,
              tags: [roleName, skillGroup.skill],
              ...question,
          };
          batch.set(questionDocRef, newQuestion);
          allQuestions.push({ id: questionDocRef.id, ...newQuestion });
        }
      }

      // Save combined questions
      for (const question of generatedData.combinedQuestions) {
        const questionDocRef = doc(questionsCollectionRef);
        const newQuestion: Omit<Question, 'id'> = {
           skill: 'combined',
           tags: [roleName, ...subSkills],
           ...question,
       };
       batch.set(questionDocRef, newQuestion);
       allQuestions.push({ id: questionDocRef.id, ...newQuestion });
      }
      
      await batch.commit();
      console.log(`Successfully generated and saved 30 questions for role: ${roleName}`);
    }

    // 3. Assemble and return the final assessment object
    const totalTimeLimit = allQuestions.reduce((acc, q) => acc + q.timeLimit, 0);
    const assessment: Assessment = {
        id: `assessment_${roleId}_${Date.now()}`,
        roleId: roleId,
        questions: allQuestions,
        totalTimeLimit,
    };
    
    return assessment;
  }
);

export async function generateAssessment(roleId: string): Promise<Assessment> {
  return await generateAssessmentFlow(roleId);
}
