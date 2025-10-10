
'use server';
/**
 * @fileOverview A resume analysis AI agent.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { AnalysisSummary, ExperienceLevel } from '@/lib/types';
import { googleAI } from '@genkit-ai/google-genai';

const AnalyzeResumeInputSchema = z.object({
  skills: z.array(z.string()).describe("A list of the candidate's skills."),
  bio: z.string().describe("A short bio or description from the candidate."),
  experienceLevel: z.string().describe("The candidate's stated experience level (e.g., Fresher, Intermediate, Experienced).")
});

const AnalysisSummarySchema = z.object({
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


export async function analyzeResume(input: { skills: string[], bio: string, experienceLevel: ExperienceLevel }): Promise<AnalysisSummary> {
  return analyzeResumeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeResumePrompt',
  model: googleAI.model('gemini-1.5-flash-latest'),
  input: { schema: AnalyzeResumeInputSchema },
  output: { schema: AnalysisSummarySchema },
  prompt: `You are a helpful career coach and resume analysis expert.
  Based on the provided skills, bio, and experience level, perform a detailed analysis.

  Candidate Information:
  - Experience Level: {{{experienceLevel}}}
  - Skills: {{{skills}}}
  - Bio: {{{bio}}}

  Your task is to generate a concise analysis.
  - Recommend the top 3 job roles that best match the candidate's profile. Provide a match score for each.
  - Calculate an overall "readinessScore" from 0-100.
  - Identify the top 3 gaps in their skillset for their most likely career path (gapAnalysis).
  - Suggest 2-3 actionable learning tasks to fill those gaps, including an estimated time in weeks.
  - Provide a basic resume health check (assume contact info and skills are present if bio and skills are provided, but check if project work is mentioned).
  
  Provide the output in the specified JSON format.
  `,
});

const analyzeResumeFlow = ai.defineFlow(
  {
    name: 'analyzeResumeFlow',
    inputSchema: AnalyzeResumeInputSchema,
    outputSchema: AnalysisSummarySchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("Analysis failed to produce an output.");
    }
    return output;
  }
);
