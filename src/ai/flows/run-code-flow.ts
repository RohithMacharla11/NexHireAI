
'use server';
/**
 * @fileOverview A flow to simulate running code against test cases.
 * In a real-world scenario, this would call an external code execution API like Judge0.
 * For this simulation, it uses an AI model to evaluate the code's correctness.
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

const SingleTestCaseResultSchema = z.object({
    status: z.enum(['Passed', 'Failed', 'Error', 'Time Limit Exceeded']).describe("The result status of the test case."),
    output: z.string().describe("The actual output from the code execution."),
    expectedOutput: z.string().optional().describe("The expected output for comparison. This should be present if the status is 'Failed' or 'Error'."),
    time: z.string().describe("Simulated execution time, e.g., '52ms'."),
    memory: z.string().describe("Simulated memory usage, e.g., '1.4MB'."),
});

const RunCodeOutputSchema = z.array(SingleTestCaseResultSchema);
export type RunCodeOutput = z.infer<typeof RunCodeOutputSchema>;


const runCodeFlow = ai.defineFlow(
  {
    name: 'runCodeFlow',
    inputSchema: RunCodeInputSchema,
    outputSchema: RunCodeOutputSchema,
  },
  async (input) => {
    
    const { output } = await ai.generate({
      prompt: `You are a code execution engine simulator. Your task is to evaluate the provided code against a series of test cases and return a structured result for each.

      Language: {{{language}}}
      
      Code to evaluate:
      \`\`\`{{{language}}}
      {{{code}}}
      \`\`\`

      You MUST evaluate the code against each of the following test cases.
      - For each test case, determine if the code's output matches the expected output.
      - Set the status to 'Passed', 'Failed', or 'Error'.
      - If the code has syntax errors or would likely cause a runtime error, set the status to 'Error' and provide a brief error message in the 'output' field.
      - Simulate a realistic execution time and memory usage for each test case.
      - For every test case, you must include the original 'expectedOutput' in your result object.

      Test Cases:
      {{#each testCases}}
      - Input: {{{this.input}}}
        Expected Output: {{{this.expectedOutput}}}
      {{/each}}
      
      Your response MUST be a valid JSON array that strictly follows the output schema and nothing else. Do not include any extra text, commentary, or markdown formatting.
      `,
      output: {
        schema: RunCodeOutputSchema,
      },
      config: { temperature: 0.1 }
    });

    if (!output) {
      throw new Error('Code execution simulation failed to produce an output.');
    }

    return output;
  }
);

export async function runCode(input: RunCodeInput): Promise<RunCodeOutput> {
  return runCodeFlow(input);
}
