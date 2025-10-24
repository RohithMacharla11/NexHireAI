
'use server';
/**
 * @fileOverview A flow to score a completed assessment, calculate scores, and generate AI feedback.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { AssessmentAttempt, Question, UserResponse } from '@/lib/types';


// Define the input schema, which is a partial AssessmentAttempt
// We include the full questions here for the AI to reference during scoring.
const ScoreAssessmentInputSchema = z.object({
  userId: z.string(),
  assessmentId: z.string(),
  roleId: z.string(),
  startedAt: z.number(),
  submittedAt: z.number(),
  responses: z.array(z.custom<UserResponse>()),
  questions: z.array(z.custom<Question>()),
});

// This is the output of the flow, containing only the scored fields.
const ScoredFieldsSchema = z.object({
  finalScore: z.number(),
  skillScores: z.record(z.string(), z.number()),
  aiFeedback: z.string(),
  responses: z.array(z.custom<UserResponse>()),
});


const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const scoreAssessmentFlow = ai.defineFlow(
  {
    name: 'scoreAssessmentFlow',
    inputSchema: ScoreAssessmentInputSchema,
    outputSchema: ScoredFieldsSchema,
  },
  async (attempt) => {
    const { questions, responses } = attempt;
    
    // Map difficulty to a weight
    const difficultyWeightMap = { Easy: 1.0, Medium: 1.5, Hard: 2.0 };
    let totalMaxPossibleScore = 0;
    let totalUserEarnedScore = 0;

    const skillScores: Record<string, { earned: number, max: number }> = {};

    const evaluatedResponses: UserResponse[] = [];
    for (const response of responses) {
      const question = questions.find(q => q.id === response.questionId);
      if (!question) {
        evaluatedResponses.push({ ...response, isCorrect: false });
        continue;
      }

      const maxQuestionScore = difficultyWeightMap[question.difficulty];
      totalMaxPossibleScore += maxQuestionScore;

      // Initialize skill score buckets
      const skillKey = question.skill || 'general';
      if (!skillScores[skillKey]) {
        skillScores[skillKey] = { earned: 0, max: 0 };
      }
      skillScores[skillKey].max += maxQuestionScore;

      let correctnessFactor = 0;
      let evaluatedResponse = { ...response };

      if (question.type === 'mcq') {
        correctnessFactor = (response.answer === question.correctAnswer) ? 1 : 0;
        evaluatedResponse.isCorrect = correctnessFactor === 1;
      } 
      else if (question.type === 'short') {
         if (response.answer?.trim().toLowerCase() === question.correctAnswer?.trim().toLowerCase()) {
            correctnessFactor = 1;
         } else if (response.answer) { // Only call AI if there is an answer
             await wait(1000); // Wait for 1 second before making the API call to avoid rate limiting
             const { output: semanticScore } = await ai.generate({
                prompt: `Evaluate if the user's answer is semantically equivalent to the correct answer. User Answer: "${response.answer}". Correct Answer: "${question.correctAnswer}". Respond with a single number between 0.0 (completely wrong) and 1.0 (perfectly correct).`,
                output: { schema: z.number().min(0).max(1).nullable() },
                config: { temperature: 0.2 }
            });
            // Handle null case from AI
            if (typeof semanticScore === 'number') {
                correctnessFactor = semanticScore;
            } else {
                correctnessFactor = 0; // Default to 0 if AI fails to return a number
            }
         } else {
             correctnessFactor = 0; // No answer provided
         }
         evaluatedResponse.isCorrect = correctnessFactor > 0.7; // Consider it "correct" if it's mostly right
      }
      else if (question.type === 'coding') {
          const totalTests = question.testCases?.length || 0;
          const passedTests = response.executionResult?.filter(r => r.status === 'Passed').length || 0;
          correctnessFactor = totalTests > 0 ? (passedTests / totalTests) : 0;
          evaluatedResponse.testCasesPassed = passedTests;
          evaluatedResponse.totalTestCases = totalTests;
          evaluatedResponse.isCorrect = correctnessFactor === 1;
      }

      const earnedScore = correctnessFactor * maxQuestionScore;
      totalUserEarnedScore += earnedScore;
      skillScores[skillKey].earned += earnedScore;
      
      evaluatedResponses.push(evaluatedResponse);
    }

    // Calculate final scores
    const finalScore = totalMaxPossibleScore > 0 ? (totalUserEarnedScore / totalMaxPossibleScore) * 100 : 0;
    
    const finalSkillScores: Record<string, number> = {};
    for (const skill in skillScores) {
      const { earned, max } = skillScores[skill];
      finalSkillScores[skill] = max > 0 ? (earned / max) * 100 : 0;
    }
    
    // Generate AI Feedback
     await wait(1000); // Add a small delay before the final call
     const { output: aiFeedback } = await ai.generate({
        prompt: `A candidate has just completed an assessment. Their final score is ${finalScore.toFixed(2)}/100.
        Their performance by skill was: ${JSON.stringify(finalSkillScores)}.
        Based on this data, provide a concise (2-3 sentences) and encouraging feedback summary for the candidate. 
        Highlight one key strength and one main area for improvement. Suggest a specific, actionable next step for them.`,
        output: { schema: z.string() },
        config: { temperature: 0.8 }
    });

    return {
      responses: evaluatedResponses,
      finalScore,
      skillScores: finalSkillScores,
      aiFeedback: aiFeedback || "Feedback could not be generated at this time.",
    };
  }
);


export async function scoreAssessment(attempt: Omit<AssessmentAttempt, 'id'> & { questions: Question[] }): Promise<z.infer<typeof ScoredFieldsSchema>> {
  const scoredData = await scoreAssessmentFlow(attempt);
  return scoredData;
}
