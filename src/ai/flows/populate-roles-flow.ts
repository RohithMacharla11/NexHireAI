'use server';
/**
 * @fileOverview A flow to populate the Firestore database with 30+ professional roles and their sub-skills.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, collection, writeBatch } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const RoleSchema = z.object({
  name: z.string().describe('The name of the professional role.'),
  description: z.string().describe('A brief, one-sentence description of the role.'),
  subSkills: z.array(z.string()).length(5).describe('A list of exactly 5 key sub-skills for this role.'),
});

const RoleListSchema = z.object({
  roles: z.array(RoleSchema).describe('A list of 30+ professional roles.'),
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
    const { firestore } = initializeFirebase();
    const batch = writeBatch(firestore);

    const { output } = await ai.generate({
      prompt: `Generate a detailed list of professional roles for a skill assessment platform. For each of the following ${professionalRoles.length} roles, provide a brief description and a list of exactly 5 essential sub-skills. The roles are: ${professionalRoles.join(', ')}.`,
      output: {
        schema: RoleListSchema,
      },
      config: { temperature: 0.5 }
    });

    if (!output || !output.roles) {
      throw new Error('AI failed to generate roles.');
    }

    const rolesCollection = collection(firestore, 'roles');
    output.roles.forEach(role => {
      const docRef = collection(rolesCollection).doc(); // Auto-generate ID
      batch.set(docRef, role);
    });

    await batch.commit();
  }
);

export async function populateRoles() {
  await populateRolesFlow();
}
