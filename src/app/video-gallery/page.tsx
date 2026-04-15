import { ComingSoon } from '@/components/ComingSoon'

export default function Page() {
  return (
    <ComingSoon
      title="Video gallery"
      description="Browse every scene clip, trailer, and short ever shipped on bMovies. Filter by tier, studio, director, year, genre. Save clips to your favourites. Remix clips into a new commission (with upstream cascade to the original film holders)."
      willDo={[
        'Grid view of every kind=video artifact in bct_artifacts',
        'Filters by tier / studio / director / genre / year',
        'Side-by-side version comparison when a scene has been re-cut',
        'Save to favourites (bct_favourites — new table)',
        '"Commission a derivative" with one click — auto-fills parent_offer_id',
      ]}
      alternative={{
        href: '/movie-editor',
        label: 'Movie editor',
        desc: 'Pick a specific film and watch its scenes in a timeline player.',
      }}
    />
  )
}
