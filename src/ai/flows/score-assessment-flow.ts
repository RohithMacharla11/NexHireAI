
'use server';
/**
 * @fileOverview A flow to score a completed assessment and calculate scores.
 * AI feedback generation is handled separately.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { AssessmentAttempt, Question, UserResponse } from '@/lib/types';


// This is the output of the flow, containing only the scored fields.
const ScoredFieldsSchema = z.object({
  finalScore: z.number(),
  skillScores: z.record(z.string(), z.number()),
  responses: z.array(z.custom<UserResponse>()),
});

// New schema for the batched scoring of short answers.
const ShortAnswerScoresSchema = z.array(
    z.object({
        questionId: z.string().describe("The ID of the question being scored."),
        score: z.number().min(0).max(1).describe("The semantic similarity score from 0.0 to 1.0.")
    })
);


export const scoreAssessmentFlow = ai.defineFlow(
  {
    name: 'scoreAssessmentFlow',
    inputSchema: z.custom<Omit<AssessmentAttempt, 'id' | 'finalScore' | 'skillScores' | 'aiFeedback'>>(),
    outputSchema: ScoredFieldsSchema,
  },
  async (attempt) => {
    const { questions, responses } = attempt;

    if (!questions) {
      throw new Error("Questions are required for scoring.");
    }
    
    const difficultyWeightMap: Record<string, number> = { Easy: 1.0, Medium: 1.5, Hard: 2.0 };
    let totalMaxPossibleScore = 0;
    let totalUserEarnedScore = 0;

    const skillScores: Record<string, { earned: number, max: number }> = {};
    
    // --- BATCH SCORING FOR SHORT ANSWERS ---
    const shortAnswerResponses = responses.filter(r => {
        const q = questions.find(q => q.id === r.questionId);
        // Only score non-exact matches that have content
        return q?.type === 'short' && r.answer && q.correctAnswer && r.answer.trim().toLowerCase() !== q.correctAnswer.trim().toLowerCase();
    });

    const scoresMap: Record<string, number> = {};

    if (shortAnswerResponses.length > 0) {
        const scoringPayload = shortAnswerResponses.map(r => {
            const q = questions.find(q => q.id === r.questionId)!;
            return {
                questionId: r.questionId,
                userAnswer: r.answer,
                correctAnswer: q.correctAnswer,
            };
        });
        
        const { output: shortAnswerScores } = await ai.generate({
            prompt: `You are an expert AI grader. Evaluate a batch of user answers against their correct counterparts. For each item, provide a semantic similarity score from 0.0 (completely wrong) to 1.0 (perfectly correct). Respond with a JSON array of objects, where each object has a "questionId" and a "score".
            
            Batch to Score:
            ${JSON.stringify(scoringPayload, null, 2)}
            
            Your response MUST be a valid JSON array matching the specified schema.`,
            output: {
                schema: ShortAnswerScoresSchema,
            },
            config: { 
              temperature: 0.2,
            }
        });
        
        if (shortAnswerScores) {
            for (const item of shortAnswerScores) {
                scoresMap[item.questionId] = item.score;
            }
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
      if (!maxQuestionScore) {
          console.warn(`No difficulty weight found for difficulty: ${question.difficulty}`);
          continue;
      }
      totalMaxPossibleScore += maxQuestionScore;

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
         } else if (response.answer && scoresMap[response.questionId] !== undefined) {
             correctnessFactor = scoresMap[response.questionId];
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

    return {
      responses: evaluatedResponses,
      finalScore,
      skillScores: finalSkillScores,
    };
  }
);

export async function scoreAssessment(attempt: Omit<AssessmentAttempt, 'id'> & { questions: Question[] }): Promise<z.infer<typeof ScoredFieldsSchema>> {
  const scoredData = await scoreAssessmentFlow(attempt);
  return scoredData;
}
