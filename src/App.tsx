import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { Onboarding } from './routes/Onboarding';
import { TravelerMode } from './routes/TravelerMode';
import { PartnerMode } from './routes/PartnerMode';
import { Editor } from './routes/Editor';
import { BetaReader } from './routes/BetaReader';
import { Button } from './components/Button';
import { useStoryStore } from './store/useStoryStore';

function Dispatcher() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const store = useStoryStore();

  useEffect(() => {
    // If missing calibration seed, go to onboarding
    if (!store.seed) {
      // Pass along the seed if it exists so onboarding can catch it
      const seed = searchParams.get('seed');
      navigate(seed ? `/onboarding?seed=${seed}` : '/onboarding');
      return;
    }

    // If there's a seed in the URL, go to Traveler mode
    const urlSeed = searchParams.get('seed');
    if (urlSeed) {
      // Make sure the store knows this is the active seed.
      // If we are given a NEW seed, we must clear traveler progress to ensure determinism.
      if (store.seed !== urlSeed) {
        store.resetProgress();
        store.initializeSeed(urlSeed);
      }
      navigate(`/traveler?seed=${urlSeed}`, { replace: true });
    } else {
      // Default route without a seed in the URL is chronological
      navigate('/partner', { replace: true });
    }
  }, [store, navigate, searchParams]);

  return <div className="min-h-screen bg-gray-50 animate-pulse" />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const password = import.meta.env.VITE_READER_PASSWORD;
  const [unlocked, setUnlocked] = useState(!password || localStorage.getItem('chronotypical_access_code') === password);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) {
    return <>{children}</>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === password) {
      localStorage.setItem('chronotypical_access_code', input);
      setUnlocked(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white border border-slate-100 p-8 rounded-3xl shadow-sm text-center">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-700">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Access Code Required</h2>
        <p className="text-xs text-slate-400 mb-6 font-serif italic">
          This narrative is currently locked. Please enter the access code.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Access Code"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(false);
            }}
            className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-center text-sm focus:outline-none focus:ring-2 focus:ring-slate-850 transition-all ${
              error ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
            }`}
          />
          {error && <p className="text-[10px] text-rose-500 font-medium">Invalid access code. Please try again.</p>}
          <Button type="submit" className="w-full py-2.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white">
            Unlock Content
          </Button>
        </form>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Dispatcher /></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/traveler" element={<ProtectedRoute><TravelerMode /></ProtectedRoute>} />
        <Route path="/partner" element={<ProtectedRoute><PartnerMode /></ProtectedRoute>} />
        <Route
          path="/editor"
          element={import.meta.env.DEV ? <Editor /> : <Navigate to="/" replace />}
        />
        <Route path="/beta" element={<BetaReader />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
