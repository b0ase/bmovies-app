import { ComingSoon } from '@/components/ComingSoon'

export default function Page() {
  return (
    <ComingSoon
      title="Video prompt library"
      description="A searchable library of every video prompt that has worked well on the xAI vidgen model, curated from the best scenes across the catalogue. Ship better scenes by starting from a proven prompt."
      willDo={[
        'Every kind=video artifact indexed by prompt text + output quality',
        'Search by genre, camera, lens, lighting, character, setting',
        'Rating system (implicit from which scenes were NOT re-cut)',
        '"Use this prompt for a new scene" with one click',
        'Per-prompt cost history (sats paid via x402 to generate)',
      ]}
      alternative={{
        href: '/movie-editor',
        label: 'Movie editor',
        desc: 'See the prompt that generated any scene on any existing film.',
      }}
    />
  )
}
