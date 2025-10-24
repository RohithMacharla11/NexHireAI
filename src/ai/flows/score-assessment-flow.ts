
'use server';
/**
 * @fileOverview A flow to score a completed assessment, calculate scores, and generate AI feedback.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { AssessmentAttempt, Question, UserResponse } from '@/lib/types';


// Define the input schema, which is a partial AssessmentAttempt
// We include the full questions here for the AI to reference during scoring.
const ScoreAssessmentInputSchema = z.custom<Omit<AssessmentAttempt, 'id'> & { questions: Question[] }>();


// This is the output of the flow, containing only the scored fields.
const ScoredFieldsSchema = z.object({
  finalScore: z.number(),
  skillScores: z.record(z.string(), z.number()),
  aiFeedback: z.string(),
  responses: z.array(z.custom<UserResponse>()),
});


const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// New schema for the batched scoring of short answers
const ShortAnswerScoresSchema = z.record(z.string(), z.number().min(0).max(1));

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
    
    // --- BATCH SCORING FOR SHORT ANSWERS ---
    const shortAnswerResponses = responses.filter(r => {
        const q = questions.find(q => q.id === r.questionId);
        return q?.type === 'short' && r.answer && r.answer.trim().toLowerCase() !== q.correctAnswer?.trim().toLowerCase();
    });

    let shortAnswerScores: z.infer<typeof ShortAnswerScoresSchema> = {};

    if (shortAnswerResponses.length > 0) {
        const scoringPayload = shortAnswerResponses.map(r => {
            const q = questions.find(q => q.id === r.questionId)!;
            return {
                questionId: r.questionId,
                userAnswer: r.answer,
                correctAnswer: q.correctAnswer,
            };
        });
        
        await wait(1500); // A single wait before the batch call
        const { output } = await ai.generate({
            prompt: `You are an expert AI grader. Evaluate a batch of user answers against their correct counterparts. For each item, provide a semantic similarity score from 0.0 (completely wrong) to 1.0 (perfectly correct). Respond with a JSON object mapping each questionId to its score.
            
            Batch to Score:
            ${JSON.stringify(scoringPayload, null, 2)}
            
            Your response MUST be a valid JSON object of the format: { "questionId": score, ... }`,
            output: { schema: ShortAnswerScoresSchema },
            config: { temperature: 0.2 }
        });
        
        if (output) {
            shortAnswerScores = output;
        }
    }
    // --- END BATCH SCORING ---


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
         } else if (response.answer && shortAnswerScores[response.questionId] !== undefined) {
             correctnessFactor = shortAnswerScores[response.questionId];
         } else {
             correctnessFactor = 0; // No answer or scoring failed
         }
         evaluatedResponse.isCorrect = correctnessFactor > 0.7;
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
    const finalScore = totalMaxPossibleScore > 0 ? Math.round((totalUserEarnedScore / totalMaxPossibleScore) * 100) : 0;
    
    const finalSkillScores: Record<string, number> = {};
    for (const skill in skillScores) {
      const { earned, max } = skillScores[skill];
      finalSkillScores[skill] = max > 0 ? Math.round((earned / max) * 100) : 0;
    }
    
    // Generate AI Feedback
     await wait(1500); // Add a delay before the final call
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
