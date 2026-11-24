import { useId, type SVGProps } from 'react';
import type { PlayerRole } from '@cricket/shared';
import { Shield, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Hand-drawn cricket illustrations as inline SVG: no image files, they scale cleanly and
 * take their colours from props. Everything is decorative (aria-hidden).
 */

const uid = (raw: string) => raw.replace(/[^a-zA-Z0-9]/g, '');

type SvgProps = SVGProps<SVGSVGElement>;

export function CricketBall({ className, ...rest }: SvgProps) {
  const id = uid(useId());
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={className} {...rest}>
      <defs>
        <radialGradient id={`${id}b`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ff7a7a" />
          <stop offset="0.5" stopColor="#dc2626" />
          <stop offset="1" stopColor="#7f1d1d" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#${id}b)`} />
      <path d="M20 20 C42 40 42 60 20 80" fill="none" stroke="#fde68a" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M80 20 C58 40 58 60 80 80" fill="none" stroke="#fde68a" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M26 26 C44 42 44 58 26 74 M74 26 C56 42 56 58 74 74" fill="none" stroke="#fff7d6" strokeWidth="2" strokeDasharray="3 4.5" strokeLinecap="round" />
      <ellipse cx="34" cy="28" rx="11" ry="6" fill="#fff" opacity="0.35" transform="rotate(-35 34 28)" />
    </svg>
  );
}

export function CricketBat({ className, ...rest }: SvgProps) {
  const id = uid(useId());
  return (
    <svg aria-hidden viewBox="0 0 60 200" className={className} {...rest}>
      <defs>
        <linearGradient id={`${id}w`} x1="0" x2="1">
          <stop offset="0" stopColor="#e8b65c" />
          <stop offset="0.5" stopColor="#fbe3a1" />
          <stop offset="1" stopColor="#d09a3e" />
        </linearGradient>
      </defs>
      <rect x="25" y="0" width="10" height="64" rx="5" fill="#334155" />
      {[8, 18, 28, 38, 48].map((y) => (
        <rect key={y} x="25" y={y} width="10" height="3" fill="#0f172a" opacity="0.55" />
      ))}
      <path d="M9 74 Q9 56 24 56 H36 Q51 56 51 74 V184 Q51 197 38 197 H22 Q9 197 9 184 Z" fill={`url(#${id}w)`} stroke="#b9822f" strokeWidth="1.5" />
      <path d="M30 62 V190" stroke="#b9822f" strokeWidth="1.5" opacity="0.6" />
      <rect x="9" y="160" width="42" height="9" fill="#ef4444" opacity="0.85" />
    </svg>
  );
}

export function Stumps({ className, bailsOff = false, ...rest }: SvgProps & { bailsOff?: boolean }) {
  const id = uid(useId());
  return (
    <svg aria-hidden viewBox="0 0 80 112" className={className} {...rest}>
      <defs>
        <linearGradient id={`${id}s`} x1="0" x2="1">
          <stop offset="0" stopColor="#e9b95e" />
          <stop offset="0.5" stopColor="#fde9b0" />
          <stop offset="1" stopColor="#cf9a3f" />
        </linearGradient>
      </defs>
      {[12, 34, 56].map((x) => (
        <rect key={x} x={x} y="10" width="12" height="98" rx="5" fill={`url(#${id}s)`} stroke="#b9822f" strokeWidth="1.2" />
      ))}
      {bailsOff ? (
        <>
          <rect x="4" y="2" width="22" height="5" rx="2.5" fill="#fff7d6" transform="rotate(-24 15 4)" />
          <rect x="54" y="-4" width="22" height="5" rx="2.5" fill="#fff7d6" transform="rotate(30 65 -2)" />
        </>
      ) : (
        <>
          <rect x="14" y="4" width="26" height="5" rx="2.5" fill="#fff7d6" stroke="#b9822f" strokeWidth="1" />
          <rect x="38" y="4" width="26" height="5" rx="2.5" fill="#fff7d6" stroke="#b9822f" strokeWidth="1" />
        </>
      )}
    </svg>
  );
}

type FigureProps = SvgProps & { shirt?: string; cap?: string };

/** A batter in the waiting stance, bat grounded in front. */
export function Batter({ className, shirt = '#0ea5e9', cap = '#1e3a8a', ...rest }: FigureProps) {
  const id = uid(useId());
  return (
    <svg aria-hidden viewBox="0 0 220 300" className={className} {...rest}>
      <defs>
        <linearGradient id={`${id}w`} x1="0" x2="1">
          <stop offset="0" stopColor="#e8b65c" />
          <stop offset="0.5" stopColor="#fbe3a1" />
          <stop offset="1" stopColor="#d09a3e" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="280" rx="80" ry="9" fill="#000" opacity="0.18" />
      {/* legs: whites, then pads */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M96 168 L80 214 L66 258" stroke="#f1f5f9" strokeWidth="22" />
        <path d="M114 168 L142 208 L152 258" stroke="#f1f5f9" strokeWidth="22" />
        <path d="M80 214 L66 258" stroke="#ffffff" strokeWidth="25" />
        <path d="M142 208 L152 258" stroke="#ffffff" strokeWidth="25" />
        <path d="M78 222 L73 238 M72 244 L68 256 M142 216 L146 234 M148 240 L151 254" stroke="#94a3b8" strokeWidth="3" />
      </g>
      <ellipse cx="62" cy="268" rx="17" ry="8" fill="#0f172a" />
      <ellipse cx="156" cy="268" rx="17" ry="8" fill="#0f172a" />
      {/* bat */}
      <g transform="translate(154 118) rotate(-10) scale(0.72) translate(-30 0)">
        <rect x="25" y="0" width="10" height="64" rx="5" fill="#334155" />
        <path d="M9 74 Q9 56 24 56 H36 Q51 56 51 74 V184 Q51 197 38 197 H22 Q9 197 9 184 Z" fill={`url(#${id}w)`} stroke="#b9822f" strokeWidth="1.8" />
        <path d="M30 62 V190" stroke="#b9822f" strokeWidth="1.8" opacity="0.6" />
      </g>
      {/* torso */}
      <path d="M84 98 Q108 84 134 98 L124 176 Q106 184 92 176 Z" fill={shirt} />
      <path d="M108 90 L108 178" stroke="#fff" strokeWidth="2" opacity="0.25" />
      {/* arms */}
      <path d="M120 104 L146 120 L156 126" fill="none" stroke={shirt} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M98 106 L128 124 L154 128" fill="none" stroke={shirt} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <circle cx="156" cy="126" r="9" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
      {/* head + helmet */}
      <rect x="104" y="76" width="14" height="16" rx="6" fill="#d9a77c" />
      <circle cx="112" cy="64" r="17" fill="#e8b78d" />
      <path d="M93 66 C91 40 133 40 131 66 L131 70 L93 70 Z" fill={cap} />
      <path d="M124 64 H140 a3 3 0 0 1 0 6 H124 Z" fill={cap} />
      <path d="M126 72 V86 M132 72 V84 M126 78 H134" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      <circle cx="120" cy="66" r="1.8" fill="#1f2937" />
    </svg>
  );
}

/** A fast bowler in the delivery stride. */
export function Bowler({ className, shirt = '#f59e0b', cap = '#7c2d12', withBall = true, ...rest }: FigureProps & { withBall?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 220 300" className={className} {...rest}>
      <ellipse cx="108" cy="280" rx="84" ry="9" fill="#000" opacity="0.18" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* trailing leg */}
        <path d="M104 176 L82 220 L46 238" stroke="#f1f5f9" strokeWidth="21" />
        {/* planted front leg */}
        <path d="M122 178 L150 216 L158 262" stroke="#f1f5f9" strokeWidth="22" />
      </g>
      <ellipse cx="38" cy="241" rx="16" ry="7" fill="#0f172a" transform="rotate(-18 38 241)" />
      <ellipse cx="162" cy="270" rx="17" ry="8" fill="#0f172a" />
      {/* back arm swinging */}
      <path d="M110 108 L80 122 L58 104" fill="none" stroke={shirt} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      {/* torso, leaning back */}
      <path d="M96 106 Q120 92 144 102 L130 180 Q112 188 100 178 Z" fill={shirt} />
      <path d="M118 96 L114 182" stroke="#fff" strokeWidth="2" opacity="0.25" />
      {/* front arm up */}
      <path d="M136 106 L152 68 L160 34" fill="none" stroke={shirt} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="161" cy="28" r="8" fill="#e8b78d" />
      {withBall ? (
        <>
          <circle cx="164" cy="16" r="9" fill="#dc2626" />
          <path d="M158 12 C162 16 162 20 158 24" fill="none" stroke="#fde68a" strokeWidth="1.5" />
        </>
      ) : null}
      {/* head + cap */}
      <rect x="120" y="76" width="14" height="16" rx="6" fill="#d9a77c" />
      <circle cx="128" cy="66" r="16" fill="#e8b78d" />
      <path d="M112 64 C110 44 146 44 144 64 Z" fill={cap} />
      <path d="M138 62 H156 a2.5 2.5 0 0 1 0 5 H138 Z" fill={cap} />
      <circle cx="136" cy="68" r="1.8" fill="#1f2937" />
    </svg>
  );
}

/** The whole picture: bowler, flying ball, stumps and batter on the pitch. */
export function CricketScene({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 480 340" className={className}>
      <rect x="40" y="288" width="400" height="30" rx="15" fill="#fff" opacity="0.18" />
      <path d="M126 72 Q210 4 292 150" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" opacity="0.8" />
      <Stumps x={206} y={144} width={96} height={132} />
      <Bowler x={-14} y={34} width={198} height={270} withBall={false} />
      <Batter x={262} y={34} width={198} height={270} />
      <CricketBall x={184} y={26} width={36} height={36} />
    </svg>
  );
}

/** Mown-stripe field with a pitch and boundary rope. Sits behind content (use as an absolute background). */
export function FieldBackdrop({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" className={className}>
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={i * 80} y="0" width="80" height="500" fill={i % 2 ? '#fff' : '#000'} opacity="0.06" />
      ))}
      <ellipse cx="400" cy="250" rx="380" ry="230" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="14 10" opacity="0.28" />
      <ellipse cx="400" cy="250" rx="210" ry="125" fill="none" stroke="#fff" strokeWidth="2" opacity="0.15" />
      <rect x="370" y="110" width="60" height="280" rx="4" fill="#f3d9a4" opacity="0.12" />
      <path d="M362 150 H438 M362 350 H438" stroke="#fff" strokeWidth="2" opacity="0.25" />
    </svg>
  );
}

