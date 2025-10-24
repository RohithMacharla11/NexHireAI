
'use server';
/**
 * @fileOverview A flow to score a completed assessment, calculate scores, and generate feedback.
 * This flow follows a robust, multi-stage process to minimize AI calls and prevent errors.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { AssessmentAttempt, UserResponse, Question } from '@/lib/types';


// Schema for Prompt A (Scoring Short Answers)
const ShortAnswerScoreSchema = z.array(
    z.object({
        questionId: z.string(),
        score: z.number().int().min(0).max(100).describe("Integer 0-100, percentage correctness"),
        explain: z.string().describe("Short string explanation (max 40 words)"),
    })
);

// Schema for Prompt B (Generating Final Feedback)
const FinalFeedbackSchema = z.object({
  overall: z.string().describe("One- or two-sentence overall feedback string"),
  skills: z.array(
    z.object({
      skill: z.string(),
      score: z.union([z.number(), z.string()]),
      advice: z.string().describe("Short action item, max 10 words"),
    })
  ),
  suggestions: z.array(z.string()).length(3).describe("Three concise study/practice suggestions, max 10 words each"),
});


export const scoreAssessmentFlow = ai.defineFlow(
  {
    name: 'scoreAssessmentFlow',
    inputSchema: z.custom<AssessmentAttempt>(),
    outputSchema: z.custom<AssessmentAttempt>(),
  },
  async (attempt) => {
    const { questions, responses } = attempt;
    if (!questions || !responses) throw new Error("Questions and responses are required for scoring.");

    // --- Defensive Data Handling & Helpers ---
    const toSafeString = (v: any) => (v === undefined || v === null ? "" : String(v));
    const isNonEmptyString = (s?: any) => typeof s === "string" && s.trim().length > 0;

    // --- 1. Combine questions and user responses, then filter by type ---
    const combinedData = responses.map(res => {
        const question = questions.find(q => q.id === res.questionId);
        return { ...question, ...res };
    }) as (Question & UserResponse)[];
    
    const mcqs = combinedData.filter(q => q.type === 'mcq');
    const codingQs = combinedData.filter(q => q.type === 'coding');
    const shortQs = combinedData.filter(q => q.type === 'short' && isNonEmptyString(q.answer) && isNonEmptyString(q.correctAnswer));


    // --- 2. Score deterministic questions (MCQs & Coding) ---
    const mcqScores = mcqs.map(q => {
        const userAnswer = toSafeString(q.answer).trim().toLowerCase();
        const correctAnswer = toSafeString(q.correctAnswer).trim().toLowerCase();
        const earned = (userAnswer === "" ? 0 : (userAnswer === correctAnswer ? 1 : 0));
        return { questionId: q.id!, skill: q.skill, earned, max: 1, isCorrect: earned === 1 };
    });

    const codingScores = codingQs.map(q => {
        const passed = Number(q.testCasesPassed ?? 0);
        const total = Number(q.totalTestCases ?? (q.testCases?.length || 0)) || 0;
        const earned = total > 0 ? Math.max(0, Math.min(1, passed / total)) : 0;
        return { questionId: q.id!, skill: q.skill, earned, max: 1, isCorrect: earned === 1, passed, total };
    });

    // --- 3. Score short answers via AI (Prompt A), only if they exist ---
    let shortAnswerScores: { questionId: string; skill: string; earned: number; max: number; isCorrect: boolean }[] = [];
    let shortAnswerSummary = "Not available";

    if (shortQs.length > 0) {
        const shortPayload = shortQs.map(q => ({
            questionId: toSafeString(q.id),
            questionText: toSafeString(q.questionText),
            correctAnswer: toSafeString(q.correctAnswer!),
            userAnswer: toSafeString(q.answer!),
        }));

        const promptA = `You are a strict grader for short-answer questions.
Input: a JSON array named SHORT_ANSWERS where each element is:
{
  "questionId": "<string>",
  "questionText": "<string>",
  "correctAnswer": "<string>",
  "userAnswer": "<string>"
}
Return: a JSON array with the same length where each element is:
{
  "questionId": "<string>",
  "score": <number>,
  "explain": "<short explanation (max 40 words)>"
}
Requirements:
- Score MUST be an integer between 0 and 100.
- If userAnswer exactly matches correctAnswer (case-insensitive, trimmed), return score 100.
- Otherwise evaluate concisely and assign a proportionate integer score.
- Output ONLY valid JSON array — nothing else.

SHORT_ANSWERS: ${JSON.stringify(shortPayload)}
`;
        let aiShortScores: z.infer<typeof ShortAnswerScoreSchema> | null = null;
        try {
            const { output } = await ai.generate({
                prompt: promptA,
                output: { schema: ShortAnswerScoreSchema },
                config: { temperature: 0.2 },
            });
            aiShortScores = output;
        } catch (e) {
            console.error("AI call for short answer scoring failed:", e);
        }
        
        if (aiShortScores) {
            const shortScoresMap = new Map(aiShortScores.map(s => [s.questionId, s.score]));
            shortAnswerScores = shortQs.map(q => {
                const score = shortScoresMap.get(q.id!) ?? 0;
                return {
                    questionId: q.id!,
                    skill: q.skill,
                    earned: score / 100, // Normalize to 0-1
                    max: 1,
                    isCorrect: score > 70, // Consider >70% as correct
                };
            });
            const avgShortScore = Math.round((shortAnswerScores.reduce((acc, s) => acc + (s.earned * 100), 0) / shortAnswerScores.length));
            shortAnswerSummary = `Total short answers: ${shortQs.length}, average score: ${avgShortScore}%`;
        }
    }
     
    // --- 4. Aggregate all scores by skill ---
    const skillMap = new Map<string, { earnedSum: number; maxSum: number }>();
    const addScore = (skill: string, earned: number, max: number) => {
        const s = skillMap.get(skill) ?? { earnedSum: 0, maxSum: 0 };
        s.earnedSum += earned;
        s.maxSum += max;
        skillMap.set(skill, s);
    };

    [...mcqScores, ...codingScores, ...shortAnswerScores].forEach(s => addScore(s.skill, s.earned, s.max));

    // --- 5. Build the final, clean skillScores object for the AI prompt ---
    const finalSkillScores: Record<string, number | "Not available"> = {};
    for (const [skill, { earnedSum, maxSum }] of skillMap.entries()) {
        finalSkillScores[skill] = maxSum > 0 ? Math.round((earnedSum / maxSum) * 100) : "Not available";
    }
    const finalSkillScoresForPrompt = Object.keys(finalSkillScores).length ? finalSkillScores : "Not available";

    // --- 6. Build summary strings for final feedback prompt (Prompt B) ---
    const mcqSummary = `Total MCQs: ${mcqs.length}, Correct: ${mcqScores.filter(s => s.earned === 1).length}`;
    const codingAvgPassRate = codingScores.length > 0
        ? Math.round((codingScores.reduce((sum, q) => sum + (q.passed / (q.total || 1)), 0) / codingScores.length) * 100)
        : 0;
    const codingSummary = `Total coding questions: ${codingScores.length}, avg_pass_rate: ${codingAvgPassRate}%`;

    const finalPromptText = `FINAL_SKILL_SCORES: ${JSON.stringify(finalSkillScoresForPrompt)}
MCQ_SUMMARY: ${mcqSummary}
CODING_SUMMARY: ${codingSummary}
SHORT_ANSWERS_SUMMARY: ${shortAnswerSummary}

TASK:
1) Return a short overall feedback paragraph (one or two sentences).
2) For each skill in FINAL_SKILL_SCORES, return a bullet with the skill name, its score, and one short action item (max 10 words) to improve.
3) Provide 3 concise study/practice suggestions across skills (each max 10 words).

OUTPUT FORMAT:
Return a JSON object exactly matching:
{
  "overall": "<one- or two-sentence string>",
  "skills": [
    {"skill": "<name>", "score": <number_or_string>, "advice": "<string>"},
    ...
  ],
  "suggestions": ["<string>", "<string>", "<string>"]
}

Rules:
- If a skill value is the string "Not available", pass it through as a string.
- Scores that are numbers must be numbers (not strings).
- Output ONLY valid JSON — nothing else.
`;
    let aiFeedback: z.infer<typeof FinalFeedbackSchema> | null = null;
    try {
        const { output } = await ai.generate({
            prompt: finalPromptText,
            output: { schema: FinalFeedbackSchema },
            config: { temperature: 0.8 },
        });
        aiFeedback = output;
    } catch(e) {
        console.error("AI call for final feedback failed:", e);
    }
    

    // --- 7. Assemble final response object ---
    const totalEarned = [...mcqScores, ...codingScores, ...shortAnswerScores].reduce((acc, s) => acc + s.earned, 0);
    const totalMax = [...mcqScores, ...codingScores, ...shortAnswerScores].reduce((acc, s) => acc + s.max, 0);
    const finalScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
    
    // Combine all correctness flags into a map for easy lookup
    const correctnessMap = new Map<string, boolean>();
    [...mcqScores, ...codingScores, ...shortAnswerScores].forEach(s => {
        correctnessMap.set(s.questionId, s.isCorrect);
    });
    
    // Update original responses with `isCorrect` flag
    const evaluatedResponses = responses.map(resp => ({
        ...resp,
        isCorrect: correctnessMap.get(resp.questionId) ?? false,
    }));

    return {
      ...attempt,
      responses: evaluatedResponses,
      finalScore,
      skillScores: finalSkillScores,
      aiFeedback,
    };
  }
);

export async function scoreAssessment(attempt: AssessmentAttempt): Promise<AssessmentAttempt> {
    const scoredData = await scoreAssessmentFlow(attempt);
    return scoredData;
}
