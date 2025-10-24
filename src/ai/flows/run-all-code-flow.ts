
'use server';
/**
 * @fileOverview A flow to run a batch of code submissions against their test cases.
 * It uses an AI model to evaluate the code's correctness for all submissions in a single call.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { CodeExecutionResult } from '@/lib/types';

// Defines a single code submission within the batch
const CodeSubmissionSchema = z.object({
  questionId: z.string(),
  code: z.string().describe("The user's source code."),
  language: z.string().describe("The programming language of the code."),
  testCases: z.array(
    z.object({
      input: z.string().describe("The input for the test case."),
      expectedOutput: z.string().describe("The expected output for the test case."),
    })
  ).describe("An array of test cases to run the code against."),
});

// The input for the main flow is an array of submissions
const RunAllCodeInputSchema = z.object({
    submissions: z.array(CodeSubmissionSchema),
});
export type RunAllCodeInput = z.infer<typeof RunAllCodeInputSchema>;

// The output schema for a single test case result
const SingleTestCaseResultSchema = z.object({
    status: z.enum(['Passed', 'Failed', 'Error', 'Time Limit Exceeded']).describe("The result status of the test case."),
    output: z.string().describe("The actual output from the code execution."),
    expectedOutput: z.string().optional().describe("The expected output for comparison."),
    time: z.string().describe("Simulated execution time, e.g., '52ms'."),
    memory: z.string().describe("Simulated memory usage, e.g., '1.4MB'."),
});

// The output schema for a single submission's results
const SingleSubmissionResultSchema = z.array(SingleTestCaseResultSchema);

// The final output of the flow is a record mapping questionId to its results
const RunAllCodeOutputSchema = z.record(z.string(), SingleSubmissionResultSchema);
export type RunAllCodeOutput = z.infer<typeof RunAllCodeOutputSchema>;


const runAllCodeFlow = ai.defineFlow(
  {
    name: 'runAllCodeFlow',
    inputSchema: RunAllCodeInputSchema,
    outputSchema: RunAllCodeOutputSchema,
  },
  async ({ submissions }) => {
    
    const { output } = await ai.generate({
      prompt: `You are a code execution engine simulator. Your task is to evaluate a batch of code submissions against their respective test cases and return a structured JSON object containing the results for each submission.

      You MUST evaluate each submission independently. For each submission, iterate through all of its test cases.
      - For each test case, determine if the code's output matches the expected output.
      - Set the status to 'Passed', 'Failed', or 'Error'.
      - If a submission's code has syntax errors or would likely cause a runtime error, set the status for all its test cases to 'Error' and provide a brief error message in the 'output' field.
      - Simulate a realistic execution time and memory usage for each test case.
      
      Your response MUST be a valid JSON object where the keys are the 'questionId' from the input submissions, and the values are an array of test case result objects for that submission. Do not include any extra text, commentary, or markdown formatting.

      Submissions to evaluate:
      ${JSON.stringify(submissions, null, 2)}
      `,
      output: {
        schema: RunAllCodeOutputSchema,
      },
      config: { 
        temperature: 0.1,
     }
    });

    if (!output) {
      throw new Error('Code execution simulation failed to produce an output.');
    }

    // Ensure all submissions have an entry in the output, even if the model missed them
    const finalOutput: RunAllCodeOutput = {};
    for (const sub of submissions) {
        if (output[sub.questionId]) {
            finalOutput[sub.questionId] = output[sub.questionId];
        } else {
            // Provide a fallback error if the model completely failed to evaluate a submission
            finalOutput[sub.questionId] = sub.testCases.map(tc => ({
                status: 'Error',
                output: 'AI evaluation failed for this submission.',
                expectedOutput: tc.expectedOutput,
                time: '0ms',
                memory: '0MB',
            }));
        }
    }

    return finalOutput;
  }
);

export async function runAllCode(input: RunAllCodeInput): Promise<RunAllCodeOutput> {
  return runAllCodeFlow(input);
}
