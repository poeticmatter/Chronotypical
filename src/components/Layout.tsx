import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStoryStore } from '../store/useStoryStore';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const store = useStoryStore();

  const isCalibrated = !!(store.names.protagonist && store.names.partner && store.seed);
  const currentPath = location.pathname;

  // Mode Handlers
  const handleSwitchToTraveler = () => {
    if (store.seed) {
      navigate(`/traveler?seed=${store.seed}`);
    } else {
      navigate('/onboarding');
    }
  };

  const handleSwitchToPartner = () => {
    navigate('/partner');
  };

  const handleRecalibrate = () => {
    navigate('/onboarding');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-serif flex flex-col items-center pb-12">
      {isCalibrated && (
        <header className="w-full max-w-2xl px-4 py-3 mt-4 bg-white/80 backdrop-blur-md border border-slate-100 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center sticky top-4 z-40">
          <div className="flex items-center gap-2">
            <span className="font-sans font-extrabold tracking-wider text-slate-800 text-sm uppercase">
              Chronotypical
            </span>
            <span className="h-4 w-px bg-slate-200" />
            <button 
              onClick={handleRecalibrate}
              className="font-sans text-xs text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 cursor-pointer"
            >
              Reset/Edit
            </button>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={handleSwitchToPartner}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-all cursor-pointer ${
                currentPath === '/partner'
                  ? 'bg-white text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Partner Mode
            </button>
            <button
              onClick={handleSwitchToTraveler}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-all cursor-pointer ${
                currentPath === '/traveler'
                  ? 'bg-white text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.656 48.656 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3M3 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M3 12l-3 3m3-3 3 3" />
              </svg>
              Traveler Mode
            </button>
          </div>
        </header>
      )}

      <main className="w-full max-w-2xl flex-grow flex flex-col justify-center p-4">
        {children}
      </main>
    </div>
  );
}
