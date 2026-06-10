import { useEffect, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import type { EditorFragment } from '../store/useEditorStore';
import { AnimatePresence, motion } from 'framer-motion';

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

        {/* Navigation Controls */}
        <div className="flex items-center gap-3 bg-slate-950/60 px-4 py-2 rounded-full border border-slate-800/80 shadow-inner">
          <NavigationArrows 
            store={store} 
            sortedFragments={sortedFragments} 
            activeIndex={activeIndex} 
            activeFragment={activeFragment} 
          />
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
        {activeFragment ? (
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
      alert("All fragments reviewed! Let's write another one.");
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
              <span className="text-[10px] text-slate-500 font-mono">Variables: props.protagonist_name, props.partner_name</span>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl h-96 font-mono text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/80 transition-all shadow-inner"
              placeholder="Write the narrative here. Use {props.protagonist_name} and {props.partner_name} for variables."
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
