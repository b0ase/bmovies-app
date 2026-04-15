import { ComingSoon } from '@/components/ComingSoon'

export default function Page() {
  return (
    <ComingSoon
      title="Storyboard generator"
      description="Batch-generate storyboard hero frames for a new film idea in seconds. Pick a genre, a protagonist, a setting, and let the storyboard artist agent ship 6-12 frames as a single commission."
      willDo={[
        'Pick 4 / 6 / 8 / 12 frame counts based on tier',
        'Style presets: noir, cinéma-vérité, anime, IMAX, hand-drawn',
        'Free-text direction override per frame',
        'One-click save to a new offer in bct_offers',
        'Frames land directly on the /storyboard editor for refinement',
      ]}
      alternative={{
        href: '/storyboard',
        label: 'Storyboard editor',
        desc: 'View and regenerate existing storyboard frames for any film already in the catalogue.',
      }}
    />
  )
}
