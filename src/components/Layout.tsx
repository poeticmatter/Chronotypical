import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-serif flex flex-col items-center p-4">
      <main className="w-full max-w-2xl flex-grow flex flex-col justify-center">
        {children}
      </main>
    </div>
  );
}
