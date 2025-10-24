
import { create } from 'zustand';
import type { Assessment, UserResponse } from '@/lib/types';

interface AssessmentState {
  assessment: Assessment | null;
  responses: Record<string, UserResponse>;
  currentQuestionIndex: number;
  startTime: number | null;
  setAssessment: (assessment: Assessment) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  goToQuestion: (index: number) => void;
  setResponse: (questionId: string, response: Partial<UserResponse>) => void;
  reset: () => void;
}

export const useAssessmentStore = create<AssessmentState>((set, get) => ({
  assessment: null,
  responses: {},
  currentQuestionIndex: 0,
  startTime: null,

  setAssessment: (assessment) => {
    set({
      assessment,
      responses: {},
      currentQuestionIndex: 0,
      startTime: Date.now(),
    });
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
          timeTaken: 0, // Will be calculated on submission
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
  },
}));
