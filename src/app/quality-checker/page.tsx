import { ComingSoon } from '@/components/ComingSoon'

export default function Page() {
  return (
    <ComingSoon
      title="Quality checker"
      description="Audit a film before it publishes. Checks for consistency of character names across scenes, sudden tone shifts in the screenplay, storyboard frames that don't match the shot plan, videos that 404, missing sound mix, and other issues that the production pipeline can miss."
      willDo={[
        'Character continuity check (name / description / voice agent)',
        'Scene order sanity (does scene N follow scene N-1 logically)',
        'Asset liveness check (every URL returns 200)',
        '1-10 score per category with a list of fixable issues',
        'Fix-with-one-click button for any issue the revise API can repair',
      ]}
      alternative={{
        href: '/movie-editor',
        label: 'Movie editor',
        desc: 'Walk through scenes one at a time and verify each one manually.',
      }}
    />
  )
}
