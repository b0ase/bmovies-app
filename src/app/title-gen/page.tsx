import { ComingSoon } from '@/components/ComingSoon'

export default function Page() {
  return (
    <ComingSoon
      title="Title generator"
      description="Brainstorm cinematic film titles from a rough logline. Gets around the writer agent's mode-collapse problem (cartographer-this, librarian-that) by pulling from a diverse prompt pool of professions, settings, and genres."
      willDo={[
        'Type a one-line idea, get 10 title candidates',
        'Reroll any candidate for a fresh alternative',
        'Ticker auto-suggestion (5-char A-Z) for each title',
        'One-click commission at any of the four tiers',
        'Duplicate detection against the canonical bct_offers roster',
      ]}
      alternative={{
        href: '/script-gen',
        label: 'Script editor',
        desc: 'Read existing screenplays from the writer agent.',
      }}
    />
  )
}
