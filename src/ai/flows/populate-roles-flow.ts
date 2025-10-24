'use server';
/**
 * @fileOverview A flow to populate the Firestore database with 30+ professional roles and their sub-skills.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, collection, writeBatch, doc } from 'firebase/firestore';
import { initializeFirebaseForServer } from '@/firebase/server-init';
import type { Question, Role } from '@/lib/types';


const RoleSchema = z.object({
  name: z.string().describe('The name of the professional role.'),
  description: z.string().describe('A brief, one-sentence description of the role.'),
  subSkills: z.array(z.string()).length(5).describe('A list of exactly 5 key sub-skills for this role.'),
});

const RoleListSchema = z.object({
  roles: z.array(RoleSchema),
});

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


const professionalRoles = [
  "Frontend Developer", "Backend Developer", "Full Stack Developer", "AI Engineer", "Machine Learning Engineer",
  "Data Scientist", "DevOps Engineer", "Cloud Engineer", "QA / Testing Engineer", "Cybersecurity Analyst",
  "Mobile App Developer (iOS)", "Mobile App Developer (Android)", "UI/UX Designer", "Database Administrator", "Software Engineer",
  "Blockchain Developer", "IoT Engineer", "Embedded Systems Developer", "AR/VR Developer", "Game Developer",
  "Automation Engineer", "Network Engineer", "System Administrator", "Product Manager", "Data Analyst",
  "IT Support Engineer", "AI Researcher", "MLOps Engineer", "Cloud Architect", "Site Reliability Engineer", "Software Tester"
];

const populateRolesFlow = ai.defineFlow(
  {
    name: 'populateRolesFlow',
    inputSchema: z.void(),
    outputSchema: z.void(),
  },
  async () => {
    const { firestore } = initializeFirebaseForServer();
    const rolesCollectionRef = collection(firestore, 'roles');

    // 1. Generate the roles and their sub-skills
    const { output: rolesOutput } = await ai.generate({
      prompt: `Generate a detailed list for the following 31 professional roles. For each role, provide a brief description and a list of exactly 5 essential sub-skills. The roles are: ${professionalRoles.join(', ')}.`,
      output: {
        schema: RoleListSchema,
      },
      config: { temperature: 0.5 }
    });

    if (!rolesOutput || !rolesOutput.roles) {
      throw new Error('AI failed to generate roles.');
    }

    // 2. For each role, generate all questions and write everything in a single batch
    for (const role of rolesOutput.roles) {
        const batch = writeBatch(firestore);
        const roleDocRef = doc(rolesCollectionRef);
        batch.set(roleDocRef, role);

        const questionsCollectionRef = collection(firestore, `roles/${roleDocRef.id}/questions`);

        // A. Generate 5 questions for EACH sub-skill
        for (const skill of role.subSkills) {
            const { output } = await ai.generate({
                prompt: `Generate 5 assessment questions for the skill "${skill}" within the context of a "${role.name}" role. Include a mix of difficulties (Easy, Medium, Hard) and types (mcq, short, coding). For MCQs, provide 4 options. For coding questions, provide simple test cases.`,
                output: { schema: GeneratedQuestionsSchema },
                config: { temperature: 0.7 },
            });

             if (!output || !output.questions) {
                console.warn(`AI failed to generate questions for skill: ${skill}. Skipping.`);
                continue;
            }

            output.questions.forEach(q => {
                const questionDocRef = doc(questionsCollectionRef); // auto-gen ID
                const newQuestion: Omit<Question, 'id'> = {
                    skill: skill,
                    tags: [role.name, skill],
                    ...q,
                };
                batch.set(questionDocRef, newQuestion);
            });
        }

        // B. Generate 5 "combined" cross-skill questions
        const { output: combinedOutput } = await ai.generate({
            prompt: `Generate 5 complex, scenario-based assessment questions for a "${role.name}" role that integrate and test knowledge across multiple of the following skills: ${role.subSkills.join(', ')}. Include a mix of difficulties and types (mcq, short, coding).`,
            output: { schema: GeneratedQuestionsSchema },
            config: { temperature: 0.8 },
        });

        if (combinedOutput && combinedOutput.questions) {
            combinedOutput.questions.forEach(q => {
                const questionDocRef = doc(questionsCollectionRef); // auto-gen ID
                const newQuestion: Omit<Question, 'id'> = {
                    skill: 'combined', // Special skill tag for cross-disciplinary questions
                    tags: [role.name, ...role.subSkills],
                    ...q,
                };
                batch.set(questionDocRef, newQuestion);
            });
        } else {
             console.warn(`AI failed to generate combined questions for role: ${role.name}.`);
        }
        
        // Commit the batch for this entire role (role doc + all its questions)
        await batch.commit();
    }
  }
);

export async function populateRoles() {
  await populateRolesFlow();
}
