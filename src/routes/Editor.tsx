import { useEffect, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import type { EditorFragment } from '../store/useEditorStore';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import { FeedbackDashboard } from '../components/FeedbackDashboard';

export function Editor() {
  const store = useEditorStore();
  const { fetchFragments } = store;

  // Load fragments on mount
  useEffect(() => {
    fetchFragments();
  }, [fetchFragments]);

  // Sort fragments chronologically for sequential review
  const sortedFragments = [...store.fragments].sort((a, b) =>
    a.metadata.chronological_order - b.metadata.chronological_order
  );

  // Initialize active fragment if none is selected
  useEffect(() => {
    if (sortedFragments.length > 0 && !store.activeFragmentId) {
      const firstUnreviewed = sortedFragments.find(f => !f.metadata.reviewed);
      if (firstUnreviewed) {
        store.setActiveFragment(firstUnreviewed.id);
      } else {
        store.setActiveFragment(sortedFragments[0].id);
      }
    }
  }, [sortedFragments, store.activeFragmentId, store]);

  const activeFragment = store.fragments.find(f => f.id === store.activeFragmentId);
  const activeIndex = sortedFragments.findIndex(f => f.id === store.activeFragmentId);

  // Reset Progress States
  const [isResetting, setIsResetting] = useState(false);
  const [resetProgress, setResetProgress] = useState(0);

  // Editor Mode State
  const [editorMode, setEditorMode] = useState<'write' | 'reorder' | 'feedback'>('write');

  // Reset all reviewed flags to false in batches
  const handleStartOver = async () => {
    if (!confirm("Are you sure you want to reset the reviewed state on all fragments and start over?")) {
      return;
    }
    setIsResetting(true);
    setResetProgress(0);
    try {
      const total = sortedFragments.length;
      const batchSize = 15;
      
      for (let i = 0; i < total; i += batchSize) {
        const batch = sortedFragments.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (frag) => {
            const updatedMetadata = { ...frag.metadata, reviewed: false };
            await fetch(`/api/fragments/${frag.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ metadata: updatedMetadata, content: frag.content }),
            });
          })
        );
        setResetProgress(Math.min(100, Math.round(((i + batch.length) / total) * 100)));
      }
      
      // Sync store once
      await store.fetchFragments();
      // Set to first fragment
      if (sortedFragments.length > 0) {
        store.setActiveFragment(sortedFragments[0].id);
      }
    } catch (err) {
      console.error("Failed to reset reviewed states:", err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Reset Progress Modal Overlay */}
      <AnimatePresence>
        {isResetting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full space-y-6 text-center">
              <div className="relative w-24 h-24 mx-auto">
                {/* Spinner */}
                <div className="absolute inset-0 border-4 border-slate-800 rounded-full" />
                <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-indigo-400">
                  {resetProgress}%
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-wide">Resetting Reviewed State</h3>
                <p className="text-sm text-slate-400">Clearing review metadata on all fragments...</p>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-300 ease-out" 
                  style={{ width: `${resetProgress}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 tracking-wider text-lg uppercase">
            Chronotypical
          </span>
          <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-[10px] text-indigo-400 uppercase font-semibold tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Dev Workshop
          </span>
        </div>

        {/* Navigation & Mode Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 shadow-inner">
            <button
              onClick={() => setEditorMode('write')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                editorMode === 'write'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Write
            </button>
            <button
              onClick={() => setEditorMode('reorder')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                editorMode === 'reorder'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Reorder
            </button>
            <button
              onClick={() => setEditorMode('feedback')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                editorMode === 'feedback'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Feedback
            </button>
          </div>
          
          {editorMode === 'write' && (
            <div className="flex items-center gap-3 bg-slate-950/60 px-4 py-2 rounded-full border border-slate-800/80 shadow-inner">
              <NavigationArrows 
                store={store} 
                sortedFragments={sortedFragments} 
                activeIndex={activeIndex} 
                activeFragment={activeFragment} 
              />
            </div>
          )}
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3">
          <a
            href="/partner"
            className="text-xs bg-slate-800/50 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700/50 transition-colors"
          >
            Chronological Mode
          </a>
          <a
            href="/traveler"
            className="text-xs bg-slate-800/50 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700/50 transition-colors"
          >
            Traveler Mode
          </a>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={() => handleStartOver()}
            className="text-xs bg-red-950/30 hover:bg-red-900/40 text-red-400 px-3 py-1.5 rounded-lg border border-red-900/30 transition-all cursor-pointer font-medium"
            title="Reset review status on all fragments and return to first fragment"
          >
            Start Over
          </button>
        </div>
      </header>

      {/* Editor Body */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-8">
        {editorMode === 'reorder' ? (
          <StageReorderer store={store} setEditorMode={setEditorMode} />
        ) : editorMode === 'feedback' ? (
          <FeedbackDashboard />
        ) : activeFragment ? (
          <EditorForm
            key={activeFragment.id} // Re-mounts form on active index change
            fragment={activeFragment}
            allFragments={sortedFragments}
            store={store}
          />
        ) : (
          <div className="h-96 flex flex-col items-center justify-center text-slate-400 space-y-4 border border-dashed border-slate-800 rounded-2xl">
            <svg className="w-8 h-8 text-slate-600 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <p className="text-sm italic">Loading narrative engine fragments...</p>
          </div>
        )}
      </main>
    </div>
  );
}

// Separate helper component for Header Navigation
function NavigationArrows({ 
  store, 
  sortedFragments, 
  activeIndex,
  activeFragment
}: { 
  store: any, 
  sortedFragments: EditorFragment[], 
  activeIndex: number,
  activeFragment?: EditorFragment
}) {
  const [isNavigating, setIsNavigating] = useState(false);

  // Auto-save wrapper before changing fragments
  const navigateWithAutoSave = async (targetId: string) => {
    if (isNavigating) return;
    setIsNavigating(true);

    try {
      // Find current state elements in EditorForm via dispatcher or compare elements if we can.
      // Since we want to save local form edits, we can dispatch a custom event
      // that the active form listens to and saves before we change the active ID.
      const saveEvent = new CustomEvent('editor-autosave');
      window.dispatchEvent(saveEvent);

      // Give a tiny tick for saving to resolve
      await new Promise(resolve => setTimeout(resolve, 50));
      store.setActiveFragment(targetId);
    } catch (err) {
      console.error("Auto-save failed during navigation", err);
    } finally {
      setIsNavigating(false);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      navigateWithAutoSave(sortedFragments[activeIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (activeIndex < sortedFragments.length - 1) {
      navigateWithAutoSave(sortedFragments[activeIndex + 1].id);
    }
  };

  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < sortedFragments.length - 1;

  return (
    <div className="flex items-center gap-4 text-sm select-none">
      <button
        onClick={handlePrev}
        disabled={!hasPrev || isNavigating}
        className={`p-1.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
          hasPrev && !isNavigating ? 'text-indigo-400 hover:bg-slate-800' : 'text-slate-600 cursor-not-allowed opacity-50'
        }`}
        title="Previous fragment (Auto-saves)"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>

      <div className="font-semibold text-slate-300 min-w-32 text-center text-xs tracking-wider uppercase">
        {activeFragment?.id === 'NEW' ? (
          <span className="text-emerald-400 font-extrabold">New Fragment</span>
        ) : (
          <>
            Fragment <span className="text-indigo-400">{activeIndex + 1}</span> of {sortedFragments.length}
          </>
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={!hasNext || isNavigating}
        className={`p-1.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
          hasNext && !isNavigating ? 'text-indigo-400 hover:bg-slate-800' : 'text-slate-600 cursor-not-allowed opacity-50'
        }`}
        title="Next fragment (Auto-saves)"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  );
}

// Inner Form component
function EditorForm({ 
  fragment, 
  allFragments, 
  store 
}: { 
  fragment: EditorFragment, 
  allFragments: EditorFragment[], 
  store: any
}) {
  const [metadata, setMetadata] = useState(fragment.metadata);
  const [content, setContent] = useState(fragment.content);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  const [searchTagQuery, setSearchTagQuery] = useState('');
  const [tagsInput, setTagsInput] = useState((fragment.metadata.tags || []).join(', '));
  const [isTagsFocused, setIsTagsFocused] = useState(false);

  // Compile tag frequencies across the system
  const tagFrequencies = allFragments.reduce((acc, f) => {
    const tags = f.metadata.tags || [];
    tags.forEach(t => {
      if (t) {
        acc[t] = (acc[t] || 0) + 1;
      }
    });
    return acc;
  }, {} as Record<string, number>);

  // Sort tags by frequency (most common first)
  const sortedCommonTags = Object.entries(tagFrequencies)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  // Autocomplete suggestions
  const lastCommaIndex = tagsInput.lastIndexOf(',');
  const currentTagSearch = lastCommaIndex === -1 ? tagsInput.trim() : tagsInput.slice(lastCommaIndex + 1).trim();
  const suggestions = currentTagSearch
    ? sortedCommonTags.filter(tag =>
        tag.toLowerCase().includes(currentTagSearch.toLowerCase()) &&
        !(metadata.tags || []).includes(tag)
      )
    : [];

  const selectSuggestion = (tag: string) => {
    const parts = tagsInput.split(',').map(s => s.trim());
    if (parts.length > 0) {
      parts[parts.length - 1] = tag;
    } else {
      parts.push(tag);
    }
    const updatedTags = parts.filter(Boolean);
    const newTagsInput = updatedTags.join(', ') + ', ';
    
    setTagsInput(newTagsInput);
    setMetadata(prev => ({ ...prev, tags: updatedTags }));
  };

  const toggleRecommendedTag = (tag: string) => {
    setMetadata(prev => {
      const currentTags = prev.tags || [];
      const isSelected = currentTags.includes(tag);
      const updatedTags = isSelected
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag];

      setTagsInput(updatedTags.join(', '));
      return { ...prev, tags: updatedTags };
    });
  };

  const handleTagsInputChange = (val: string) => {
    setTagsInput(val);
    const arr = val.split(',').map(s => s.trim()).filter(Boolean);
    setMetadata(prev => ({ ...prev, tags: arr }));
  };

  const STAGES = ['before', 'courting', 'partnered', 'married', 'pregnancy', 'parenting-young', 'parenting-teen', 'later'];

  const stageOptions = [
    { value: '', label: 'Select Stage (None)' },
    ...STAGES.map(stage => ({
      value: stage,
      label: stage.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }))
  ];

  // Values from local state vs initial fragment props to determine dirty state
  const isDirty = JSON.stringify(metadata) !== JSON.stringify(fragment.metadata) || content !== fragment.content;

  // Listen to auto-save requests dispatched by navigation arrows
  useEffect(() => {
    const handleAutosaveEvent = async () => {
      if (isDirty) {
        await store.saveFragment(metadata.id, metadata, content);
      }
    };
    window.addEventListener('editor-autosave', handleAutosaveEvent);
    return () => {
      window.removeEventListener('editor-autosave', handleAutosaveEvent);
    };
  }, [isDirty, metadata, content, store]);

  // Clean tags and warnings array from string
  const handleListInput = (key: 'tags' | 'warnings', value: string) => {
    const arr = value.split(',').map(s => s.trim()).filter(Boolean);
    setMetadata(prev => ({ ...prev, [key]: arr }));
  };

  const handleRequiresInput = (value: string) => {
    const arr = value.split(',').map(s => s.trim()).filter(Boolean);
    setMetadata(prev => ({ ...prev, requires: arr }));
  };

  // Compile all unique tags in the system for tag-based requires selection
  const allTagsInSystem = Array.from(
    new Set(allFragments.flatMap(f => f.metadata.tags || []))
  ).filter(Boolean).sort();

  const toggleRequireTag = (tag: string) => {
    setMetadata(prev => {
      const currentRequires = prev.requires || [];
      const isSelected = currentRequires.includes(tag);
      return {
        ...prev,
        requires: isSelected
          ? currentRequires.filter(t => t !== tag)
          : [...currentRequires, tag]
      };
    });
  };

  // Save changes and navigate to next chronological fragment
  const handleNextChronological = async () => {
    if (isDirty) {
      await store.saveFragment(metadata.id, metadata, content);
    }
    const activeIndex = allFragments.findIndex(f => f.id === fragment.id);
    const hasNext = activeIndex !== -1 && activeIndex < allFragments.length - 1;
    if (hasNext) {
      store.setActiveFragment(allFragments[activeIndex + 1].id);
    }
  };

  // Save and Advance to next unreviewed
  const handleSaveAndNext = async () => {
    const updatedMetadata = { ...metadata, reviewed: true };
    setMetadata(updatedMetadata);
    await store.saveFragment(updatedMetadata.id, updatedMetadata, content);

    // Scan for next unreviewed fragment
    // We look in the latest allFragments (or store.fragments)
    const latestFragments = store.fragments;
    const sorted = [...latestFragments].sort((a, b) =>
      a.metadata.chronological_order - b.metadata.chronological_order
    );

    const currentIdx = sorted.findIndex(f => f.id === updatedMetadata.id);
    let nextUnreviewedId: string | null = null;

    if (currentIdx !== -1) {
      // 1. Look from currentIdx + 1 to the end
      for (let i = currentIdx + 1; i < sorted.length; i++) {
        if (!sorted[i].metadata.reviewed) {
          nextUnreviewedId = sorted[i].id;
          break;
        }
      }
      // 2. Wrap around from 0 to currentIdx
      if (!nextUnreviewedId) {
        for (let i = 0; i < currentIdx; i++) {
          if (!sorted[i].metadata.reviewed) {
            nextUnreviewedId = sorted[i].id;
            break;
          }
        }
      }
    }

    if (nextUnreviewedId) {
      store.setActiveFragment(nextUnreviewedId);
    } else {
      store.createTemporaryFragment();
    }
  };

  const handleManualNew = () => {
    store.createTemporaryFragment();
  };

  const handleDelete = async () => {
    if (confirm(`Delete "${metadata.title || metadata.id}"? This cannot be undone.`)) {
      let targetActiveId: string | null = null;
      const activeIdx = allFragments.findIndex(f => f.id === fragment.id);
      if (activeIdx !== -1) {
        // 1. Search forward for unreviewed
        for (let i = activeIdx + 1; i < allFragments.length; i++) {
          if (!allFragments[i].metadata.reviewed) {
            targetActiveId = allFragments[i].id;
            break;
          }
        }
        
        // 2. Search backward for unreviewed
        if (!targetActiveId) {
          for (let i = activeIdx - 1; i >= 0; i--) {
            if (!allFragments[i].metadata.reviewed) {
              targetActiveId = allFragments[i].id;
              break;
            }
          }
        }
        
        // 3. Fallback to chronological next/prev
        if (!targetActiveId) {
          if (activeIdx < allFragments.length - 1) {
            targetActiveId = allFragments[activeIdx + 1].id;
          } else if (activeIdx > 0) {
            targetActiveId = allFragments[activeIdx - 1].id;
          }
        }
      }

      await store.deleteFragment(fragment.id);
      if (targetActiveId) {
        store.setActiveFragment(targetActiveId);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Editor Main Card */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 shadow-2xl rounded-2xl p-6 md:p-8 space-y-6 relative">
        {/* Fragment Header & Save State Info */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-3">
              <span>{metadata.title || metadata.id}</span>
              <span className="text-xs text-slate-500 font-mono font-medium">({metadata.id})</span>
            </h2>
            <div className="flex flex-wrap gap-2 text-xs">
              {metadata.stage && (
                <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded uppercase font-semibold text-[10px]">
                  Stage: {metadata.stage}
                </span>
              )}
              {metadata.reviewed ? (
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase font-semibold text-[10px]">
                  Reviewed
                </span>
              ) : (
                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded uppercase font-semibold text-[10px]">
                  Unreviewed
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            {/* Status indicator */}
            {isDirty ? (
              <span className="text-xs text-amber-400 bg-amber-400/5 px-2 py-1 rounded border border-amber-400/20 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Unsaved edits
              </span>
            ) : (
              <span className="text-xs text-slate-400 bg-slate-800/20 px-2 py-1 rounded border border-slate-800 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                Synced
              </span>
            )}
            
            <button
              onClick={handleManualNew}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg border border-slate-700 transition-all font-medium flex items-center gap-1"
            >
              + New Fragment
            </button>

            {fragment.id !== 'NEW' && (
              <button
                onClick={handleDelete}
                className="text-xs border border-red-900/40 text-red-400/80 px-3 py-2 rounded-lg hover:bg-red-950/20 transition-all font-medium cursor-pointer"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Primary UI (always visible) */}
        <div className="space-y-4">
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-semibold tracking-wide text-slate-300">Fragment Content (MDX)</label>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl h-96 font-mono text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/80 transition-all shadow-inner"
              placeholder="Write the narrative here..."
            />
          </div>

          {/* Tags (moved outside of advanced options) */}
          <div className="flex flex-col space-y-1 relative">
            <label className="text-sm font-semibold tracking-wide text-slate-300">Tags (comma separated)</label>
            <div className="relative">
              <input
                type="text"
                value={tagsInput}
                onChange={e => handleTagsInputChange(e.target.value)}
                onFocus={() => setIsTagsFocused(true)}
                onBlur={() => setTimeout(() => setIsTagsFocused(false), 200)}
                className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/80 transition-all"
                placeholder="marriage, family, time-travel"
              />
              
              {/* Autocomplete Suggestions Dropdown */}
              {isTagsFocused && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-40 max-h-48 overflow-y-auto divide-y divide-slate-800/50">
                  {suggestions.slice(0, 8).map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => selectSuggestion(suggestion)}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors flex justify-between items-center cursor-pointer"
                    >
                      <span>{suggestion}</span>
                      <span className="text-[10px] text-slate-500 font-mono">system tag</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recommended Tags List at the bottom */}
            {sortedCommonTags.length > 0 && (
              <div className="pt-2 flex flex-col space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Recommended Tags (Most Commonly Used):</span>
                <div className="flex flex-wrap gap-1.5">
                  {sortedCommonTags.slice(0, 12).map(tag => {
                    const isSelected = (metadata.tags || []).includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleRecommendedTag(tag)}
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-500 hover:border-slate-700 hover:text-slate-400'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions Row */}
          <div className="flex flex-col md:flex-row gap-5 items-stretch md:items-center justify-between bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
            <div className="flex flex-wrap items-center gap-6">
              {/* Reviewed checkbox */}
              <label className="flex items-center gap-3 cursor-pointer select-none group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={!!metadata.reviewed}
                    onChange={e => setMetadata(prev => ({ ...prev, reviewed: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-800 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white peer-checked:after:border-emerald-600" />
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-slate-100 transition-colors">
                  Mark as reviewed
                </span>
              </label>

              {/* Stage Dropdown */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-300 whitespace-nowrap">Stage:</label>
                <select
                  value={metadata.stage || ''}
                  onChange={e => setMetadata(prev => ({ ...prev, stage: e.target.value }))}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 px-3 py-1.5 transition-all outline-none"
                >
                  {stageOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto">
              <button
                onClick={handleNextChronological}
                disabled={store.isSaving}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>Next</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
              <button
                onClick={handleSaveAndNext}
                disabled={store.isSaving}
                className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <span>Save & Next</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Section Card */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden transition-all duration-300">
        <button
          onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <svg 
              className={`w-4 h-4 text-indigo-400 transition-transform duration-300 ${isAdvancedExpanded ? 'rotate-90' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            <span className="font-semibold text-sm tracking-wide text-slate-200">Advanced Narrative Settings</span>
          </div>
          <span className="text-xs text-slate-500 uppercase font-semibold">
            {isAdvancedExpanded ? 'Hide' : 'Show'}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {isAdvancedExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              <div className="px-6 pb-6 pt-2 border-t border-slate-850 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fragment ID</label>
                    <input
                      type="text"
                      value={metadata.id}
                      onChange={e => setMetadata(m => ({ ...m, id: e.target.value }))}
                      disabled={fragment.id !== 'NEW'}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                      placeholder="e.g. frag-167"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Title</label>
                    <input
                      type="text"
                      value={metadata.title}
                      onChange={e => setMetadata(m => ({ ...m, title: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Fragment Title"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chronological Order</label>
                    <input
                      type="number"
                      value={metadata.chronological_order}
                      onChange={e => setMetadata(m => ({ ...m, chronological_order: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Required Pool Count</label>
                    <input
                      type="number"
                      value={metadata.required_pool_count}
                      onChange={e => setMetadata(m => ({ ...m, required_pool_count: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Warnings (comma separated)</label>
                    <input
                      type="text"
                      value={metadata.warnings.join(', ')}
                      onChange={e => handleListInput('warnings', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="existential-dread, strong-language"
                    />
                  </div>
                </div>

                {/* Tag-Based Requires Section */}
                <div className="space-y-2 border-t border-slate-800/60 pt-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Requires (Tag dependencies, comma separated)</span>
                      <span className="text-[10px] text-slate-500 font-normal">This fragment unlocks only after fragments containing these tags are read</span>
                    </label>
                    <input
                      type="text"
                      value={(metadata.requires || []).join(', ')}
                      onChange={e => handleRequiresInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="e.g. time-travel-basics, proposal"
                    />
                  </div>

                  {/* Clickable System Tags List */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">Available Tags in Narrative:</span>
                      <input 
                        type="text"
                        placeholder="Filter available tags..."
                        value={searchTagQuery}
                        onChange={e => setSearchTagQuery(e.target.value)}
                        className="bg-slate-950/40 border border-slate-850 px-2.5 py-1 rounded-md text-[11px] outline-none text-slate-300 focus:border-indigo-500/50 transition-colors"
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-slate-950/30 rounded-xl border border-slate-800/80">
                      {allTagsInSystem
                        .filter(t => t.toLowerCase().includes(searchTagQuery.toLowerCase()))
                        .map(tag => {
                          const isSelected = (metadata.requires || []).includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleRequireTag(tag)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300 shadow-sm shadow-indigo-500/5'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                              }`}
                            >
                              <span>{tag}</span>
                              {isSelected ? (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              ) : (
                                <span className="text-[10px] text-slate-600 font-semibold">+</span>
                              )}
                            </button>
                          );
                        })}
                      {allTagsInSystem.length === 0 && (
                        <span className="text-xs italic text-slate-500">No tags defined in narrative yet. Tag a fragment to add one here.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StageReorderer({ store, setEditorMode }: { store: any; setEditorMode: (mode: 'write' | 'reorder') => void }) {
  const STAGES = ['before', 'courting', 'partnered', 'married', 'pregnancy', 'parenting-young', 'parenting-teen', 'later'];
  
  const [selectedStage, setSelectedStage] = useState<string>('before');
  const [orderedList, setOrderedList] = useState<EditorFragment[]>([]);

  // Compile tag frequencies & count fragments in stages
  const stageCounts = STAGES.reduce((acc, stage) => {
    acc[stage] = store.fragments.filter((f: EditorFragment) => f.metadata.stage === stage).length;
    return acc;
  }, {} as Record<string, number>);
  const unassignedCount = store.fragments.filter((f: EditorFragment) => !f.metadata.stage).length;

  const currentStageFrags: EditorFragment[] = store.fragments.filter((f: EditorFragment) => {
    if (selectedStage === '') {
      return !f.metadata.stage;
    }
    return f.metadata.stage === selectedStage;
  });
  currentStageFrags.sort((a: EditorFragment, b: EditorFragment) => a.metadata.chronological_order - b.metadata.chronological_order);

  // Sync state with store fragments for selected stage
  useEffect(() => {
    setOrderedList([...currentStageFrags]);
  }, [selectedStage, store.fragments]);

  const isOrderDirty = JSON.stringify(currentStageFrags.map((f: EditorFragment) => f.id)) !== JSON.stringify(orderedList.map((f: EditorFragment) => f.id));

  const handleSaveOrder = async () => {
    const originalOrders = [...currentStageFrags]
      .map((f: EditorFragment) => f.metadata.chronological_order)
      .sort((a: number, b: number) => a - b);

    const updates = orderedList.map((frag, idx) => {
      const newOrder = originalOrders[idx] ?? (idx * 10);
      return {
        id: frag.id,
        metadata: {
          ...frag.metadata,
          chronological_order: newOrder
        },
        content: frag.content
      };
    });

    await store.saveFragmentsBatch(updates);
  };

  const handleStageChange = async (fragId: string, newStage: string) => {
    if (isOrderDirty) {
      if (!confirm("Changing stage will save the current reordered sequence first. Proceed?")) {
        return;
      }
      await handleSaveOrder();
    }

    const frag = store.fragments.find((f: EditorFragment) => f.id === fragId);
    if (!frag) return;

    await store.saveFragment(fragId, { ...frag.metadata, stage: newStage }, frag.content);
  };

  return (
    <div className="space-y-6">
      {/* Stage Selector Grid */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 shadow-2xl rounded-2xl p-6 space-y-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-left">Select Stage to Reorder</label>
        <div className="flex flex-wrap gap-2 justify-start">
          <button
            onClick={() => setSelectedStage('')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-2 ${
              selectedStage === ''
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span>Unassigned</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
              selectedStage === '' ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {unassignedCount}
            </span>
          </button>

          {STAGES.map(stage => {
            const count = stageCounts[stage] || 0;
            const isSelected = selectedStage === stage;
            const label = stage.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            return (
              <button
                key={stage}
                onClick={() => setSelectedStage(stage)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span>{label}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Save / Reset Actions Bar */}
      <div className="flex justify-between items-center bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
        <div className="space-y-0.5 text-left">
          <h3 className="text-sm font-semibold text-slate-200">
            Stage Sequence List
          </h3>
          <p className="text-xs text-slate-500">
            {isOrderDirty 
              ? "You have unsaved sequence changes. Save to apply them."
              : "Drag cards or use the arrows to adjust their order."
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isOrderDirty && (
            <button
              onClick={() => {
                setOrderedList([...currentStageFrags]);
              }}
              className="text-xs bg-slate-850 hover:bg-slate-800 text-slate-400 px-3.5 py-2 rounded-xl border border-slate-850 hover:border-slate-700 transition-all font-medium cursor-pointer"
            >
              Reset
            </button>
          )}
          <button
            onClick={handleSaveOrder}
            disabled={!isOrderDirty || store.isSaving}
            className={`text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
              isOrderDirty
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-800/50 border border-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            {store.isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Save New Order
              </>
            )}
          </button>
        </div>
      </div>

      {/* List of cards */}
      {orderedList.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-4 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
          <svg className="w-8 h-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 8.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
          </svg>
          <p className="text-sm italic">No fragments assigned to this stage.</p>
        </div>
      ) : (
        <Reorder.Group axis="y" values={orderedList} onReorder={setOrderedList} className="space-y-3">
          {orderedList.map((frag, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === orderedList.length - 1;
            
            const handleMoveUp = () => {
              if (isFirst) return;
              const newList = [...orderedList];
              const temp = newList[idx];
              newList[idx] = newList[idx - 1];
              newList[idx - 1] = temp;
              setOrderedList(newList);
            };

            const handleMoveDown = () => {
              if (isLast) return;
              const newList = [...orderedList];
              const temp = newList[idx];
              newList[idx] = newList[idx + 1];
              newList[idx + 1] = temp;
              setOrderedList(newList);
            };

            const handleEditClick = () => {
              store.setActiveFragment(frag.id);
              setEditorMode('write');
            };

            const contentSnippet = frag.content
              .replace(/---[\s\S]*?---/g, '')
              .trim();
            const previewText = contentSnippet.length > 180 
              ? contentSnippet.slice(0, 180) + '...' 
              : contentSnippet;

            return (
              <Reorder.Item
                key={frag.id}
                value={frag}
                className="bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500/20 hover:bg-slate-955/60 rounded-2xl p-4 flex gap-4 items-center transition-colors group cursor-grab active:cursor-grabbing relative select-none"
              >
                {/* Drag Handle Indicator */}
                <div className="text-slate-600 group-hover:text-indigo-400/80 transition-colors pointer-events-none shrink-0">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a1 1 0 110-2h14a1 1 0 110 2H3zm0 6a1 1 0 110-2h14a1 1 0 110 2H3zm0 6a1 1 0 110-2h14a1 1 0 110 2H3z" clipRule="evenodd" />
                  </svg>
                </div>

                {/* Index indicator */}
                <div className="font-mono text-xs font-extrabold text-indigo-400 bg-indigo-950/30 border border-indigo-900/30 px-2.5 py-1.5 rounded-xl min-w-[2.75rem] text-center shrink-0">
                  #{String(idx + 1).padStart(2, '0')}
                </div>

                {/* Fragment brief detail */}
                <div className="flex-1 min-w-0 space-y-1 text-left">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="font-bold text-sm text-slate-200 truncate">
                      {frag.metadata.title || "Untitled Fragment"}
                    </span>
                    <span className="font-mono text-[10px] text-violet-400/85 bg-violet-400/5 border border-violet-400/10 px-2 py-0.5 rounded-md">
                      {frag.id}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      Order: {frag.metadata.chronological_order}
                    </span>
                    {frag.metadata.reviewed ? (
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md uppercase font-bold text-[8px] tracking-wider">
                        Reviewed
                      </span>
                    ) : (
                      <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md uppercase font-bold text-[8px] tracking-wider">
                        Unreviewed
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 ml-1" onClick={e => e.stopPropagation()}>
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wide">Stage:</span>
                      <select
                        value={frag.metadata.stage || ''}
                        onChange={e => handleStageChange(frag.id, e.target.value)}
                        className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-350 text-[10px] rounded-md px-1.5 py-0.5 font-sans outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer transition-colors"
                      >
                        <option value="">None</option>
                        {STAGES.map(s => (
                          <option key={s} value={s}>
                            {s.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Snippet Preview */}
                  <p className="text-xs text-slate-400 line-clamp-2 italic pr-4">
                    "{previewText}"
                  </p>

                  {/* Badges row */}
                  {((frag.metadata.tags && frag.metadata.tags.length > 0) || (frag.metadata.requires && frag.metadata.requires.length > 0)) && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(frag.metadata.tags || []).map(t => (
                        <span key={t} className="px-2 py-0.5 bg-slate-950/80 border border-slate-800 text-slate-500 rounded-md text-[9px] font-bold uppercase tracking-wider">
                          {t}
                        </span>
                      ))}
                      {(frag.metadata.requires || []).map(r => (
                        <span key={r} className="px-2 py-0.5 bg-indigo-950/45 border border-indigo-900/30 text-indigo-400 rounded-md text-[9px] font-bold uppercase tracking-wider" title={`Requires: ${r}`}>
                          req: {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action Controls */}
                <div className="flex items-center gap-2.5 shrink-0" onClick={e => e.stopPropagation()}>
                  {/* Edit specific fragment button */}
                  <button
                    onClick={handleEditClick}
                    className="p-2 rounded-xl border border-slate-800 hover:border-indigo-500/40 hover:text-indigo-400 bg-slate-955/50 text-slate-450 transition-all cursor-pointer flex items-center justify-center shadow-sm"
                    title="Edit Fragment"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                    </svg>
                  </button>

                  <div className="flex flex-col sm:flex-row items-center gap-1">
                    <button
                      onClick={handleMoveUp}
                      disabled={isFirst}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isFirst 
                          ? 'border-slate-800/40 text-slate-700 cursor-not-allowed opacity-30'
                          : 'border-slate-850 hover:border-slate-750 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                      }`}
                      title="Move Up"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                      </svg>
                    </button>
                    <button
                      onClick={handleMoveDown}
                      disabled={isLast}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isLast 
                          ? 'border-slate-800/40 text-slate-700 cursor-not-allowed opacity-30'
                          : 'border-slate-850 hover:border-slate-750 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                      }`}
                      title="Move Down"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      )}
    </div>
  );
}
