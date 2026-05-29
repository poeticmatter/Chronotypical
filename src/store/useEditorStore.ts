import { create } from 'zustand';
import type { FragmentMetadata } from '../types';

export interface EditorFragment {
  id: string;
  metadata: FragmentMetadata;
  content: string;
}

interface EditorState {
  fragments: EditorFragment[];
  activeFragmentId: string | null;
  isSaving: boolean;

  fetchFragments: () => Promise<void>;
  saveFragment: (id: string, metadata: FragmentMetadata, content: string) => Promise<void>;
  setActiveFragment: (id: string) => void;
  createTemporaryFragment: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  fragments: [],
  activeFragmentId: null,
  isSaving: false,

  fetchFragments: async () => {
    try {
      const res = await fetch('/api/fragments');
      const data = await res.json();
      set({ fragments: data });
    } catch (error) {
      console.error('Failed to fetch fragments:', error);
    }
  },

  saveFragment: async (id: string, metadata: FragmentMetadata, content: string) => {
    set({ isSaving: true });
    try {
      await fetch(`/api/fragments/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata, content }),
      });
      // Refresh the list after saving
      await get().fetchFragments();
    } catch (error) {
      console.error('Failed to save fragment:', error);
    } finally {
      set({ isSaving: false });
    }
  },

  setActiveFragment: (id: string) => set({ activeFragmentId: id }),

  createTemporaryFragment: () => {
    const { fragments } = get();
    // Find highest chronological order
    const maxOrder = fragments.reduce((max, f) => Math.max(max, f.metadata.chronological_order), 0);
    const newOrder = maxOrder + 1;
    const newId = `frag-${newOrder.toString().padStart(3, '0')}`;

    const tempFragment: EditorFragment = {
      id: 'NEW', // Used just to trigger a distinct local state
      metadata: {
        id: newId,
        chronological_order: newOrder,
        requires: [],
        required_pool_count: 0,
        tags: [],
        warnings: []
      },
      content: ''
    };

    set({
      fragments: [...fragments, tempFragment],
      activeFragmentId: 'NEW'
    });
  }
}));
