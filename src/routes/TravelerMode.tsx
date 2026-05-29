import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoryStore } from '../store/useStoryStore';
import { Layout } from '../components/Layout';
import { FragmentViewer } from '../components/FragmentViewer';
import { getNextDeterministicFragment } from '../engine/PoolEngine';
import manifest from '../manifest.json';
import type { FragmentMetadata } from '../types';

export function TravelerMode() {
  const navigate = useNavigate();
  const store = useStoryStore();
  useEffect(() => {
    if (!store.names.protagonist || !store.seed) {
      // Preserve the seed if we have one in the URL when redirecting to onboarding
      const searchParams = new URLSearchParams(window.location.search);
      const urlSeed = searchParams.get('seed');
      if (urlSeed) {
        navigate(`/onboarding?seed=${urlSeed}`);
      } else {
        navigate('/onboarding');
      }
    }
  }, [store.names.protagonist, store.seed, navigate]);

  const currentFragId = store.seed ? getNextDeterministicFragment(
    manifest as FragmentMetadata[],
    store.traveler.readFragments,
    store.seed
  ) : null;

  if (!currentFragId) {
    return (
      <Layout>
        <div className="text-center text-gray-500 italic">
          The timeline has stabilized. There are no more memories to process.
        </div>
      </Layout>
    );
  }

  const meta = manifest.find(m => m.id === currentFragId) as FragmentMetadata;

  return <TravelerFragmentRenderer currentFragId={currentFragId} meta={meta} store={store} />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TravelerFragmentRenderer({ currentFragId, meta, store }: { currentFragId: string, meta: FragmentMetadata, store: any }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MDXComponent, setMDXComponent] = useState<React.LazyExoticComponent<React.ComponentType<any>> | null>(null);

  useEffect(() => {
    if (currentFragId) {
      const cmp = lazy(() => import(`../content/${currentFragId}.mdx`));
      setMDXComponent(() => cmp);
    }
  }, [currentFragId]);

  const handleAdvance = () => {
    store.markTravelerRead(currentFragId);
  };

  const handleSkip = () => {
    store.markTravelerRead(currentFragId);
  };

  if (!MDXComponent) return <div />;

  return (
    <Layout>
      <Suspense fallback={<div className="animate-pulse h-32 bg-gray-100 rounded-lg" />}>
        <FragmentViewer
          key={currentFragId}
          id={currentFragId}
          chronologicalOrder={meta.chronological_order}
          warnings={meta.warnings}
          showChronologicalAnchor={store.showChronologicalAnchor}
          onAdvance={handleAdvance}
          onSkip={handleSkip}
        >
          <MDXComponent
            protagonist_name={store.names.protagonist}
            partner_name={store.names.partner}
          />
        </FragmentViewer>
      </Suspense>
    </Layout>
  );
}
