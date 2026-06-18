import { useEffect, useState } from 'react';
import { getAllBetaReaders, getAllBetaReadingLogs, type BetaReaderProfile, type BetaReadingLog } from '../lib/supabase';
import manifestData from '../manifest.json';
import type { FragmentMetadata } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditorStore } from '../store/useEditorStore';

const manifest = manifestData as FragmentMetadata[];

export function FeedbackDashboard() {
  const store = useEditorStore();
  const [readers, setReaders] = useState<BetaReaderProfile[]>([]);
  const [logs, setLogs] = useState<BetaReadingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'fragments' | 'testers'>('fragments');
  
  // Expand states
  const [expandedFragId, setExpandedFragId] = useState<string | null>(null);
  const [expandedTesterId, setExpandedTesterId] = useState<string | null>(null);
  const [expandedTimelineKey, setExpandedTimelineKey] = useState<string | null>(null);

  // Sorting
  const [fragSortKey, setFragSortKey] = useState<'id' | 'views' | 'time' | 'comments'>('id');
  const [fragSortDir, setFragSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [loadedReaders, loadedLogs] = await Promise.all([
          getAllBetaReaders(),
          getAllBetaReadingLogs()
        ]);
        setReaders(loadedReaders);
        setLogs(loadedLogs);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load feedback logs from database.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-slate-400 space-y-4 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
        <div className="w-10 h-10 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm italic">Loading reader logs & calibrating metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-rose-400 space-y-4 border border-dashed border-rose-950/30 rounded-2xl bg-rose-950/5 p-6 text-center">
        <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <h3 className="text-base font-bold text-slate-200">Sync Failed</h3>
        <p className="text-xs text-slate-400 max-w-sm">{error}</p>
      </div>
    );
  }

  // --- 1. TIMING SAMPLES COMPILATION ---
  const timingSamples: Record<string, number[]> = {}; // fragmentId -> sample seconds
  const userFragmentLogs: Record<string, Record<string, BetaReadingLog[]>> = {};

  logs.forEach(log => {
    if (!userFragmentLogs[log.user_id]) {
      userFragmentLogs[log.user_id] = {};
    }
    if (!userFragmentLogs[log.user_id][log.fragment_id]) {
      userFragmentLogs[log.user_id][log.fragment_id] = [];
    }
    userFragmentLogs[log.user_id][log.fragment_id].push(log);
  });

  Object.entries(userFragmentLogs).forEach(([_userId, frags]) => {
    Object.entries(frags).forEach(([fragId, eventList]) => {
      // Sort chronologically
      eventList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      let lastViewTime: number | null = null;
      eventList.forEach(evt => {
        if (evt.action === 'view') {
          lastViewTime = new Date(evt.created_at).getTime();
        } else if (evt.action === 'advance' && lastViewTime !== null) {
          const durationSec = (new Date(evt.created_at).getTime() - lastViewTime) / 1000;
          // Exclude idle time (> 30 mins) or negative times
          if (durationSec > 0.5 && durationSec < 1800) {
            if (!timingSamples[fragId]) {
              timingSamples[fragId] = [];
            }
            timingSamples[fragId].push(durationSec);
          }
          lastViewTime = null; // reset
        }
      });
    });
  });

  // --- 2. SUMMARY METRICS ---
  const totalReadersCount = readers.length;
  const registeredReadersCount = readers.filter(r => r.name || r.contact_info).length;
  const totalAdvancesCount = logs.filter(l => l.action === 'advance').length;
  
  // Overall reaction count
  const reactionCounts: Record<string, number> = { funny: 0, interesting: 0, confusing: 0, boring: 0, skipped: 0 };
  logs.forEach(l => {
    if (l.action === 'advance' && l.reaction) {
      const rx = l.reaction.toLowerCase();
      if (rx in reactionCounts) {
        reactionCounts[rx]++;
      }
    }
  });

  // Find dominant reaction
  let dominantReaction = 'None';
  let maxReactionCount = 0;
  Object.entries(reactionCounts).forEach(([rx, count]) => {
    if (count > maxReactionCount) {
      maxReactionCount = count;
      dominantReaction = rx.charAt(0).toUpperCase() + rx.slice(1);
    }
  });

  // Average reading time across all samples
  const allDurations = Object.values(timingSamples).flat();
  const avgPaceSec = allDurations.length > 0 
    ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length 
    : 0;

  // --- 3. FRAGMENTS LIST DATA COMPILATION ---
  const sortedManifest = [...manifest].sort((a, b) => a.chronological_order - b.chronological_order);
  
  const fragmentsStats = sortedManifest.map(frag => {
    const fragId = frag.id;
    const fragLogs = logs.filter(l => l.fragment_id === fragId);
    
    const views = fragLogs.filter(l => l.action === 'view').length;
    const advances = fragLogs.filter(l => l.action === 'advance').length;
    
    // Average time spent
    const samples = timingSamples[fragId] || [];
    const avgTime = samples.length > 0 
      ? samples.reduce((a, b) => a + b, 0) / samples.length 
      : null;

    // Reactions
    const rxSummary: Record<string, number> = { funny: 0, interesting: 0, confusing: 0, boring: 0, skipped: 0 };
    fragLogs.forEach(l => {
      if (l.action === 'advance' && l.reaction) {
        const rx = l.reaction.toLowerCase();
        if (rx in rxSummary) {
          rxSummary[rx]++;
        }
      }
    });

    const commentsList = fragLogs.filter(l => l.action === 'advance' && l.comments && l.comments.trim().length > 0);

    return {
      id: fragId,
      title: frag.title,
      chronological_order: frag.chronological_order,
      views,
      advances,
      avgTime,
      reactions: rxSummary,
      comments: commentsList,
      warnings: frag.warnings || []
    };
  });

  // Apply sorting to fragmentsStats
  const sortedFragmentsStats = [...fragmentsStats].sort((a, b) => {
    let valA: any = a.id;
    let valB: any = b.id;

    if (fragSortKey === 'id') {
      valA = a.chronological_order;
      valB = b.chronological_order;
    } else if (fragSortKey === 'views') {
      valA = a.views;
      valB = b.views;
    } else if (fragSortKey === 'time') {
      valA = a.avgTime ?? -1;
      valB = b.avgTime ?? -1;
    } else if (fragSortKey === 'comments') {
      valA = a.comments.length;
      valB = b.comments.length;
    }

    if (valA < valB) return fragSortDir === 'asc' ? -1 : 1;
    if (valA > valB) return fragSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (key: 'id' | 'views' | 'time' | 'comments') => {
    if (fragSortKey === key) {
      setFragSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setFragSortKey(key);
      setFragSortDir('desc'); // Default to descending when changing sort key
    }
  };

  // Helper to format duration
  const formatSec = (sec: number | null) => {
    if (sec === null) return '--';
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const mins = Math.floor(sec / 60);
    const secs = Math.round(sec % 60);
    return `${mins}m ${secs}s`;
  };

  const reactionEmojis: Record<string, string> = {
    funny: '😂',
    interesting: '🤔',
    confusing: '😵‍💫',
    boring: '🥱',
    skipped: '⚠️'
  };

  const reactionColorClasses: Record<string, string> = {
    funny: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    interesting: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    confusing: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    boring: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    skipped: 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
  };

  return (
    <div className="space-y-8 font-sans">
      {/* 1. OVERVIEW WIDGETS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Readers */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-left relative overflow-hidden group shadow-md">
          <span className="text-[10px] text-slate-550 uppercase font-extrabold tracking-wider block">Total Testers</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-slate-100">{totalReadersCount}</span>
            <span className="text-[11px] text-slate-400">({registeredReadersCount} calibrated)</span>
          </div>
          <div className="absolute right-4 bottom-4 text-slate-800 font-bold text-4xl group-hover:scale-110 transition-transform select-none">👥</div>
        </div>

        {/* Card 2: Total Advances */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-left relative overflow-hidden group shadow-md">
          <span className="text-[10px] text-slate-555 uppercase font-extrabold tracking-wider block">Completed Steps</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-slate-100">{totalAdvancesCount}</span>
            <span className="text-[11px] text-slate-400">logged read steps</span>
          </div>
          <div className="absolute right-4 bottom-4 text-slate-800 font-bold text-4xl group-hover:scale-110 transition-transform select-none">📖</div>
        </div>

        {/* Card 3: Avg Pace */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-left relative overflow-hidden group shadow-md">
          <span className="text-[10px] text-slate-550 uppercase font-extrabold tracking-wider block">Avg. Pace per Fragment</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-indigo-400">{formatSec(avgPaceSec || null)}</span>
            <span className="text-[11px] text-slate-400">across all samples</span>
          </div>
          <div className="absolute right-4 bottom-4 text-indigo-950/50 font-bold text-4xl group-hover:scale-110 transition-transform select-none">⏱️</div>
        </div>

        {/* Card 4: Dominant Reaction */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-left relative overflow-hidden group shadow-md">
          <span className="text-[10px] text-slate-550 uppercase font-extrabold tracking-wider block">Dominant Reaction</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-slate-100">
              {dominantReaction !== 'None' ? (
                <>
                  {dominantReaction} <span className="text-2xl">{reactionEmojis[dominantReaction.toLowerCase()]}</span>
                </>
              ) : 'None'}
            </span>
          </div>
          <div className="absolute right-4 bottom-4 text-slate-800 font-bold text-4xl group-hover:scale-110 transition-transform select-none">🎭</div>
        </div>
      </div>

      {/* 2. REACTION RATIOS METER */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-left">Reaction Share</h3>
        <div className="w-full bg-slate-950 h-5 rounded-full overflow-hidden flex shadow-inner">
          {Object.entries(reactionCounts).map(([rx, count]) => {
            if (count === 0) return null;
            const pct = (count / totalAdvancesCount) * 100;
            const colors: Record<string, string> = {
              funny: 'bg-amber-500',
              interesting: 'bg-indigo-500',
              confusing: 'bg-purple-500',
              boring: 'bg-rose-500',
              skipped: 'bg-slate-600'
            };
            return (
              <div 
                key={rx}
                style={{ width: `${pct}%` }}
                className={`${colors[rx]} h-full transition-all`}
                title={`${rx.toUpperCase()}: ${count} (${pct.toFixed(1)}%)`}
              />
            );
          })}
          {totalAdvancesCount === 0 && (
            <div className="w-full bg-slate-850 h-full flex items-center justify-center text-[10px] text-slate-500 italic">No feedback entries logged yet</div>
          )}
        </div>
        <div className="flex flex-wrap justify-start gap-x-5 gap-y-1.5 text-xs pt-1">
          {Object.entries(reactionCounts).map(([rx, count]) => {
            const pct = totalAdvancesCount > 0 ? (count / totalAdvancesCount) * 100 : 0;
            const dotColors: Record<string, string> = {
              funny: 'bg-amber-500',
              interesting: 'bg-indigo-500',
              confusing: 'bg-purple-500',
              boring: 'bg-rose-500',
              skipped: 'bg-slate-650'
            };
            return (
              <div key={rx} className="flex items-center gap-2 text-slate-350">
                <span className={`w-2 h-2 rounded-full ${dotColors[rx]}`} />
                <span className="capitalize text-[11px] font-medium text-slate-400">
                  {reactionEmojis[rx]} {rx}: <span className="text-slate-200 font-bold">{count}</span> ({pct.toFixed(0)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. TABS SELECTOR */}
      <div className="flex border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab('fragments')}
          className={`pb-3.5 px-4 font-bold text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'fragments'
              ? 'border-indigo-500 text-slate-100'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Fragments Analytics ({manifest.length})
        </button>
        <button
          onClick={() => setActiveTab('testers')}
          className={`pb-3.5 px-4 font-bold text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeTab === 'testers'
              ? 'border-indigo-500 text-slate-100'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Tester Journeys ({readers.length})
        </button>
      </div>

      {/* 4. DETAILS AREA */}
      <div>
        {activeTab === 'fragments' ? (
          /* FRAGMENTS TABLE VIEW */
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <span className="text-xs text-slate-500 italic">Click a row to expand comments and warnings metadata.</span>
              {/* Table Column headers description for sorting indicator */}
              <div className="flex gap-2">
                <button 
                  onClick={() => toggleSort('id')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer font-bold ${
                    fragSortKey === 'id' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-950/40 border-slate-850 text-slate-505'
                  }`}
                >
                  Sort: Sequence {fragSortKey === 'id' && (fragSortDir === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  onClick={() => toggleSort('views')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer font-bold ${
                    fragSortKey === 'views' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-955/40 border-slate-850 text-slate-505'
                  }`}
                >
                  Sort: Views {fragSortKey === 'views' && (fragSortDir === 'asc' ? '↑' : '↓')}
                </button>
                <button 
                  onClick={() => toggleSort('time')}
                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer font-bold ${
                    fragSortKey === 'time' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-955/40 border-slate-850 text-slate-505'
                  }`}
                >
                  Sort: Reading Time {fragSortKey === 'time' && (fragSortDir === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-850 shadow-md">
              {sortedFragmentsStats.map(f => {
                const isExpanded = expandedFragId === f.id;
                
                return (
                  <div key={f.id} className="transition-colors hover:bg-slate-955/10 text-left">
                    {/* Header Row */}
                    <div 
                      onClick={() => setExpandedFragId(isExpanded ? null : f.id)}
                      className="p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-200 text-sm">{f.title || 'Untitled'}</span>
                          <span className="font-mono text-[10px] text-violet-400/80 bg-violet-400/5 px-2 py-0.5 border border-violet-400/10 rounded-md">{f.id}</span>
                          <span className="font-mono text-[10px] text-slate-500">Order #{f.chronological_order}</span>
                          {f.warnings.length > 0 && (
                            <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider">
                              CW
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 pt-0.5 text-xs text-slate-500">
                          <span>Views: <strong className="text-slate-350">{f.views}</strong></span>
                          <span>Advances: <strong className="text-slate-350">{f.advances}</strong></span>
                          <span>Comments: <strong className="text-slate-350">{f.comments.length}</strong></span>
                        </div>
                      </div>

                      {/* Right metadata badges */}
                      <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-end shrink-0">
                        {/* Time metric */}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-extrabold text-slate-550 tracking-wider block">Avg Duration</span>
                          <span className={`text-xs font-mono font-bold ${f.avgTime ? 'text-indigo-400' : 'text-slate-650'}`}>
                            {formatSec(f.avgTime)}
                          </span>
                        </div>

                        {/* Emojis stack */}
                        <div className="flex gap-1">
                          {Object.entries(f.reactions).map(([rx, count]) => {
                            if (count === 0) return null;
                            return (
                              <span 
                                key={rx} 
                                title={`${rx}: ${count}`} 
                                className="px-1.5 py-0.5 bg-slate-950/65 rounded border border-slate-800/80 text-[10px]"
                              >
                                {reactionEmojis[rx]} {count}
                              </span>
                            );
                          })}
                        </div>
                        
                        {/* Expand indicator arrow */}
                        <svg 
                          className={`w-4 h-4 text-slate-600 transition-transform ${isExpanded ? 'rotate-90 text-indigo-400' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </div>

                    {/* Expandable Comments Area */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="bg-slate-950/45 border-t border-slate-850 overflow-hidden"
                        >
                          <div className="p-5 space-y-4">
                            {/* Fragment text context card */}
                            {(() => {
                              const matchedFragment = store.fragments.find(item => item.id === f.id);
                              const cleanText = matchedFragment
                                ? matchedFragment.content.replace(/---[\s\S]*?---/g, '').trim()
                                : 'Fragment narrative content not found.';
                              return (
                                <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 text-left shadow-inner space-y-2.5">
                                  <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex justify-between items-center">
                                    <span>Narrative Text Context ({f.id})</span>
                                    <span className="text-[9px] text-slate-500 font-mono font-normal lowercase">frontmatter excluded</span>
                                  </h4>
                                  <div className="text-sm font-serif text-slate-350 leading-relaxed whitespace-pre-wrap pl-3.5 border-l-2 border-indigo-500/20 max-h-60 overflow-y-auto">
                                    {cleanText}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Warnings detail */}
                            {f.warnings.length > 0 && (
                              <div className="flex items-center gap-2 bg-rose-500/5 border border-rose-500/10 px-3 py-2 rounded-xl text-xs text-rose-400">
                                <strong>⚠️ Content Warnings:</strong>
                                <span>{f.warnings.join(', ')}</span>
                              </div>
                            )}

                            {/* Comments Header */}
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-2">Tester Feedback Comments ({f.comments.length})</h4>
                            
                            {/* Comments list */}
                            <div className="space-y-2.5">
                              {f.comments.map((comment, cIdx) => {
                                // Find reader profile
                                const profile = readers.find(r => r.user_id === comment.user_id);
                                const displayName = profile?.name || comment.user_id;
                                const dateString = new Date(comment.created_at).toLocaleString();

                                return (
                                  <div key={cIdx} className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 space-y-2 text-left">
                                    <div className="flex justify-between items-start flex-wrap gap-2 text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-350">{displayName}</span>
                                        {profile?.reading_mode && (
                                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-850 text-slate-500 border border-slate-800">
                                            {profile.reading_mode}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-slate-550 font-mono">{dateString}</span>
                                    </div>

                                    <p className="text-xs text-slate-400 font-serif leading-relaxed italic">
                                      "{comment.comments}"
                                    </p>

                                    {comment.reaction && (
                                      <div className="pt-1 flex">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${reactionColorClasses[comment.reaction.toLowerCase()] || ''}`}>
                                          {reactionEmojis[comment.reaction.toLowerCase()]} {comment.reaction}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              
                              {f.comments.length === 0 && (
                                <p className="text-xs italic text-slate-650 py-3 text-center">No comments left on this fragment yet.</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* TESTERS JOURNEYS VIEW */
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-850 shadow-md">
              {readers.map(reader => {
                const isExpanded = expandedTesterId === reader.user_id;
                
                // Calculate their progress fraction
                const isTraveler = reader.reading_mode === 'traveler';
                let progressPercent = 0;
                let progressFraction = '0 / 0';
                
                if (isTraveler) {
                  const readCount = reader.traveler_progress?.length || 0;
                  const total = manifest.length;
                  progressPercent = total > 0 ? (readCount / total) * 100 : 0;
                  progressFraction = `${readCount} / ${total}`;
                } else {
                  // Partner Mode progress index
                  const furthestOrder = reader.partner_progress;
                  const total = manifest.length;
                  
                  // Count how many manifest items are at or below partner_progress
                  const readCount = partnerManifestCount(furthestOrder);
                  progressPercent = total > 0 ? (readCount / total) * 100 : 0;
                  progressFraction = `${readCount} / ${total}`;
                }

                // Filter logs for this specific reader
                const readerLogs = logs.filter(l => l.user_id === reader.user_id);
                const advanceEvents = readerLogs.filter(l => l.action === 'advance').length;

                return (
                  <div key={reader.user_id} className="transition-colors hover:bg-slate-955/10 text-left">
                    {/* Header Row */}
                    <div 
                      onClick={() => setExpandedTesterId(isExpanded ? null : reader.user_id)}
                      className="p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-200 text-sm">{reader.name || 'Anonymous Tester'}</span>
                          <span className="font-mono text-[10px] text-indigo-400/85 bg-indigo-400/5 px-2 py-0.5 border border-indigo-400/10 rounded-md">{reader.user_id}</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-750">
                            Mode: {reader.reading_mode}
                          </span>
                        </div>
                        {reader.contact_info && (
                          <p className="text-xs text-slate-500">{reader.contact_info}</p>
                        )}
                      </div>

                      {/* Tester Progress metrics */}
                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end shrink-0">
                        {/* Audit count */}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-extrabold text-slate-550 tracking-wider block">Logged steps</span>
                          <span className="text-xs font-mono font-bold text-slate-350">{advanceEvents} advances</span>
                        </div>

                        {/* Progress meter */}
                        <div className="text-right w-28 space-y-1">
                          <div className="flex justify-between items-baseline text-[10px] font-mono">
                            <span className="text-slate-500">Progress</span>
                            <span className="text-indigo-400 font-bold">{progressFraction}</span>
                          </div>
                          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full transition-all" style={{ width: `${progressPercent}%` }} />
                          </div>
                        </div>

                        {/* Expand indicator arrow */}
                        <svg 
                          className={`w-4 h-4 text-slate-600 transition-transform ${isExpanded ? 'rotate-90 text-indigo-400' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </div>

                    {/* Expandable audit log timeline */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="bg-slate-950/45 border-t border-slate-850 overflow-hidden text-left"
                        >
                          <div className="p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-850 text-xs">
                              <div>
                                <span className="text-slate-500">Calibrated Seed:</span> <strong className="text-slate-300 font-mono">{reader.seed}</strong>
                              </div>
                              <div>
                                <span className="text-slate-500">Joined:</span> <span className="text-slate-300">{new Date(reader.created_at || '').toLocaleDateString()}</span>
                              </div>
                            </div>

                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chronological Reader Path</h4>

                            {/* Timeline audit path */}
                            <div className="relative border-l border-slate-800 pl-4 ml-2.5 space-y-5 py-2">
                              {readerLogs.map((log, lIdx) => {
                                const isView = log.action === 'view';
                                const dateString = new Date(log.created_at).toLocaleTimeString();
                                const fragMeta = manifest.find(m => m.id === log.fragment_id);
                                const fragTitle = fragMeta?.title || log.fragment_id;

                                // If it is an advance, try to find a preceding view log to show reading duration
                                let durationStr = '';
                                if (!isView) {
                                  // Find the closest view log in history before this advance
                                  const prevLogs = readerLogs.slice(0, readerLogs.indexOf(log));
                                  const matchingView = [...prevLogs].reverse().find(pl => pl.fragment_id === log.fragment_id && pl.action === 'view');
                                  if (matchingView) {
                                    const diffSec = (new Date(log.created_at).getTime() - new Date(matchingView.created_at).getTime()) / 1000;
                                    if (diffSec > 0 && diffSec < 1800) {
                                      durationStr = `Read time: ${formatSec(diffSec)}`;
                                    }
                                  }
                                }

                                return (
                                  <div key={log.id || lIdx} className="relative text-xs">
                                    {/* Circle dot on line */}
                                    <div className={`absolute -left-[22px] top-1.5 w-3.5 h-3.5 rounded-full border-2 ${
                                      isView 
                                        ? 'bg-slate-900 border-slate-700' 
                                        : 'bg-indigo-650 border-slate-905'
                                    }`} />

                                    <div className="space-y-1 bg-slate-900/20 border border-slate-900 p-3 rounded-xl">
                                      <div className="flex justify-between items-baseline flex-wrap gap-2">
                                        <div>
                                          <span className="font-semibold text-slate-350">{isView ? 'Opened' : 'Advanced from'}: </span>
                                          <button 
                                            onClick={() => {
                                              const key = `${log.user_id}-${log.fragment_id}-${log.created_at}`;
                                              setExpandedTimelineKey(expandedTimelineKey === key ? null : key);
                                            }}
                                            className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer text-left"
                                            title="Click to view fragment text"
                                          >
                                            {fragTitle}
                                          </button>
                                          <span className="font-mono text-[9px] text-slate-500 ml-1.5 bg-slate-850 px-1 rounded">
                                            {log.fragment_id}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-mono">{dateString}</span>
                                      </div>

                                      {/* Collapsible Fragment Content in Timeline */}
                                      {expandedTimelineKey === `${log.user_id}-${log.fragment_id}-${log.created_at}` && (
                                        <div className="mt-2 p-3 bg-slate-950/60 border border-slate-850 rounded-lg text-slate-300 text-left font-serif leading-relaxed text-[11px] max-h-36 overflow-y-auto whitespace-pre-wrap shadow-inner">
                                          {(() => {
                                            const matched = store.fragments.find(item => item.id === log.fragment_id);
                                            return matched 
                                              ? matched.content.replace(/---[\s\S]*?---/g, '').trim() 
                                              : 'Fragment narrative content not found.';
                                          })()}
                                        </div>
                                      )}

                                      {/* Duration display */}
                                      {durationStr && (
                                        <div className="text-[10px] text-indigo-400 font-mono pt-0.5">
                                          ⏱️ {durationStr}
                                        </div>
                                      )}

                                      {/* Reaction/comment */}
                                      {!isView && (log.reaction || log.comments) && (
                                        <div className="mt-2 space-y-1.5 pt-1.5 border-t border-slate-900">
                                          {log.reaction && (
                                            <div>
                                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${reactionColorClasses[log.reaction.toLowerCase()] || ''}`}>
                                                {reactionEmojis[log.reaction.toLowerCase()]} {log.reaction}
                                              </span>
                                            </div>
                                          )}
                                          {log.comments && (
                                            <p className="text-xs text-slate-400 font-serif italic leading-relaxed">
                                              "{log.comments}"
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {readerLogs.length === 0 && (
                                <p className="text-xs italic text-slate-650 py-2 pl-2">This tester has not recorded any reading actions yet.</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              
              {readers.length === 0 && (
                <div className="py-12 text-center text-slate-500 italic">No beta readers registered in database yet.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Count how many fragments are completed at or below furthest chronological_order in Partner Mode
function partnerManifestCount(furthestOrder: number) {
  if (furthestOrder < 0) return 0;
  const sorted = [...manifest].sort((a, b) => a.chronological_order - b.chronological_order);
  const index = sorted.findIndex(m => m.chronological_order === furthestOrder);
  return index === -1 ? 0 : index + 1;
}
