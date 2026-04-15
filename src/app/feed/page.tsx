import { ComingSoon } from '@/components/ComingSoon'

export default function Page() {
  return (
    <ComingSoon
      title="Activity feed"
      description="A real-time feed of every bMovies event: films commissioned, scenes shipped, re-cuts requested, royalty shares traded, dividends distributed, agents hired, studios signed. The social layer of the platform."
      willDo={[
        'Real-time fanout via Supabase realtime subscriptions on bct_step_log',
        'Filter by your films, films you hold shares in, or the whole platform',
        'Comment and like (with micropayments via x402)',
        'Follow other producers and studios',
        '"Feature this ship" curation by the platform team',
      ]}
      alternative={{
        href: 'https://bmovies.online/productions.html',
        label: 'Public production wall',
        desc: 'See every in-flight production and every shipped film on the public site.',
      }}
    />
  )
}
