
'use server';
/**
 * @fileOverview A flow to dynamically generate a 30-question assessment for a given role.
 * This flow now orchestrates the generation and saving of questions.
 */
import { getFirestore, doc, getDoc, collection, writeBatch, getDocs, query, limit } from 'firebase/firestore';
import { initializeFirebaseForServer } from '@/firebase/server-init';
import type { Question, Role, Assessment } from '@/lib/types';
import { generateAssessmentQuestions } from './generate-assessment-questions-flow';

/**
 * Checks for existing questions or generates new ones, then assembles an assessment.
 * @param roleId The Firestore ID of the role.
 * @returns An Assessment object.
 */
export async function generateAssessment(roleId: string): Promise<Assessment> {
    const { firestore } = initializeFirebaseForServer();
    
    // 1. Fetch the role document
    const roleRef = doc(firestore, 'roles', roleId);
    const roleSnap = await getDoc(roleRef);
    if (!roleSnap.exists()) {
      throw new Error(`Role with ID ${roleId} not found.`);
    }
    const roleData = roleSnap.data() as Role;
    const { subSkills, name: roleName } = roleData;
    const questionsCollectionRef = collection(firestore, 'roles', roleId, 'questions');

    // 2. Check if enough questions already exist for this role
    const existingQuestionsQuery = query(questionsCollectionRef, limit(30));
    const existingQuestionsSnap = await getDocs(existingQuestionsQuery);
    
    let allQuestions: Question[] = [];

    if (existingQuestionsSnap.size >= 30) {
      // Questions exist, fetch them
      console.log(`Found existing questions for role: ${roleName}`);
      existingQuestionsSnap.forEach((doc) => {
        allQuestions.push({ id: doc.id, ...doc.data() } as Question);
      });
    } else {
      // Questions do NOT exist, generate and save them
      console.log(`No questions found for role: ${roleName}. Generating new questions...`);
      
      const generatedQuestions = await generateAssessmentQuestions({ roleName, subSkills });

      if (!generatedQuestions || generatedQuestions.length < 30) {
        throw new Error(`AI failed to generate the required number of questions.`);
      }
      
      const batch = writeBatch(firestore);
      // Save all generated questions to Firestore and collect their new IDs
      for (const qData of generatedQuestions) {
        const questionDocRef = doc(questionsCollectionRef);
        batch.set(questionDocRef, qData);
        allQuestions.push({ id: questionDocRef.id, ...qData });
      }

      await batch.commit();
      console.log(`Successfully generated and saved ${generatedQuestions.length} questions for role: ${roleName}`);
    }

    // 3. Assemble and return the final assessment object
    const totalTimeLimit = allQuestions.reduce((acc, q) => acc + q.timeLimit, 0);
    const assessment: Assessment = {
        id: `assessment_${roleId}_${Date.now()}`,
        roleId: roleId,
        roleName: roleName,
        questions: allQuestions,
        totalTimeLimit,
    };
    
    return assessment;
}
