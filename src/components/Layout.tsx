import { ReactNode } from 'react';
import Navigation from './Navigation';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {children}
      </main>

      <footer className="border-t border-zinc-900 bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-medium text-zinc-400">AGENTDATE</span>
            <span aria-hidden="true">·</span>
            <span>Agentic Autonomous Matchmaking Platform</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-500">
            <span>React + Vite</span>
            <span aria-hidden="true">·</span>
            <span>Express Backend</span>
            <span aria-hidden="true">·</span>
            <span>REST Protocol</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
