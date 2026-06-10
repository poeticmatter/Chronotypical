import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoryStore } from '../store/useStoryStore';
import { Layout } from '../components/Layout';
import { FragmentViewer } from '../components/FragmentViewer';
import manifestData from '../manifest.json';
import type { FragmentMetadata } from '../types';

// Sort manifest by chronological order
const manifest = [...manifestData].sort((a, b) => a.chronological_order - b.chronological_order) as FragmentMetadata[];

export function PartnerMode() {
  const navigate = useNavigate();
  const store = useStoryStore();

  // Local state for pagination
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, manifest.findIndex(m => m.chronological_order === store.partner.furthestReadChronologicalId))
  );

  useEffect(() => {
    if (!store.names.protagonist) {
      navigate('/onboarding');
    }
  }, [store.names.protagonist, navigate]);

  if (currentIndex >= manifest.length) {
    return (
      <Layout>
        <div className="text-center text-gray-500 italic">
          The records end here.
        </div>
      </Layout>
    );
  }

  const meta = manifest[currentIndex];

  return <PartnerFragmentRenderer
    meta={meta}
    store={store}
    currentIndex={currentIndex}
    setCurrentIndex={setCurrentIndex}
    manifestLength={manifest.length}
  />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PartnerFragmentRenderer({ meta, store, currentIndex, setCurrentIndex, manifestLength }: { meta: FragmentMetadata, store: any, currentIndex: number, setCurrentIndex: (val: number | ((prev: number) => number)) => void, manifestLength: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MDXComponent, setMDXComponent] = useState<React.LazyExoticComponent<React.ComponentType<any>> | null>(null);

  useEffect(() => {
    if (meta?.id) {
      const cmp = lazy(() => import(`../content/${meta.id}.mdx`));
      setMDXComponent(() => cmp);
    }
  }, [meta?.id]);

  const handleAdvance = () => {
    store.updatePartnerProgress(meta.chronological_order);
    setCurrentIndex(prev => prev + 1);
  };

  const handleSkip = () => {
    store.updatePartnerProgress(meta.chronological_order);
    setCurrentIndex(prev => prev + 1);
  };

  return (
    <Layout>
      <Suspense fallback={<div className="animate-pulse h-32 bg-gray-100 rounded-lg" />}>
        {MDXComponent && (
          <FragmentViewer
            key={meta.id}
            id={meta.id}
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
        )}
      </Suspense>

      <div className="mt-8 flex justify-between text-sm text-gray-400 font-sans">
        <button
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="disabled:opacity-30 hover:text-gray-900 transition-colors"
        >
          &larr; Previous
        </button>
        <span>Record {currentIndex + 1} of {manifestLength}</span>
        <button
          onClick={handleAdvance}
          className="hover:text-gray-900 transition-colors"
        >
          Next &rarr;
        </button>
      </div>
    </Layout>
  );
}
