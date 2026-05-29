import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './Button';

interface FragmentViewerProps {
  id: string;
  chronologicalOrder: number;
  warnings: string[];
  showChronologicalAnchor: boolean;
  children: React.ReactNode;
  onAdvance: () => void;
  onSkip?: () => void;
}

export function FragmentViewer({
  id,
  chronologicalOrder,
  warnings,
  showChronologicalAnchor,
  children,
  onAdvance,
  onSkip
}: FragmentViewerProps) {
  const hasWarnings = warnings.length > 0;
  const [isRevealed, setIsRevealed] = useState(!hasWarnings);
  const [dragY, setDragY] = useState(0);

  const handleReveal = () => setIsRevealed(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = (_: any, info: any) => {
    if (isRevealed && info.offset.y < -50) {
      onAdvance();
    }
    setDragY(0);
  };

  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      drag={isRevealed ? "y" : false}
      dragConstraints={{ top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      onDrag={(_e, info) => setDragY(info.offset.y)}
      className="relative p-6 bg-white rounded-lg shadow-sm border border-gray-100"
      onClick={isRevealed && dragY === 0 ? onAdvance : undefined}
    >
      {showChronologicalAnchor && (
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-sans">
          Memory #{chronologicalOrder}
        </div>
      )}

      <div className={`prose prose-gray max-w-none text-lg leading-relaxed ${!isRevealed ? 'blur-md select-none' : 'cursor-pointer'}`}>
        {children}
      </div>

      {!isRevealed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/30 backdrop-blur-[2px] rounded-lg">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-center max-w-sm">
            <p className="text-sm text-gray-600 mb-4 font-sans">
              This memory contains: <span className="font-semibold">{warnings.join(', ')}</span>
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={onSkip}>Skip</Button>
              <Button onClick={handleReveal}>Reveal</Button>
            </div>
          </div>
        </div>
      )}

      {isRevealed && (
        <div className="mt-8 text-center opacity-50 text-sm font-sans text-gray-400">
           Click anywhere or swipe up to continue
        </div>
      )}
    </motion.div>
  );
}
