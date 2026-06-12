import { create } from 'zustand';

interface BetaState {
  userId: string | null;
  name: string | null;
  contactInfo: string | null;
  isRegistered: boolean;
  isLoading: boolean;
  error: string | null;
  feedbackEmoji: string | null;
  feedbackComments: string;

  // Actions
  setUserId: (id: string | null) => void;
  setProfile: (profile: { name: string | null; contact_info: string | null; isRegistered?: boolean }) => void;
  setFeedbackEmoji: (emoji: string | null) => void;
  setFeedbackComments: (comments: string) => void;
  resetFeedback: () => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBetaStore = create<BetaState>((set) => ({
  userId: null,
  name: null,
  contactInfo: null,
  isRegistered: false,
  isLoading: false,
  error: null,
  feedbackEmoji: null,
  feedbackComments: '',

  setUserId: (id) => set({ userId: id }),
  setProfile: (profile) =>
    set((state) => ({
      name: profile.name,
      contactInfo: profile.contact_info,
      isRegistered: profile.isRegistered !== undefined ? profile.isRegistered : state.isRegistered,
    })),
  setFeedbackEmoji: (emoji) => set({ feedbackEmoji: emoji }),
  setFeedbackComments: (comments) => set({ feedbackComments: comments }),
  resetFeedback: () => set({ feedbackEmoji: null, feedbackComments: '' }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
