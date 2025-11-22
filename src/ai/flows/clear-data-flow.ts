
'use server';
/**
 * @fileoverview A flow to completely wipe specified collections from Firestore.
 * This is a dangerous operation and should only be used for development/testing.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { initializeFirebaseForServer } from '@/firebase/server-init';

const collectionsToDelete = ['users', 'roles', 'assessments', 'questionBank', 'cohorts'];

export const clearDataFlow = ai.defineFlow(
  {
    name: 'clearDataFlow',
    inputSchema: z.void(),
    outputSchema: z.object({
        deletedCounts: z.record(z.number()),
        status: z.string(),
    }),
  },
  async () => {
    const { firestore } = initializeFirebaseForServer();
    const deletedCounts: Record<string, number> = {};
    
    console.log(`Starting data wipe for collections: ${collectionsToDelete.join(', ')}`);

    for (const collectionName of collectionsToDelete) {
        const collectionRef = collection(firestore, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        if (snapshot.empty) {
            deletedCounts[collectionName] = 0;
            continue;
        }

        const batchSize = 500;
        let deletedCount = 0;
        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
            const batch = writeBatch(firestore);
            const chunk = snapshot.docs.slice(i, i + batchSize);
            chunk.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            deletedCount += chunk.length;
        }
        deletedCounts[collectionName] = deletedCount;
        console.log(`Deleted ${deletedCount} documents from ${collectionName}.`);
    }

    return {
      deletedCounts,
      status: 'Completed',
    };
  }
);

export async function clearAllData(): Promise<z.infer<typeof clearDataFlow.outputSchema>> {
  return clearDataFlow();
}
