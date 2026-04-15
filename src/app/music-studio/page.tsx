import { ComingSoon } from '@/components/ComingSoon'

export default function MusicStudioPage() {
  return (
    <ComingSoon
      title="Music studio"
      kicker="Creative tools"
      description="Score your film. Generate original music via the composer agent, preview cues against your cut, swap moods, and lock the final soundtrack as an on-chain artifact."
      willDo={[
        'Composer agent generates original cues per scene',
        'Preview cues synced to the movie-editor timeline',
        'Mood / tempo / instrumentation controls — "darker, slower, more strings"',
        'Per-cue rewrite button that pings the composer agent',
        'Lock soundtrack — mints as a bct_artifact tied to your film',
      ]}
      alternative={{
        href: '/movie-editor',
        label: 'Movie editor',
        desc: 'Working on the cut instead? The movie editor plays back your scenes with the current score and lets you request per-scene re-cuts.',
      }}
    />
  )
}
