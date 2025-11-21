
'use server';
/**
 * @fileOverview An AI flow to match a job description against all candidates in the database.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { initializeFirebaseForServer } from '@/firebase/server-init';
import type { User } from '@/lib/types';

// Input schema for the flow
const MatchCandidatesInputSchema = z.object({
  jobDescription: z.string().min(50, "Job description must be at least 50 characters."),
});
export type MatchCandidatesInput = z.infer<typeof MatchCandidatesInputSchema>;

// Output schema for the flow
const MatchCandidatesOutputSchema = z.array(
    z.object({
        candidateId: z.string(),
        matchScore: z.number().min(0).max(100).describe("The percentage match score from 0-100."),
        justification: z.string().describe("A brief, 1-2 sentence explanation for why the candidate is a good match."),
        name: z.string(),
        email: z.string(),
        avatarUrl: z.string().optional(),
    })
);
export type MatchCandidatesOutput = z.infer<typeof MatchCandidatesOutputSchema>;

// The main flow definition
export const matchCandidatesFlow = ai.defineFlow(
  {
    name: 'matchCandidatesFlow',
    inputSchema: MatchCandidatesInputSchema,
    outputSchema: MatchCandidatesOutputSchema,
  },
  async ({ jobDescription }) => {
    const { firestore } = initializeFirebaseForServer();

    // 1. Fetch all candidate profiles from Firestore
    const candidatesQuery = query(collection(firestore, 'users'), where('role', '==', 'candidate'));
    const candidatesSnapshot = await getDocs(candidatesQuery);
    
    if (candidatesSnapshot.empty) {
        return [];
    }

    const candidatesData = candidatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    
    // Prepare a simplified version of candidates for the AI prompt to save tokens
    const candidatesForPrompt = candidatesData.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        avatarUrl: c.avatarUrl,
        experienceLevel: c.candidateSpecific?.experienceLevel,
        yearsOfExperience: c.candidateSpecific?.yearsOfExperience,
        skills: c.candidateSpecific?.skills,
        bio: c.candidateSpecific?.bio,
    }));

    // 2. Generate the AI prompt
    const { output } = await ai.generate({
      prompt: `You are an expert technical recruiter. Your task is to analyze the following job description and rank the provided list of candidates based on their suitability for the role.

      **Job Description:**
      ---
      ${jobDescription}
      ---

      **Candidate Profiles:**
      ---
      ${JSON.stringify(candidatesForPrompt, null, 2)}
      ---

      **Instructions:**
      1.  Carefully read the job description to understand the key requirements, skills, and experience level needed.
      2.  For each candidate, evaluate their profile (skills, experience, bio) against the job description.
      3.  Provide a "matchScore" from 0 to 100, where 100 is a perfect match.
      4.  Write a concise "justification" (1-2 sentences) explaining your reasoning for the score.
      5.  Return a JSON array of the top 10 candidates, ordered from the highest matchScore to the lowest.
      6.  Ensure your response is ONLY the valid JSON array and nothing else.

      `,
      output: {
        schema: MatchCandidatesOutputSchema,
      },
      config: { temperature: 0.2 },
    });

    if (!output) {
      throw new Error("AI failed to generate a candidate match list.");
    }
    
    // Return the top 10 ranked candidates
    return output.slice(0, 10);
  }
);


// Wrapper function to be called from the client
export async function matchCandidates(input: MatchCandidatesInput): Promise<MatchCandidatesOutput> {
  return await matchCandidatesFlow(input);
}
