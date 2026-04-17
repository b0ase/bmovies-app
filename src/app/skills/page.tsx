/**
 * /skills
 *
 * Browsable catalog of every agent-callable skill on the bMovies
 * platform. Mirrors the data served at /.well-known/x402.json but
 * rendered as a human-readable page. Builds at request time from
 * src/lib/x402-skills.ts so there's one source of truth.
 */

import Link from 'next/link';
import { buildManifest, SKILLS } from '@/lib/x402-skills';
import type { Skill } from '@/lib/x402-skills';

export const revalidate = 60;
export const metadata = {
  title: 'bMovies — Agent Skills',
  description:
    'Every agent-callable skill on bMovies. x402-discoverable, BSV-paid, ready for autonomous production pipelines.',
};

const CATEGORY_LABELS: Record<Skill['category'], string> = {
  writing: 'Writing',
  visual: 'Visual',
  audio: 'Audio',
  video: 'Video',
  production: 'Production',
  query: 'Query',
};

const CATEGORY_ORDER: Skill['category'][] = [
  'writing',
  'visual',
  'audio',
  'video',
  'production',
  'query',
];

function groupSkills(skills: Skill[]): Record<Skill['category'], Skill[]> {
  const out = {} as Record<Skill['category'], Skill[]>;
  for (const c of CATEGORY_ORDER) out[c] = [];
  for (const s of skills) out[s.category].push(s);
  return out;
}

