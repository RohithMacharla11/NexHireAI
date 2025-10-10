
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// This constant should be initialized directly.
// The previous logic with memoization and 'use server' was causing errors.
export const ai = genkit({
  plugins: [googleAI({ apiVersion: 'v1' })],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
