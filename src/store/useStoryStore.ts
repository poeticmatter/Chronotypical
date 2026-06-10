import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StoryState {
  // Global & Identity
  seed: string | null;
  names: {
    protagonist: string;
    partner: string;
  };
  showChronologicalAnchor: boolean;

  // Mode 1: Time Traveler Progression
  traveler: {
    readFragments: string[];
  };

  // Mode 2: Linear Partner Progression
  partner: {
    furthestReadChronologicalId: number;
  };

  // Actions
  initializeSeed: (seed: string) => void;
  setNames: (names: Partial<StoryState['names']>) => void;
  toggleChronologicalAnchor: (val: boolean) => void;
  markTravelerRead: (id: string) => void;
  updatePartnerProgress: (id: number) => void;
  resetProgress: () => void;
}

const initialState = {
  seed: null,
  names: {
    protagonist: '',
    partner: '',
  },
  showChronologicalAnchor: false,
  traveler: {
    readFragments: [],
  },
  partner: {
    furthestReadChronologicalId: -1, // Initialize to -1 to start at 0
  },
};

export const useStoryStore = create<StoryState>()(
  persist(
    (set) => ({
      ...initialState,
      initializeSeed: (seed) => set({ seed }),
      setNames: (names) =>
        set((state) => ({
          names: { ...state.names, ...names },
        })),
      toggleChronologicalAnchor: (val) => set({ showChronologicalAnchor: val }),
      markTravelerRead: (id) =>
        set((state) => ({
          traveler: {
            ...state.traveler,
            // Prevent duplicates
            readFragments: state.traveler.readFragments.includes(id)
              ? state.traveler.readFragments
              : [...state.traveler.readFragments, id],
          },
        })),
      updatePartnerProgress: (id) =>
        set((state) => ({
          partner: {
            ...state.partner,
            furthestReadChronologicalId: Math.max(
              state.partner.furthestReadChronologicalId,
              id
            ),
          },
        })),
      resetProgress: () =>
        set({
          traveler: initialState.traveler,
          partner: initialState.partner,
        }),
    }),
    {
      name: 'microfiction-engine-storage',
    }
  )
);