const SKINS = ['#f1c9a5', '#e0ac7e', '#c68a5b', '#a8693f', '#7b4a2a'];
const SHIRTS = ['#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#ec4899', '#6366f1', '#14b8a6'];
const CAPS = ['#1e3a8a', '#7c2d12', '#14532d', '#581c87', '#0f172a', '#9f1239'];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const SIZE = { xs: 'size-7', sm: 'size-9', md: 'size-11', lg: 'size-16' } as const;

/**
 * A little cricketer bust. Looks are picked from the name, so the same player always looks the same
 * (there are no uploaded photos yet). `role` adds a small bat / ball / keeper badge.
 */
export function PlayerAvatar({ name, role, size = 'md', ring, className }: { name: string; role?: PlayerRole; size?: keyof typeof SIZE; ring?: boolean; className?: string }) {
  const h = hash(name || '?');
  const skin = SKINS[h % SKINS.length]!;
  const shirt = SHIRTS[(h >>> 3) % SHIRTS.length]!;
  const cap = CAPS[(h >>> 6) % CAPS.length]!;
  const bg = `hsl(${h % 360} 70% 88%)`;
  return (
    <span className={cn('relative inline-flex shrink-0', SIZE[size], className)}>
      <svg aria-hidden viewBox="0 0 64 64" className={cn('size-full rounded-full shadow-md', ring ? 'ring-2 ring-amber-400' : 'ring-2 ring-white')}>
        <rect width="64" height="64" fill={bg} />
        <path d="M6 66 C6 48 18 44 32 44 C46 44 58 48 58 66 Z" fill={shirt} />
        <path d="M26 44 L32 52 L38 44" fill="#fff" opacity="0.9" />
        <rect x="27" y="36" width="10" height="10" rx="4" fill={skin} />
        <circle cx="32" cy="29" r="12" fill={skin} />
        <path d="M19.5 28 C18 12 46 12 44.5 28 Z" fill={cap} />
        <path d="M38 27 H52 a2 2 0 0 1 0 4 H38 Z" fill={cap} />
        <circle cx="36" cy="31" r="1.5" fill="#1f2937" />
        <circle cx="28" cy="31" r="1.5" fill="#1f2937" />
        <path d="M29 36 Q32 38.5 35 36" fill="none" stroke="#7c3f1d" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      {role ? <RoleBadge role={role} /> : null}
    </span>
  );
}

function RoleBadge({ role }: { role: PlayerRole }) {
  const base = 'absolute -right-1 -bottom-1 flex size-[42%] min-h-4 min-w-4 items-center justify-center rounded-full border-2 border-white text-white shadow';
  if (role === 'batter') return <span className={cn(base, 'bg-emerald-600')}><CricketBat className="size-[70%] rotate-45" /></span>;
  if (role === 'bowler') return <span className={cn(base, 'bg-rose-600')}><CricketBall className="size-[80%]" /></span>;
  if (role === 'all_rounder') return <span className={cn(base, 'bg-amber-500')}><Star className="size-[65%]" fill="currentColor" /></span>;
  return <span className={cn(base, 'bg-indigo-600')}><Shield className="size-[65%]" /></span>;
}
