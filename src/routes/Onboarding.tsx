import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStoryStore } from '../store/useStoryStore';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';

export function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const store = useStoryStore();

  const [protagonist, setProtagonist] = useState(store.names.protagonist || '');
  const [partner, setPartner] = useState(store.names.partner || '');
  const [showAnchor, setShowAnchor] = useState(store.showChronologicalAnchor);

  const incomingSeed = searchParams.get('seed');
  const [useSharedSeed, setUseSharedSeed] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!protagonist.trim() || !partner.trim()) return;

    store.setNames({ protagonist, partner });
    store.toggleChronologicalAnchor(showAnchor);

    const useLinkedSeed = incomingSeed && useSharedSeed;

    // If we're using a new linked seed, or we don't have one and need to generate one
    if (useLinkedSeed) {
       store.resetProgress();
       store.initializeSeed(incomingSeed);
       navigate(`/?seed=${incomingSeed}`);
    } else {
       const finalSeed = store.seed || Math.random().toString(36).substring(2, 8).toUpperCase();
       store.initializeSeed(finalSeed);
       navigate(`/?seed=${finalSeed}`);
    }
  };

  return (
    <Layout>
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 font-sans">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Begin the Calibration</h1>

        {incomingSeed && (
          <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-md text-sm border border-blue-200">
            <p className="font-semibold mb-2">You are connecting via a shared link.</p>
            <label className="flex items-start gap-2 cursor-pointer mt-2">
              <input
                type="radio"
                name="seedChoice"
                checked={useSharedSeed}
                onChange={() => setUseSharedSeed(true)}
                className="mt-1"
              />
              <span>Experience the shared timeline (Seed: {incomingSeed})</span>
            </label>
             <label className="flex items-start gap-2 cursor-pointer mt-2">
              <input
                type="radio"
                name="seedChoice"
                checked={!useSharedSeed}
                onChange={() => setUseSharedSeed(false)}
                className="mt-1"
              />
              <span>Start my own unique timeline</span>
            </label>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name (The Traveler)</label>
            <input
              type="text"
              required
              value={protagonist}
              onChange={(e) => setProtagonist(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Their Name (The Anchor)</label>
            <input
              type="text"
              required
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showAnchor}
                onChange={(e) => setShowAnchor(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                <strong className="text-gray-900 block">Show Chronological Anchors</strong>
                Display chronological numbers above memories. Reading as the Traveler means memories will arrive out of order. This anchor reduces cognitive load.
              </span>
            </label>
          </div>

          <Button type="submit" className="w-full mt-8">
            Initialize Sequence
          </Button>
        </form>
      </div>
    </Layout>
  );
}
