import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { Onboarding } from './routes/Onboarding';
import { TravelerMode } from './routes/TravelerMode';
import { PartnerMode } from './routes/PartnerMode';
import { Editor } from './routes/Editor';
import { useStoryStore } from './store/useStoryStore';

function Dispatcher() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const store = useStoryStore();

  useEffect(() => {
    // If missing identity, go to onboarding
    if (!store.names.protagonist || !store.names.partner) {
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dispatcher />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/traveler" element={<TravelerMode />} />
        <Route path="/partner" element={<PartnerMode />} />
        <Route
          path="/editor"
          element={import.meta.env.DEV ? <Editor /> : <Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
