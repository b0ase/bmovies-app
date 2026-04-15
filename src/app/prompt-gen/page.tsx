import { ComingSoon } from '@/components/ComingSoon'

export default function Page() {
  return (
    <ComingSoon
      title="Prompt generator"
      description="Give the crew better directions. A guided prompt builder for the video generation model that produces the scene clips — helps commissioners write prompts that actually yield cinematic output instead of generic AI slop."
      willDo={[
        'Scene-by-scene prompt templates (wide, medium, close, insert, master)',
        'Genre-specific modifier lists (noir lighting, Dogme 95, neon, natural)',
        'Negative prompt presets (no CGI, no over-saturation, no uncanny faces)',
        'Preview the prompt against the film\'s existing aesthetic before committing',
        'Save to bct_artifacts as a new version overriding the default prompt',
      ]}
      alternative={{
        href: '/movie-editor',
        label: 'Movie editor',
        desc: 'Use the free-text re-cut interface to rewrite any scene\'s prompt right now.',
      }}
    />
  )
}
