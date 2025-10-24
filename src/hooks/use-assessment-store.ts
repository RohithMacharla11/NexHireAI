
import { create } from 'zustand';
import { useEffect, useState } from 'react';
import type { Assessment, UserResponse } from '@/lib/types';

const ASSESSMENT_STORAGE_KEY = 'nexhire-assessment-state';

interface AssessmentState {
  assessment: Assessment | null;
  responses: Record<string, Partial<UserResponse>>;
  currentQuestionIndex: number;
  startTime: number | null;
  setAssessment: (assessment: Assessment) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  goToQuestion: (index: number) => void;
  setResponse: (questionId: string, response: Partial<UserResponse>) => void;
  reset: () => void;
  isHydrated: boolean; // To check if state has been loaded from storage
  _rehydrate: () => void;
}

const useAssessmentStoreInternal = create<AssessmentState>((set, get) => ({
  assessment: null,
  responses: {},
  currentQuestionIndex: 0,
  startTime: null,
  isHydrated: false,

  setAssessment: (assessment) => {
    const initialResponses: Record<string, Partial<UserResponse>> = {};
    assessment.questions.forEach(q => {
      if (q.type === 'coding' && q.starterCode) {
        initialResponses[q.id] = { code: q.starterCode, language: 'javascript' };
      }
    });

    const newState = {
      assessment,
      responses: initialResponses,
      currentQuestionIndex: 0,
      startTime: Date.now(),
    };
    set(newState);
    localStorage.setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify(newState));
  },

  nextQuestion: () => {
    set((state) => ({
      currentQuestionIndex: Math.min(
        state.currentQuestionIndex + 1,
        (state.assessment?.questions.length ?? 1) - 1
      ),
    }));
  },

  prevQuestion: () => {
    set((state) => ({
      currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0),
    }));
  },

  goToQuestion: (index) => {
    set((state) => ({
      currentQuestionIndex: Math.max(0, Math.min(index, (state.assessment?.questions.length ?? 1) - 1)),
    }));
  },

  setResponse: (questionId, response) => {
    const { assessment } = get();
    const question = assessment?.questions.find(q => q.id === questionId);
    if (!question) return;

    set((state) => ({
      responses: {
        ...state.responses,
        [questionId]: {
          ...state.responses[questionId],
          questionId,
          skill: question.skill,
          difficulty: question.difficulty,
          ...response,
        },
      },
    }));
  },

  reset: () => {
    set({
      assessment: null,
      responses: {},
      currentQuestionIndex: 0,
      startTime: null,
    });
    localStorage.removeItem(ASSESSMENT_STORAGE_KEY);
  },

  _rehydrate: () => {
    try {
      const savedState = localStorage.getItem(ASSESSMENT_STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Dont rehydrate if the assessment is too old (e.g. > 3 hours)
        const threeHours = 3 * 60 * 60 * 1000;
        if (parsedState.startTime && (Date.now() - parsedState.startTime < threeHours)) {
           set({ ...parsedState });
        } else {
           localStorage.removeItem(ASSESSMENT_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error("Could not rehydrate assessment state from localStorage", e);
    } finally {
      set({ isHydrated: true });
    }
  },
}));

// This is the hook we'll use in our components
export const useAssessmentStore = () => {
  const store = useAssessmentStoreInternal();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!store.isHydrated) {
      store._rehydrate();
    }
  }, [store]);

  // Save to localStorage on every state change, but only on the client
  useEffect(() => {
    if (isClient && store.assessment) {
      const { assessment, responses, currentQuestionIndex, startTime } = store;
      const stateToSave = { assessment, responses, currentQuestionIndex, startTime };
      localStorage.setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [store, isClient]);

  return store;
};

// Expose the raw reset function if needed outside of React components
export const resetAssessmentStore = () => useAssessmentStoreInternal.getState().reset();
