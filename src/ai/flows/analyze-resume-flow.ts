
'use server';
/**
 * @fileOverview A resume analysis AI agent.
 *
 * - analyzeResume - A function that handles the resume analysis process.
 * - AnalyzeResumeInput - The input type for the analyzeResume function.
 * - AnalyzeResumeOutput - The return type for the analyzeResume function.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';


// Initialize Genkit directly in this file
const ai = genkit({
  plugins: [
    googleAI({
      location: 'us-central1',
      apiVersion: 'v1',
    }),
  ],
});


const AnalyzeResumeInputSchema = z.object({
  skills: z.array(z.string()).describe("A list of the candidate's skills."),
  bio: z.string().describe("A short bio or description from the candidate."),
  experienceLevel: z.string().describe("The candidate's stated experience level (e.g., Fresher, Intermediate, Experienced).")
});
export type AnalyzeResumeInput = z.infer<typeof AnalyzeResumeInputSchema>;

const AnalyzeResumeOutputSchema = z.object({
  topRoles: z.array(z.object({
    role: z.string().describe("A recommended job role."),
    score: z.number().describe("A match score from 0 to 100.")
  })).describe("Top 3 recommended roles based on the profile."),
  
  readinessScore: z.number().describe("An overall score from 0-100 indicating job readiness."),

  gapAnalysis: z.array(z.string()).describe("Top 3 skills or areas for improvement."),

  suggestedLearning: z.array(z.object({
    task: z.string().describe("A specific, actionable learning task."),
    estWeeks: z.number().describe("Estimated weeks to complete the task.")
  })).describe("A short list of 2-3 learning suggestions."),

  resumeHealth: z.object({
      contact: z.boolean(),
      projects: z.boolean(),
      skills: z.boolean(),
      keywords: z.boolean(),
  }).describe("A simple checklist for resume quality.")
});
export type AnalyzeResumeOutput = z.infer<typeof AnalyzeResumeOutputSchema>;


export async function analyzeResume(input: AnalyzeResumeInput): Promise<AnalyzeResumeOutput> {
  const { candidates } = await ai.generate({
    model: googleAI.model('gemini-1.5-flash-latest'),
    prompt: `You are a helpful career coach and resume analysis expert.
    Based on the provided skills, bio, and experience level, perform a detailed analysis.

    Candidate Information:
    - Experience Level: ${input.experienceLevel}
    - Skills: ${input.skills.join(', ')}
    - Bio: ${input.bio}

    Your task is to generate a concise analysis.
    - Recommend the top 3 job roles that best match the candidate's profile. Provide a match score for each.
    - Calculate an overall "readinessScore" from 0-100.
    - Identify the top 3 gaps in their skillset for their most likely career path (gapAnalysis).
    - Suggest 2-3 actionable learning tasks to fill those gaps, including an estimated time in weeks.
    - Provide a basic resume health check (assume contact info and skills are present if bio and skills are provided, but check if project work is mentioned in the bio).
    
    Provide the output in a valid JSON format that strictly adheres to the following TypeScript type:
    
    type AnalyzeResumeOutput = {
      topRoles: Array<{ role: string; score: number; }>;
      readinessScore: number;
      gapAnalysis: Array<string>;
      suggestedLearning: Array<{ task: string; estWeeks: number; }>;
      resumeHealth: {
        contact: boolean;
        projects: boolean;
        skills: boolean;
        keywords: boolean;
      };
    }

    Do not include any markdown or formatting characters like \`\`\`json.
    `,
    config: {
      temperature: 0.3,
    }
  });

  const analysisResultText = candidates[0].output?.text;

  if (!analysisResultText) {
    throw new Error("Analysis failed to produce a valid result.");
  }

  try {
    const analysisResult = JSON.parse(analysisResultText);
    return AnalyzeResumeOutputSchema.parse(analysisResult);
  } catch (e) {
    console.error("Failed to parse analysis JSON:", e);
    throw new Error("AI returned an invalid JSON structure.");
  }
}
