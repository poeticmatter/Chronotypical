import { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useStoryStore } from '../store/useStoryStore';
import { useBetaStore } from '../store/useBetaStore';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import {
  getBetaReader,
  createOrUpdateBetaReader,
  logBetaReadingEvent,
  isSupabaseConfigured,
} from '../lib/supabase';
import type { BetaReaderProfile } from '../lib/supabase';
import { getNextDeterministicFragment } from '../engine/PoolEngine';
import manifestData from '../manifest.json';
import type { FragmentMetadata } from '../types';

const manifest = manifestData as FragmentMetadata[];

// Sort manifest by chronological order for Partner Mode
const partnerManifest = [...manifest].sort(
  (a, b) => a.chronological_order - b.chronological_order
);

const EMOJIS = [
  { label: 'Funny', char: '😂', colorClass: 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 border-slate-100 bg-slate-50/50 text-slate-600', activeClass: 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm shadow-amber-100 scale-105 font-medium' },
  { label: 'Interesting', char: '🤔', colorClass: 'hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border-slate-100 bg-slate-50/50 text-slate-600', activeClass: 'bg-indigo-100 border-indigo-400 text-indigo-900 shadow-sm shadow-indigo-100 scale-105 font-medium' },
  { label: 'Confusing', char: '😵‍💫', colorClass: 'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 border-slate-100 bg-slate-50/50 text-slate-600', activeClass: 'bg-purple-100 border-purple-400 text-purple-900 shadow-sm shadow-purple-100 scale-105 font-medium' },
  { label: 'Boring', char: '🥱', colorClass: 'hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border-slate-100 bg-slate-50/50 text-slate-600', activeClass: 'bg-rose-100 border-rose-400 text-rose-900 shadow-sm shadow-rose-100 scale-105 font-medium' },
];

