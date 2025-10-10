import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      location: 'us-central1',
      apiVersion: 'v1',
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
