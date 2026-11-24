import { BarChart3, Share2, Trophy, Zap } from 'lucide-react';
import { CricketBall, CricketScene, FieldBackdrop } from '@/components/art/CricketArt';
import { Outlet } from 'react-router-dom';
import { Brand } from './Brand';

const POINTS = [
  { icon: Zap, text: 'Score every ball in seconds', tone: 'bg-amber-400/90 text-amber-950' },
  { icon: Trophy, text: 'Run tournaments and series', tone: 'bg-pink-400/90 text-pink-950' },
  { icon: Share2, text: 'Share one live link with everyone', tone: 'bg-sky-300/90 text-sky-950' },
  { icon: BarChart3, text: 'Scorecards, standings and awards', tone: 'bg-lime-300/90 text-lime-950' },
];

export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* colourful brand panel */}
      <aside className="bg-brand relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-lime-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-fuchsia-400/30 blur-3xl" />
        <FieldBackdrop className="pointer-events-none absolute inset-0 size-full opacity-80" />
        <CricketBall className="animate-spin-slow pointer-events-none absolute top-10 right-10 size-16 drop-shadow-xl" />
        <div className="relative">
          <Brand light />
        </div>
        <div className="relative space-y-8">
          <h1 className="text-5xl leading-[1.1] font-extrabold tracking-tight">
            Your ground.
            <br />
            <span className="bg-gradient-to-r from-yellow-200 to-lime-200 bg-clip-text text-transparent">Your live score.</span>
          </h1>
          <ul className="space-y-3">
            {POINTS.map(({ icon: Icon, text, tone }) => (
              <li key={text} className="flex items-center gap-3 text-lg font-medium">
                <span className={`flex size-10 items-center justify-center rounded-xl shadow-lg ${tone}`}>
                  <Icon className="size-5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <CricketScene className="relative mx-auto -mb-4 w-full max-w-md drop-shadow-2xl" />
      </aside>

      {/* form */}
      <div className="flex flex-col items-center justify-center gap-6 px-4 py-10">
        <div className="lg:hidden">
          <Brand />
        </div>
        <div className="animate-rise-in w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
