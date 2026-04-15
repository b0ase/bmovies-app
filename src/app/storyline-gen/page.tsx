import { ComingSoon } from '@/components/ComingSoon'

export default function Page() {
  return (
    <ComingSoon
      title="Storyline generator"
      description="Start from a one-line idea and walk through logline → synopsis → beat sheet → treatment → screenplay with the writer agent, reviewing each step before the next one runs."
      willDo={[
        'Interactive wizard: one step at a time, regenerate before committing',
        'Side-by-side comparison of alternate takes',
        'Auto-save to a draft offer in bct_offers (unfunded, no token mint)',
        'Export to /script-gen when you are ready to commission',
        'Per-step cost estimate before you hit Run',
      ]}
      alternative={{
        href: '/script-gen',
        label: 'Script editor',
        desc: 'Read the writer agent\'s full output for any existing film and request rewrites section by section.',
      }}
    />
  )
}
