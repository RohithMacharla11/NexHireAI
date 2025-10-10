
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      location: 'us-central1', // Specify region for model availability
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