export function BetaReader() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const betaStore = useBetaStore();
  const storyStore = useStoryStore();

  const rawUserID = searchParams.get('userID');
  const userID = rawUserID ? rawUserID.trim().toLowerCase() : null;
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingContact, setOnboardingContact] = useState('');
  const [profile, setProfile] = useState<BetaReaderProfile | null>(null);
  const [manualID, setManualID] = useState('');
  const [retryTrigger, setRetryTrigger] = useState(0);

  const handleManualIDSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanManualID = manualID.trim().toLowerCase();
    if (cleanManualID) {
      betaStore.setError(null);
      if (cleanManualID === userID) {
        // Force re-run validation if trying to sync the same ID again
        setRetryTrigger((prev) => prev + 1);
      } else {
        navigate(`/beta?userID=${cleanManualID}`);
      }
    }
  };

  // Initialize and validate
  useEffect(() => {
    if (!userID) {
      betaStore.setError('Missing User ID. Please check your beta testing link.');
      return;
    }

    betaStore.setUserId(userID);
    betaStore.setIsLoading(true);

    getBetaReader(userID)
      .then((data) => {
        if (!data) {
          betaStore.setError('Invalid beta tester ID. Please contact the author.');
        } else {
          setProfile(data);
          betaStore.setProfile({
            name: data.name,
            contact_info: data.contact_info,
            isRegistered: !!(data.name || data.contact_info),
          });
          // Import seed & progress into our story engine
          storyStore.importBetaProgress(
            data.seed,
            data.traveler_progress,
            data.partner_progress
          );
        }
      })
      .catch((err) => {
        console.error(err);
        betaStore.setError('Failed to connect to database.');
      })
      .finally(() => {
        betaStore.setIsLoading(false);
      });
  }, [userID, retryTrigger]);

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userID || !profile) return;

    betaStore.setIsLoading(true);
    try {
      const updatedProfile = await createOrUpdateBetaReader({
        ...profile,
        name: onboardingName || null,
        contact_info: onboardingContact || null,
      });

      if (updatedProfile) {
        setProfile(updatedProfile);
        betaStore.setProfile({
          name: updatedProfile.name,
          contact_info: updatedProfile.contact_info,
          isRegistered: true,
        });
      }
    } catch (err) {
      console.error(err);
      betaStore.setError('Failed to complete onboarding.');
    } finally {
      betaStore.setIsLoading(false);
    }
  };



  // Rendering Loading
  if (betaStore.isLoading) {
    return (
      <Layout hideHeader>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-sans text-sm animate-pulse">Initializing temporal sync...</p>
        </div>
      </Layout>
    );
  }

  // Rendering Error
  if (betaStore.error) {
    return (
      <Layout hideHeader>
        <div className="max-w-md mx-auto bg-white border border-slate-100 p-8 rounded-3xl shadow-lg text-center font-sans">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-500 text-xs mb-6 leading-relaxed">
            {betaStore.error}
          </p>
          
          <form onSubmit={handleManualIDSubmit} className="space-y-3.5 pt-4 border-t border-slate-100">
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider text-left">
              Or Enter Tester ID Manually
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Tester ID"
                value={manualID}
                onChange={(e) => setManualID(e.target.value)}
                className="flex-grow px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all font-serif"
              />
              <Button type="submit" className="py-2 px-4 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-850 text-white shadow-md">
                Sync ID
              </Button>
            </div>
          </form>
          
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs text-slate-400 hover:text-slate-700 transition-colors font-medium cursor-pointer"
            >
              &larr; Return to Homepage
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Onboarding (First Join)
  if (profile && !betaStore.isRegistered) {
    return (
      <Layout hideHeader>
        <div className="max-w-md mx-auto bg-white border border-slate-100 rounded-2xl p-8 shadow-sm font-sans">
          <div className="text-center mb-6">
            <span className="inline-block text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
              Beta Reader calibration
            </span>
            <h2 className="text-2xl font-bold text-slate-900">Welcome to Chronotypical</h2>
            <p className="text-slate-500 text-sm mt-1 font-serif italic">
              Please calibrate your tester profile before beginning the narrative.
            </p>
          </div>

          <form onSubmit={handleOnboardingSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Your Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Jane Doe"
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all font-serif"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Contact Info / Email (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., jane@example.com"
                value={onboardingContact}
                onChange={(e) => setOnboardingContact(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 transition-all font-serif"
              />
              <p className="text-[11px] text-slate-400 mt-1.5 font-serif italic leading-relaxed">
                Contact info is non-mandatory. It will only be used by the author to follow up on your feedback.
              </p>
            </div>

            <Button type="submit" className="w-full py-3 mt-4 text-sm font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-md">
              Initialize Story Sync
            </Button>
          </form>
        </div>
      </Layout>
    );
  }

  if (!profile) return null;

  // Resolve current fragment
  const isTraveler = profile.reading_mode === 'traveler';
  let currentFragId: string | null = null;
  let meta: FragmentMetadata | null = null;

  if (isTraveler) {
    currentFragId = getNextDeterministicFragment(
      manifest,
      storyStore.traveler.readFragments,
      profile.seed
    );
    meta = currentFragId ? (manifest.find((m) => m.id === currentFragId) as FragmentMetadata) : null;
  } else {
    // Partner Mode (linear)
    const currentIndex = Math.max(
      0,
      partnerManifest.findIndex((m) => m.chronological_order === storyStore.partner.furthestReadChronologicalId) + 1
    );

    if (currentIndex < partnerManifest.length) {
      meta = partnerManifest[currentIndex];
      currentFragId = meta.id;
    }
  }

  // Ending screen
  if (!currentFragId || !meta) {
    return (
      <Layout hideHeader>
        {!isSupabaseConfigured && (
          <div className="w-full mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-sans text-amber-800 flex justify-between items-center">
            <span>⚠️ <strong>Demo Mode:</strong> Supabase not configured. Logs are saved to Local Storage.</span>
          </div>
        )}
        <div className="max-w-md mx-auto text-center py-12 font-sans">
          <div className="text-4xl mb-4">✨</div>
          <h2 className="text-2xl font-bold text-slate-900">Narrative Complete</h2>
          <p className="text-slate-500 font-serif italic mt-2 leading-relaxed">
            The calibration is stable. You have navigated all available memories.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-12">
      {/* Header bar */}
      <header className="w-full max-w-2xl mx-auto px-4 py-3 mt-4 bg-white/80 backdrop-blur-md border border-slate-100 rounded-2xl shadow-sm flex justify-between items-center sticky top-4 z-40">
        <div className="flex items-center gap-2">
          <span className="font-sans font-extrabold tracking-wider text-slate-800 text-xs uppercase">
            Beta mode
          </span>
          <span className="h-3.5 w-px bg-slate-200" />
          <span className="font-sans text-[11px] text-slate-500 max-w-[120px] truncate" title={betaStore.name || 'Anonymous'}>
            Tester: {betaStore.name || 'Anonymous'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
            Mode: {isTraveler ? 'Traveler' : 'Partner'}
          </span>
        </div>
      </header>

      {/* Demo Warning Banner */}
      {!isSupabaseConfigured && (
        <div className="w-full max-w-2xl mx-auto px-4 mt-3">
          <div className="p-2.5 bg-amber-50/70 backdrop-blur-sm border border-amber-200/60 rounded-xl text-[10px] font-sans text-amber-800 flex justify-between items-center">
            <span>🛠️ <strong>Demo Mode:</strong> Supabase environment variables are missing. All logs & progress are saved to your browser's local storage.</span>
            <span className="font-mono bg-amber-100/60 px-1.5 py-0.5 rounded text-[9px]">ID: {userID}</span>
          </div>
        </div>
      )}

      {/* Main viewer container */}
      <main className="w-full max-w-2xl mx-auto flex-grow flex flex-col justify-start p-4 mt-6">
        <BetaFragmentRenderer
          key={currentFragId}
          userID={userID || ''}
          fragmentId={currentFragId}
          meta={meta}
          profile={profile}
          setProfile={setProfile}
          isTraveler={isTraveler}
          storyStore={storyStore}
          betaStore={betaStore}
        />
      </main>
    </div>
  );
}

// Deduplicate double logging in React StrictMode dev environment
let lastLoggedView = '';

// Sub-component to manage MDX loading, warnings, and feedback panels
function BetaFragmentRenderer({
  userID,
  fragmentId,
  meta,
  profile,
  setProfile,
  isTraveler,
  storyStore,
  betaStore,
}: {
  userID: string;
  fragmentId: string;
  meta: FragmentMetadata;
  profile: BetaReaderProfile;
  setProfile: (profile: BetaReaderProfile) => void;
  isTraveler: boolean;
  storyStore: any;
  betaStore: any;
}) {
  const [MDXComponent, setMDXComponent] = useState<React.LazyExoticComponent<React.ComponentType<any>> | null>(null);
  const [isRevealed, setIsRevealed] = useState(!meta.warnings || meta.warnings.length === 0);

  // Load component
  useEffect(() => {
    if (fragmentId) {
      const cmp = lazy(() => import(`../content/${fragmentId}.mdx`));
      setMDXComponent(() => cmp);
      setIsRevealed(!meta.warnings || meta.warnings.length === 0);
      betaStore.resetFeedback();
    }
  }, [fragmentId]);

  // Log View event only when revealed to user (deduplicated against React StrictMode)
  useEffect(() => {
    if (isRevealed && lastLoggedView !== fragmentId) {
      lastLoggedView = fragmentId;
      logBetaReadingEvent({
        user_id: userID,
        fragment_id: fragmentId,
        action: 'view',
        reaction: null,
        comments: null,
      });
    }
  }, [isRevealed, fragmentId, userID]);

  const handleAdvance = async () => {
    const reaction = betaStore.feedbackEmoji;
    const comments = betaStore.feedbackComments.trim() || null;

    // Log the advance/feedback action
    await logBetaReadingEvent({
      user_id: userID,
      fragment_id: fragmentId,
      action: 'advance',
      reaction,
      comments,
    });

    // Update progress
    let updatedProgress: Partial<BetaReaderProfile> = {};
    if (isTraveler) {
      const newReadList = [...profile.traveler_progress];
      if (!newReadList.includes(fragmentId)) {
        newReadList.push(fragmentId);
      }
      updatedProgress = { traveler_progress: newReadList };
      storyStore.markTravelerRead(fragmentId);
    } else {
      updatedProgress = { partner_progress: meta.chronological_order };
      storyStore.updatePartnerProgress(meta.chronological_order);
    }

    // Upsert to DB/localStorage
    const finalProfile = await createOrUpdateBetaReader({
      ...profile,
      ...updatedProgress,
    });

    if (finalProfile) {
      setProfile(finalProfile);
    }
  };

  const handleSkipReveal = async () => {
    // If they skip a warnings fragment, we log that they advanced without viewing, and update progress
    await logBetaReadingEvent({
      user_id: userID,
      fragment_id: fragmentId,
      action: 'advance',
      reaction: 'skipped',
      comments: 'Skipped content warning',
    });

    let updatedProgress: Partial<BetaReaderProfile> = {};
    if (isTraveler) {
      const newReadList = [...profile.traveler_progress];
      if (!newReadList.includes(fragmentId)) {
        newReadList.push(fragmentId);
      }
      updatedProgress = { traveler_progress: newReadList };
      storyStore.markTravelerRead(fragmentId);
    } else {
      updatedProgress = { partner_progress: meta.chronological_order };
      storyStore.updatePartnerProgress(meta.chronological_order);
    }

    const finalProfile = await createOrUpdateBetaReader({
      ...profile,
      ...updatedProgress,
    });

    if (finalProfile) {
      setProfile(finalProfile);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Fragment Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.4 }}
        className="relative p-7 md:p-9 bg-white rounded-3xl shadow-sm border border-slate-100"
      >
        {storyStore.showChronologicalAnchor && (
          <div className="text-[10px] font-sans font-bold tracking-widest text-slate-400 uppercase mb-4">
            Memory #{meta.chronological_order}
          </div>
        )}

        <div className={`prose prose-slate max-w-none text-[17px] font-serif leading-relaxed whitespace-pre-wrap transition-all duration-300 ${!isRevealed ? 'blur-lg select-none' : ''}`}>
          {MDXComponent && (
            <Suspense fallback={<div className="animate-pulse h-24 bg-slate-100 rounded-2xl" />}>
              <MDXComponent />
            </Suspense>
          )}
        </div>

        {/* Content Warnings Block */}
        {!isRevealed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-md rounded-3xl p-6">
            <div className="bg-white/95 border border-slate-100 p-6 md:p-8 rounded-2xl shadow-xl text-center max-w-sm">
              <span className="inline-block text-[10px] font-sans font-extrabold bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full uppercase tracking-wider mb-3">
                Content Warning
              </span>
              <p className="text-xs text-slate-600 mb-6 font-serif italic leading-relaxed">
                This memory contains: <span className="font-semibold text-slate-900">{meta.warnings.join(', ')}</span>
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleSkipReveal}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-900 rounded-xl text-xs font-sans font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Skip Memory
                </button>
                <button
                  onClick={() => setIsRevealed(true)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-sans font-semibold shadow-md transition-colors cursor-pointer"
                >
                  Reveal
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Feedback Panel */}
      <AnimatePresence>
        {isRevealed && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm font-sans flex flex-col gap-6"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span>Reaction</span>
                <span className="text-[10px] font-normal text-slate-400 font-serif italic">(optional)</span>
              </h3>
              
              {/* Emojis list */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
                {EMOJIS.map((emoji) => {
                  const isActive = betaStore.feedbackEmoji === emoji.label.toLowerCase();
                  return (
                    <button
                      key={emoji.label}
                      type="button"
                      onClick={() =>
                        betaStore.setFeedbackEmoji(
                          isActive ? null : emoji.label.toLowerCase()
                        )
                      }
                      className={`flex items-center justify-center gap-2 py-2 px-3 border rounded-xl text-xs transition-all cursor-pointer ${
                        isActive ? emoji.activeClass : emoji.colorClass
                      }`}
                    >
                      <span className="text-base">{emoji.char}</span>
                      <span>{emoji.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
                <span>Comments</span>
                <span className="text-[10px] font-normal text-slate-400 font-serif italic">(optional)</span>
              </h3>
              <textarea
                placeholder="What did you feel? Any suggestions, questions or critiques..."
                value={betaStore.feedbackComments}
                onChange={(e) => betaStore.setFeedbackComments(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-850 focus:bg-white transition-all text-sm font-serif resize-none"
              />
            </div>

            {/* Advance actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-50">
              <button
                onClick={handleAdvance}
                className="flex-1 py-3 px-5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl text-xs shadow-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Save Feedback & Continue</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>

              {(!betaStore.feedbackEmoji && !betaStore.feedbackComments.trim()) && (
                <button
                  onClick={handleAdvance}
                  className="py-3 px-5 text-slate-400 hover:text-slate-800 font-medium rounded-2xl text-xs transition-colors cursor-pointer"
                >
                  Skip Feedback
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
