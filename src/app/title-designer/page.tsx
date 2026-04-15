import { ComingSoon } from '@/components/ComingSoon'

export default function TitleDesignerPage() {
  return (
    <ComingSoon
      title="Title designer"
      kicker="Creative tools"
      description="Name your film. Generate dozens of title candidates with typography mocks, pick one, and ship it back to the editor as the canonical title card."
      willDo={[
        'Generate 20+ title candidates against your logline and genre',
        'Typography mocks — Bebas, Grotesk, slab serif, custom ligatures',
        'Title card previews on the hero frame from your storyboard',
        'Per-candidate title rewrite button that pings the writer agent',
        'One-click "Use this title" — updates bct_offers.title + mint metadata',
      ]}
      alternative={{
        href: '/script-gen',
        label: 'Script generator',
        desc: 'Working on the writing side instead? The script generator is live — logline, synopsis, beat sheet, treatment, screenplay, per-section rewrites.',
      }}
    />
  )
}
