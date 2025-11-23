
'use server';
/**
 * @fileOverview A flow to populate the Firestore 'roles' collection with a default set of tech roles.
 * This is intended to be run once for initial setup.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, writeBatch, getDocs, query, doc } from 'firebase/firestore';
import { initializeFirebaseForServer } from '@/firebase/server-init';

// Zod schema for a single role
const RoleSchema = z.object({
  name: z.string().describe("The name of the professional role, e.g., 'Frontend Developer'."),
  description: z.string().describe("A concise, one-sentence description of the role."),
  subSkills: z.array(z.string()).min(4).max(6).describe("An array of 4-6 essential sub-skills for this role."),
});

// Zod schema for the entire list of roles
const RolesListSchema = z.array(RoleSchema);

const populateRolesFlow = ai.defineFlow(
  {
    name: 'populateRolesFlow',
    inputSchema: z.void(),
    outputSchema: z.object({
        count: z.number(),
        roles: RolesListSchema
    }),
  },
  async () => {
    const { firestore } = initializeFirebaseForServer();
    const rolesCollection = collection(firestore, 'roles');
    
    // Check if roles already exist to prevent re-population
    const existingRoles = await getDocs(query(rolesCollection));
    if (!existingRoles.empty) {
        console.log("Roles collection is not empty. Skipping population.");
        const rolesData = existingRoles.docs.map(doc => doc.data() as z.infer<typeof RoleSchema>);
        return { count: existingRoles.size, roles: rolesData };
    }

    const { output: generatedRoles } = await ai.generate({
      prompt: `You are an expert in technical recruitment and job market trends. Your task is to generate a comprehensive list of at least 30 modern and distinct technology job roles.

      **INSTRUCTIONS:**
      - For each role, you must provide:
        1. A 'name' (e.g., "AI Engineer").
        2. A concise, one-sentence 'description'.
        3. An array of 4 to 6 specific and essential 'subSkills' for that role.
      - Cover a wide range of domains: Web Development (frontend, backend, fullstack), Cloud & DevOps, Data Science & AI, Cybersecurity, Mobile Development, and more.
      - Ensure the roles are distinct and represent common, in-demand positions in the tech industry today.

      Your response MUST be a valid JSON array of role objects, adhering strictly to the required schema. Do not include any text before or after the JSON array.`,
      output: {
        schema: RolesListSchema,
      },
      config: {
        temperature: 0.5,
      },
    });

    if (!generatedRoles || generatedRoles.length === 0) {
      throw new Error("AI failed to generate roles.");
    }
    
    // Save the generated roles to Firestore
    const batch = writeBatch(firestore);
    generatedRoles.forEach(role => {
      const newRoleRef = doc(rolesCollection);
      batch.set(newRoleRef, role);
    });

    await batch.commit();

    return { count: generatedRoles.length, roles: generatedRoles };
  }
);


export async function populateRoles(): Promise<void> {
  await populateRolesFlow();
}

