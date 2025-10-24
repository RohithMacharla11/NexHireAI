
'use server';
/**
 * @fileOverview A flow to run a single code submission against its test cases.
 * It uses an AI model to evaluate the code's correctness.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { CodeExecutionResult } from '@/lib/types';

const RunCodeInputSchema = z.object({
  code: z.string().describe("The user's source code."),
  language: z.string().describe("The programming language of the code."),
  testCases: z.array(
    z.object({
      input: z.string().describe("The input for the test case."),
      expectedOutput: z.string().describe("The expected output for the test case."),
    })
  ).describe("An array of test cases to run the code against."),
});
export type RunCodeInput = z.infer<typeof RunCodeInputSchema>;

const RunCodeOutputSchema = z.array(z.object({
    status: z.enum(['Passed', 'Failed', 'Error', 'Time Limit Exceeded']).describe("The result status of the test case."),
    output: z.string().describe("The actual output from the code execution."),
    expectedOutput: z.string().optional().describe("The expected output for comparison."),
    time: z.string().describe("Simulated execution time, e.g., '52ms'."),
    memory: z.string().describe("Simulated memory usage, e.g., '1.4MB'."),
}));
export type RunCodeOutput = z.infer<typeof RunCodeOutputSchema>;


const runCodeFlow = ai.defineFlow(
  {
    name: 'runCodeFlow',
    inputSchema: RunCodeInputSchema,
    outputSchema: RunCodeOutputSchema,
  },
  async (input) => {
    
    const { output } = await ai.generate({
      prompt: `You are a code execution engine simulator. Your task is to evaluate a single code submission against its test cases and return a structured JSON object containing the results.

      Iterate through all of the provided test cases.
      - For each test case, determine if the code's output matches the expected output.
      - Set the status to 'Passed', 'Failed', or 'Error'.
      - If the submission's code has syntax errors or would likely cause a runtime error, set the status for all its test cases to 'Error' and provide a brief error message in the 'output' field.
      - Simulate a realistic execution time and memory usage for each test case.
      
      Your response MUST be a valid JSON array of test case result objects. Do not include any extra text, commentary, or markdown formatting.

      Submission to evaluate:
      ${JSON.stringify(input, null, 2)}
      `,
      output: {
        schema: RunCodeOutputSchema,
      },
      config: { 
        temperature: 0.1,
     }
    });

    if (!output) {
      // Provide a fallback error if the model completely fails to evaluate a submission
      return input.testCases.map(tc => ({
          status: 'Error',
          output: 'AI evaluation failed for this submission.',
          expectedOutput: tc.expectedOutput,
          time: '0ms',
          memory: '0MB',
      }));
    }
    
    return output;
  }
);

export async function runCode(input: RunCodeInput): Promise<RunCodeOutput> {
  return runCodeFlow(input);
}
