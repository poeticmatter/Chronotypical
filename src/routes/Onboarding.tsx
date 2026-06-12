import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStoryStore } from '../store/useStoryStore';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { motion, AnimatePresence } from 'framer-motion';

const generateRandomSeed = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const store = useStoryStore();

  const incomingSeed = searchParams.get('seed');
  
  // Local states
  const [useSharedSeed, setUseSharedSeed] = useState(!!incomingSeed);
  const [localSeed, setLocalSeed] = useState(store.seed || generateRandomSeed());
  const [showAnchor, setShowAnchor] = useState(store.showChronologicalAnchor);
  const [isEditingSeed, setIsEditingSeed] = useState(false);

  // If incoming seed changes, update choices
  useEffect(() => {
    if (incomingSeed) {
      setUseSharedSeed(true);
    }
  }, [incomingSeed]);

  const activeSeed = useSharedSeed && incomingSeed ? incomingSeed : localSeed;

  const handleShuffle = () => {
    setLocalSeed(generateRandomSeed());
    setIsEditingSeed(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeed.trim()) return;

    store.toggleChronologicalAnchor(showAnchor);
    store.resetProgress();
    store.initializeSeed(activeSeed.trim().toUpperCase());

    navigate(`/?seed=${activeSeed.trim().toUpperCase()}`);
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg mx-auto bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-100/80 font-sans"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-900/10"
          >
            <svg className="w-8 h-8 text-white animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.656 48.656 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3M3 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M3 12l-3 3m3-3 3 3" />
            </svg>
          </motion.div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Timeline Calibration</h1>
          <p className="text-sm text-slate-500 mt-2 font-serif italic">Adjust parameters to synchronize your reading interface.</p>
        </div>

        {incomingSeed && (
          <div className="mb-8 p-5 bg-gradient-to-br from-indigo-50/80 to-blue-50/50 text-slate-800 rounded-2xl border border-indigo-100/60 shadow-sm">
            <h2 className="text-sm font-semibold text-indigo-950 flex items-center gap-2 mb-3">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Shared Link Detected
            </h2>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/60 transition-colors cursor-pointer select-none">
                <input
                  type="radio"
                  name="seedChoice"
                  checked={useSharedSeed}
                  onChange={() => setUseSharedSeed(true)}
                  className="mt-1 accent-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-sm">
                  <span className="font-medium text-slate-900 block">Synchronize Seed</span>
                  <span className="text-xs text-slate-500 font-mono">Use shared seed: {incomingSeed}</span>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/60 transition-colors cursor-pointer select-none">
                <input
                  type="radio"
                  name="seedChoice"
                  checked={!useSharedSeed}
                  onChange={() => setUseSharedSeed(false)}
                  className="mt-1 accent-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-sm">
                  <span className="font-medium text-slate-900 block">Generate Custom Timeline</span>
                  <span className="text-xs text-slate-500">Create a unique pathway independent of the shared link</span>
                </div>
              </label>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <AnimatePresence mode="wait">
            {(!incomingSeed || !useSharedSeed) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <label className="block text-sm font-semibold tracking-wide text-slate-700 mb-2">
                  Temporal Seed
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      required
                      disabled={!isEditingSeed}
                      value={localSeed}
                      onChange={(e) => setLocalSeed(e.target.value.toUpperCase())}
                      placeholder="ENTER SEED"
                      className={`w-full px-4 py-3 border rounded-xl font-mono text-lg tracking-widest text-center uppercase focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all shadow-inner ${
                        isEditingSeed 
                          ? 'bg-white border-slate-300 text-slate-900' 
                          : 'bg-slate-50 border-slate-100 text-slate-700 select-all cursor-pointer font-bold'
                      }`}
                      onClick={() => !isEditingSeed && setIsEditingSeed(true)}
                    />
                    {!isEditingSeed && (
                      <button
                        type="button"
                        onClick={() => setIsEditingSeed(true)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-900 font-medium transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleShuffle}
                    className="p-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl text-slate-700 transition-colors flex items-center justify-center shadow-sm hover:shadow"
                    title="Generate random seed"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.656 48.656 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3M3 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-serif italic">
                  This seed determines the deterministic, non-linear progression of your narrative fragments.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-5 border-t border-slate-100">
            <label className="flex items-start gap-3.5 cursor-pointer group select-none">
              <div className="relative flex items-center mt-1">
                <input
                  type="checkbox"
                  checked={showAnchor}
                  onChange={(e) => setShowAnchor(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900"
                />
              </div>
              <div className="text-sm">
                <strong className="text-slate-800 font-semibold block group-hover:text-slate-950 transition-colors">
                  Enable Chronological Anchors
                </strong>
                <span className="text-slate-500 font-serif italic text-xs leading-relaxed block mt-0.5">
                  Displays the chronological index (e.g., #042) above fragment memories. Helps orient yourself during out-of-order reading.
                </span>
              </div>
            </label>
          </div>

          <Button type="submit" className="w-full py-3 text-sm font-semibold rounded-xl tracking-wider shadow-md bg-slate-900 hover:bg-slate-800 text-white transition-all transform hover:-translate-y-0.5">
            Initialize Sequence
          </Button>
        </form>
      </motion.div>
    </Layout>
  );
}
