
'use server';
/**
 * @fileOverview A flow to populate the Firestore database with 30+ professional roles and their sub-skills.
 * This flow does NOT generate questions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore, collection, writeBatch, doc } from 'firebase/firestore';
import { initializeFirebaseForServer } from '@/firebase/server-init';
import type { Role } from '@/lib/types';


const GeneratedRoleSchema = z.object({
  name: z.string(),
  description: z.string(),
  subSkills: z.array(z.string()).length(5),
});

const RoleListSchema = z.object({
    roles: z.array(GeneratedRoleSchema),
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
    
    // 1. Generate all roles and their sub-skills in a single AI call.
    const { output: rolesOutput } = await ai.generate({
      prompt: `Generate a detailed list for the following 31 professional roles: ${professionalRoles.join(', ')}.

      For EACH of the 31 roles, provide the following in a single JSON object:
      1.  'name': The name of the professional role.
      2.  'description': A brief, one-sentence description of the role.
      3.  'subSkills': A list of exactly 5 essential string sub-skills for this role.
      
      Ensure the output is a single, valid JSON object that strictly follows the provided schema. The root should be an object with a 'roles' property, which is an array of these generated role objects.`,
      output: {
        schema: RoleListSchema,
      },
      config: { temperature: 0.5 }
    });

    if (!rolesOutput || !rolesOutput.roles) {
      throw new Error('AI failed to generate roles.');
    }

    // 2. Write all roles to Firestore in a single batch.
    const batch = writeBatch(firestore);
    const rolesCollectionRef = collection(firestore, 'roles');

    for (const roleData of rolesOutput.roles) {
        const roleDocRef = doc(rolesCollectionRef);
        const role: Omit<Role, 'id'> = {
            name: roleData.name,
            description: roleData.description,
            subSkills: roleData.subSkills,
        };
        batch.set(roleDocRef, role);
    }
    
    await batch.commit();
    console.log(`Successfully populated ${rolesOutput.roles.length} roles.`);
  }
);

export async function populateRoles() {
  await populateRolesFlow();
}
