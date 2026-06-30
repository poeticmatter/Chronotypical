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
  saveFragmentsBatch: (updates: { id: string; metadata: FragmentMetadata; content: string }[]) => Promise<void>;
  deleteFragment: (id: string) => Promise<void>;
  setActiveFragment: (id: string) => void;
  createTemporaryFragment: (defaultStage?: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  fragments: [],
  activeFragmentId: null,
  isSaving: false,

  fetchFragments: async () => {
    try {
      const res = await fetch(`/api/fragments?_t=${Date.now()}`);
      const data = await res.json();
      set({ fragments: data });
    } catch (error) {
      console.error('Failed to fetch fragments:', error);
    }
  },

  saveFragment: async (id: string, metadata: FragmentMetadata, content: string) => {
    set({ isSaving: true });
    const targetId = id === 'NEW' ? metadata.id : id;
    try {
      await fetch(`/api/fragments/${targetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata, content }),
      });
      // Refresh the list after saving
      await get().fetchFragments();
      // If we saved a new fragment, update activeFragmentId
      if (get().activeFragmentId === 'NEW' || get().activeFragmentId === id) {
        set({ activeFragmentId: targetId });
      }
    } catch (error) {
      console.error('Failed to save fragment:', error);
    } finally {
      set({ isSaving: false });
    }
  },

  saveFragmentsBatch: async (updates) => {
    set({ isSaving: true });
    try {
      await fetch('/api/fragments/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      await get().fetchFragments();
    } catch (error) {
      console.error('Failed to batch save fragments:', error);
    } finally {
      set({ isSaving: false });
    }
  },

  deleteFragment: async (id: string) => {
    // For unsaved new fragments, just remove them from local state
    if (id === 'NEW') {
      set(state => ({
        fragments: state.fragments.filter(f => f.id !== 'NEW'),
        activeFragmentId: null,
      }));
      return;
    }
    try {
      await fetch(`/api/fragments/${id}`, { method: 'DELETE' });
      set(state => ({
        fragments: state.fragments.filter(f => f.id !== id),
        activeFragmentId: state.activeFragmentId === id ? null : state.activeFragmentId,
      }));
    } catch (error) {
      console.error('Failed to delete fragment:', error);
    }
  },

  setActiveFragment: (id: string) => set({ activeFragmentId: id }),

  createTemporaryFragment: (defaultStage?: string) => {
    const { fragments } = get();
    // Find highest chronological order
    const maxOrder = fragments.reduce((max, f) => Math.max(max, f.metadata.chronological_order), 0);
    const newOrder = maxOrder + 1;
    const newId = `frag-${newOrder.toString().padStart(3, '0')}`;

    const tempFragment: EditorFragment = {
      id: 'NEW', // Used just to trigger a distinct local state
      metadata: {
        id: newId,
        title: '',
        chronological_order: newOrder,
        tags: [],
        warnings: [],
        stage: defaultStage || ''
      },
      content: ''
    };

    set({
      fragments: [...fragments, tempFragment],
      activeFragmentId: 'NEW'
    });
  }
}));
