import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Sparkles, Users, Award, HeartHandshake, Activity } from 'lucide-react';
import { fetchHealth } from '../api/client';

export default function Navigation() {
  const [serverStatus, setServerStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  useEffect(() => {
    fetchHealth()
      .then((res) => {
        if (res.status === 'ok') setServerStatus('ok');
        else setServerStatus('error');
      })
      .catch(() => setServerStatus('error'));
  }, []);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-zinc-950/80 border-b border-zinc-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Zone 1: Brand Wordmark */}
        <Link to="/people" className="flex items-center gap-2 group">
          <span className="font-display font-semibold text-lg tracking-widest text-zinc-100 group-hover:text-amber-500 transition-colors">
            AGENT<span className="text-amber-500 font-light">DATE</span>
          </span>
        </Link>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <NavLink
            to="/demo"
            className={({ isActive }) =>
              `flex items-center gap-2 transition-colors py-1.5 border-b-2 ${
                isActive
                  ? 'border-amber-500 text-amber-300 font-bold'
                  : 'border-transparent text-amber-400/90 hover:text-amber-300'
              }`
            }
          >
            <span>Demo</span>
          </NavLink>

          <NavLink
            to="/people"
            className={({ isActive }) =>
              `flex items-center gap-2 transition-colors py-1.5 border-b-2 ${
                isActive
                  ? 'border-amber-500 text-zinc-100'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`
            }
          >
            <Users className="w-4 h-4" />
            <span>People</span>
          </NavLink>

          <NavLink
            to="/rankings"
            className={({ isActive }) =>
              `flex items-center gap-2 transition-colors py-1.5 border-b-2 ${
                isActive
                  ? 'border-amber-500 text-zinc-100'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`
            }
          >
            <Award className="w-4 h-4" />
            <span>Rankings</span>
          </NavLink>
        </nav>

        {/* Zone 3: Actions & System Health Indicator */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900/60 px-3 py-1.5 rounded-full border border-zinc-800">
            <span className={`w-1.5 h-1.5 rounded-full ${serverStatus === 'ok' ? 'bg-emerald-500' : serverStatus === 'error' ? 'bg-rose-500' : 'bg-zinc-500'}`} />
            <span>API {serverStatus === 'ok' ? 'Online' : serverStatus === 'error' ? 'Offline' : 'Checking'}</span>
          </div>

          <Link
            to="/people"
            className="text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all whitespace-nowrap"
          >
            Ingest Profile
          </Link>
        </div>

      </div>
    </header>
  );
}