export default function SkillsPage() {
  const manifest = buildManifest();
  const grouped = groupSkills(SKILLS);

  return (
    <main className="min-h-screen bg-black text-[#e5e5e5] pb-24">
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="border-b border-[#1f1f1f] pb-8 mb-10">
          <div className="text-[0.65rem] text-[#E50914] uppercase tracking-[0.2em] font-bold mb-2">
            Agent skills · x402-discoverable
          </div>
          <h1
            className="text-5xl md:text-6xl text-white leading-none"
            style={{ fontFamily: 'var(--font-bebas), "Bebas Neue", sans-serif', letterSpacing: '0.02em' }}
          >
            Every capability.<br />
            <span style={{ color: '#E50914' }}>One manifest.</span>
          </h1>
          <p className="mt-5 text-[#aaa] text-base leading-relaxed max-w-[720px]">
            The bMovies platform exposes its agent swarm as a catalog of
            discrete skills. Each skill is a paid HTTP endpoint with a
            well-defined input, a BSV micropayment price, and a known
            output contract. Autonomous agents discover the full list at{' '}
            <code className="text-[#6bff8a] font-mono text-sm">/.well-known/x402.json</code>,
            pay per call, and chain skills into full productions.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            <Stat label="Total skills"    value={String(manifest.meta.totalSkills)} accent />
            <Stat label="Live today"      value={String(manifest.meta.liveSkills)} />
            <Stat label="Templates"       value={String(manifest.meta.templateSkills)} />
            <Stat label="Free / query"    value={String(manifest.meta.freeSkills)} />
          </div>

          <div className="flex gap-3 mt-8 flex-wrap">
            <a
              href="/.well-known/x402.json"
              target="_blank"
              rel="noopener"
              className="inline-block px-5 py-2.5 bg-[#E50914] hover:bg-[#b00610] text-white text-xs font-black uppercase tracking-wider no-underline"
            >
              Agent manifest JSON →
            </a>
            <Link
              href="/commission.html"
              className="inline-block px-5 py-2.5 border border-[#333] hover:border-[#E50914] text-[#ccc] hover:text-white text-xs font-black uppercase tracking-wider no-underline"
            >
              Commission a film
            </Link>
          </div>
        </div>

        {CATEGORY_ORDER.map((cat) => {
          const bucket = grouped[cat];
          if (!bucket.length) return null;
          return (
            <section key={cat} className="mb-12">
              <div className="flex items-baseline justify-between mb-5">
                <h2
                  className="text-3xl text-white"
                  style={{ fontFamily: 'var(--font-bebas), "Bebas Neue", sans-serif', letterSpacing: '0.03em' }}
                >
                  {CATEGORY_LABELS[cat]}
                </h2>
                <div className="text-[0.6rem] text-[#666] uppercase tracking-wider font-mono">
                  {bucket.length} skill{bucket.length === 1 ? '' : 's'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bucket.map((skill) => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>
            </section>
          );
        })}

        <footer className="mt-16 pt-8 border-t border-[#1f1f1f] text-[0.7rem] text-[#666] leading-relaxed max-w-[780px]">
          <p>
            Every paid skill speaks the <b className="text-[#ccc]">x402</b> HTTP
            402 Payment Required standard, adapted for Bitcoin SV. A first
            call without payment returns 402 + a{' '}
            <code className="text-[#888]">PaymentRequired</code> envelope;
            retry with the signed BSV transaction in{' '}
            <code className="text-[#888]">X-PAYMENT</code>. Query skills are
            free and rate-limited.
          </p>
          <p className="mt-3">
            Template skills are scaffolded but not yet wired end-to-end —
            track the <code className="text-[#888]">live</code> flag on each
            card before building against them in production.
          </p>
        </footer>
      </div>
    </main>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-[#1f1f1f] bg-[#0a0a0a] p-4">
      <div className="text-[0.55rem] uppercase tracking-[0.12em] text-[#888] font-bold">
        {label}
      </div>
      <div
        className="mt-2 text-3xl leading-none"
        style={{
          fontFamily: 'var(--font-bebas), "Bebas Neue", sans-serif',
          color: accent ? '#E50914' : '#fff',
          letterSpacing: '0.02em',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SkillCard({ skill }: { skill: Skill }) {
  const isFree = skill.price.amountSats === 0;
  return (
    <div
      className={`border bg-[#0a0a0a] p-4 flex flex-col gap-3 ${
        skill.live ? 'border-[#1f1f1f]' : 'border-dashed border-[#332a1a]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[0.55rem] uppercase tracking-[0.14em] text-[#E50914] font-bold">
            {skill.method} {skill.endpoint.replace(/^https?:\/\/[^/]+/, '')}
          </div>
          <h3
            className="text-xl text-white mt-1"
            style={{ fontFamily: 'var(--font-bebas), "Bebas Neue", sans-serif', letterSpacing: '0.02em' }}
          >
            {skill.name}
          </h3>
        </div>
        <div className="text-right shrink-0">
          {isFree ? (
            <div className="text-[0.65rem] text-[#6bff8a] font-bold uppercase tracking-wider">
              Free
            </div>
          ) : (
            <>
              <div className="text-xs text-white font-mono font-bold tabular-nums">
                {skill.price.amountSats.toLocaleString()} sat
              </div>
              <div className="text-[0.6rem] text-[#888] font-mono">
                {skill.price.usdEquivalent}
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-sm text-[#a0a0a0] leading-relaxed flex-1">
        {skill.description}
      </p>

      {skill.params.length > 0 && (
        <div className="border-t border-[#1a1a1a] pt-3">
          <div className="text-[0.5rem] uppercase tracking-[0.14em] text-[#666] font-bold mb-2">
            Params
          </div>
          <ul className="space-y-1">
            {skill.params.map((p) => (
              <li key={p.name} className="text-xs font-mono text-[#888] leading-snug">
                <span className={p.required ? 'text-[#E50914]' : 'text-[#555]'}>
                  {p.required ? '*' : '·'}
                </span>{' '}
                <span className="text-[#ccc]">{p.name}</span>
                <span className="text-[#555]">:{p.type}</span>{' '}
                <span className="text-[#777]">— {p.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#1a1a1a]">
        <div className="flex gap-1.5 flex-wrap">
          {skill.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="text-[0.5rem] px-1.5 py-0.5 border border-[#222] text-[#777] font-mono uppercase tracking-wider"
            >
              {t}
            </span>
          ))}
        </div>
        <div
          className={`text-[0.55rem] font-mono uppercase tracking-wider ${
            skill.live ? 'text-[#6bff8a]' : 'text-[#e09b09]'
          }`}
        >
          {skill.live ? 'Live' : 'Template'}
        </div>
      </div>
    </div>
  );
}
